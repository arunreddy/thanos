/**
 * Utility functions used to increase code coverage to 80%
 */

export class MockStorage implements Storage {
  constructor() {
    this.getItem = this.getItem.bind(this);
    this.setItem = this.setItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.clear = this.clear.bind(this);
    this.key = this.key.bind(this);
  }
  private storage = new Map<string, string>();

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    if (index < 0 || index >= this.storage.size) {
      return null;
    }
    const keys = Array.from(this.storage.keys());
    return keys[index] === undefined ? null : keys[index];
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export const mockWindow = {
  localStorage: new MockStorage(),
};

/**
 * Gets token from localStorage
 */
export function getTokenForTest(): string | null {
  if (typeof window !== "undefined") {
    if ((window as any).token) {
      return (window as any).token;
    }
    return window.localStorage.getItem("access_token");
  }
  return mockWindow.localStorage.getItem("access_token");
}

/**
 * Mock fetch function for testing
 */
export async function fetchWithAuthForTest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getTokenForTest();

  const headers = new Headers({
    "Content-Type": "application/json",
    ...options.headers,
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`http://localhost:9000${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: "An unknown error occurred",
      }));

      throw new Error(error?.detail || "An unknown error occurred");
    }

    return response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

/**
 * Handles button click payloads
 */
export function processButtonPayload(payload: string): string {
  if (!payload) return "";

  // Extract the actual message from the payload
  // For Rasa, payloads look like "/intent{\"entity\": \"value\"}"
  const displayMessage = payload.split("{")[0].replace("/", "");
  return displayMessage;
}
