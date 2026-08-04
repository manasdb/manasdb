import { CollectionNames } from '../storage/CollectionNames.ts';
export interface InsertParams {
  rawText: string;
  filteredText?: string;
  chunks?: any[];
  parentTags?: Record<string, unknown> | string[];
  aiProvider?: any;
  targetDims?: number;
  [key: string]: unknown;
}

export interface VectorSearchParams {
  queryVector: number[];
  limit?: number;
  minScore?: number;
  aiModelName?: string;
  [key: string]: unknown;
}

export interface KeywordSearchParams {
  query: string;
  limit?: number;
  mode?: string;
  [key: string]: unknown;
}

/**
 * Abstract BaseProvider interface for ManasDB Storage Drivers.
 * All database implementations (Polyglot Persistence) must extend this class
 * to ensure ManasDB can broadcast predictably across multiple layers.
 */
export abstract class BaseProvider {
  pool?: any;
  uri?: string;

  async close?(): Promise<void>;
  async getManifest?(): Promise<any>;
  async updateManifest?(arg0: { modelName: string; dimensions: number; lockedAt: Date; }): Promise<void>;
  async getMonthlySpend?(): Promise<any>;
  async expireOlderThan?(date: Date): Promise<any>;
  async deleteMany?(query: Record<string, any>): Promise<number | undefined>;
  async clear?(): Promise<void>;
  async clearTelemetry?(): Promise<void>;
  /**
   * Initializes schemas, tables, and necessary indexes.
   */
  async init(targetDims?: number): Promise<any> {
    throw new Error('BaseProvider: init() not implemented.');
  }

  /**
   * Persists a document into the database with its child vectors.
   */
  async insert(params: InsertParams): Promise<any> {
    throw new Error('BaseProvider: insert() not implemented.');
  }

  /**
   * Recalls semantically matching memories for a given query vector.
   */
  async vectorSearch(params: VectorSearchParams): Promise<any[]> {
    throw new Error('BaseProvider: vectorSearch() not implemented.');
  }

  /**
   * Recalls matching memories using keyword/text search.
   */
  async keywordSearch(params: KeywordSearchParams): Promise<any[]> {
    throw new Error('BaseProvider: keywordSearch() not implemented.');
  }

  /**
   * Deletes a parent document and all its associated child vectors.
   */
  async delete(documentId: string | number): Promise<any> {
    throw new Error('BaseProvider: delete() not implemented.');
  }

  /**
   * Checks the health of the database connection.
   */
  async health(): Promise<any> {
    throw new Error('BaseProvider: health() not implemented.');
  }

  /**
   * Retrieves the most recent documents from the database.
   */
  async list(limit?: number): Promise<any[]> {
    throw new Error('BaseProvider: list() not implemented.');
  }

  /**
   * Asynchronously logs an event object to the respective _manas_telemetry structure natively.
   */
  async logTelemetry(telemetryDoc: Record<string, unknown>): Promise<void> {
    // Optional implementation, fails silently if not supported.
  }
}

export default BaseProvider;
