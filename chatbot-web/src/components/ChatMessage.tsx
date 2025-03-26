// src/components/ChatMessage.tsx (updated)
import { format } from 'date-fns';

interface Button {
  title: string;
  payload: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  buttons?: Button[];
  onButtonClick?: (payload: string) => void;
}

export default function ChatMessage({ 
  role, 
  content, 
  timestamp, 
  buttons = [], 
  onButtonClick 
}: ChatMessageProps) {
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
        
        {buttons && buttons.length > 0 && (
          <div className="mt-2 flex flex-col space-y-2">
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => onButtonClick?.(button.payload)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border border-gray-300 text-left"
              >
                {button.title}
              </button>
            ))}
          </div>
        )}
        
        {timestamp && (
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {format(new Date(timestamp), 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
}