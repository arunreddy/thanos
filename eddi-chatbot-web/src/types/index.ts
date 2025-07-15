export interface Chat {
  id: string;
  title: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  topic?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview?: string;
}

export interface Message {
  role: string;
  content: string;
  buttons?: any[];
  custom?: any;
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

export interface CustomForm {
  text: string;
  form_type: "multiselect" | "download" | "execution_plan";
  objects: Record<string, any>;
  file_name: string;
  execution_plan_data?: any; // For execution plan visualization
}