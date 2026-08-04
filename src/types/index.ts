// ==========================================
// Named aliases for the public API surface — these are structurally
// Record<string, unknown> today (both are genuinely open-ended: arbitrary
// user-defined tags/fields), but naming them means IntelliSense shows
// "Metadata" / "FilterExpression" at a call site instead of a bare generic
// map, and gives future-us one place to add real structure if a fixed shape
// ever emerges for either.
// ==========================================
export type Metadata = Record<string, unknown>;
export type FilterExpression = Record<string, unknown>;

export interface ModelConfig {
  source: 'transformers' | 'openai' | 'gemini' | 'ollama' | string;
  model?: string;
  apiKey?: string;
  dimensions?: number;
  baseUrl?: string;
}

export interface PIIShieldRule {
  name?: string;
  pattern?: RegExp;
  regex?: RegExp;
  placeholder?: string;
  replacement?: string;
}

export interface PIIShieldConfig {
  enabled: boolean;
  customRules?: PIIShieldRule[];
}

export interface CacheConfig {
  provider: 'redis' | 'memory' | string;
  uri?: string;
  semanticThreshold?: number;
  ttl?: number;
}

export interface ReasoningConfig {
  enabled: boolean;
  maxDepth?: number;
}

export interface BudgetConfig {
  monthlyLimit?: number;
  currentSpend?: number;
}

export interface RetryConfig {
  attempts?: number;
  backoff?: number;
  budget?: BudgetConfig;
}

export interface DatabaseConfig {
  type: 'memory' | 'mongodb' | 'postgres' | string;
  uri?: string;
  dbName?: string;
  collectionName?: string;
  tableName?: string;
  [key: string]: unknown;
}

export interface ManasDBConfig {
  uri?: string;
  dbName?: string;
  dbType?: string;
  databases?: DatabaseConfig[];
  projectName?: string;
  modelConfig?: ModelConfig;
  piiShield?: boolean | PIIShieldConfig;
  telemetry?: boolean;
  debug?: boolean;
  cache?: CacheConfig;
  reasoning?: ReasoningConfig;
  retry?: RetryConfig;
}

export interface AbsorbOptions {
  metadata?: Metadata;
  tags?: string[];
  projectName?: string;
  piiShield?: boolean;
  /** Chunk size in tokens — accepted by the legacy engine's chunker but
   * previously missing from this public type (a real gap: LegacyManasDB.absorb()
   * has always accepted it, just not through this interface). */
  maxTokens?: number;
  /** Overlap between adjacent chunks, in tokens. */
  overlapTokens?: number;
}

export interface RecallOptions {
  limit?: number;
  minScore?: number;
  metadataFilter?: FilterExpression;
  projectName?: string;
  hybrid?: boolean;
  rerank?: 'rrf' | 'mmr' | 'none';
  reasoning?: boolean;
}

export interface MemoryChunk {
  id: string;
  document_id?: string;
  text: string;
  vector?: number[];
  score?: number;
  metadata?: Metadata;
  projectName?: string;
  createdAt?: string | Date;
}

export interface TelemetryEvent {
  eventName: string;
  durationMs?: number;
  timestamp?: string;
  financial?: {
    actual_cost?: number;
    potential_cost?: number;
    tokens?: number;
    savings_financial?: number;
    savings_latency?: number;
  };
  [key: string]: unknown;
}

export interface IBaseProvider {
  type: string;
  init(): Promise<void>;
  absorb(text: string, vector: number[], metadata?: Metadata): Promise<MemoryChunk>;
  recall(vector: number[], options?: RecallOptions): Promise<MemoryChunk[]>;
  close?(): Promise<void>;
}

// ==========================================
// Typed return values � replaces any in public API
// ==========================================

export interface AbsorbResult {
  /** Number of chunks written */
  insertedCount: number;
  documentId?: string;
  metadata?: Metadata;
}

export interface RecallResult {
  /** Source database name */
  database: string;
  contentId: string;
  text: string;
  tags: string[];
  score: number;
  metadata?: Metadata;
}

/**
 * The known, updatable fields of a stored memory. Anything not listed here
 * genuinely isn't part of the update contract yet — extend this interface
 * (not a Record<string, unknown> call site) when a new updatable field is
 * added, so callers get autocomplete/type errors instead of silently typo-ing
 * a key that's never read.
 */
export interface UpdateFields {
  text?: string;
  tags?: string[];
  metadata?: Metadata;
}

export interface UpdateResult {
  updated: boolean;
  id: string;
}

export interface DeleteResult {
  deleted: boolean;
  id: string;
}

export interface SearchResult extends RecallResult {}

export interface IntentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==========================================
// Admin/operational result types — replaces
// Record<string, unknown>/any on the router's
// full operation surface (see OperationEngine).
// ==========================================

export interface ProviderHealthStatus {
  db: string;
  status: 'OK' | 'FAIL';
  error?: string;
}

export interface ForgetManyResult {
  query: FilterExpression;
  deletedTotal: number;
  providers: Array<{ provider: string; deleted: number }>;
  timestamp: string;
}

export interface DedupResult {
  purgedCount: number;
}

export interface ExpireResult {
  deletedTotal: number;
}

export interface MigrateResult {
  migratedCount: number;
}

export interface StorageManifest {
  name?: string;
  version?: string;
  type?: string;
  capabilities?: string[];
  [key: string]: unknown;
}
