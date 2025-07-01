import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the child components
vi.mock('@/components/Chat', () => ({
  default: () => <div data-testid="chat">Chat Component</div>
}));

vi.mock('@/components/ChatNew', () => ({
  default: () => <div data-testid="chat-new">ChatNew Component</div>
}));

vi.mock('@/components/help/Help', () => ({
  default: () => <div data-testid="help">Help Component</div>
}));

vi.mock('@/components/help/HelpDetailed', () => ({
  default: () => <div data-testid="help-detailed">HelpDetailed Component</div>
}));

vi.mock('@/components/auth/login', () => ({
  default: () => <div data-testid="login">Login Component</div>
}));

describe('App Component', () => {
  const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(ui, { wrapper: BrowserRouter });
  };

  // test('renders ChatNew component at /new route', () => {
  //   renderWithRouter(<App />, { route: '/new' });
  //   expect(screen.getByTestId('chat-new')).toBeInTheDocument();
  // });

  test('renders Login component at /login route', () => {
    renderWithRouter(<App />, { route: '/login' });
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

});