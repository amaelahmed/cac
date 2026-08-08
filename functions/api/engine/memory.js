export class BusinessMemoryService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Save an enriched profile to the database.
   * @param {string} sessionId
   * @param {object} profile
   */
  async saveProfile(sessionId, profile) {
    if (!sessionId || !profile) return false;
    
    try {
      const version = profile._schemaVersion || 1;
      const profileJson = JSON.stringify(profile);

      await this.db.prepare(`
        INSERT INTO business_profiles (session_id, schema_version, profile_json, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(session_id) DO UPDATE SET
          profile_json = excluded.profile_json,
          schema_version = excluded.schema_version,
          updated_at = CURRENT_TIMESTAMP
      `).bind(sessionId, version, profileJson).run();
      
      return true;
    } catch (err) {
      console.error("Failed to save BusinessProfile to BusinessMemoryService:", err);
      return false;
    }
  }

  /**
   * Retrieve an enriched profile from the database.
   * @param {string} sessionId
   * @returns {object|null} The business profile, or null if not found
   */
  async loadProfile(sessionId) {
    if (!sessionId) return null;

    try {
      const result = await this.db.prepare(`
        SELECT profile_json FROM business_profiles WHERE session_id = ?
      `).bind(sessionId).first();

      if (result && result.profile_json) {
        return JSON.parse(result.profile_json);
      }
    } catch (err) {
      console.error("Failed to load BusinessProfile from BusinessMemoryService:", err);
    }
    
    return null;
  }
}
