import { getRequestSession, isPaidUser } from "./utils/auth";
import { RetrievalEngine } from "./engine/retrieval";
import { TaxonomyResolver } from "./engine/taxonomy";
import { hydrateStrategy } from "./engine/hydration";
import { BusinessProfileBuilder } from "./engine/profileBuilder";
import { BusinessMemoryService } from "./engine/memory";
import { validateBusinessPayload } from "./utils/input-quality";
import { assembleReport, validateReportSchema, sanitizeBusinessProfileForOutput } from "./engine/reportAssembler";
import { StrategyBlockRetrieval } from "./engine/strategyBlockRetrieval";
import { createMasterStrategy } from "./engine/masterStrategyEngine.js";
import { expandCalendarWithAi } from "./engine/calendarExpander.js";
import { fetchWebSnapshot } from "./utils/web-fetch.js";
import { extractInternetSignals } from "./engine/internetSignals.js";

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Fields the workspace UI actually renders for a calendar day. The engine
// attaches a great deal more per day - shot_list, expected_outcome and
// visual_direction were each repeating the SAME sentence across all 30 days
// (308x, 289x, 88x) while never being displayed. Shipping them cost ~80% of
// the calendar payload and made the plan read as boilerplate on export.
const WORKSPACE_CALENDAR_DAY_KEYS = new Set([
    "day", "platform", "post_type", "theme", "topic", "hook",
    "what_to_show", "how_to_create", "caption", "full_caption",
    "hashtags", "customer_action", "why_this_helps",
]);

const WORKSPACE_FULL_REPORT_KEYS = new Set([
    "If You Only Do One Thing",
    "Do This First",
    "What We Checked",
    "Quick Summary",
    "Launch Readiness",
    "What To Fix First",
    "First Customer Plan",
    "Customer Plan",
    "Numbers To Watch",
    "Website Check",
    "Website Details Used",
    "source",
    "unique_value_proposition",
    "customer_types",
]);

function buildWorkspaceResponseReport(report) {
    const tabs = report?.tabs && typeof report.tabs === "object" ? report.tabs : {};
    const fullReport = tabs.fullReport && typeof tabs.fullReport === "object" ? tabs.fullReport : {};
    const simpleFullReport = Object.fromEntries(
        Object.entries(fullReport).filter(([key]) => WORKSPACE_FULL_REPORT_KEYS.has(key))
    );

    const calendar = tabs.calendar && typeof tabs.calendar === "object" ? tabs.calendar : null;
    const trimmedCalendar = calendar && Array.isArray(calendar.days)
        ? {
            ...calendar,
            days: calendar.days.map(day => (day && typeof day === "object"
                ? Object.fromEntries(
                    Object.entries(day).filter(([key]) => WORKSPACE_CALENDAR_DAY_KEYS.has(key))
                )
                : day)),
        }
        : calendar;

    return {
        business: report?.business || {},
        scores: Array.isArray(report?.scores) ? report.scores : [],
        diagnostics: report?.diagnostics || null,
        tabs: {
            ...tabs,
            ...(trimmedCalendar ? { calendar: trimmedCalendar } : {}),
            fullReport: simpleFullReport,
        },
        meta: report?.meta || {},
    };
}

function compactSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    return {
        url: snapshot.url,
        title: snapshot.title,
        description: snapshot.description,
        topHeadings: Array.isArray(snapshot.headings) ? snapshot.headings.slice(0, 5) : [],
        callsToAction: Array.isArray(snapshot.callsToAction) ? snapshot.callsToAction.slice(0, 6) : [],
        detectedGaps: Array.isArray(snapshot.detectedGaps) ? snapshot.detectedGaps.slice(0, 6) : []
    };
}

