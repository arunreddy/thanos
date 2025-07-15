import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { useAppContext } from '@/AppContext';
import { 
  getConversations, 
  getConversation, 
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  updateConversation as apiUpdateConversation,
  sendMessage as apiSendMessage,
  newConversation as apiNewConversation
} from '@/lib/api';
import { Conversation } from '@/types';

// Query keys for better cache management
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (userEmail: string) => [...conversationKeys.lists(), userEmail] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

// Hook to get all conversations for the current user
export function useConversations() {
  const { userEmail, isAuthenticated } = useAppContext();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: conversationKeys.list(userEmail || ''),
    queryFn: getConversations,
    enabled: isAuthenticated && !!userEmail,
  });

  // Handle errors with toast notifications
  React.useEffect(() => {
    if (query.error) {
      showToast(`Failed to load conversations: ${query.error.message}`, 'error');
    }
  }, [query.error, showToast]);

  return query;
}

// Hook to get a specific conversation with messages
export function useConversation(conversationId: string | null) {
  const { isAuthenticated } = useAppContext();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: conversationKeys.detail(conversationId || ''),
    queryFn: () => getConversation(conversationId!),
    enabled: isAuthenticated && !!conversationId,
  });

  // Handle errors with toast notifications
  React.useEffect(() => {
    if (query.error) {
      showToast(`Failed to load conversation: ${query.error.message}`, 'error');
    }
  }, [query.error, showToast]);

  return query;
}

// Hook to create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { userEmail } = useAppContext();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: { title: string; topic?: string }) => 
      apiCreateConversation(data),
    onSuccess: (newConversation: Conversation) => {
      // Optimistically update the conversations list
      queryClient.setQueryData(
        conversationKeys.list(userEmail || ''),
        (old: Conversation[] = []) => [newConversation, ...old]
      );
      
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(userEmail || ''),
      });
      
      showToast('Conversation created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to create conversation: ${error.message}`, 'error');
    },
  });
}

// Hook to update a conversation
export function useUpdateConversation() {
  const queryClient = useQueryClient();
  const { userEmail } = useAppContext();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string } }) =>
      apiUpdateConversation(id, data),
    onSuccess: (updatedConversation: Conversation, { id }) => {
      // Update the conversation in the list
      queryClient.setQueryData(
        conversationKeys.list(userEmail || ''),
        (old: Conversation[] = []) =>
          old.map(conv => conv.id === id ? updatedConversation : conv)
      );
      
      // Update the conversation detail cache
      queryClient.setQueryData(
        conversationKeys.detail(id),
        (old: any) => old ? { ...old, ...updatedConversation } : undefined
      );
      
      showToast('Conversation updated successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to update conversation: ${error.message}`, 'error');
    },
  });
}

// Hook to delete a conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { userEmail } = useAppContext();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (conversationId: string) => apiDeleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      // Remove the conversation from the list
      queryClient.setQueryData(
        conversationKeys.list(userEmail || ''),
        (old: Conversation[] = []) =>
          old.filter(conv => conv.id !== conversationId)
      );
      
      // Remove the conversation detail from cache
      queryClient.removeQueries({
        queryKey: conversationKeys.detail(conversationId),
      });
      
      showToast('Conversation deleted successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(`Failed to delete conversation: ${error.message}`, 'error');
    },
  });
}

// Hook to send a message with optimistic updates
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { userEmail } = useAppContext();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: { conversation_id: string; message: string }) =>
      apiSendMessage(data),
    
    // Optimistic update: immediately add user message to UI
    onMutate: async ({ conversation_id, message }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: conversationKeys.detail(conversation_id),
      });

      // Snapshot previous value
      const previousConversation = queryClient.getQueryData(
        conversationKeys.detail(conversation_id)
      );

      // Optimistically update conversation with user message
      const optimisticUserMessage = {
        id: `temp-${Date.now()}`,
        role: 'user' as const,
        content: message,
        created_at: new Date().toISOString(),
        model_used: null,
        intent_name: null,
        confidence_score: null,
        response_time_ms: null,
        buttons: null,
        custom_data: {},
      };

      queryClient.setQueryData(
        conversationKeys.detail(conversation_id),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), optimisticUserMessage],
          };
        }
      );

      return { previousConversation, optimisticUserMessage };
    },

    onSuccess: (response, { conversation_id, message }) => {
      // Replace optimistic user message and add assistant response
      queryClient.setQueryData(
        conversationKeys.detail(conversation_id),
        (old: any) => {
          if (!old) return old;
          
          // Remove optimistic user message
          const messagesWithoutOptimistic = old.messages.filter(
            (msg: any) => !msg.id?.toString().startsWith('temp-')
          );
          
          // Create the real user message (based on what we sent)
          const realUserMessage = {
            id: `user-${Date.now()}`,
            role: 'user' as const,
            content: message,
            created_at: new Date().toISOString(),
            model_used: null,
            intent_name: null,
            confidence_score: null,
            response_time_ms: null,
            buttons: null,
            custom_data: {},
          };

          // Create assistant message from response
          const assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant' as const,
            content: response.message.content,
            created_at: new Date().toISOString(),
            model_used: 'rasa',
            intent_name: null,
            confidence_score: null,
            response_time_ms: null,
            buttons: response.message.buttons || [],
            custom_data: response.message.custom || {},
          };
          
          return {
            ...old,
            messages: [...messagesWithoutOptimistic, realUserMessage, assistantMessage],
          };
        }
      );
      
      // Invalidate conversations list to update message count and preview
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(userEmail || ''),
      });
    },

    onError: (error: Error, { conversation_id }, context) => {
      // Rollback optimistic update on error
      if (context?.previousConversation) {
        queryClient.setQueryData(
          conversationKeys.detail(conversation_id),
          context.previousConversation
        );
      }
      showToast(`Failed to send message: ${error.message}`, 'error');
    },

    onSettled: (_, __, { conversation_id }) => {
      // Always refetch after 3 seconds to ensure consistency
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: conversationKeys.detail(conversation_id),
        });
      }, 3000);
    },
  });
}

// Hook to create a new conversation with a message
export function useNewConversation() {
  const queryClient = useQueryClient();
  const { userEmail } = useAppContext();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: { message: string }) => apiNewConversation(data),
    onSuccess: (response) => {
      // Invalidate conversations list to include the new conversation
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(userEmail || ''),
      });
      
      // If we have a conversation_id, we can pre-cache the conversation details
      if (response.conversation_id) {
        // This will be updated when the conversation is actually selected
        queryClient.invalidateQueries({
          queryKey: conversationKeys.detail(response.conversation_id),
        });
      }
    },
    onError: (error: Error) => {
      showToast(`Failed to start conversation: ${error.message}`, 'error');
    },
  });
}