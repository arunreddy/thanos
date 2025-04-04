import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import App from './App';

// Mock the SVG imports properly with default export
vi.mock('./assets/react.svg', () => ({
  default: 'react-logo-mock'
}));

vi.mock('/vite.svg', () => ({
  default: 'vite-logo-mock'
}));

describe('App Component', () => {
  test('renders header text correctly', () => {
    render(<App />);
    expect(screen.getByText('Vite + React')).toBeInTheDocument();
  });

  test('renders both logo links', () => {
    render(<App />);
    
    // Check Vite logo link
    const viteLink = screen.getByRole('link', { name: /vite logo/i });
    expect(viteLink).toBeInTheDocument();
    expect(viteLink).toHaveAttribute('href', 'https://vite.dev');
    expect(viteLink).toHaveAttribute('target', '_blank');
    
    // Check React logo link
    const reactLink = screen.getByRole('link', { name: /react logo/i });
    expect(reactLink).toBeInTheDocument();
    expect(reactLink).toHaveAttribute('href', 'https://react.dev');
    expect(reactLink).toHaveAttribute('target', '_blank');
  });

  test('renders logo images', () => {
    render(<App />);
    
    const viteLogo = screen.getByAltText('Vite logo');
    expect(viteLogo).toBeInTheDocument();
    expect(viteLogo).toHaveClass('logo');
    
    const reactLogo = screen.getByAltText('React logo');
    expect(reactLogo).toBeInTheDocument();
    expect(reactLogo).toHaveClass('logo');
    expect(reactLogo).toHaveClass('react');
  });

  test('increments count when button is clicked', () => {
    render(<App />);
    
    // Initial count should be 0
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('count is 0');
    
    // Click the button and check if count increments
    fireEvent.click(button);
    expect(button).toHaveTextContent('count is 1');
    
    // Click again to ensure it keeps incrementing
    fireEvent.click(button);
    expect(button).toHaveTextContent('count is 2');
  });

  test('renders help text', () => {
    render(<App />);
    expect(screen.getByText(/Edit/i)).toBeInTheDocument();
    expect(screen.getByText(/src\/App.tsx/i)).toBeInTheDocument();
    expect(screen.getByText(/and save to test HMR/i)).toBeInTheDocument();
  });

  test('renders footer text', () => {
    render(<App />);
    expect(screen.getByText('Click on the Vite and React logos to learn more')).toBeInTheDocument();
  });
});