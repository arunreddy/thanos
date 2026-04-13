// Empty string makes all API calls use relative paths (e.g. /api/chat/send).
// The browser automatically prepends the current domain, so this works on any deployment.
// The VirtualService in EKS routes /api/*, /auth/*, /download/* to the API pod.
// For local dev, vite.config.ts proxies those paths to localhost:48000.
export const API_URL = "";