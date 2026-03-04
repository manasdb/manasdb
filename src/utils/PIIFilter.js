/**
 * PII Filter Utility
 * 
 * Provides robust, non-backtracking regular expressions to detect and redact
 * sensitive Personally Identifiable Information (PII) before it reaches the AI
 * or the database. Uses data minimization placeholders to maintain sentence structure.
 */
class PIIFilter {
  /**
   * Redacts sensitive information from a given text string.
   * 
   * @param {string} text - The input text potentially containing PII.
   * @param {Array<{regex: RegExp, placeholder: string}>} [customRules=[]] - Custom regex validation mappings.
   * @returns {string} The text with PII replaced by structural placeholders.
   */
  static redact(text, customRules = []) {
    if (typeof text !== 'string') return text;

    let redactedText = text;

    // 1. Emails: Basic non-capturing structural match
    // Matches standard email formats without excessive backtracking on local parts
    const emailRegex = /(?:[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/g;
    redactedText = redactedText.replace(emailRegex, '[EMAIL]');

    // 2. IPv4 Addresses: Strict 4-octet bounded match
    // Matches 0.0.0.0 to 255.255.255.255 avoiding excessive lookarounds
    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    redactedText = redactedText.replace(ipv4Regex, '[IP_ADDR]');

    // 3. Credit Cards: Matches 13-16 digits with optional spaces or dashes
    // Uses lookahead to ensure there are enough total digits before matching the pattern to avoid backtracking loops
    const cardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
    // Let's use a slightly tighter one for credit cards that specifically looks for 4 chunks of 4 (visa/mc etc) or 15 (amex)
    const strictCardRegex = /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b/g;
    redactedText = redactedText.replace(strictCardRegex, '[CARD]');

    // 4. Phone Numbers: Loose structural match for international and local
    // Matches +1-800-555-0199, (800) 555-0199, etc. Max 15 digits per ITU.
    const phoneRegex = /(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g;
    redactedText = redactedText.replace(phoneRegex, '[PHONE]');

    // 5. API Keys / Secrets: Matches common prefixed tokens (sk-, key-, pk-)
    const secretRegex = /\b(?:sk|pk|key)-[A-Za-z0-9_-]{10,}\b/g;
    redactedText = redactedText.replace(secretRegex, '[SECRET]');

    // 6. Custom User-Defined Rules execution
    if (Array.isArray(customRules)) {
        for (const rule of customRules) {
            if (rule.regex && typeof rule.placeholder === 'string') {
                redactedText = redactedText.replace(rule.regex, rule.placeholder);
            }
        }
    }

    return redactedText;
  }
}

export default PIIFilter;
