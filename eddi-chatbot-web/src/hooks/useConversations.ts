// Legacy hook - now uses TanStack Query under the hood
// This ensures backward compatibility while providing better caching and state management

import {
  useConversations as useConversationsQuery,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation
} from './useConversationsQuery';
import { Conversation } from '@/types';

export function useConversations() {
  const { data: conversations = [], isLoading: loading, error, refetch } = useConversationsQuery() as {
    data: Conversation[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
  const createMutation = useCreateConversation();
  const updateMutation = useUpdateConversation();
  const deleteMutation = useDeleteConversation();

  const createConversation = async (title: string, topic?: string) => {
    const result = await createMutation.mutateAsync({ title, topic });
    return result;
  };

  const updateConversation = async (id: string, title: string) => {
    const result = await updateMutation.mutateAsync({ id, data: { title } });
    return result;
  };

  const deleteConversation = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    conversations,
    loading,
    error: error?.message || null,
    refetch,
    createConversation,
    updateConversation,
    deleteConversation,
  };
}