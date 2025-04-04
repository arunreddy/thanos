// src/components/ChatInput.spec.tsx
import ChatInput from './ChatInput';
import * as reactModule from 'react';

describe('ChatInput', () => {
  const defaultProps = {
    onSendMessage: jasmine.createSpy('onSendMessage'),
    isLoading: false
  };
  
  beforeEach(() => {
    defaultProps.onSendMessage.calls.reset();
    
    // Mock React hooks
    spyOn(reactModule, 'useState').and.callFake((initialValue) => [initialValue, jasmine.createSpy('setState')]);
    spyOn(reactModule, 'useRef').and.returnValue({ current: {} });
    spyOn(reactModule, 'useEffect').and.callFake(cb => cb());
  });
  
  it('should render textarea and submit button', () => {
    const component = ChatInput(defaultProps);
    
    // Check the form
    expect(component.type).toBe('form');
    
    // Find textarea
    const textarea = component.props.children[0].props.children;
    expect(textarea.type).toBe('textarea');
    expect(textarea.props.disabled).toBe(false);
    
    // Find button
    const button = component.props.children[1];
    expect(button.type).toBe('button');
    expect(button.props.disabled).toBe(true); // Initially disabled with empty input
  });
  
  it('should handle message input correctly', () => {
    const component = ChatInput(defaultProps);
    
    // Get textarea
    const textarea = component.props.children[0].props.children;
    
    // Simulate text input
    const event = { target: { value: 'Test message' } };
    textarea.props.onChange(event);
    
    // Check that event handler was called (can't check state in this simplified test)
  });
  
  it('should call onSendMessage when form is submitted with non-empty message', () => {
    // Mocking state
    (reactModule.useState as jasmine.Spy).and.returnValue(['Test message', jasmine.createSpy('setMessage')]);
    
    const component = ChatInput(defaultProps);
    
    // Get the form
    const form = component;
    
    // Simulate form submission
    const preventDefaultSpy = jasmine.createSpy('preventDefault');
    const event = { preventDefault: preventDefaultSpy };
    form.props.onSubmit(event);
    
    // Check preventDefault was called
    expect(preventDefaultSpy).toHaveBeenCalled();
    
    // Check onSendMessage was called with the message
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test message');
  });
  
  it('should handle Enter key to submit form', () => {
    const component = ChatInput(defaultProps);
    
    // Get textarea
    const textarea = component.props.children[0].props.children;
    
    // Simulate Enter key press
    const preventDefaultSpy = jasmine.createSpy('preventDefault');
    const event = { 
      key: 'Enter', 
      shiftKey: false,
      preventDefault: preventDefaultSpy 
    };
    
    textarea.props.onKeyDown(event);
    
    // Check preventDefault was called
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
  
  it('should not submit form on Shift+Enter', () => {
    const component = ChatInput(defaultProps);
    
    // Get textarea
    const textarea = component.props.children[0].props.children;
    
    // Simulate Shift+Enter key press
    const preventDefaultSpy = jasmine.createSpy('preventDefault');
    const event = { 
      key: 'Enter', 
      shiftKey: true,
      preventDefault: preventDefaultSpy 
    };
    
    textarea.props.onKeyDown(event);
    
    // Check preventDefault was not called
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
  
  it('should disable input when isLoading is true', () => {
    const props = { ...defaultProps, isLoading: true };
    const component = ChatInput(props);
    
    // Get textarea
    const textarea = component.props.children[0].props.children;
    expect(textarea.props.disabled).toBe(true);
    
    // Get button
    const button = component.props.children[1];
    expect(button.props.disabled).toBe(true);
  });
});