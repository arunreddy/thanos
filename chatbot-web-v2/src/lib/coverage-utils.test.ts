import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTokenForTest,
  fetchWithAuthForTest,
  processButtonPayload,
  mockWindow,
  MockStorage,
} from "./coverage-utils";

// Headers mock
global.Headers = class {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) {
    this.headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
  }
  set(key: string, value: string) {
    this.headers.set(key, value);
  }
  get(key: string) {
    return this.headers.get(key);
  }
} as any;

// Mock fetch for tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("coverage utils", () => {
  const originalConsoleError = console.error;

  beforeEach(async () => {
    console.error = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  describe("getTokenForTest", () => {
    it("should get token from window.token when available", () => {
      (window as any).token = "window-token";
      expect(getTokenForTest()).toBe("window-token");
      expect(window.localStorage.getItem).not.toHaveBeenCalled();
    });

    it("should get token from localStorage when window.token is undefined", () => {
      delete (window as any).token;
      vi.spyOn(window.localStorage, "getItem").mockReturnValue("storage-token");
      expect(getTokenForTest()).toBe("storage-token");
      expect(window.localStorage.getItem).toHaveBeenCalledWith("access_token");
    });

    it("should return null when window is undefined using mockWindow default", () => {
      vi.unstubAllGlobals();
      expect(getTokenForTest()).toBeNull();
    });

    it("should use mockWindow when window is undefined and return custom token", () => {
      // Reset mocks
      vi.unstubAllGlobals();
      vi.clearAllMocks();

      // Ensure window is undefined
      // @ts-ignore
      global.window = undefined;

      // Create a fresh mock storage
      const mockStorage = new MockStorage();
      vi.spyOn(mockStorage, 'getItem').mockReturnValue('mock-token');

      // Override mockWindow's localStorage
      mockWindow.localStorage = mockStorage;

      const result = getTokenForTest();
      expect(result).toBe("mock-token");
      expect(mockWindow.localStorage.getItem).toHaveBeenCalledWith(
        "access_token"
      );
    });

    it("should return null when no token is found in either source", () => {
      delete (window as any).token;
      vi.spyOn(window.localStorage, "getItem").mockReturnValue(null);
      expect(getTokenForTest()).toBeNull();
    });
  });

  describe("fetchWithAuthForTest", () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    it("should make successful API request with default options", async () => {
      const mockResponse = { data: "test" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchWithAuthForTest("/test");
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:9000/test");
      expect(options.method).toBeUndefined();
      expect(options.headers.get("Content-Type")).toBe("application/json");
      expect(options.headers.get("Authorization")).toBeUndefined();
      expect(result).toEqual(mockResponse);
    });

    it("should merge custom headers with defaults", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchWithAuthForTest("/test", {
        headers: { "Custom-Header": "value" },
      });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get("Custom-Header")).toBe("value");
      expect(options.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include auth token when available", async () => {
      // Set up window.localStorage mock
      vi.stubGlobal("window", {
        localStorage: {
          getItem: vi.fn().mockReturnValue("test-token"),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
      });

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: "test" }),
      } as Response);

      await fetchWithAuthForTest("/test");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("should override Content-Type if specified in options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchWithAuthForTest("/test", {
        headers: { "Content-Type": "application/xml" },
      });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get("Content-Type")).toBe("application/xml");
    });

    it("should handle API error with detail", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: "Test error" }),
      });

      await expect(fetchWithAuthForTest("/test")).rejects.toThrow("Test error");
      expect(console.error).toHaveBeenCalledWith(
        "API request failed:",
        expect.any(Error)
      );
    });

    it("should handle API error when json parsing fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error("JSON parse error")),
      });

      await expect(fetchWithAuthForTest("/test")).rejects.toThrow(
        "An unknown error occurred"
      );
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle API error response without detail", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(fetchWithAuthForTest("/test")).rejects.toThrow(
        "An unknown error occurred"
      );
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle API error response with null detail", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: null }),
      });

      await expect(fetchWithAuthForTest("/test")).rejects.toThrow(
        "An unknown error occurred"
      );
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle network error from Promise rejection", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(fetchWithAuthForTest("/test")).rejects.toThrow(
        "Network error"
      );
      expect(console.error).toHaveBeenCalledWith(
        "API request failed:",
        networkError
      );
    });

    it("should preserve other fetch options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await fetchWithAuthForTest("/test", {
        method: "POST",
        body: "test-body",
      });
      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.body).toBe("test-body");
    });
  });

  describe("processButtonPayload", () => {
    it("should return empty string for empty payload", () => {
      expect(processButtonPayload("")).toBe("");
    });

    it("should extract intent from Rasa-style payload", () => {
      expect(processButtonPayload('/intent{"entity": "value"}')).toBe("intent");
    });

    it("should handle payload without JSON part", () => {
      expect(processButtonPayload("/simple_intent")).toBe("simple_intent");
    });

    it("should handle null payload", () => {
      expect(processButtonPayload(null as any)).toBe("");
    });

    it("should handle undefined payload", () => {
      expect(processButtonPayload(undefined as any)).toBe("");
    });

    it("should handle payload with only slash", () => {
      expect(processButtonPayload("/")).toBe("");
    });

    it("should handle complex payloads", () => {
      expect(processButtonPayload('/intent{"entity":"value","another":123}')).toBe("intent");
      expect(processButtonPayload('/multi_part_intent{"data":{}}')).toBe("multi_part_intent");
    });
  });

  describe("mockWindow", () => {
    it("should have all required Storage methods", () => {
      expect(mockWindow.localStorage.getItem).toBeDefined();
      expect(mockWindow.localStorage.setItem).toBeDefined();
      expect(mockWindow.localStorage.removeItem).toBeDefined();
      expect(mockWindow.localStorage.clear).toBeDefined();
    });

    it("should have working getItem function", () => {
      const key = "test-key";
      const value = "test-value";
      mockWindow.localStorage.setItem(key, value);
      expect(mockWindow.localStorage.getItem(key)).toBe(value);
      mockWindow.localStorage.removeItem(key);
      expect(mockWindow.localStorage.getItem(key)).toBeNull();
    });

    it("should have working setItem function", () => {
      const key = "test-key";
      const value = "test-value";
      const setItem = mockWindow.localStorage.setItem;
      expect(() => setItem(key, value)).not.toThrow();
    });

    it("should have working removeItem function", () => {
      const key = "test-key";
      const removeItem = mockWindow.localStorage.removeItem;
      expect(() => removeItem(key)).not.toThrow();
    });

    it("should have working clear function", () => {
      const clear = mockWindow.localStorage.clear;
      expect(() => clear()).not.toThrow();
    });

    it("should maintain Storage interface", () => {
      const storage = mockWindow.localStorage;
      expect(storage).toBeDefined();
      expect(typeof storage.getItem).toBe('function');
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.removeItem).toBe('function');
      expect(typeof storage.clear).toBe('function');
    });
  });
});
