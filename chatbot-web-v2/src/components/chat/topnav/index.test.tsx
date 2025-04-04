import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import TopNav from './index';

describe('TopNav Component', () => {
  test('renders with provided title', () => {
    render(<TopNav title="Test Chat" />);
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });

  test('renders default title when null is provided', () => {
    render(<TopNav title={null} />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  test('applies correct styling', () => {
    render(<TopNav title="Test Chat" />);
    const container = screen.getByText('Test Chat').parentElement;
    expect(container).toHaveClass('p-4', 'w-full');
    expect(screen.getByText('Test Chat')).toHaveClass('text-lg', 'font-semibold');
  });
});
