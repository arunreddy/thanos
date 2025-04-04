// import ThemeSwitcher from "../../ui/themeSwitcher.tsx";

import { useEffect, useState } from "react";

import Button from "../../ui/button";
import { deleteConversation, getConversations } from "../../../lib/api";
import { Chat } from "../../../types";

interface ChatsListProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

const SideNav: React.FC<ChatsListProps> = ({
  activeChatId,
  onSelectChat,
  onNewChat,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        const data = await getConversations();

        console.log(data);

        setChats(data);
        setError(null);
      } catch (err) {
        setError("Failed to load conversations");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await deleteConversation(id);

      setChats((prevChats) => prevChats.filter((chat) => chat.id !== id));

      if (activeChatId === id) {
        onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  return (
    <div className="w-[300px] flex flex-col gap-4">
      {/* <ThemeSwitcher /> */}

      <div>
        <div className="flex justify-between items-center w-full p-4">
          <h2 className="text-lg font-semibold">Conversations</h2>

          <Button label="New" onClick={() => {}} />
        </div>

        <div>
          {isLoading ? (
            <div className="flex flex-col justify-center py-4 gap-1">
              <div className="animate-pulse h-8 w-full bg-muted"></div>
              <div className="animate-pulse h-8 w-full bg-muted"></div>
              <div className="animate-pulse h-8 w-full bg-muted"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm text-center">{error}</div>
          ) : (
            <div className="mb-4">
              {chats.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  No conversations yet
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`
                  flex justify-between items-center py-2 px-4 cursor-pointer
                  ${
                    activeChatId === chat.id
                      ? "text-primary bg-primary/20"
                      : "hover:bg-primary/10"
                  } 
                `}
                  >
                    <div className="truncate flex-1">
                      <div className="text-sm">{chat.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {/* {format(new Date(chat.updated_at), "MMM d, h:mm a")} */}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="ml-2 text-gray-400 hover:text-red-500"
                      aria-label="Delete conversation"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SideNav;
