export default class SearchFormatter {
  /**
   * Cleans and merges raw MongoDB output from a $vectorSearch aggregation.
   * Removing internal fields like raw vectors or content hashes.
   * 
   * @param {Array} rawResults - The output from the aggregation pipeline.
   * @returns {Array} Formatted memory objects.
   */
  static formatRecallResults(rawResults) {
    if (!Array.isArray(rawResults)) return [];

    return rawResults.map(res => {
      // Check if it's already using the new polyglot structure or old mongodb structure
      const content = (res.contentDetails && res.contentDetails[0]) || {};
      
      return {
        database: res.database || 'unknown',
        contentId: res.document_id || content._id || res.id,
        text: content.text || res.text || '',
        tags: content.tags || res.tags || [],
        score: res.score || res.annScore || 0,
        metadata: {
          matchedChunk: content.text || res.text || '',
          sectionTitle: content.sectionTitle || res.metadata?.sectionTitle || '',
          healedContext: true,
          project: content.project || res.project || 'unknown',
          model: res.model || 'unknown'
        }
      };
    });
  }
}
