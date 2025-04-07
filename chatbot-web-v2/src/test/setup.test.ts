import { describe, it, expect, vi } from 'vitest';
import '../test/setup';

describe('Test Setup', () => {
  it('sets up matchMedia correctly', () => {
    // Setup is already imported at the top

    // Test the matchMedia implementation
    const query = '(prefers-color-scheme: dark)';
    const result = window.matchMedia(query);

    expect(result).toBeDefined();
    expect(result.matches).toBeDefined();
    expect(typeof result.matches).toBe('boolean');
    expect(result.media).toBe(query);
    expect(typeof result.addListener).toBe('function');
    expect(typeof result.removeListener).toBe('function');
    expect(typeof result.addEventListener).toBe('function');
    expect(typeof result.removeEventListener).toBe('function');
    expect(typeof result.dispatchEvent).toBe('function');

    // Test listener functionality
    const listener = vi.fn();
    result.addListener(listener);
    result.removeListener(listener);
    result.addEventListener('change', listener);
    result.removeEventListener('change', listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('sets up resizeTo correctly', () => {
    // Setup is already imported at the top

    // Test the resizeTo implementation
    expect(typeof window.resizeTo).toBe('function');
    expect(() => window.resizeTo(800, 600)).not.toThrow();
  });
});
