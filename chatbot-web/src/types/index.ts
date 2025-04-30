export interface Chat {
  id: string;
  title: string;
  updated_at: string;
}

export interface Message {
  role: string;
  content: string;
  buttons?: any[];
}

export interface MessageRequest {
  message: string;
  user_id?: string;
  conversation_id?: string | null;
}

export interface MessageResponse {
  message: Message;
  conversation_id: string;
}

export interface ChatHistory {
  conversation_id: string;
  messages: Message[];
}
