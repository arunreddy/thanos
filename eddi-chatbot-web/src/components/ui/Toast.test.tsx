import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from './Toast';

// Test component that uses the toast hook
const TestComponent = () => {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showToast('Warning message', 'warning')}>
        Show Warning
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info
      </button>
      <button onClick={() => showToast('Custom duration', 'info', 1000)}>
        Show Custom Duration
      </button>
      <button onClick={() => showToast('No auto-dismiss', 'info', 0)}>
        Show No Auto-dismiss
      </button>
    </div>
  );
};

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders children without toast provider context', () => {
    render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('throws error when useToast is used outside provider', () => {
    const ThrowingComponent = () => {
      useToast();
      return <div>Should not render</div>;
    };

    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThrowingComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  test('shows success toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    const toast = screen.getByText('Success message').closest('div')?.parentElement;
    expect(toast).toHaveClass('bg-green-100', 'border-green-400', 'text-green-700');
  });

  test('shows error toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error message')).toBeInTheDocument();
    const toast = screen.getByText('Error message').closest('div')?.parentElement;
    expect(toast).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700');
  });

  test('shows warning toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning message')).toBeInTheDocument();
    const toast = screen.getByText('Warning message').closest('div')?.parentElement;
    expect(toast).toHaveClass('bg-yellow-100', 'border-yellow-400', 'text-yellow-700');
  });

  test('shows info toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info message')).toBeInTheDocument();
    const toast = screen.getByText('Info message').closest('div')?.parentElement;
    expect(toast).toHaveClass('bg-blue-100', 'border-blue-400', 'text-blue-700');
  });

  test('shows multiple toasts simultaneously', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  test('removes toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  test('auto-dismisses toast after default duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Fast-forward time by 5000ms (default duration)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Toast should be removed after timeout
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  test('auto-dismisses toast after custom duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Custom Duration'));
    expect(screen.getByText('Custom duration')).toBeInTheDocument();

    // Fast-forward time by 1000ms (custom duration)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Toast should be removed after timeout
    expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
  });

  test('does not auto-dismiss toast when duration is 0', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show No Auto-dismiss'));
    expect(screen.getByText('No auto-dismiss')).toBeInTheDocument();

    // Fast-forward time by a large amount
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Toast should still be there
    expect(screen.getByText('No auto-dismiss')).toBeInTheDocument();
  });

  test('toast container has correct positioning classes', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    
    const toastContainer = screen.getByText('Success message').closest('div')?.parentElement?.parentElement;
    expect(toastContainer).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'space-y-2');
  });

  test('toast has correct structural classes', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    
    const toast = screen.getByText('Success message').closest('div')?.parentElement;
    expect(toast).toHaveClass('max-w-sm', 'px-4', 'py-3', 'border', 'rounded-lg', 'shadow-lg');
  });

  test('close button has correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    
    const closeButton = screen.getByRole('button', { name: '' });
    expect(closeButton).toHaveClass('flex-shrink-0', 'p-1', 'rounded-md');
  });

  test('generates unique IDs for toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Success'));
    
    const toasts = screen.getAllByText('Success message');
    expect(toasts).toHaveLength(2);
    
    // Each toast should have a unique key (we can't directly test the ID, but we can verify they're separate elements)
    expect(toasts[0]).not.toBe(toasts[1]);
  });
});