/**
 * Utility function to format a message
 * Handles empty strings, null, undefined, and non-string inputs
 */
export function formatMessage(message: any): string {
  if (message === null || message === undefined) {
    return '';
  }
  
  // Convert to string if not already a string
  const stringMessage = typeof message === 'string' ? message : String(message);
  
  return stringMessage.trim();
}

/**
 * Utility function to validate an email address
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Truncate text to a specific length
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}