import { MessageResponse, FeedbackRequest, FeedbackResponse } from "@/types";
import { API_URL } from "./config";

// User context for API calls
let currentUserEmail: string | null = null;

// Set current user for API calls
export function setCurrentUser(userEmail: string | null) {
  currentUserEmail = userEmail;
}

// Get current user email
export function getCurrentUser(): string | null {
  return currentUserEmail;
}

// Retry utility function
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const backoffDelay = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Generic fetch function with user context
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...options.headers,
  });

  // Add user email to headers if available
  if (currentUserEmail) {
    headers.set('X-User-Email', currentUserEmail);
    headers.set('X-User-Id', currentUserEmail);
  }

  // Add demo auth headers for testing pass-through functionality
  // TODO: Replace with actual auth headers from your authentication system
  headers.set('X-Source-Id', 'eddi-chatbot'); // eddi, hoover, and teams are the only valid values
  headers.set('X-Jwt-Token', 'my-jwt-token'); // this is the JWT token for the user
  headers.set('X-User-Role', 'eddi-chatbot-dba'); // this is the role of the user

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for session-based auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: "An unknown error occurred",
    }));

    throw new Error(error.detail || "An unknown error occurred");
  }

  return response.json();
}

// Chat APIs

export async function newConversation(data: {
  message: string;
}) {
  const response = await withRetry(() => fetchWithAuth("/api/chat/new", {
    method: "POST",
    body: JSON.stringify(data),
  }));

  return response as MessageResponse;
}

export async function sendMessage(data: {
  conversation_id: string;
  message: string;
}) {
  console.log("Sending message:", data);
  return withRetry(() => fetchWithAuth("/api/chat/send", {
    method: "POST",
    body: JSON.stringify(data),
  }));
}

export async function getConversations() {
  return fetchWithAuth("/api/chat/conversations");
}

export async function getConversation(id: string) {
  return fetchWithAuth(`/api/chat/conversations/${id}`);
}

export async function deleteConversation(id: string) {
  return fetchWithAuth(`/api/chat/conversations/${id}`, {
    method: "DELETE",
  });
}

// New conversation management APIs
export async function createConversation(data: {
  title: string;
  topic?: string;
}) {
  return fetchWithAuth("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateConversation(id: string, data: {
  title?: string;
  description?: string;
}) {
  return fetchWithAuth(`/api/chat/conversations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Feedback APIs

export async function submitFeedback(
  messageId: string,
  data: FeedbackRequest,
): Promise<FeedbackResponse> {
  return fetchWithAuth(`/api/chat/messages/${messageId}/feedback`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteFeedback(messageId: string): Promise<void> {
  return fetchWithAuth(`/api/chat/messages/${messageId}/feedback`, {
    method: "DELETE",
  });
}
