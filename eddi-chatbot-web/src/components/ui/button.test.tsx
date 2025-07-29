import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { Button } from './button';

describe('Button Component', () => {
  test('renders with default variant', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  test('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    expect(screen.getByText('Secondary Button')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByText('Disabled Button')).toBeDisabled();
  });

  test('renders with different sizes', () => {
    render(<Button size="sm">Small Button</Button>);
    expect(screen.getByText('Small Button')).toBeInTheDocument();
  });
});