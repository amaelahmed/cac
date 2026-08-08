export class RetrievalEngine {
  constructor(db) {
    this.db = db;
  }

  normalizeCriterion(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  scoreCriterion(field, modValue, input) {
    const maxPoints = 10;
    const broadPoints = 2;
    const values = Array.isArray(input) ? input : [input];
    const normalizedValues = values
      .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => this.normalizeCriterion(value))
      .filter(Boolean);
    const target = modValue ? this.normalizeCriterion(modValue) : 'any';

    if (!modValue || target === 'any') {
      return { score: broadPoints, reason: null };
    }

    if (normalizedValues.includes(target)) {
      return { score: maxPoints, reason: `Exact Match: ${field.replace('target_', '')}` };
    }

    const targetWords = target.split(" ").filter(word => word.length > 2);
    const closeMatch = normalizedValues.some(value => {
      if (!value) return false;
      if (value.includes(target) || target.includes(value)) return true;
      const valueWords = new Set(value.split(" ").filter(word => word.length > 2));
      const overlap = targetWords.filter(word => valueWords.has(word)).length;
      return overlap >= Math.min(2, targetWords.length);
    });

    if (closeMatch) {
      return { score: 8, reason: `Close Match: ${field.replace('target_', '')}` };
    }

    if (normalizedValues.length === 0 || normalizedValues.includes('any')) {
      return { score: 1, reason: `Generic User matched to Specific ${field.replace('target_', '')}` };
    }

    return { score: -5, reason: `Mismatch on ${field.replace('target_', '')}` };
  }

  /**
   * Retrieves and assembles an industry intelligence pack strategy.
   * @param {string[]} industryLineage - Array of industry IDs from specific to root.
   * @param {object} userInputs - The user's form inputs
   * @param {object} options - Optional configuration (e.g. { debug: true })
   * @returns {object|null} - The assembled strategy object with confidence, or null if no objects found.
   */
  async assembleStrategy(industryLineage, userInputs, sessionId, options = {}) {
    if (!industryLineage || industryLineage.length === 0) {
      return null;
    }

    // 1. Retrieve Candidate Objects (Joined with Domains)
    // We fetch all 'Published' objects matching the industry lineage
    const placeholders = industryLineage.map(() => '?').join(',');
    
    // In SQLite D1, passing array elements to IN requires binding them sequentially
    const query = `
      SELECT 
        ko.*, 
        kd.name as domain_name,
        COALESCE(ka.times_selected, 0) as prior_selections
      FROM knowledge_objects ko
      JOIN knowledge_domains kd ON ko.domain_id = kd.id
      LEFT JOIN (
        SELECT object_id, SUM(times_selected) as times_selected
        FROM ko_analytics
        GROUP BY object_id
      ) ka ON ka.object_id = ko.id
      WHERE ko.industry_id IN (${placeholders})
        AND ko.review_status = 'Published'
        AND kd.is_active = 1
    `;

    const { results: modules } = await this.db.prepare(query).bind(...industryLineage).all();

    if (!modules || modules.length === 0) {
      return null;
    }

    // 2. Score Candidates
    const categories = {};
    const MAX_POINTS_PER_CRITERIA = 10;
    
    const profile = userInputs || {};
    const criteriaList = [
      { field: 'target_goal', input: profile.objectives?.goals ?? profile.goal ?? 'ANY' },
      { field: 'target_audience', input: profile.customers?.audience ?? profile.audience ?? 'ANY' },
      { field: 'target_location', input: profile.market?.location ?? profile.location ?? 'ANY' },
      { field: 'target_size', input: profile.economics?.size ?? profile.size ?? 'ANY' },
      { field: 'target_service', input: profile.economics?.revenueModel ?? profile.offering?.service ?? profile.service ?? 'ANY' },
      { field: 'target_stage', input: profile.identity?.stage ?? profile.stage ?? 'ANY' },
      { field: 'target_model', input: profile.customers?.model ?? profile.model ?? 'ANY' },
      { field: 'target_pricing', input: profile.offering?.averageTicket ?? profile.pricing ?? 'ANY' },
      { field: 'target_type', input: profile.identity?.type ?? profile.business_type ?? profile.type ?? 'ANY' },
      { field: 'target_maturity', input: profile.maturity ?? 'ANY' },
      { field: 'target_challenge', input: profile.customers?.challenge ?? profile.challenge ?? 'ANY' }
    ];

    const MAX_POSSIBLE_POINTS = criteriaList.length * MAX_POINTS_PER_CRITERIA;

    for (const mod of modules) {
      let score = 0;
      let reasoning = [];
      let debugMeta = {
          industry_match: 0,
          business_type_match: 0,
          budget_match: 0,
          goal_match: 0,
          audience_match: 0,
          matched_tags: [],
          fallback_reason: null,
          relationship_source: null
      };

      for (const { field, input } of criteriaList) {
        const modValue = mod[field];
        
        const { score: matchScore, reason } = this.scoreCriterion(field, modValue, input);
        if (reason) reasoning.push(reason);
        score += matchScore;
        
        if (field === 'target_audience') debugMeta.audience_match = matchScore;
        if (field === 'target_pricing') debugMeta.budget_match = matchScore;
        if (field === 'target_goal') debugMeta.goal_match = matchScore;
        if (field === 'target_type') debugMeta.business_type_match = matchScore;
      }

      // Exact industry should beat generic advice unless the exact object is clearly wrong.
      const inheritanceLevel = industryLineage.indexOf(mod.industry_id);
      if (inheritanceLevel > 0) {
        const inheritancePenalty = inheritanceLevel * 6;
        score -= inheritancePenalty;
        reasoning.push(`Inherited from level ${inheritanceLevel}`);
        debugMeta.industry_match = Math.max(0, MAX_POINTS_PER_CRITERIA - inheritancePenalty);
        debugMeta.fallback_reason = `Inherited from parent (level ${inheritanceLevel})`;
      } else {
        score += 8;
        reasoning.push(`Exact Industry Match`);
        debugMeta.industry_match = MAX_POINTS_PER_CRITERIA;
      }

      const usagePenalty = Math.min(8, Math.floor(Number(mod.prior_selections || 0) / 5));
      if (usagePenalty > 0) {
        score -= usagePenalty;
        reasoning.push(`Usage rotation penalty ${usagePenalty}`);
      }

      // Calculate Object Confidence
      // base_confidence is out of 100
      const baseConfidence = mod.base_confidence || 100;
      const objectConfidence = Math.round((score / MAX_POSSIBLE_POINTS) * baseConfidence);

      if (!categories[mod.domain_name]) {
        categories[mod.domain_name] = [];
      }
      categories[mod.domain_name].push({ ...mod, score, objectConfidence, reasoning, debugMeta });
    }

    // 3. Select Highest Scoring per Category (with rotation on tie)
    const assembledParts = {};
    const selectedConfidences = [];
    let allReasoning = new Set();
    const debugTrace = [];
    const selectedObjects = [];
    let fallbackUsed = false;
    
    const dayOfWeek = new Date().getDay();
    const rotationSeed = Array.from(sessionId || 'default').reduce((acc, char) => acc + char.charCodeAt(0), 0) + dayOfWeek;

    for (const [domainName, candidates] of Object.entries(categories)) {
      if (candidates.length === 0) continue;

      candidates.sort((a, b) => b.score - a.score);
      const topScore = candidates[0].score;
      const tiedCandidates = candidates.filter(c => c.score === topScore);

      const selectedModule = tiedCandidates[rotationSeed % tiedCandidates.length];
      
      try {
        assembledParts[domainName] = JSON.parse(selectedModule.content_json);
        selectedConfidences.push(selectedModule.objectConfidence);
        selectedModule.reasoning.forEach(r => allReasoning.add(r));
        selectedObjects.push({
          id: selectedModule.id,
          domain: domainName,
          industry_id: selectedModule.industry_id,
          object_type: selectedModule.object_type,
          score: selectedModule.score,
          fallback_reason: selectedModule.debugMeta.fallback_reason,
        });
        if (selectedModule.debugMeta.fallback_reason || selectedModule.industry_id === 'ind-generic-000') {
          fallbackUsed = true;
        }
        
        if (options.debug) {
          debugTrace.push({
            domain: domainName,
            object_id: selectedModule.id,
            final_score: selectedModule.score,
            confidence: selectedModule.objectConfidence,
            reasoning: selectedModule.reasoning,
            industry_match: selectedModule.debugMeta.industry_match,
            business_type_match: selectedModule.debugMeta.business_type_match,
            budget_match: selectedModule.debugMeta.budget_match,
            goal_match: selectedModule.debugMeta.goal_match,
            audience_match: selectedModule.debugMeta.audience_match,
            matched_tags: selectedModule.debugMeta.matched_tags,
            fallback_reason: selectedModule.debugMeta.fallback_reason,
            relationship_source: selectedModule.debugMeta.relationship_source,
            candidates_evaluated: candidates.length,
            tied_count: tiedCandidates.length
          });
        }
      } catch (err) {
        console.error(`Error parsing module content for domain ${domainName}`, err);
      }
    }

    if (Object.keys(assembledParts).length === 0) {
      return null;
    }

    // 4. Calculate Final Strategy Confidence
    const avgConfidence = Math.round(selectedConfidences.reduce((a, b) => a + b, 0) / selectedConfidences.length);
    const confidenceStatus = avgConfidence >= 50 ? "STRONG_MATCH" : "WEAK_MATCH";

    if (options.debug) {
      debugTrace.sort((a, b) => b.final_score - a.final_score);
    }

    return {
      confidence: {
        score: avgConfidence,
        status: confidenceStatus,
        reasoning: Array.from(allReasoning).slice(0, 5) // Top 5 reasons
      },
      strategyRawJson: JSON.stringify(assembledParts),
      usage: {
        selectedObjects,
        knowledgeObjectsUsed: selectedObjects.length,
        fallbackUsed,
        generationSource: 'knowledge_engine',
      },
      ...(options.debug ? { _debug: debugTrace } : {})
    };
  }
}
