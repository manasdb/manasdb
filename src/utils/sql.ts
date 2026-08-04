/**
 * sql.ts — SQL identifier safety helpers.
 *
 * Use quoteIdentifier() anywhere a table or column name is interpolated
 * into a SQL string. This prevents raw string interpolation from ever
 * silently accepting a malformed or injected identifier.
 *
 * Usage:
 *   `SELECT * FROM ${qi(CollectionNames.DOCUMENTS)} WHERE ...`
 *
 * Rules enforced:
 *   - Must start with a letter or underscore
 *   - Must contain only alphanumeric characters and underscores
 *   - Throws at runtime if a name violates these rules (fail-fast)
 *   - Wraps in double quotes (Postgres-safe, case-preserving)
 */

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates and double-quotes a SQL identifier (table name, column name, etc).
 * Throws if the name contains characters that are not allowed in identifiers.
 */
export function quoteIdentifier(name: string): string {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(
      `[ManasDB] Invalid SQL identifier: "${name}". ` +
      `Identifiers must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    );
  }
  // Escape any embedded double-quotes (standard SQL: "" inside "...")
  return `"${name.replace(/"/g, '""')}"`;
}

/** Shorthand alias — use in template literals for readability */
export const qi = quoteIdentifier;
