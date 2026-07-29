export default class ModelRegistry {
  /**
   * Retrieves default target dimensions for common known models.
   * This is used to map vector_index metrics safely before search flows.
   */
  static getDimensions(model: string | undefined | null): number | null {
    if (!model) return null;
    const cleanModel = model.split(':')[0];

    const mappings: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
      'text-embedding-004': 768,
      'gemini-embedding-001': 768,
      'nomic-embed-text': 768,
      'local-minilm': 384,
      'transformers': 384
    };

    return mappings[cleanModel] || mappings[model] || null;
  }
}