function buildLiveSignals(biz) {
    const signals = {};

    if (biz.location_insight) {
        signals["Local Market Anchor"] = {
            place: biz.location_insight.displayName || biz.biz_location,
            city: biz.location_insight.city,
            region: biz.location_insight.state,
            country: biz.location_insight.country
        };
    }

    const ownWebsite = compactSnapshot(biz.own_website_snapshot);
    if (ownWebsite) {
        signals["Own Website Signals"] = ownWebsite;
    }

    const competitorWebsite = compactSnapshot(biz.competitor_website_snapshot);
    if (competitorWebsite) {
        signals["Competitor Signals"] = competitorWebsite;
    }

    return Object.keys(signals).length > 0 ? signals : null;
}

async function enrichInternetSignals(biz, businessProfile) {
    const enrichedBiz = { ...(biz || {}) };
    const errors = [];

    async function ensureSnapshot(snapshotKey, urlKey, label) {
        if (enrichedBiz[snapshotKey]) return enrichedBiz[snapshotKey];
        if (!enrichedBiz[urlKey]) return null;

        try {
            const snapshot = await fetchWebSnapshot(enrichedBiz[urlKey], {
                maxTextLength: 3500,
                timeoutMs: 4500,
            });
            enrichedBiz[snapshotKey] = snapshot;
            return snapshot;
        } catch (error) {
            errors.push({
                kind: label,
                message: error?.message || "Website enrichment unavailable",
            });
            return null;
        }
    }

    const ownSnapshot = await ensureSnapshot("own_website_snapshot", "biz_website", "own_website");
    const competitorSnapshot = await ensureSnapshot("competitor_website_snapshot", "biz_comp_website", "competitor");
    const internetSignals = extractInternetSignals({
        ownSnapshot,
        competitorSnapshot,
        businessProfile,
        rawBiz: enrichedBiz,
    });

    if (errors.length) {
        internetSignals.fetch_errors = errors.map(error => error.kind);
    }

    return { enrichedBiz, internetSignals, errors };
}

function buildTelemetry(assemblyResult, strategyBlockPreview) {
    const usage = assemblyResult?.usage || {};
    const selectedObjects = Array.isArray(usage.selectedObjects) ? usage.selectedObjects : [];
    const selectedBlockIds = Array.isArray(strategyBlockPreview?.selectedBlocks)
        ? strategyBlockPreview.selectedBlocks.map(block => block.id).filter(Boolean)
        : [];
    const retrievedPackIds = [
        ...selectedObjects.map(item => item.id).filter(Boolean),
        ...selectedBlockIds,
    ];
    return {
        ai_calls_count: 0,
        knowledge_objects_used: Number(usage.knowledgeObjectsUsed || selectedObjects.length || 0),
        strategy_blocks_used: Number(strategyBlockPreview?.selectedCount || 0),
        strategy_block_candidate_count: Number(strategyBlockPreview?.candidateCount || 0),
        knowledge_object_ids: selectedObjects.map(item => item.id).filter(Boolean),
        retrieved_pack_ids: retrievedPackIds,
        fallback_used: Boolean(usage.fallbackUsed || selectedObjects.length === 0),
        fallback_reason: usage.fallbackUsed
            ? "CAC used inherited or generic offline knowledge where exact business modules were missing."
            : selectedObjects.length === 0
                ? "No matching published knowledge modules were found, so CAC used the safe Marketing OS fallback."
                : "",
        estimated_cost_saved: {
            amount_usd: 0.03,
            basis: "Avoided one full-report AI synthesis call by using deterministic Knowledge Engine assembly."
        },
        generation_source: usage.generationSource || "knowledge_engine"
    };
}

function uniqueValues(values) {
    return [...new Set((values || []).filter(Boolean))];
}

async function loadStrategyBlockPreview(env, businessProfile, rawBiz) {
    if (env.STRATEGY_LIBRARY_PREVIEW === "false") return null;

    try {
        const retriever = new StrategyBlockRetrieval(env.DB);
        const preview = await retriever.retrieveForReport(businessProfile, rawBiz, {
            candidateLimit: 320,
        });
        return preview.selectedCount > 0 ? preview : null;
    } catch (error) {
        console.warn("Strategy block preview unavailable; using deterministic fallback report.", error?.message || error);
        return null;
    }
}

