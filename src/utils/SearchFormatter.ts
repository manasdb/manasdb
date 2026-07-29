export interface RawSearchResult {
  database?: string;
  document_id?: string;
  id?: string;
  text?: string;
  tags?: string[];
  score?: number;
  annScore?: number;
  project?: string;
  model?: string;
  metadata?: {
    sectionTitle?: string;
    [key: string]: unknown;
  };
  contentDetails?: Array<{
    _id?: string;
    text?: string;
    tags?: string[];
    sectionTitle?: string;
    project?: string;
  }>;
  [key: string]: unknown;
}

export interface FormattedSearchResult {
  database: string;
  contentId: string;
  text: string;
  tags: string[];
  score: number;
  metadata: {
    matchedChunk: string;
    sectionTitle: string;
    healedContext: boolean;
    project: string;
    model: string;
  };
}

export default class SearchFormatter {
  /**
   * Cleans and merges raw MongoDB output from a $vectorSearch aggregation.
   */
  static formatRecallResults(rawResults: RawSearchResult[]): FormattedSearchResult[] {
    if (!Array.isArray(rawResults)) return [];

    return rawResults.map(res => {
      const content = (res.contentDetails && res.contentDetails[0]) || {};
      
      return {
        database: res.database || 'unknown',
        contentId: res.document_id || content._id || res.id || '',
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
