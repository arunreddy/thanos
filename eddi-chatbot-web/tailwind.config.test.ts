import { describe, it, expect } from 'vitest';
import config from './tailwind.config';
import type { Config } from 'tailwindcss';

describe('Tailwind Config', () => {
  it('has correct content configuration', () => {
    expect(config.content).toEqual([
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}'
    ]);
  });

  it('has correct theme configuration', () => {
    const typedConfig = config as Config;
    const theme = typedConfig.theme?.extend;
    
    // Ensure theme and its properties exist
    expect(theme).toBeDefined();
    expect(theme?.colors).toBeDefined();
    expect(theme?.fontFamily).toBeDefined();

    // Test colors using type assertion
    const colors = theme!.colors as Record<string, unknown>;
    const expectedColors = [
      'border', 'background', 'foreground',
      'primary', 'secondary', 'muted'
    ];

    expectedColors.forEach(color => {
      expect(colors[color]).toBeDefined();
    });

    // Test font family
    const fontFamily = theme!.fontFamily as Record<string, unknown>;
    expect(fontFamily.poppins).toBeDefined();
    expect(Array.isArray(fontFamily.poppins)).toBe(true);
    expect((fontFamily.poppins as string[])[0]).toBe('var(--font-poppins)');
  });

  it('has correct plugins', () => {
    expect(Array.isArray(config.plugins)).toBe(true);
  });
});
