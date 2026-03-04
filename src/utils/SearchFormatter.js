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

    return rawResults.map(raw => {
      // Destructure to separate internal components
      const { 
        vector, 
        embedding_hash,
        content_id,
        _id,
        contentDetails,
        score,
        ...rest 
      } = raw;

      // Ensure content details exist and extract first element from $lookup
      const content = Array.isArray(contentDetails) && contentDetails.length > 0 
        ? contentDetails[0] 
        : {};

      return {
        id: content._id || _id,
        text: content.text || null,
        tags: content.tags || null,
        project: content.project || rest.project || 'unknown',
        model: rest.model || 'unknown',
        dims: rest.dims || null,
        profile: rest.profile || 'unknown',
        score: score || 0,
        createdAt: content.createdAt || rest.createdAt
      };
    });
  }
}
