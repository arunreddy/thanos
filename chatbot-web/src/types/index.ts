export interface Chat {
  id: string;
  title: string;
  updated_at: string;
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
  form_type: "multiselect" | "download";
  objects: Record<string, any>;
  file_name: string;
}