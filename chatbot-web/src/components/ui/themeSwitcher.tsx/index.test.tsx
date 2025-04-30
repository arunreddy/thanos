import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
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
  ])('shows correct theme icon for %s theme', (currentTheme) => {
    (useTheme as any).mockReturnValue({
      theme: currentTheme,
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    // Check that the correct icon is displayed based on theme
    if (currentTheme === 'light') {
      expect(screen.getByLabelText('Theme switcher')).toBeInTheDocument();
      expect(document.querySelector('.lucide-sun')).toBeInTheDocument();
    } else if (currentTheme === 'dark') {
      expect(screen.getByLabelText('Theme switcher')).toBeInTheDocument();
      expect(document.querySelector('.lucide-moon')).toBeInTheDocument();
    } else {
      expect(screen.getByLabelText('Theme switcher')).toBeInTheDocument();
      expect(document.querySelector('.lucide-monitor')).toBeInTheDocument();
    }
  });

  test.each([
    ['light'],
    ['dark'],
    ['system']
  ])('calls setTheme with %s when option is clicked', (expectedTheme) => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    // First click the dropdown button to open it
    fireEvent.click(screen.getByLabelText('Theme switcher'));
    
    // Then find the option by its icon and text
    let optionButton;
    if (expectedTheme === 'light') {
      optionButton = screen.getByText('Light').closest('button');
    } else if (expectedTheme === 'dark') {
      optionButton = screen.getByText('Dark').closest('button');
    } else {
      optionButton = screen.getByText('System').closest('button');
    }
    
    fireEvent.click(optionButton!);
    expect(mockSetTheme).toHaveBeenCalledWith(expectedTheme);
  });

  test('renders all theme options when dropdown is opened', () => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    // First click the dropdown button to open it
    fireEvent.click(screen.getByLabelText('Theme switcher'));
    
    // Now check for the theme options
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  test('applies correct container classes', () => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    const container = screen.getByLabelText('Theme switcher').parentElement;
    expect(container).toHaveClass('relative');
  });

  test('applies correct button styling', () => {
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    });

    render(<ThemeSwitcher />);
    
    const button = screen.getByLabelText('Theme switcher');
    expect(button).toHaveClass('flex', 'items-center', 'gap-1', 'px-3', 'py-2', 'rounded-md');
  });
});
