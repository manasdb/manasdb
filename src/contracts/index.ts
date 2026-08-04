import type { MemoryChunk, RecallOptions } from '../types/index.ts';

export interface DatabaseProvider {
  init(dimensions?: number): Promise<void>;
  insert(data: any): Promise<any>;
  keywordSearch(options: any): Promise<any[]>;
  vectorSearch(options: any): Promise<any[]>;
  delete(id: string | number): Promise<void>;
  deleteMany(query: any): Promise<number>;
  clear(): Promise<void>;
  getManifest(): Promise<any>;
  updateManifest(manifest: any): Promise<void>;
  getMonthlySpend(): Promise<number>;
  expireOlderThan(date: Date): Promise<number>;
  list(limit: number): Promise<any[]>;
}

export interface EmbeddingProvider {
  embed(text: string, dimensions?: number): Promise<{ vector: number[], tokens?: number }>;
  getModelKey(): string;
}

export interface CacheProvider {
  init(): Promise<void>;
  getSemanticMatch(vector: number[]): Promise<any>;
  set(vector: number[], results: any): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

export interface LoggerProvider {
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error?: any, context?: any): void;
  debug(message: string, context?: any): void;
}

export interface MetricsProvider {
  increment(metric: string, value?: number, tags?: any): void;
  gauge(metric: string, value: number, tags?: any): void;
  histogram(metric: string, value: number, tags?: any): void;
}

export interface SecurityProvider {
  validate(context: any): Promise<void>;
  redact(text: string): string;
}

export interface StorageAdapter {
  type: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  provider: DatabaseProvider;
}
