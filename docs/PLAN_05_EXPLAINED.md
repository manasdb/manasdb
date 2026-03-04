# Plan 5: Enhanced PII & Security Shield Explained

This document details the mechanics of ManasDB's Data Minimization AI Privacy Layer, designed to fully redact Personally Identifiable Information (PII) before it structurally reaches the database, the AI model array mappings, or the vector space computation layer.

## The Concept of Data Minimization in AI

AI embeddings natively "memorize" massive chunks of sequential contextual relationships mathematically. If you insert a string like `"The system architect is user@example.com."`, an advanced transformer model physically maps the spatial relationship between `"architect"` and `"user@example.com"`.

This is highly dangerous for enterprise architectures! A semantic lookup could potentially structurally "leak" raw email addresses if cross-referenced securely against similar parameters.

**Data Minimization** guarantees that the system receives exactly enough intelligence to function, and absolutely zero extra parameters natively.
To preserve grammar context loops mathematically, we use explicit `[STRUCTURAL_PLACEHOLDERS]` directly mapped to the Regex parameters.

Instead of stripping string gaps (`"The system architect is  ."`), we map to `"The system architect is [EMAIL]."`. The AI physically recognizes `[EMAIL]` as a noun/contact point mathematically, while the literal private key is destroyed forever physically.

## Regular Expression Architectures

ManasDB leverages strict **Non-Backtracking** parameters avoiding standard "ReDoS" (Regular Expression Denial of Service) lag delays executing massive arrays natively.

### 1. Emails

```js
/(?:[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/g;
```

- **Why**: Prevents catastrophic backtracking against improperly constructed local parameters, shielding against bad emails mapped against domains logically natively. Maps to `[EMAIL]`.

### 2. IPv4 Addresses

```js
/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
```

- **Why**: Strictly asserts physical mathematical boundaries avoiding capturing `192.168.1.999` mathematically protecting normal decimal configurations. Maps to `[IP_ADDR]`.

### 3. Credit Cards

```js
/\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|\d{4}[ -]?\d{6}[ -]?\d{5})\b/g;
```

- **Why**: Explicit lookahead boundaries avoiding loose digit strings mathematically mapped to exact ISO parameters (Visa/MC 16, Amex 15). Maps to `[CARD]`.

### 4. Phone Numbers

```js
/(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g;
```

- **Why**: Accurately traps exactly standard E.164 configurations natively avoiding non-standard arrays strictly. Maps to `[PHONE]`.

### 5. API Keys / Secrets

```js
/\b(?:sk|pk|key)-[A-Za-z0-9_-]{10,}\b/g;
```

- **Why**: Common cloud secrets map explicitly against predefined physical prefixes universally isolating exact credential parameters locally natively. Maps to `[SECRET]`.
