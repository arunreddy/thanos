import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import TopNav from './index';
import { ThemeProvider } from '@/components/layout/themeProvider';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('TopNav Component', () => {
  test('renders with provided title', () => {
    renderWithTheme(<TopNav title="Test Chat" />);
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });

  test('renders default title when null is provided', () => {
    renderWithTheme(<TopNav title={null} />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  test('applies correct styling', () => {
    renderWithTheme(<TopNav title="Test Chat" />);
    const container = screen.getByText('Test Chat').parentElement;
    expect(container).toHaveClass('p-4', 'w-full');
    expect(screen.getByText('Test Chat')).toHaveClass('text-lg', 'font-semibold');
  });
});
