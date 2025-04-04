// src/components/ChatMessage.spec.tsx
import ChatMessage from './ChatMessage';
import { format } from 'date-fns';

describe('ChatMessage', () => {
  const defaultProps = {
    role: 'user' as const,
    content: 'Test message',
    timestamp: '2023-01-01T12:00:00.000Z'
  };
  
  beforeEach(() => {
    // Mock date-fns format function
    spyOn(format, 'format').and.returnValue('12:00 PM');
  });
  
  it('should render user message correctly', () => {
    const component = ChatMessage(defaultProps);
    
    expect(component.props.className).toContain('justify-end');
    expect(component.props.children.props.className).toContain('bg-blue-500');
    expect(component.props.children.props.children[0].props.children).toBe('Test message');
  });
  
  it('should render assistant message correctly', () => {
    const props = { ...defaultProps, role: 'assistant' as const };
    const component = ChatMessage(props);
    
    expect(component.props.className).toContain('justify-start');
    expect(component.props.children.props.className).toContain('bg-white');
    expect(component.props.children.props.children[0].props.children).toBe('Test message');
  });
  
  it('should render timestamp when provided', () => {
    const component = ChatMessage(defaultProps);
    
    // Get the timestamp element (3rd child)
    const timestampEl = component.props.children.props.children[2];
    expect(timestampEl).toBeDefined();
    expect(timestampEl.props.className).toContain('text-xs');
    expect(timestampEl.props.children).toBe('12:00 PM');
  });
  
  it('should not render buttons if none provided', () => {
    const component = ChatMessage(defaultProps);
    
    // Get the buttons element (2nd child)
    const buttonsEl = component.props.children.props.children[1];
    expect(buttonsEl).toBeFalsy();
  });
  
  it('should render buttons when provided', () => {
    const props = {
      ...defaultProps,
      buttons: [
        { title: 'Button 1', payload: 'payload1' },
        { title: 'Button 2', payload: 'payload2' }
      ]
    };
    
    const component = ChatMessage(props);
    
    // Get the buttons element (2nd child)
    const buttonsEl = component.props.children.props.children[1];
    expect(buttonsEl).toBeDefined();
    
    // Check if there are 2 buttons
    expect(buttonsEl.props.children.props.children.length).toBe(2);
  });
  
  it('should call onButtonClick when button is clicked', () => {
    const onButtonClick = jasmine.createSpy('onButtonClick');
    const props = {
      ...defaultProps,
      buttons: [{ title: 'Button 1', payload: 'payload1' }],
      onButtonClick
    };
    
    const component = ChatMessage(props);
    
    // Get the button element
    const buttonEl = component.props.children.props.children[1].props.children.props.children[0];
    
    // Simulate click
    buttonEl.props.onClick();
    
    expect(onButtonClick).toHaveBeenCalledWith('payload1');
  });
});