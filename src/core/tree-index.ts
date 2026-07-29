import MemoryEngine from './memory-engine.ts';

export interface TreeSectionNode {
  sectionId: string;
  title: string;
  summary: string;
  leafIds: string[];
  vector: number[] | null;
}

export interface TreeLeafNode {
  leafId: string;
  sectionId: string;
  text: string;
  chunkIndex: number;
}

export interface ChunkInput {
  text: string;
  sectionTitle?: string;
  chunkIndex?: number;
  embedText?: string;
}

export interface ScoredSection {
  sectionId: string;
  title: string;
  score: number;
  leafIds: string[];
}

export class TreeIndex {
  public sections: Map<string, TreeSectionNode>;
  public leaves: Map<string, TreeLeafNode>;
  private _built: boolean;

  constructor() {
    this.sections = new Map();
    this.leaves = new Map();
    this._built = false;
  }

  /**
   * Parses a flat chunk array into the 3-tier tree.
   */
  build(chunks: ChunkInput[]): void {
    this.sections.clear();
    this.leaves.clear();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const sectionKey = chunk.sectionTitle?.trim() || 'root';
      const sectionId = `section::${sectionKey}`;
      const leafId = `leaf::${sectionKey}::${i}`;

      if (!this.sections.has(sectionId)) {
        this.sections.set(sectionId, {
          sectionId,
          title: sectionKey,
          summary: '',
          leafIds: [],
          vector: null,
        });
      }

      const section = this.sections.get(sectionId)!;
      section.leafIds.push(leafId);

      if (section.leafIds.length <= 3) {
        section.summary += (section.summary ? ' ' : '') + chunk.text.slice(0, 200);
      }

      this.leaves.set(leafId, {
        leafId,
        sectionId,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex ?? i,
      });
    }

    this._built = true;
  }

  /**
   * Generates embedding vectors for all section summaries.
   */
  async vectorize(aiProvider: any, targetDims: number): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [, section] of this.sections) {
      if (!section.vector && section.summary) {
        promises.push(
          aiProvider.embed(section.summary, targetDims).then(({ vector }: { vector: number[] }) => {
            section.vector = vector;
          })
        );
      }
    }
    await Promise.all(promises);
  }

  /**
   * Returns the top-N sections ranked by cosine similarity to the query vector.
   */
  rankSections(queryVector: number[], topN = 5): ScoredSection[] {
    const scored: ScoredSection[] = [];
    for (const [, section] of this.sections) {
      if (!section.vector) continue;
      const score = (MemoryEngine as any)._cosine(queryVector, section.vector);
      scored.push({ sectionId: section.sectionId, title: section.title, score, leafIds: section.leafIds });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  /**
   * Retrieves all leaf nodes belonging to a given sectionId.
   */
  getLeaves(sectionId: string): TreeLeafNode[] {
    const section = this.sections.get(sectionId);
    if (!section) return [];
    return section.leafIds
      .map(id => this.leaves.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  get isBuilt(): boolean { return this._built; }
  get sectionCount(): number { return this.sections.size; }
  get leafCount(): number { return this.leaves.size; }
}

export default TreeIndex;
