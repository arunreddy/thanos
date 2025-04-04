// src/helpers/test-setup.ts
// Mock global browser objects for tests in Node environment

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  clear: () => {},
  removeItem: (key: string) => {},
  length: 0,
  key: (index: number) => null
};

// Mock fetch
global.fetch = jasmine.createSpy('fetch').and.returnValue(
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  })
);

// Add global objects
(global as any).localStorage = localStorageMock;

// Mock window
(global as any).window = {
  localStorage: localStorageMock
};

// Mock Headers
class MockHeaders {
  private headers: Record<string, string> = {};
  
  constructor(init?: Record<string, string>) {
    if (init) {
      Object.keys(init).forEach(key => {
        this.headers[key] = init[key];
      });
    }
  }
  
  append(name: string, value: string): void {
    this.headers[name] = value;
  }
  
  delete(name: string): void {
    delete this.headers[name];
  }
  
  get(name: string): string | null {
    return this.headers[name] || null;
  }
  
  has(name: string): boolean {
    return name in this.headers;
  }
  
  set(name: string, value: string): void {
    this.headers[name] = value;
  }
  
  forEach(callback: (value: string, name: string) => void): void {
    Object.entries(this.headers).forEach(([key, value]) => {
      callback(value, key);
    });
  }
}

(global as any).Headers = MockHeaders;

// Disable console errors during tests
const originalConsoleError = console.error;
console.error = function() {
  // Uncomment to see errors in test output
  // originalConsoleError.apply(console, arguments as any);
};