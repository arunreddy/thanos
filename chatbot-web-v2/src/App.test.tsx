import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import App from './App';

// Mock the child components
vi.mock('./components/chat/sidenav/index.tsx', () => ({
  default: () => <div data-testid="sidenav">SideNav Mock</div>
}));

vi.mock('./components/chat/content/index.tsx', () => ({
  default: () => <div data-testid="chat-content">ChatContent Mock</div>
}));

describe('App Component', () => {
  test('renders main layout with correct classes', () => {
    render(<App />);
    const mainContainer = screen.getByTestId('sidenav').parentElement;
    expect(mainContainer).toHaveClass('bg-background', 'text-foreground', 'w-full', 'h-[100vh]', 'flex', 'divide-x', 'divide-border');
  });

  test('renders SideNav component', () => {
    render(<App />);
    const sideNav = screen.getByTestId('sidenav');
    expect(sideNav).toBeInTheDocument();
  });

  test('renders ChatContent component', () => {
    render(<App />);
    const chatContent = screen.getByTestId('chat-content');
    expect(chatContent).toBeInTheDocument();
  });
});