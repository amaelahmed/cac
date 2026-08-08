export class TaxonomyResolver {
  constructor(db) {
    this.db = db;
  }

  /**
   * Resolves the industry lineage (IDs) for a given industry name.
   * If the industry is found, walks up the parent tree.
   * Also includes a fallback 'ANY' or 'ROOT' id conceptually, but in our schema
   * target criteria handles 'ANY'. The industry_id in KO links to a specific node.
   * We return an array of industry IDs from the specific node up to the root.
   * @param {string} industryName
   * @returns {Promise<string[]>} Array of industry IDs
   */
  async resolveLineage(industryName) {
    if (!industryName) return [];

    // Find the starting industry node
    const startNode = await this.db.prepare(
      "SELECT id, parent_id FROM industries WHERE name = ? COLLATE NOCASE AND is_active = 1 LIMIT 1"
    ).bind(industryName).first();

    if (!startNode) return ['ind-generic-000'];

    const lineage = [startNode.id];
    let currentParentId = startNode.parent_id;

    // Safety limit to prevent infinite loops in case of circular references
    let depth = 0;
    const MAX_DEPTH = 10;

    while (currentParentId && depth < MAX_DEPTH) {
      const parentNode = await this.db.prepare(
        "SELECT id, parent_id FROM industries WHERE id = ? AND is_active = 1 LIMIT 1"
      ).bind(currentParentId).first();

      if (parentNode) {
        lineage.push(parentNode.id);
        currentParentId = parentNode.parent_id;
      } else {
        break;
      }
      depth++;
    }

    // Always append the Generic Business fallback root so every business gets at least some strategies
    if (lineage[lineage.length - 1] !== 'ind-generic-000') {
      lineage.push('ind-generic-000');
    }

    return lineage;
  }
}