async function recordGenerationTelemetry(db, sessionId, generationId, businessProfile, telemetry, selectedObjects) {
    if (!db || !sessionId) return;

    try {
        const stmts = [
            db.prepare(`
                INSERT INTO analytics (id, event_type, uid, metadata)
                VALUES (?, ?, ?, ?)
            `).bind(
                crypto.randomUUID(),
                "strategy_generation",
                sessionId,
                JSON.stringify({
                    generation_id: generationId,
                    industry: businessProfile?.market?.industry || null,
                    ai_calls_count: telemetry.ai_calls_count,
                    knowledge_objects_used: telemetry.knowledge_objects_used,
                    strategy_blocks_used: telemetry.strategy_blocks_used,
                    strategy_block_candidate_count: telemetry.strategy_block_candidate_count,
                    fallback_used: telemetry.fallback_used,
                    fallback_reason: telemetry.fallback_reason || "",
                    retrieved_pack_ids: telemetry.retrieved_pack_ids || [],
                    internet_enrichment: telemetry.internet_enrichment || "unavailable",
                    internet_sources_used: telemetry.internet_sources_used || [],
                    estimated_cost_saved: telemetry.estimated_cost_saved,
                    generation_source: telemetry.generation_source,
                    master_strategy_quality_score: telemetry.master_strategy_quality_score,
                    knowledge_categories_used: telemetry.knowledge_categories_used || {},
                    duplicate_recommendation_score: telemetry.duplicate_recommendation_score,
                    generic_language_score: telemetry.generic_language_score,
                    business_specificity_score: telemetry.business_specificity_score,
                    why_how_impact_score: telemetry.why_how_impact_score,
                    template_likeness_score: telemetry.template_likeness_score,
                    template_likeness_hits: telemetry.template_likeness_hits || [],
                    human_agency_review_score: telemetry.human_agency_review_score,
                    caption_ready_ratio: telemetry.caption_ready_ratio,
                    message_ready_ratio: telemetry.message_ready_ratio,
                    execution_ready_ratio: telemetry.execution_ready_ratio,
                    modules_generated: telemetry.modules_generated || 0,
                    missing_sections_filled: telemetry.missing_sections_filled || [],
                    report_schema_valid: Boolean(telemetry.report_schema_valid),
                    schema_valid: Boolean(telemetry.report_schema_valid)
                })
            )
        ];

        for (const object of selectedObjects || []) {
            stmts.push(
                db.prepare(`
                    INSERT INTO object_interactions
                      (id, session_id, generation_id, object_id, interaction_type, industry)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID(),
                    sessionId,
                    generationId,
                    object.id,
                    "GENERATED",
                    businessProfile?.market?.industry || null
                )
            );
            stmts.push(
                db.prepare(`
                    INSERT INTO ko_analytics (object_id, times_selected, last_used_at)
                    VALUES (?, 1, CURRENT_TIMESTAMP)
                `).bind(object.id)
            );
        }

        await db.batch(stmts);
    } catch (error) {
        console.error("Failed to record generation telemetry:", error);
    }
}

async function saveGeneratedWorkspace(db, uid, generationId, businessProfile, rawBiz, report) {
    if (!db || !uid || !generationId || !report) return null;

    const storageReport = {
        business: report.business,
        scores: report.scores,
        diagnostics: report.diagnostics || null,
        tabs: report.tabs,
        meta: report.meta,
    };
    const strategyJson = JSON.stringify(storageReport);
    const businessName = businessProfile?.identity?.name || rawBiz?.biz_name || "";
    const businessType = businessProfile?.market?.industry || rawBiz?.biz_industry || "";
    const location = businessProfile?.market?.location || rawBiz?.biz_location || "";
    const website = businessProfile?.channels?.website || rawBiz?.biz_website || "";

    await db.prepare(
        `INSERT INTO strategies (id, uid, business_name, business_type, location, website, strategy_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           strategy_json = excluded.strategy_json,
           business_name = excluded.business_name,
           business_type = excluded.business_type,
           location = excluded.location,
           website = excluded.website,
           updated_at = CURRENT_TIMESTAMP`
    ).bind(generationId, uid, businessName, businessType, location, website, strategyJson).run();

    return generationId;
}

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const session = await getRequestSession(env, request);

        if (!session || !session.user) {
            return json({ error: { message: "Unauthorized. Please sign in." } }, 401);
        }

        const hasPaid = await isPaidUser(env, session.user);
        if (!hasPaid) {
            return json({
                error: {
                    message: "Access denied. This account has not been granted access.",
                    code: "PAYMENT_REQUIRED"
                }
            }, 403);
        }

        const body = await request.json();
        const { useHybrid, biz } = body;

        if (!useHybrid) {
            return json({
                error: {
                    message: "Generic AI generation is disabled. Use /api/generate-roast or /api/generate-social for AI tasks, and /api/generate for knowledge-library strategy only."
                }
            }, 400);
        }

        if (!biz) {
            return json({ error: { message: "Business profile is required." } }, 400);
        }

        const validationErrors = validateBusinessPayload(biz);
        if (validationErrors.length > 0) {
            return json({
                error: {
                    message: "Please add real business details before generating.",
                    fields: validationErrors
                }
            }, 422);
        }

        const taxonomy = new TaxonomyResolver(env.DB);
        const engine = new RetrievalEngine(env.DB);
        const memory = new BusinessMemoryService(env.DB);
        const businessProfile = BusinessProfileBuilder.build(biz);

        await memory.saveProfile(session.user.id, businessProfile);

        const lineage = await taxonomy.resolveLineage(businessProfile.market.industry);

        const assemblyResult = await engine.assembleStrategy(
            lineage.length > 0 ? lineage : ['ind-generic-000'],
            businessProfile,
            session.user.id,
            { debug: env.GENERATION_DEBUG === 'true' }
        );

        const hydratedKnowledge = assemblyResult
            ? hydrateStrategy(assemblyResult.strategyRawJson, businessProfile)
            : {};
        const { enrichedBiz, internetSignals, errors: internetErrors } = await enrichInternetSignals(biz, businessProfile);
        const strategyBlockPreview = await loadStrategyBlockPreview(env, businessProfile, enrichedBiz);
        const telemetry = buildTelemetry(assemblyResult, strategyBlockPreview);
        const liveSignals = buildLiveSignals(enrichedBiz);
        telemetry.internet_enrichment = internetSignals.internet_enrichment;
        telemetry.internet_sources_used = [
            internetSignals.used_own_website ? "own_website" : "",
            internetSignals.used_competitor ? "competitor_website" : "",
        ].filter(Boolean);
        telemetry.internet_enrichment_errors = internetErrors.map(error => error.kind);
        const generationId = crypto.randomUUID();
        const confidence = assemblyResult?.confidence || {
            score: telemetry.knowledge_objects_used > 0 ? 45 : 30,
            status: telemetry.knowledge_objects_used > 0 ? "EARLY_MATCH" : "PROFILE_FALLBACK",
            reasoning: telemetry.knowledge_objects_used > 0
                ? ["Knowledge Engine objects were hydrated into the report."]
                : ["No matching published objects were found, so CAC used the safe profile fallback."]
        };
        const forceRuleBased = body.aiMode === "rules_only"
            || biz._force_rule_based === true
            || env.FORCE_RULE_BASED_STRATEGY === "true"
            || env.EMERGENCY_KILL_SWITCH_AI === "true";
        const forceAiFailure = body.aiMode === "force_ai_failure"
            || biz._force_ai_failure === true
            || env.FORCE_HYBRID_AI_FAILURE === "true";
        const masterResult = await createMasterStrategy(context, {
            sessionUserId: session.user.id,
            businessProfile,
            rawBiz: enrichedBiz,
            lineage: lineage.length > 0 ? lineage : ['ind-generic-000'],
            internetSignals,
            forceRuleBased,
            forceAiFailure,
        });
        // Second AI pass: the master prompt deliberately refuses to write final
        // calendar days, so without this the days are only ever template
        // expansion. Slices are independent and each one falls back to the
        // deterministic days on refusal, so this can partially succeed.
        if (masterResult.masterStrategy && !forceRuleBased && !forceAiFailure) {
            const expansion = await expandCalendarWithAi(context, {
                sessionUserId: session.user.id,
                businessProfile,
                masterStrategy: masterResult.masterStrategy,
                businessFacts: {
                    name: businessProfile?.identity?.name || enrichedBiz?.biz_name || "",
                    industry: businessProfile?.market?.industry || enrichedBiz?.biz_industry || "",
                    location: businessProfile?.market?.location || enrichedBiz?.biz_location || "",
                    audience: businessProfile?.customers?.audience || enrichedBiz?.biz_audience || "",
                    offer: businessProfile?.offering?.coreOffer || enrichedBiz?.biz_offer || "",
                    website_facts: compactSnapshot(enrichedBiz?.own_website_snapshot),
                },
                enabled: env.CALENDAR_AI_EXPANSION !== "false",
            });
            if (expansion.days.length === masterResult.masterStrategy.content_calendar_30_days.length) {
                masterResult.masterStrategy.content_calendar_30_days = expansion.days;
            }
            Object.assign(telemetry, expansion.telemetry);
        }

        const masterTelemetry = masterResult.telemetry || {};
        telemetry.master_strategy_enabled = true;
        telemetry.generation_source = masterTelemetry.generation_source || telemetry.generation_source;
        telemetry.ai_calls_count = Number(masterTelemetry.ai_calls_count || 0);
        telemetry.ai_enhanced = Boolean(masterTelemetry.ai_enhanced);
        telemetry.ai_model = masterTelemetry.ai_model || null;
        telemetry.ai_provider = masterTelemetry.ai_provider || null;
        telemetry.ai_status = masterTelemetry.schema_valid === false
            ? "master_strategy_quality_gate_fallback"
            : masterTelemetry.ai_enhanced ? "master_strategy_ai_ready" : "master_strategy_offline_ready";
        const masterAiSucceeded = Boolean(masterTelemetry.ai_enhanced)
            && masterTelemetry.generation_source === "master_strategy_ai"
            && masterTelemetry.schema_valid !== false
            && !masterTelemetry.fallback_used;
        telemetry.fallback_used = masterAiSucceeded
            ? false
            : Boolean(masterTelemetry.fallback_used || telemetry.fallback_used);
        telemetry.fallback_reason = masterAiSucceeded
            ? ""
            : masterTelemetry.fallback_reason || telemetry.fallback_reason || "";
        telemetry.quality_score_before_ai = masterTelemetry.quality_score_before_ai;
        telemetry.quality_score_after_ai = masterTelemetry.quality_score_after_ai;
        telemetry.master_strategy_quality_score = masterTelemetry.master_strategy_quality_score;
        telemetry.knowledge_categories_used = masterTelemetry.knowledge_categories_used || {};
        telemetry.duplicate_recommendation_score = masterTelemetry.duplicate_recommendation_score;
        telemetry.generic_language_score = masterTelemetry.generic_language_score;
        telemetry.business_specificity_score = masterTelemetry.business_specificity_score;
        telemetry.why_how_impact_score = masterTelemetry.why_how_impact_score;
        telemetry.template_likeness_score = masterTelemetry.template_likeness_score;
        telemetry.template_likeness_hits = masterTelemetry.template_likeness_hits || [];
        telemetry.human_agency_review_score = masterTelemetry.human_agency_review_score;
        telemetry.caption_ready_ratio = masterTelemetry.caption_ready_ratio;
        telemetry.message_ready_ratio = masterTelemetry.message_ready_ratio;
        telemetry.execution_ready_ratio = masterTelemetry.execution_ready_ratio;
        telemetry.knowledge_units_used = Number(masterTelemetry.knowledge_units_used || 0);
        telemetry.strategy_blocks_used_as_output = Number(masterTelemetry.strategy_blocks_used_as_output || 0);
        telemetry.strategy_blocks_repurposed_as_knowledge = Number(masterTelemetry.strategy_blocks_repurposed_as_knowledge || 0);
        telemetry.strategy_block_candidate_count = Number(masterTelemetry.strategy_block_candidate_count || telemetry.strategy_block_candidate_count || 0);
        telemetry.strategy_blocks_used = telemetry.strategy_blocks_used_as_output;
        telemetry.retrieved_pack_ids = uniqueValues([
            ...(telemetry.retrieved_pack_ids || []),
            ...(masterTelemetry.retrieved_pack_ids || []),
        ]);
        const legacyStrategyBlockOutputEnabled = env.LEGACY_STRATEGY_BLOCK_OUTPUT === "true";
        const safeDraft = assembleReport({
            hydratedStrategy: hydratedKnowledge,
            businessProfile,
            rawBiz: enrichedBiz,
            confidence,
            telemetry,
            strategyBlocks: legacyStrategyBlockOutputEnabled ? strategyBlockPreview?.selectedBlocks || [] : [],
            internetSignals,
            masterStrategy: masterResult.masterStrategy,
        });
        const finalStrategy = safeDraft;
        telemetry.ai_calls_count = Number(masterTelemetry.ai_calls_count || finalStrategy?.meta?.ai_calls_count || 0);
        telemetry.ai_enhanced = Boolean(masterTelemetry.ai_enhanced);
        telemetry.ai_model = masterTelemetry.ai_model || finalStrategy?.meta?.ai_model || null;
        telemetry.ai_provider = finalStrategy?.meta?.ai_provider || masterTelemetry.ai_provider || null;
        telemetry.ai_status = finalStrategy?.meta?.ai_status || telemetry.ai_status || null;
        telemetry.generation_source = finalStrategy?.meta?.generation_source || telemetry.generation_source;
        telemetry.fallback_reason = finalStrategy?.meta?.fallback_reason || telemetry.fallback_reason || "";
        telemetry.quality_score_before_ai = masterTelemetry.quality_score_before_ai || finalStrategy?.meta?.quality_score_before_ai;
        telemetry.quality_score_after_ai = masterTelemetry.quality_score_after_ai || finalStrategy?.meta?.quality_score_after_ai;
        telemetry.master_strategy_quality_score = masterTelemetry.master_strategy_quality_score || finalStrategy?.meta?.master_strategy_quality_score;
        telemetry.knowledge_categories_used = masterTelemetry.knowledge_categories_used || finalStrategy?.meta?.knowledge_categories_used || {};
        telemetry.duplicate_recommendation_score = masterTelemetry.duplicate_recommendation_score ?? finalStrategy?.meta?.duplicate_recommendation_score;
        telemetry.generic_language_score = masterTelemetry.generic_language_score ?? finalStrategy?.meta?.generic_language_score;
        telemetry.business_specificity_score = masterTelemetry.business_specificity_score ?? finalStrategy?.meta?.business_specificity_score;
        telemetry.why_how_impact_score = masterTelemetry.why_how_impact_score ?? finalStrategy?.meta?.why_how_impact_score;
        telemetry.template_likeness_score = masterTelemetry.template_likeness_score ?? finalStrategy?.meta?.template_likeness_score;
        telemetry.template_likeness_hits = masterTelemetry.template_likeness_hits || finalStrategy?.meta?.template_likeness_hits || [];
        telemetry.human_agency_review_score = masterTelemetry.human_agency_review_score ?? finalStrategy?.meta?.human_agency_review_score;
        telemetry.caption_ready_ratio = masterTelemetry.caption_ready_ratio ?? finalStrategy?.meta?.caption_ready_ratio;
        telemetry.message_ready_ratio = masterTelemetry.message_ready_ratio ?? finalStrategy?.meta?.message_ready_ratio;
        telemetry.execution_ready_ratio = masterTelemetry.execution_ready_ratio ?? finalStrategy?.meta?.execution_ready_ratio;
        const reportValidation = validateReportSchema(finalStrategy);
        telemetry.modules_generated = finalStrategy?.meta?.modules_generated || Object.keys(finalStrategy?.tabs || {}).length;
        telemetry.missing_sections_filled = finalStrategy?.meta?.missing_sections_filled || reportValidation.missing || [];
        telemetry.report_schema_valid = reportValidation.valid;
        if (finalStrategy?.meta) {
            finalStrategy.meta.modules_generated = telemetry.modules_generated;
            finalStrategy.meta.missing_sections_filled = telemetry.missing_sections_filled;
            finalStrategy.meta.schema_valid = reportValidation.valid;
            finalStrategy.meta.report_schema_valid = reportValidation.valid;
            finalStrategy.meta.generation_source = telemetry.generation_source;
            finalStrategy.meta.ai_calls_count = telemetry.ai_calls_count;
            finalStrategy.meta.retrieved_pack_ids = telemetry.retrieved_pack_ids;
            finalStrategy.meta.fallback_reason = telemetry.fallback_reason;
            finalStrategy.meta.master_strategy_quality_score = telemetry.master_strategy_quality_score;
            finalStrategy.meta.knowledge_categories_used = telemetry.knowledge_categories_used;
            finalStrategy.meta.duplicate_recommendation_score = telemetry.duplicate_recommendation_score;
            finalStrategy.meta.generic_language_score = telemetry.generic_language_score;
            finalStrategy.meta.business_specificity_score = telemetry.business_specificity_score;
            finalStrategy.meta.why_how_impact_score = telemetry.why_how_impact_score;
            finalStrategy.meta.template_likeness_score = telemetry.template_likeness_score;
            finalStrategy.meta.template_likeness_hits = telemetry.template_likeness_hits;
            finalStrategy.meta.human_agency_review_score = telemetry.human_agency_review_score;
            finalStrategy.meta.caption_ready_ratio = telemetry.caption_ready_ratio;
            finalStrategy.meta.message_ready_ratio = telemetry.message_ready_ratio;
            finalStrategy.meta.execution_ready_ratio = telemetry.execution_ready_ratio;
            finalStrategy.meta.saved_workspace_id = generationId;
            finalStrategy.meta.internet_enrichment = telemetry.internet_enrichment;
            finalStrategy.meta.internet_sources_used = telemetry.internet_sources_used;
        }
        const selectedObjects = assemblyResult?.usage?.selectedObjects || [];
        const savedReportId = await saveGeneratedWorkspace(env.DB, session.user.id, generationId, businessProfile, enrichedBiz, finalStrategy);

        await recordGenerationTelemetry(env.DB, session.user.id, generationId, businessProfile, telemetry, selectedObjects);

        const responseDetails = {
            confidence,
            businessProfile: sanitizeBusinessProfileForOutput(businessProfile),
            telemetry,
            generationId,
            savedReportId,
            workspaceId: savedReportId,
            generatedAt: new Date().toISOString(),
            internetEnrichment: {
                status: telemetry.internet_enrichment,
                sourcesUsed: telemetry.internet_sources_used,
            },
            ...(liveSignals ? { liveSignals } : {}),
            ...(strategyBlockPreview ? {
                strategyLibraryPreview: {
                    tags: strategyBlockPreview.tags,
                    candidateCount: strategyBlockPreview.candidateCount,
                    selectedCount: strategyBlockPreview.selectedCount,
                    selectedIds: strategyBlockPreview.selectedBlocks.map(block => block.id)
                }
            } : {}),
            reportValidation,
            ...(assemblyResult?._debug ? { debug: assemblyResult._debug } : {})
        };

        if (body.responseMode === "workspace_v1") {
            return json({
                report: buildWorkspaceResponseReport(finalStrategy),
                ...responseDetails,
            });
        }

        return json({
            choices: [{ message: { content: JSON.stringify(finalStrategy) } }],
            strategy: finalStrategy,
            report: finalStrategy,
            ...responseDetails,
        });

    } catch (error) {
        console.error('Error in /api/generate:', error);
        return json({ error: { message: "Internal server error during generation." } }, 500);
    }
}
