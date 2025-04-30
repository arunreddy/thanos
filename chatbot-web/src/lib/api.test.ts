import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, getConversations, getConversation, deleteConversation } from './api';

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.log to avoid noise in tests
console.log = vi.fn();

describe('API functions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockResponse = { success: true, message: 'Message sent' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const data = {
        conversation_id: 1,
        message: 'Hello, world!',
      };

      const result = await sendMessage(data);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9000/api/chat/send');
      expect(options.method).toBe('POST');
      expect(options.headers instanceof Headers).toBe(true);
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(options.body).toBe(JSON.stringify(data));
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Failed to send message';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: errorMessage }),
      });

      await expect(
        sendMessage({ conversation_id: 1, message: 'test' })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getConversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockConversations = [{ id: 1, title: 'Chat 1' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConversations),
      });

      const result = await getConversations();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9000/api/chat/conversations');
      expect(options.headers instanceof Headers).toBe(true);
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(result).toEqual(mockConversations);
    });
  });

  describe('getConversation', () => {
    it('should fetch a single conversation successfully', async () => {
      const mockConversation = { id: '1', messages: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConversation),
      });

      const result = await getConversation('1');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9000/api/chat/conversations/1');
      expect(options.headers instanceof Headers).toBe(true);
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(result).toEqual(mockConversation);
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation successfully', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await deleteConversation('1');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9000/api/chat/conversations/1');
      expect(options.method).toBe('DELETE');
      expect(options.headers instanceof Headers).toBe(true);
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(getConversations()).rejects.toThrow();
    });

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      await expect(getConversations()).rejects.toThrow('An unknown error occurred');
    });

    it('should handle error response without detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });
      await expect(getConversations()).rejects.toThrow('An unknown error occurred');
    });
  });

  describe('API_URL configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      vi.resetModules();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use default API_URL when env var is not set', async () => {
      delete process.env.VITE_API_URL;
      const { getConversations } = await import('./api');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getConversations();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9000/api/chat/conversations');
    });

    it('should use VITE_API_URL when set', async () => {
      process.env.VITE_API_URL = 'https://api.example.com';
      const { getConversations } = await import('./api');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getConversations();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/api/chat/conversations');
    });
  });
});
