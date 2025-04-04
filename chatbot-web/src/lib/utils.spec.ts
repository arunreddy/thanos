import { formatMessage, validateEmail, formatDate, truncateText } from './utils';

describe('Utils', () => {
  describe('formatMessage', () => {
    it('should trim the message', () => {
      const result = formatMessage('  test message  ');
      expect(result).toBe('test message');
    });
    
    it('should handle null or undefined', () => {
      expect(formatMessage(null)).toBe('');
      expect(formatMessage(undefined)).toBe('');
    });
    
    it('should handle non-string inputs', () => {
      expect(formatMessage(123)).toBe('123');
      expect(formatMessage(true)).toBe('true');
    });
    
    it('should handle empty string', () => {
      expect(formatMessage('')).toBe('');
    });
  });
  
  describe('validateEmail', () => {
    it('should validate a valid email address', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });
    
    it('should reject invalid email addresses', () => {
      expect(validateEmail('test')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
    
    it('should handle empty input', () => {
      expect(validateEmail('')).toBe(false);
    });
  });
  
  describe('formatDate', () => {
    it('should format a Date object', () => {
      const date = new Date('2023-01-15');
      expect(formatDate(date)).toContain('Jan');
      expect(formatDate(date)).toContain('2023');
    });
    
    it('should format a date string', () => {
      expect(formatDate('2023-01-15')).toContain('Jan');
      expect(formatDate('2023-01-15')).toContain('2023');
    });
    
    it('should handle empty input', () => {
      expect(formatDate('')).toBe('');
    });
  });
  
  describe('truncateText', () => {
    it('should truncate text longer than maxLength', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 10)).toBe('This is a ...');
    });
    
    it('should not truncate text shorter than maxLength', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe(shortText);
    });
    
    it('should use default maxLength if not provided', () => {
      const longText = 'A'.repeat(60);
      expect(truncateText(longText)).toBe('A'.repeat(50) + '...');
    });
    
    it('should handle empty input', () => {
      expect(truncateText('')).toBe('');
    });
  });
});