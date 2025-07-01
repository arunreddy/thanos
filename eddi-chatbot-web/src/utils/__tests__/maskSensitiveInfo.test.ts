import { describe, it, expect } from 'vitest';
import { 
  maskDatabaseUrls, 
  maskString, 
  maskSensitiveInfo, 
  containsSensitiveInfo 
} from '../maskSensitiveInfo';

describe('maskSensitiveInfo', () => {
  describe('maskDatabaseUrls', () => {
    it('should mask PostgreSQL connection strings', () => {
      const input = 'postgres://username:password123@localhost:5432/mydb';
      const result = maskDatabaseUrls(input);
      expect(result).toBe('postgres://us***me:pa***23@localhost:5432/mydb');
    });

    it('should mask MySQL connection strings', () => {
      const input = 'mysql://admin:secret@db.example.com:3306/database';
      const result = maskDatabaseUrls(input);
      expect(result).toBe('mysql://ad***in:se***et@db.example.com:3306/database');
    });

    it('should mask MongoDB connection strings', () => {
      const input = 'mongodb://user:pass@cluster.mongodb.net:27017/testdb';
      const result = maskDatabaseUrls(input);
      // "user" becomes "****" (4 chars) and "pass" becomes "****" (4 chars) 
      expect(result).toBe('mongodb://****:****@cluster.mongodb.net:27017/testdb');
    });

    it('should handle multiple URLs in text', () => {
      const input = `
        PostgreSQL: postgres://user1:pass1@host1:5432/db1
        MySQL: mysql://user2:pass2@host2:3306/db2
      `;
      const result = maskDatabaseUrls(input);
      expect(result).toContain('us***r1:pa***s1@host1:5432/db1');
      expect(result).toContain('us***r2:pa***s2@host2:3306/db2');
    });

    it('should not modify text without database URLs', () => {
      const input = 'This is just regular text with no sensitive info';
      const result = maskDatabaseUrls(input);
      expect(result).toBe(input);
    });
  });

  describe('maskString', () => {
    it('should mask short strings completely', () => {
      const result = maskString('abc');
      expect(result).toBe('***');
    });

    it('should mask long strings with visible start and end', () => {
      const result = maskString('verylongpassword');
      expect(result).toBe('ve***rd');
    });

    it('should handle custom visible characters', () => {
      const result = maskString('password123', 3);
      expect(result).toBe('pas***123');
    });
  });

  describe('containsSensitiveInfo', () => {
    it('should detect database URLs', () => {
      const text = 'postgres://user:pass@host:5432/db';
      expect(containsSensitiveInfo(text)).toBe(true);
    });

    it('should detect API keys', () => {
      const text = 'API key: abc123def456ghi789jkl012';
      expect(containsSensitiveInfo(text)).toBe(true);
    });

    it('should detect password in JSON', () => {
      const text = '{"password": "mysecret"}';
      expect(containsSensitiveInfo(text)).toBe(true);
    });

    it('should return false for clean text', () => {
      const text = 'This is just normal chat content';
      expect(containsSensitiveInfo(text)).toBe(false);
    });
  });

  describe('maskSensitiveInfo (comprehensive)', () => {
    it('should mask multiple types of sensitive info', () => {
      const input = `
        Database: postgres://admin:secret123@db.server.com:5432/myapp
        API Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
        Config: {"password": "topsecret", "api_key": "abc123def456"}
      `;
      const result = maskSensitiveInfo(input);
      
      expect(result).toContain('ad***in:se***23@db.server.com:5432/myapp');
      expect(result).toContain('ey***J9');
      expect(result).toContain('"password": "***"');
    });
  });
});