// /src/lib/api.spec.ts
import { sendMessage, getConversations, getConversation, deleteConversation } from './api';

describe('API Functions', () => {
  let fetchSpy: jasmine.Spy;
  
  beforeEach(() => {
    fetchSpy = global.fetch as jasmine.Spy;
    fetchSpy.calls.reset();
    
    // Mock successful response
    fetchSpy.and.returnValue(Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    }));
  });
  
  describe('sendMessage', () => {
    it('should call fetch with correct parameters', async () => {
      const data = { conversation_id: 123, message: 'Test message' };
      
      await sendMessage(data);
      
      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching('/api/chat/send'),
        jasmine.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
          headers: jasmine.any(Object)
        })
      );
    });
    
    it('should handle null conversation_id', async () => {
      const data = { conversation_id: null, message: 'Test message' };
      
      await sendMessage(data);
      
      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching('/api/chat/send'),
        jasmine.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
    });
  });
  
  describe('getConversations', () => {
    it('should call fetch with correct parameters', async () => {
      await getConversations();
      
      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching('/api/chat/conversations'),
        jasmine.objectContaining({
          headers: jasmine.any(Object)
        })
      );
    });
  });
  
  describe('getConversation', () => {
    it('should call fetch with correct parameters and conversation ID', async () => {
      const id = 123;
      
      await getConversation(id);
      
      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(`/api/chat/conversations/${id}`),
        jasmine.objectContaining({
          headers: jasmine.any(Object)
        })
      );
    });
  });
  
  describe('deleteConversation', () => {
    it('should call fetch with correct parameters and DELETE method', async () => {
      const id = 123;
      
      await deleteConversation(id);
      
      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(`/api/chat/conversations/${id}`),
        jasmine.objectContaining({
          method: 'DELETE',
          headers: jasmine.any(Object)
        })
      );
    });
  });
  
  describe('Error handling', () => {
    it('should throw an error when response is not ok', async () => {
      // Mock error response
      fetchSpy.and.returnValue(Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Test error' })
      }));
      
      await expectAsync(getConversations()).toBeRejectedWithError('Test error');
    });
    
    it('should handle JSON parse errors in error responses', async () => {
      // Mock error response with JSON parse error
      fetchSpy.and.returnValue(Promise.resolve({
        ok: false,
        json: () => Promise.reject()
      }));
      
      await expectAsync(getConversations()).toBeRejectedWithError('An unknown error occurred');
    });
  });
});