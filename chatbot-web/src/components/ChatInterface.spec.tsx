// src/components/ChatInterface.spec.tsx
import ChatInterface from './ChatInterface';
import * as reactModule from 'react';

// Mock the API methods
import * as api from '@/lib/api';

// Mock useRef implementation
const mockScrollIntoView = jasmine.createSpy('scrollIntoView');
const mockUseRef = {
  current: {
    scrollIntoView: mockScrollIntoView
  }
};

describe('ChatInterface', () => {
  const defaultProps = {
    conversationId: null
  };
  
  beforeEach(() => {
    // Set up spies
    spyOn(api, 'sendMessage').and.returnValue(Promise.resolve({
      conversation_id: '123',
      message: {
        role: 'assistant',
        content: 'Assistant response',
        buttons: []
      }
    }));
    
    spyOn(api, 'getConversation').and.returnValue(Promise.resolve({
      messages: [
        { role: 'user', content: 'User message', created_at: '2023-01-01T12:00:00.000Z' },
        { role: 'assistant', content: 'Assistant response', created_at: '2023-01-01T12:01:00.000Z' }
      ]
    }));
    
    // Mock React hooks
    spyOn(reactModule, 'useRef').and.returnValue(mockUseRef);
    spyOn(reactModule, 'useEffect').and.callFake(cb => cb());
    
    // Reset spies
    mockScrollIntoView.calls.reset();
  });
  
  it('should render empty state for new conversation', () => {
    const component = ChatInterface(defaultProps);
    
    // Check title shows "New Chat"
    const titleElement = component.props.children[0].props.children;
    expect(titleElement.props.children).toBe('New Chat');
  });
  
  it('should load an existing conversation', () => {
    const props = { ...defaultProps, conversationId: '123' };
    const component = ChatInterface(props);
    
    // Check that getConversation was called
    expect(api.getConversation).toHaveBeenCalledWith(123);
    
    // Check title shows "Conversation"
    const titleElement = component.props.children[0].props.children;
    expect(titleElement.props.children).toBe('Conversation');
  });
  
  it('should handle sending a message', async () => {
    const onNewConversation = jasmine.createSpy('onNewConversation');
    const props = { ...defaultProps, onNewConversation };
    
    const component = ChatInterface(props);
    
    // Get the ChatInput component (last child of main component)
    const chatInput = component.props.children[2].props.children;
    
    // Call onSendMessage handler
    await chatInput.props.onSendMessage('Test message');
    
    // Check if sendMessage was called correctly
    expect(api.sendMessage).toHaveBeenCalledWith({
      conversation_id: null,
      message: 'Test message'
    });
    
    // Check if onNewConversation was called with the returned conversation_id
    expect(onNewConversation).toHaveBeenCalledWith('123');
  });
  
  it('should handle button clicks', async () => {
    // This would test the button click handler in a real test environment
  });
  
  it('should handle API errors', async () => {
    // Mock API error
    (api.sendMessage as jasmine.Spy).and.returnValue(Promise.reject(new Error('API error')));
    
    // This would test error handling in a real test environment
  });
  
  it('should extract intent from payload in button click handler', async () => {
    // This would test the payload extraction in a real test environment
  });
});