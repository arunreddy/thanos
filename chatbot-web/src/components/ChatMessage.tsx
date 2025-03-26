// frontend/src/components/ChatMessage.tsx
import { format } from 'date-fns';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[80%] rounded-lg px-4 py-2 
        ${isUser 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-white border border-gray-200 rounded-bl-none'
        }
      `}>
        <div className="whitespace-pre-wrap">{content}</div>
        
        {timestamp && (
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {format(new Date(timestamp), 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
}