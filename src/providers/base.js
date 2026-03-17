/**
 * Abstract BaseProvider interface for ManasDB Storage Drivers.
 * All database implementations (Polyglot Persistence) must extend this class
 * to ensure ManasDB can broadcast predictably across multiple layers.
 */
class BaseProvider {
  /**
   * Initializes schemas, tables, and necessary indexes.
   */
  async init() {
    throw new Error('BaseProvider: init() not implemented.');
  }

  /**
   * Persists a document into the database with its child vectors.
   * 
   * @param {Object} params
   * @param {string} params.rawText
   * @param {string} params.filteredText
   * @param {Array} params.chunks
   * @param {Object} params.parentTags
   * @param {Object} params.aiProvider
   * @param {number} params.targetDims
   */
  async insert(params) {
    throw new Error('BaseProvider: insert() not implemented.');
  }

  /**
   * Recalls semantically matching memories for a given query vector.
   * 
   * @param {Object} params
   * @param {number[]} params.queryVector
   * @param {number} params.limit
   * @param {number} params.minScore
   * @param {string} params.aiModelName
   */
  async vectorSearch(params) {
    throw new Error('BaseProvider: vectorSearch() not implemented.');
  }

  /**
   * Recalls matching memories using keyword/text search.
   * 
   * @param {Object} params
   * @param {string} params.query
   * @param {number} params.limit
   * @param {string} params.mode
   */
  async keywordSearch(params) {
    throw new Error('BaseProvider: keywordSearch() not implemented.');
  }

  /**
   * Deletes a parent document and all its associated child vectors.
   * 
   * @param {string|number} documentId 
   */
  async delete(documentId) {
    throw new Error('BaseProvider: delete() not implemented.');
  }

  /**
   * Checks the health of the database connection.
   */
  async health() {
    throw new Error('BaseProvider: health() not implemented.');
  }

  /**
   * Retrieves the most recent documents from the database.
   * 
   * @param {number} limit 
   */
  async list(limit) {
    throw new Error('BaseProvider: list() not implemented.');
  }

  /**
   * Asynchronously logs an event object to the respective _manas_telemetry structure natively.
   * 
   * @param {Object} telemetryDoc
   */
  async logTelemetry(telemetryDoc) {
    // Optional implementation, fails silently if not supported.
  }
}

export default BaseProvider;
