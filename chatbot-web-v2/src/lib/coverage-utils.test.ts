import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTokenForTest, fetchWithAuthForTest, processButtonPayload } from './coverage-utils';

describe('coverage utils', () => {
  // Mock console.error to prevent error logs during tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  describe('getTokenForTest', () => {
    const mockGetItem = vi.fn();
    
    beforeEach(() => {
      vi.resetModules();
      vi.stubGlobal('window', {
        localStorage: {
          getItem: mockGetItem,
        },
      });
    });

    it('should get token from window.localStorage if available', () => {
      mockGetItem.mockReturnValue('test-token');
      expect(getTokenForTest()).toBe('test-token');
      expect(mockGetItem).toHaveBeenCalledWith('access_token');
    });

    it('should return null when window is undefined', () => {
      vi.unstubAllGlobals();
      expect(getTokenForTest()).toBeNull();
    });

    it('returns null if no token is found', () => {
      // Ensure no token in window or localStorage
      delete (window as any).token;
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
      expect(getTokenForTest()).toBeNull();
    });

    it('returns token from localStorage if window.token is not available', () => {
      // Ensure no window.token but has localStorage token
      delete (window as any).token;
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('test-token-from-storage');
      expect(getTokenForTest()).toBe('test-token-from-storage');
    });

    it('returns window.token if available', () => {
      // Set window.token and ensure it takes precedence
      (window as any).token = 'test-token-from-window';
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('test-token-from-storage');
      expect(getTokenForTest()).toBe('test-token-from-window');
    });
  });

  describe('fetchWithAuthForTest', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    beforeEach(() => {
      // Clear any mocked implementations
      vi.restoreAllMocks();
      // Clear window.token
      delete (window as any).token;
      // Reset localStorage mock
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
    });

    it('should make successful API request', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchWithAuthForTest('/test');
      
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9000/test');
      expect(options.headers instanceof Headers).toBe(true);
      expect(options.headers.get('Content-Type')).toBe('application/json');
      expect(result).toEqual(mockResponse);
    });

    it('should include auth token if available', async () => {
      vi.stubGlobal('window', {
        localStorage: {
          getItem: () => 'test-token',
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchWithAuthForTest('/test');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should handle API error with error detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Test error' }),
      });

      await expect(fetchWithAuthForTest('/test')).rejects.toThrow('Test error');
    });

    it('should handle API error with default message when json parse fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(),
      });

      await expect(fetchWithAuthForTest('/test')).rejects.toThrow('An unknown error occurred');
    });

    it('should handle API error with default message when error has no detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(fetchWithAuthForTest('/test')).rejects.toThrow('An unknown error occurred');
    });

    it('should handle API error with empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(null),
      });

      await expect(fetchWithAuthForTest('/test')).rejects.toThrow('An unknown error occurred');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(fetchWithAuthForTest('/test')).rejects.toThrow(networkError);
    });
  });

  describe('processButtonPayload', () => {
    it('should handle empty payload', () => {
      expect(processButtonPayload('')).toBe('');
    });

    it('should extract message from Rasa-style payload', () => {
      expect(processButtonPayload('/intent{"entity": "value"}')).toBe('intent');
    });

    it('should handle payload without JSON part', () => {
      expect(processButtonPayload('/simple_intent')).toBe('simple_intent');
    });

    it('should handle undefined payload', () => {
      expect(processButtonPayload(undefined as unknown as string)).toBe('');
    });
  });
});
