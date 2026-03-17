/**
 * Utility for estimating tokens and calculating financial cost/savings.
 */
class CostCalculator {
    static PRICING_TABLE = {
        'openai': 0.02,
        'text-embedding-3-small': 0.02,
        'gemini': 0.10,
        'gemini-embedding-001': 0.10,
        'ollama': 0.00,
        'nomic-embed-text': 0.00,
        'transformers': 0.00,
        'local-minilm': 0.00
    };

    /**
     * Approximates token count (roughly 4 chars per token for English).
     */
    static estimateTokens(text) {
        if (!text || typeof text !== 'string') return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Calculates the actual cost in USD based on Pricing Table (Feb 2026).
     */
    static calculate(tokens, model) {
        let pricePer1M = this.PRICING_TABLE[model];
        if (pricePer1M === undefined) {
             const key = Object.keys(this.PRICING_TABLE).find(k => model.includes(k));
             pricePer1M = key ? this.PRICING_TABLE[key] : 0.05;
        }
        // Micro-savings sensitivity: perform math at "Price per 1 token" level
        const pricePerToken = pricePer1M / 1000000.0;
        return tokens * pricePerToken;
    }

    /**
     * Estimates what the cost *would* have been.
     */
    static estimateSavings(tokens, model) {
        return this.calculate(tokens, model);
    }

    /**
     * Calculates projected annual savings.
     */
    static calculateProjectedAnnual(monthlySavings) {
        return monthlySavings * 12;
    }

    /**
     * Pre-flight estimation for absorb().
     */
    static estimateAbsorbCost(text, model) {
        const tokens = this.estimateTokens(text);
        const cost = this.calculate(tokens, model);
        return { tokens, costUSD: cost, model };
    }

    /**
     * Pre-flight estimation for recall().
     */
    static estimateRecallCost(query, model) {
        const tokens = this.estimateTokens(query);
        const cost = this.calculate(tokens, model);
        return { tokens, costUSD: cost, model };
    }
}

export default CostCalculator;
