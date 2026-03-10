/**
 * TreeIndex — Hierarchical Document Tree for ManasDB reasoning.
 *
 * Converts a flat array of chunks (from absorb()) into a 3-tier tree:
 *   document → sections → leaves (individual text chunks)
 *
 * This tree is used exclusively by reasoningRecall() to enable
 * step-by-step hierarchical traversal for better precision on large docs.
 *
 * Node Types:
 *   'document' — The root. Represents the full absorbed text.
 *   'section'  — A Markdown heading or double-newline-separated block.
 *   'leaf'     — An individual text chunk (the smallest unit).
 *
 * @module core/tree-index
 */

import MemoryEngine from './memory-engine.js';

class TreeIndex {
  constructor() {
    /** @type {Map<string, { sectionId: string, title: string, summary: string, leafIds: string[], vector: number[]|null }>} */
    this.sections = new Map();

    /** @type {Map<string, { leafId: string, sectionId: string, text: string, chunkIndex: number }>} */
    this.leaves = new Map();

    this._built = false;
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  /**
   * Parses a flat chunk array into the 3-tier tree.
   * Chunks are expected to have `sectionTitle`, `chunkIndex`, `text` fields
   * (same shape emitted by MemoryEngine._tokenAwareChunk).
   *
   * @param {Array<{ text: string, sectionTitle?: string, chunkIndex: number, embedText?: string }>} chunks
   */
  build(chunks) {
    this.sections.clear();
    this.leaves.clear();

    for (let i = 0; i < chunks.length; i++) {
      const chunk       = chunks[i];
      const sectionKey  = chunk.sectionTitle?.trim() || 'root';
      const sectionId   = `section::${sectionKey}`;
      const leafId      = `leaf::${sectionKey}::${i}`;

      // Create or retrieve section node
      if (!this.sections.has(sectionId)) {
        this.sections.set(sectionId, {
          sectionId,
          title:   sectionKey,
          summary: '',      // built lazily in vectorize()
          leafIds: [],
          vector:  null,    // computed in vectorize()
        });
      }

      const section = this.sections.get(sectionId);
      section.leafIds.push(leafId);

      // Build section summary from first 3 leaves
      if (section.leafIds.length <= 3) {
        section.summary += (section.summary ? ' ' : '') + chunk.text.slice(0, 200);
      }

      // Store leaf
      this.leaves.set(leafId, {
        leafId,
        sectionId,
        text:       chunk.text,
        chunkIndex: chunk.chunkIndex ?? i,
      });
    }

    this._built = true;
  }

  // ── Vectorize ────────────────────────────────────────────────────────────────

  /**
   * Generates embedding vectors for all section summaries.
   * Called lazily on first reasoningRecall().
   *
   * @param {Object} aiProvider - The embedding provider (from ModelFactory)
   * @param {number} targetDims
   */
  async vectorize(aiProvider, targetDims) {
    const promises = [];
    for (const [sectionId, section] of this.sections) {
      if (!section.vector && section.summary) {
        promises.push(
          aiProvider.embed(section.summary, targetDims).then(({ vector }) => {
            section.vector = vector;
          })
        );
      }
    }
    await Promise.all(promises);
  }

  // ── Query ─────────────────────────────────────────────────────────────────────

  /**
   * Returns the top-N sections ranked by cosine similarity to the query vector.
   *
   * @param {number[]} queryVector
   * @param {number} topN
   * @returns {Array<{ sectionId: string, title: string, score: number, leafIds: string[] }>}
   */
  rankSections(queryVector, topN = 5) {
    const scored = [];
    for (const [, section] of this.sections) {
      if (!section.vector) continue;
      const score = MemoryEngine._cosine(queryVector, section.vector);
      scored.push({ sectionId: section.sectionId, title: section.title, score, leafIds: section.leafIds });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  /**
   * Retrieves all leaf nodes belonging to a given sectionId.
   *
   * @param {string} sectionId
   * @returns {Array<{ leafId: string, text: string, chunkIndex: number }>}
   */
  getLeaves(sectionId) {
    const section = this.sections.get(sectionId);
    if (!section) return [];
    return section.leafIds
      .map(id => this.leaves.get(id))
      .filter(Boolean)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  // ── State ─────────────────────────────────────────────────────────────────────

  get isBuilt() { return this._built; }
  get sectionCount() { return this.sections.size; }
  get leafCount() { return this.leaves.size; }
}

export default TreeIndex;
