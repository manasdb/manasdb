import { pipeline } from '@xenova/transformers';

export interface ChunkOutput {
  text: string;
  embedText: string;
  sectionTitle: string;
  chunkIndex: number;
  totalInSection: number;
}

export interface ExtractedTags {
  keywords: string[];
  timestamp: number;
}

/**
 * MemoryEngine handles the AI logic for ManasDB.
 * Utilizes a Singleton pattern for the embedding pipeline.
 */
export class MemoryEngine {
  private static extractorPipeline: any = null;

  /**
   * Initializes or reuses the extraction pipeline.
   */
  static async getPipeline(): Promise<any> {
    if (!this.extractorPipeline) {
      this.extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.extractorPipeline;
  }

  /**
   * Generates a numeric vector array representing the input text.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Extracts generic tags/keywords from the given text.
   */
  static extractTags(text: string): ExtractedTags {
    const words = text.split(/\W+/);
    
    const keywords = words
      .filter(word => word.length > 4 && word.length < 50)
      .map(word => word.toLowerCase());
      
    const uniqueKeywords = [...new Set(keywords)];
    
    return {
      keywords: uniqueKeywords,
      timestamp: Date.now()
    };
  }

  /**
   * Cosine similarity between two vectors. Safely handles mismatched lengths.
   */
  static _cosine(a: number[] | null | undefined, b: number[] | null | undefined): number {
    if (!a || !b) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }

  /**
   * Token-aware sliding window chunker for large documents.
   */
  static _tokenAwareChunk(text: string, maxTokens = 100, overlapTokens = 20): ChunkOutput[] {
    if (!text || text.trim() === '') return [];
    
    // Prevent huge contiguous strings from generating impossible chunks
    const safeText = text.replace(/([^\s]{50})/g, '$1 ');
    const paragraphs = safeText.split(/\n\s*\n/).filter(p => p.trim());
    const chunks: ChunkOutput[] = [];
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      
      if (words.length <= maxTokens) {
        chunks.push({
          text: para,
          embedText: para,
          sectionTitle: '',
          chunkIndex: chunkIndex++,
          totalInSection: 0
        });
        continue;
      }

      let i = 0;
      while (i < words.length) {
        let chunkEnd = Math.min(i + maxTokens, words.length);
        const windowWords = words.slice(i, chunkEnd);
        const chunkText = windowWords.join(' ');
        
        chunks.push({
          text: chunkText,
          embedText: chunkText,
          sectionTitle: '',
          chunkIndex: chunkIndex++,
          totalInSection: 0
        });

        if (chunkEnd === words.length) break;
        i += (maxTokens - overlapTokens);
      }
    }

    for (let c of chunks) {
      c.totalInSection = chunks.length;
    }

    return chunks;
  }
}

export default MemoryEngine;
