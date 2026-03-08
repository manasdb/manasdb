import MongoConnection from '../core/connection.js';

/**
 * Telemetry Utility
 * 
 * Captures anonymous performance metrics specifically focused on latency and operation success rates.
 * Operates on a "Fire and Forget" basis to avoid blocking main SDK lifecycle events.
 */
class TelemetryManager {
    constructor() {
        this.enabled = true; // Telemetry is ON by default
    }

    /**
     * Starts a high-resolution performance timer using Node's process.hrtime.bigint().
     * @returns {bigint} The current high-resolution nanosecond timestamp.
     */
    startTimer() {
        return process.hrtime.bigint();
    }

    /**
     * Calculates elapsed time since the timer started.
     * @param {bigint} startTime - The start timestamp from `startTimer()`
     * @returns {number} Duration in milliseconds.
     */
    endTimer(startTime) {
        if (!startTime) return 0;
        const diffNs = process.hrtime.bigint() - startTime;
        return Number(diffNs) / 1000000.0;
    }

    /**
     * Asynchronously logs a telemetry event safely to all database providers correctly concurrently.
     * Never throws exceptions back to the main thread.
     * 
     * @param {string} eventName - Standardized name of event
     * @param {Object} payload - Non-PII metadata including project context and duration.
     * @param {Array} providers - Array of BaseProvider extensions like MongoProvider / PostgresProvider.
     */
    async logEvent(eventName, payload, providers = []) {
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
                timestamp: new Date()
            };

            // Polyglot Provider dispatch
            if (providers && providers.length > 0) {
                providers.forEach(p => {
                    if (typeof p.logTelemetry === 'function') {
                        p.logTelemetry(telemetryDoc).catch(() => {});
                    }
                });
            } else {
                // Fallback traditional singleton Mongo route
                const db = MongoConnection.getDb();
                if (db) {
                    db.collection('_manas_telemetry').insertOne(telemetryDoc).catch(() => {});
                }
            }
        } catch (error) {}
    }
}

// Export as Singleton
const Telemetry = new TelemetryManager();
export default Telemetry;
