import MongoConnection from '../core/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let sdkVersion = 'unknown';
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let pkgPath = path.join(__dirname, '../../package.json');
  if (!fs.existsSync(pkgPath)) pkgPath = path.join(__dirname, '../package.json');
  sdkVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
} catch (e) {}

export interface TelemetryPayload {
  projectName?: string;
  durationMs?: number;
  tokens?: number;
  actual_cost?: number;
  potential_cost?: number;
  savings_financial?: number;
  savings_latency?: number;
  metadata?: Record<string, unknown>;
  retrievalPath?: string;
  finalScore?: number;
  retrievalMode?: string;
  queryLengthBucket?: string;
  chunkSizeUsed?: number;
  embeddingProfile?: string;
  savedByCache?: number;
  [key: string]: unknown;
}

class TelemetryManager {
    public enabled: boolean;

    constructor() {
        this.enabled = true;
    }

    /**
     * Starts a high-resolution performance timer using Node's process.hrtime.bigint().
     */
    startTimer(): bigint {
        return process.hrtime.bigint();
    }

    /**
     * Calculates elapsed time since the timer started.
     */
    endTimer(startTime?: bigint): number {
        if (!startTime) return 0;
        const diffNs = process.hrtime.bigint() - startTime;
        return Number(diffNs) / 1000000.0;
    }

    /**
     * Asynchronously logs a telemetry event safely to all database providers.
     */
    async logEvent(eventName: string, payload: TelemetryPayload = {}, providers: any[] = []): Promise<void> {
        if (!this.enabled) return;

        try {
            const telemetryDoc = {
                eventName,
                projectName: payload.projectName || 'unknown',
                durationMs: payload.durationMs || 0,
                financial: {
                    tokens: payload.tokens || 0,
                    total_tokens_processed: payload.tokens || 0,
                    actual_cost: Number(payload.actual_cost || 0),
                    potential_cost: Number(payload.potential_cost || 0),
                    savings_financial: Number(payload.savings_financial || 0),
                    savings_latency: payload.savings_latency || 0
                },
                metadata: payload.metadata || {},
                timestamp: new Date(),
                retrievalPath: payload.retrievalPath || null,
                finalScore: payload.finalScore || null,
                retrievalMode: payload.retrievalMode || null,
                queryLengthBucket: payload.queryLengthBucket || null,
                chunkSizeUsed: payload.chunkSizeUsed || null,
                embeddingProfile: payload.embeddingProfile || null,
                savedByCache: payload.savedByCache || 0,
                sdkVersion,
                nodeVersion: process.version
            };

            if (providers && providers.length > 0) {
                providers.forEach(p => {
                    if (p && typeof p.logTelemetry === 'function') {
                        p.logTelemetry(telemetryDoc).catch(() => {});
                    }
                });
            } else {
                const db = MongoConnection.getDb();
                if (db) {
                    db.collection('_manas_telemetry').insertOne(telemetryDoc).catch(() => {});
                }
            }
        } catch (error) {}
    }
}

const Telemetry = new TelemetryManager();
export default Telemetry;
