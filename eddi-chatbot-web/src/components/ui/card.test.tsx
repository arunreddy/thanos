import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter, CardAction } from './card';

describe('Card Components', () => {
  test('renders Card component', () => {
    render(<Card data-testid="card">Card Content</Card>);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  test('renders CardHeader component', () => {
    render(<CardHeader data-testid="card-header">Header Content</CardHeader>);
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
  });

  test('renders CardTitle component', () => {
    render(<CardTitle>Card Title</CardTitle>);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  test('renders CardContent component', () => {
    render(<CardContent>Card Content</CardContent>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  test('renders CardDescription component', () => {
    render(<CardDescription>Card Description</CardDescription>);
    expect(screen.getByText('Card Description')).toBeInTheDocument();
  });

  test('renders CardFooter component', () => {
    render(<CardFooter>Card Footer</CardFooter>);
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
  });

  test('renders CardAction component', () => {
    render(<CardAction>Card Action</CardAction>);
    expect(screen.getByText('Card Action')).toBeInTheDocument();
  });

  test('renders CardAction with custom className', () => {
    render(<CardAction className="custom-action-class">Action with Custom Class</CardAction>);
    const action = screen.getByText('Action with Custom Class');
    expect(action).toBeInTheDocument();
    expect(action).toHaveClass('custom-action-class');
  });

  test('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });

  test('renders complete card structure with action', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title with Action</CardTitle>
          <CardDescription>Test Description</CardDescription>
          <CardAction>
            <button>Action Button</button>
          </CardAction>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Test Title with Action')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });
});