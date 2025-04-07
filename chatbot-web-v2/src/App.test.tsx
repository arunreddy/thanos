import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import App from './App';

// Mock the child components with props
vi.mock('./components/chat/sidenav/index.tsx', () => ({
  default: ({ activeChatId, onSelectChat, onNewChat }: any) => (
    <div data-testid="sidenav">
      <button onClick={() => onSelectChat('123')} data-testid="select-chat">Select Chat</button>
      <button onClick={() => onSelectChat(null)} data-testid="clear-chat">Clear Selection</button>
      <button onClick={onNewChat} data-testid="new-chat">New Chat</button>
      <span data-testid="active-chat-id">{activeChatId}</span>
    </div>
  )
}));

vi.mock('./components/chat/content/index.tsx', () => ({
  default: ({ chatId, setActiveChatId }: any) => (
    <div data-testid="chat-content">
      <span data-testid="chat-id">{chatId}</span>
      <button onClick={() => setActiveChatId(null)} data-testid="reset-chat">Reset Chat</button>
    </div>
  )
}));

describe('App Component', () => {
  test('renders main layout with correct classes', () => {
    render(<App />);
    const mainContainer = screen.getByTestId('sidenav').parentElement;
    expect(mainContainer).toHaveClass('bg-background', 'text-foreground', 'w-full', 'h-[100vh]', 'flex', 'divide-x', 'divide-border');
  });

  test('renders SideNav and ChatContent components', () => {
    render(<App />);
    expect(screen.getByTestId('sidenav')).toBeInTheDocument();
    expect(screen.getByTestId('chat-content')).toBeInTheDocument();
  });

  test('initializes with no active chat', () => {
    render(<App />);
    expect(screen.getByTestId('active-chat-id').textContent).toBe('');
    expect(screen.getByTestId('chat-id').textContent).toBe('');
  });

  test('handles chat selection', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('select-chat'));
    expect(screen.getByTestId('active-chat-id').textContent).toBe('123');
    expect(screen.getByTestId('chat-id').textContent).toBe('123');
  });

  test('handles chat deselection', () => {
    render(<App />);
    // First select a chat
    fireEvent.click(screen.getByTestId('select-chat'));
    // Then clear the selection
    fireEvent.click(screen.getByTestId('clear-chat'));
    expect(screen.getByTestId('active-chat-id').textContent).toBe('');
    expect(screen.getByTestId('chat-id').textContent).toBe('');
  });

  test('handles chat reset from content', () => {
    render(<App />);
    // First select a chat
    fireEvent.click(screen.getByTestId('select-chat'));
    // Then reset from chat content
    fireEvent.click(screen.getByTestId('reset-chat'));
    expect(screen.getByTestId('active-chat-id').textContent).toBe('');
    expect(screen.getByTestId('chat-id').textContent).toBe('');
  });

  test('handles new chat button click', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('new-chat'));
    // Verify the new chat handler was called (even though it's empty)
    expect(screen.getByTestId('active-chat-id').textContent).toBe('');
  });
});