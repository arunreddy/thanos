import { MessageRequest, MessageResponse, ChatHistory } from "@/types";
// frontend/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Get token from localStorage
// const getToken = () => {
//   if (typeof window !== "undefined") {
//     return localStorage.getItem("access_token");
//   }
//   return null;
// };

// Generic fetch function with authorization
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // const token = getToken();

  const headers = new Headers({
    "Content-Type": "application/json",
    ...options.headers,
  });

  // if (token) {
  //   headers.set('Authorization', `Bearer ${token}`);
  // }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
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
  const response = await fetchWithAuth("/api/chat/new", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response as MessageResponse;
}

export async function sendMessage(data: {
  conversation_id: string;
  message: string;
}) {
  console.log("Sending message:", data);
  return fetchWithAuth("/api/chat/send", {
    method: "POST",
    body: JSON.stringify(data),
  });
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
