/**
 * Utility functions for masking sensitive information in chat messages
 */

/**
 * Masks credentials in database connection strings
 * @param text - The text that may contain connection strings
 * @returns Text with masked credentials
 */
export function maskDatabaseUrls(text: string): string {
  if (!text) return text;

  // Pattern to match database URLs with credentials
  // Matches: protocol://username:password@host:port/database
  const dbUrlPattern = /((?:postgres|postgresql|mysql|mongodb):\/\/)([^:]+):([^@]+)@([^/\s]+)(\/?\S*)/gi;
  
  return text.replace(dbUrlPattern, (_, protocol, username, password, hostAndRest, pathAndQuery) => {
    const maskedUsername = maskString(username);
    const maskedPassword = maskString(password);
    return `${protocol}${maskedUsername}:${maskedPassword}@${hostAndRest}${pathAndQuery}`;
  });
}

/**
 * Masks API keys, tokens, and other sensitive strings
 * @param text - The text that may contain sensitive information
 * @returns Text with masked sensitive information
 */
export function maskApiKeys(text: string): string {
  if (!text) return text;

  let maskedText = text;

  // Mask common API key patterns
  const patterns = [
    // API keys (various formats)
    /\b[A-Za-z0-9]{20,}\b/g,
    // JWT tokens
    /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    // Password fields in JSON
    /"password"\s*:\s*"([^"]+)"/gi,
    // Secret fields in JSON
    /"secret"\s*:\s*"([^"]+)"/gi,
    // Token fields in JSON
    /"token"\s*:\s*"([^"]+)"/gi,
  ];

  patterns.forEach(pattern => {
    maskedText = maskedText.replace(pattern, (match) => {
      if (match.includes(':')) {
        // For JSON patterns, preserve structure but mask value
        return match.replace(/:\s*"[^"]+"/gi, ': "***"');
      }
      return maskString(match);
    });
  });

  return maskedText;
}

/**
 * Masks a string by showing first and last characters with asterisks in between
 * @param str - String to mask
 * @param visibleChars - Number of characters to show at start and end (default: 2)
 * @returns Masked string
 */
export function maskString(str: string, visibleChars: number = 2): string {
  if (!str || str.length <= visibleChars * 2) {
    return '*'.repeat(str.length);
  }

  const start = str.substring(0, visibleChars);
  const end = str.substring(str.length - visibleChars);
  const middle = '*'.repeat(3); // Always use exactly 3 asterisks for consistency
  
  return `${start}${middle}${end}`;
}

/**
 * Comprehensive function to mask all sensitive information
 * @param text - The text to process
 * @returns Text with all sensitive information masked
 */
export function maskSensitiveInfo(text: string): string {
  if (!text) return text;

  let maskedText = text;
  
  // Apply all masking functions
  maskedText = maskDatabaseUrls(maskedText);
  maskedText = maskApiKeys(maskedText);
  
  return maskedText;
}

/**
 * Detects if text contains potentially sensitive information
 * @param text - Text to analyze
 * @returns True if sensitive information is detected
 */
export function containsSensitiveInfo(text: string): boolean {
  if (!text) return false;

  const sensitivePatterns = [
    // Database URLs
    /(postgres|postgresql|mysql|mongodb):\/\/[^:]+:[^@]+@/i,
    // API keys (long alphanumeric strings)
    /\b[A-Za-z0-9]{20,}\b/,
    // JWT tokens
    /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/,
    // Password/secret in JSON
    /"(password|secret|token)"\s*:\s*"[^"]+"/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(text));
}