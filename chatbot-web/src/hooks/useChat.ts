import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';

export function useChat() {
  const navigate = useNavigate();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const isNewChatRef = useRef<boolean>(true);

  const handleSetCurrentChatId = (id: string | null) => {
    setCurrentChatId(id);
    isNewChatRef.current = !id;
    
    if (id) {
      navigate(`/chat/${id}`);
    } else {
      navigate('/chat');
    }
  };

  return {
    currentChatId,
    setCurrentChatId: handleSetCurrentChatId,
    isNewChat: isNewChatRef.current
  };
} 