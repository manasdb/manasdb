/**
 * Token Counter and Cost Estimator
 * Uses a lightweight approximation of tokens (approx 4 chars per token for English text)
 * and estimates cost based on internal pricing tables.
 */

const MODEL_PRICING_PER_1M: Record<string, number> = {
    'text-embedding-3-small': 0.02,
    'text-embedding-3-large': 0.13,
    'text-embedding-ada-002': 0.10,
    'gemini-embedding-001': 0.00,
    'local-minilm': 0.00,
    'nomic-embed-text': 0.00
};

export class TokenCounter {
    /**
     * Estimates the number of tokens in a given text.
     */
    static estimateTokens(text: string): number {
        if (!text || typeof text !== 'string') return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Estimates the cost of processing a certain number of tokens for a given model.
     */
    static estimateCost(tokenCount: number, modelName: string): number {
        let pricePer1M = MODEL_PRICING_PER_1M[modelName];
        if (pricePer1M === undefined) {
            pricePer1M = 0.05; 
        }
        return (tokenCount / 1000000) * pricePer1M;
    }
}

export default TokenCounter;
