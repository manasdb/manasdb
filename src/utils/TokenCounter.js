/**
 * Token Counter and Cost Estimator
 * Uses a lightweight approximation of tokens (approx 4 chars per token for English text)
 * and estimates cost based on internal pricing tables.
 */

// Pricing Table (Cost per 1,000,000 tokens in USD approximate as of early 2024 for embeddings)
const MODEL_PRICING_PER_1M = {
    'text-embedding-3-small': 0.02,
    'text-embedding-3-large': 0.13,
    'text-embedding-ada-002': 0.10,
    'gemini-embedding-001': 0.00, // Gemini embedding is currently very cheap or free
    'local-minilm': 0.00,         // Local models cost 0
    'nomic-embed-text': 0.00      // Local models cost 0
};

class TokenCounter {
    /**
     * Estimates the number of tokens in a given text.
     * @param {string} text - The input text
     * @returns {number} Estimated token count
     */
    static estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        // Basic approximation: 4 characters per token
        return Math.ceil(text.length / 4);
    }

    /**
     * Estimates the cost of processing a certain number of tokens for a given model.
     * @param {number} tokenCount - Number of tokens
     * @param {string} modelName - The model identifier
     * @returns {number} Estimated cost in USD
     */
    static estimateCost(tokenCount, modelName) {
        let pricePer1M = MODEL_PRICING_PER_1M[modelName];
        if (pricePer1M === undefined) {
            // Default to a typical average embedding price if unknown
            pricePer1M = 0.05; 
        }
        return (tokenCount / 1000000) * pricePer1M;
    }
}

export default TokenCounter;
