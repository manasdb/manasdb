export interface CustomPIIRule {
  regex: RegExp;
  placeholder: string;
}

/**
 * PII Filter Utility
 * 
 * Provides robust, non-backtracking regular expressions to detect and redact
 * sensitive Personally Identifiable Information (PII) before it reaches the AI
 * or the database. Uses data minimization placeholders to maintain sentence structure.
 */
export class PIIFilter {
  /**
   * Redacts sensitive information from a given text string.
   */
  static redact(text: string, customRules: CustomPIIRule[] = []): string {
    if (typeof text !== 'string') return text;

    let redactedText = text;

    const emailRegex = /(?:[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/g;
    redactedText = redactedText.replace(emailRegex, '[EMAIL]');

    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    redactedText = redactedText.replace(ipv4Regex, '[IP_ADDR]');

    const strictCardRegex = /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b/g;
    redactedText = redactedText.replace(strictCardRegex, '[CARD]');

    const phoneRegex = /(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g;
    redactedText = redactedText.replace(phoneRegex, '[PHONE]');

    const secretRegex = /\b(?:sk|pk|key)-[A-Za-z0-9_-]{10,}\b/g;
    redactedText = redactedText.replace(secretRegex, '[SECRET]');

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
