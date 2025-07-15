import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import { Badge } from './badge';

describe('Badge Component', () => {
  test('renders with default variant', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  test('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>);
    expect(screen.getByText('Secondary Badge')).toBeInTheDocument();
  });

  test('renders with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>);
    expect(screen.getByText('Destructive Badge')).toBeInTheDocument();
  });

  test('renders with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>);
    expect(screen.getByText('Outline Badge')).toBeInTheDocument();
  });
});