import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import ThemeSwitcher from './index';

// Mock the useTheme hook
vi.mock('../../layout/themeProvider', () => ({
  useTheme: vi.fn()
}));

import { useTheme } from '../../layout/themeProvider';

describe('ThemeSwitcher Component', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    mockSetTheme.mockClear();
    (useTheme as any).mockReset();
  });

  test.each([
    ['light'],
    ['dark'],
    ['system']
  ])('highlights active %s theme button', (currentTheme) => {
    (useTheme as any).mockReturnValue({
      theme: currentTheme,
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    const buttons = screen.getAllByRole('button');
    const activeButton = screen.getByText(currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1));
    
    expect(activeButton).toHaveClass('bg-primary', 'text-white');
    buttons.forEach(button => {
      if (button !== activeButton) {
        expect(button).toHaveClass('bg-gray-200');
      }
    });
  });

  test.each([
    ['Light', 'light'],
    ['Dark', 'dark'],
    ['System', 'system']
  ])('calls setTheme with %s when clicked', (buttonText, expectedTheme) => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    fireEvent.click(screen.getByText(buttonText));
    expect(mockSetTheme).toHaveBeenCalledWith(expectedTheme);
  });

  test('renders all theme options', () => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  test('applies correct layout classes', () => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    const container = screen.getAllByRole('button')[0].parentElement;
    expect(container).toHaveClass('flex', 'gap-2');
  });

  test('applies consistent button styling', () => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('px-3', 'py-1', 'rounded');
    });
  });
});
