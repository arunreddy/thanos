import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import ChatInput from './ChatInput';

describe('ChatInput Component', () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  test('renders input and send button', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('button is disabled when input is empty', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('button is disabled when loading', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={true} />);
    
    const button = screen.getByRole('button');
    const textarea = screen.getByPlaceholderText('Type a message...');
    
    expect(button).toBeDisabled();
    expect(textarea).toBeDisabled();
  });

  test('sends message on button click', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText('Type a message...');
    const button = screen.getByRole('button');
    
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
    expect(textarea).toHaveValue('');
  });

  test('sends message on Enter without Shift', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText('Type a message...');
    
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
    expect(textarea).toHaveValue('');
  });

  test('does not send message on Shift+Enter', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText('Type a message...');
    
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Hello world');
  });

  test('does not send empty message', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText('Type a message...');
    
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });
});
