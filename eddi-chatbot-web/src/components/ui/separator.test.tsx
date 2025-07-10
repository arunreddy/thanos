import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import { Separator } from './separator';

describe('Separator Component', () => {
  test('renders with default props and classes', () => {
    render(<Separator data-testid="separator" />);
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass('bg-border');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator).toHaveAttribute('data-slot', 'separator');
  });

  test('renders with vertical orientation', () => {
    render(<Separator orientation="vertical" data-testid="separator-vertical" />);
    const separator = screen.getByTestId('separator-vertical');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  test('applies custom className', () => {
    render(<Separator className="custom-separator" data-testid="separator-custom" />);
    expect(screen.getByTestId('separator-custom')).toHaveClass('custom-separator');
  });
});
