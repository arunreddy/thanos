import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './index';
import React from 'react';

describe('ThemeProvider', () => {
  const mockSetItem = vi.fn();
  const mockGetItem = vi.fn();
  
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: mockGetItem,
      setItem: mockSetItem,
    });
    document.documentElement.className = '';
  });

  it('should use system theme by default', () => {
    mockGetItem.mockReturnValue(null);
    render(<ThemeProvider>Test</ThemeProvider>);
    
    expect(mockGetItem).toHaveBeenCalledWith('theme');
    expect(document.documentElement.className).toBe('system');
  });

  it('should use saved theme from localStorage', () => {
    mockGetItem.mockReturnValue('dark');
    render(<ThemeProvider>Test</ThemeProvider>);
    
    expect(mockGetItem).toHaveBeenCalledWith('theme');
    expect(document.documentElement.className).toBe('dark');
  });

  it('should update theme when setTheme is called', () => {
    mockGetItem.mockReturnValue('light');
    
    const TestComponent = () => {
      const { setTheme } = useTheme();
      return <button onClick={() => setTheme('dark')}>Toggle</button>;
    };

    const { getByText } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      getByText('Toggle').click();
    });

    expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.className).toBe('dark');
  });

  it('should save theme to localStorage when changed', () => {
    mockGetItem.mockReturnValue('light');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
  });

  it('should render children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    );

    expect(getByText('Test Child')).toBeTruthy();
  });

  it('should handle all theme types', () => {
    mockGetItem.mockReturnValue('light');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('light');
    });
    expect(document.documentElement.className).toBe('light');

    act(() => {
      result.current.setTheme('dark');
    });
    expect(document.documentElement.className).toBe('dark');

    act(() => {
      result.current.setTheme('system');
    });
    expect(document.documentElement.className).toBe('system');
  });
});
