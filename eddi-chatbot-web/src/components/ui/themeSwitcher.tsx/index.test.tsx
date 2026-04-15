import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ThemeSwitcher from './index';

// Mock the useTheme hook
vi.mock('../../layout/themeProvider', () => ({
  useTheme: vi.fn()
}));

import { useTheme } from '../../layout/themeProvider';

describe('ThemeSwitcher Component', () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReset();
  });

  test('renders dark theme indicator', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn()
    });

    render(<ThemeSwitcher />);
    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(document.querySelector('.lucide-moon')).toBeInTheDocument();
  });

  test('applies correct styling', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn()
    });

    render(<ThemeSwitcher />);
    const container = screen.getByText('dark').closest('div');
    expect(container).toHaveClass('flex', 'items-center');
  });
});
