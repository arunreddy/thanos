import { useState } from "react";
import ChatContent from "./components/chat/content/index.tsx";
import SideNav from "./components/chat/sidenav/index.tsx";

function App() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <div className="bg-background text-foreground w-full h-[100vh] flex divide-x divide-border">
      <SideNav
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={() => setActiveChatId(null)}
      />

      <ChatContent chatId={activeChatId} setActiveChatId={setActiveChatId} />
    </div>
  );
}

export default App;
