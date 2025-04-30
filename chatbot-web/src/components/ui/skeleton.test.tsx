import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import Skeleton from './skeleton';

describe('Skeleton Component', () => {
  test('renders with default classes', () => {
    render(<Skeleton data-testid="skeleton" />);
    
    const skeletonElement = screen.getByTestId('skeleton');
    expect(skeletonElement).toBeInTheDocument();
    expect(skeletonElement).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted/70');
  });

  test('renders with custom className', () => {
    const customClass = 'w-20 h-20 bg-red-500';
    render(<Skeleton className={customClass} data-testid="skeleton" />);
    
    const skeletonElement = screen.getByTestId('skeleton');
    expect(skeletonElement).toBeInTheDocument();
    
    // Check default classes
    expect(skeletonElement).toHaveClass('animate-pulse');
    expect(skeletonElement).toHaveClass('rounded-md');
    
    // Check custom classes
    expect(skeletonElement).toHaveClass('w-20');
    expect(skeletonElement).toHaveClass('h-20');
    expect(skeletonElement).toHaveClass('bg-red-500');
    
    // The bg-muted/70 class is replaced by bg-red-500
    expect(skeletonElement).not.toHaveClass('bg-muted/70');
  });

  test('renders with different dimensions', () => {
    render(
      <>
        <Skeleton className="h-4 w-[250px]" data-testid="skeleton-line" />
        <Skeleton className="h-12 w-12 rounded-full" data-testid="skeleton-avatar" />
        <Skeleton className="h-32 w-full" data-testid="skeleton-card" />
      </>
    );
    
    const lineElement = screen.getByTestId('skeleton-line');
    const avatarElement = screen.getByTestId('skeleton-avatar');
    const cardElement = screen.getByTestId('skeleton-card');
    
    expect(lineElement).toHaveClass('h-4', 'w-[250px]');
    expect(avatarElement).toHaveClass('h-12', 'w-12', 'rounded-full');
    expect(cardElement).toHaveClass('h-32', 'w-full');
  });

  test('combines default and custom classes correctly', () => {
    render(<Skeleton className="custom-class another-class" data-testid="skeleton" />);
    
    const skeletonElement = screen.getByTestId('skeleton');
    
    // Check default classes individually
    expect(skeletonElement).toHaveClass('animate-pulse');
    expect(skeletonElement).toHaveClass('rounded-md');
    expect(skeletonElement).toHaveClass('bg-muted/70');
    
    // Check custom classes individually
    expect(skeletonElement).toHaveClass('custom-class');
    expect(skeletonElement).toHaveClass('another-class');
  });
});
