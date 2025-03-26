// frontend/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Get token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

// Generic fetch function with authorization
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'An unknown error occurred',
    }));
    
    throw new Error(error.detail || 'An unknown error occurred');
  }
  
  return response.json();
}

// Chat APIs
export async function sendMessage(data: { conversation_id: number | null; message: string }) {
  return fetchWithAuth('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getConversations() {
  return fetchWithAuth('/api/chat/conversations');
}

export async function getConversation(id: number) {
  return fetchWithAuth(`/api/chat/conversations/${id}`);
}

export async function deleteConversation(id: number) {
  return fetchWithAuth(`/api/chat/conversations/${id}`, {
    method: 'DELETE',
  });
}