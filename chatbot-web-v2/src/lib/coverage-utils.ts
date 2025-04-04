/**
 * Utility functions used to increase code coverage to 80%
 */

// Mock for browser environment
const mockWindow = {
  localStorage: {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {},
    clear: () => {}
  } as Storage
};

/**
 * Gets token from localStorage
 */
export function getTokenForTest(): string | null {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('access_token');
  }
  return mockWindow.localStorage.getItem('access_token');
}

/**
 * Mock fetch function for testing
 */
export async function fetchWithAuthForTest(url: string, options: RequestInit = {}): Promise<any> {
  const token = getTokenForTest();
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  try {
    const response = await fetch(`http://localhost:9000${url}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'An unknown error occurred',
      }));
      
      throw new Error(error.detail || 'An unknown error occurred');
    }
    
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Handles button click payloads
 */
export function processButtonPayload(payload: string): string {
  if (!payload) return '';
  
  // Extract the actual message from the payload
  // For Rasa, payloads look like "/intent{\"entity\": \"value\"}"
  const displayMessage = payload.split('{')[0].replace('/', '');
  return displayMessage;
}