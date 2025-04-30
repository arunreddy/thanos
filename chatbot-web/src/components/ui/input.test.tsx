import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { Input } from './input';

// Mock the cn utility function
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('Input Component', () => {
  test('renders input with base classes', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).toHaveClass(
      'flex',
      'h-9',
      'w-full',
      'rounded-md',
      'border',
      'bg-transparent'
    );
  });

  test('applies additional className when provided', () => {
    render(<Input className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  test('handles different input types', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  test('forwards additional props', () => {
    const placeholder = 'Enter text';
    const onChange = vi.fn();
    
    render(
      <Input
        placeholder={placeholder}
        onChange={onChange}
        data-testid="test-input"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', placeholder);
    expect(input).toHaveAttribute('data-testid', 'test-input');
    
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  test('handles disabled state', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  test('handles aria-invalid state', () => {
    render(<Input aria-invalid={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass(
      'aria-invalid:ring-destructive/20',
      'dark:aria-invalid:ring-destructive/40',
      'aria-invalid:border-destructive'
    );
  });

  test('handles focus state', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    
    input.focus();
    expect(input).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-ring/50');
  });

  test('handles file input type', () => {
    const { container } = render(<Input type="file" />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('file:inline-flex', 'file:border-0');
  });
});
