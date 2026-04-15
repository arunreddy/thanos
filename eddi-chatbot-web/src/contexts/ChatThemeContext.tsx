import { createContext, useContext, ReactNode } from "react";
import theme, { ChatTheme } from "@/lib/chatThemes";

const ChatThemeContext = createContext<{ theme: ChatTheme }>({ theme });

export function ChatThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ChatThemeContext.Provider value={{ theme }}>
      {children}
    </ChatThemeContext.Provider>
  );
}

export function useChatTheme() {
  return useContext(ChatThemeContext);
}
