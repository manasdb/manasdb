export interface ModelConfig {
  source: 'transformers' | 'openai' | 'gemini' | 'ollama' | string;
  model?: string;
  apiKey?: string;
  dimensions?: number;
  baseUrl?: string;
}

export interface PIIShieldRule {
  name: string;
  pattern: RegExp;
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
  metadata?: Record<string, unknown>;
  tags?: string[];
  projectName?: string;
  piiShield?: boolean;
}

export interface RecallOptions {
  limit?: number;
  minScore?: number;
  metadataFilter?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
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
  absorb(text: string, vector: number[], metadata?: Record<string, unknown>): Promise<MemoryChunk>;
  recall(vector: number[], options?: RecallOptions): Promise<MemoryChunk[]>;
  close?(): Promise<void>;
}
