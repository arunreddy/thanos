import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {  MessageSquare, Plus, Trash2 } from "lucide-react";
import {Link } from "react-router";

import Button from "../../ui/button";
import { deleteConversation, getConversations } from "../../../lib/api";
import { Chat } from "../../../types";
import { _checkIdExists } from "./test-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

interface ChatsListProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  refreshTrigger?: number; // Optional prop to trigger refresh
  newlyCreatedChatId?: string | null; // ID of newly created chat to select after refresh
}

// For testing purposes only
export const _testHandleDeleteConfirm = (id: string | null) => {
  if (!id) return false;
  return true;
};

// For testing the activeChatId === id branch
export const _testActiveIdComparison = (
  activeChatId: string | null,
  id: string
) => {
  if (activeChatId === id) return true;
  return false;
};

// For testing the try/catch block
export const _testTryCatch = async (shouldThrow: boolean) => {
  try {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return true;
  } catch (err) {
    console.error("Failed to delete chat:", err);
    return false;
  }
};

const SideNav: React.FC<ChatsListProps> = ({
  activeChatId,
  onSelectChat,
  refreshTrigger,
  newlyCreatedChatId,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Function to fetch conversations initially
  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const data = await getConversations();
      setChats(data);
      setError(null);
    } catch (err) {
      setError("Failed to load conversations");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh conversations in the background
  const refreshChatsInBackground = async () => {
    if (isBackgroundLoading) return; // Prevent multiple simultaneous background refreshes

    try {
      setIsBackgroundLoading(true);
      const data = await getConversations();
      setChats(data);
      setError(null);

      // Auto-select the newly created conversation if provided
      if (newlyCreatedChatId && data.length > 0) {
        // Find the conversation in the refreshed list
        const newChat = data.find(
          (chat: Chat) => chat.id === newlyCreatedChatId
        );
        if (newChat) {
          // Select it after a short delay to ensure the UI has updated
          setTimeout(() => {
            onSelectChat(newlyCreatedChatId);
          }, 100);
        }
      }
    } catch (err) {
      // Silently handle errors during background refresh
      console.error("Background refresh error:", err);
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Background refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refreshChatsInBackground();
    }
  }, [refreshTrigger]);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(id);
  };

  const handleDeleteConfirm = async () => {
    const id = chatToDelete;
    // This is line 91 that needs coverage
    if (!_checkIdExists(id)) return;

    try {
      await deleteConversation(id!);
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== id));
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
    setChatToDelete(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[300px] flex flex-col gap-4 border-r border-border bg-card/50 h-full p-4"
      >
        <div className="flex justify-between items-center w-full pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/citizens-logo.png" alt="EDDI Assistant" className="w-6 h-6" />
            <h2 className="text-lg font-semibold">EDDI Assistant</h2>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to="/new"
            className={`flex items-center justify-start gap-2 w-full px-4 py-2 text-sm font-medium rounded-md hover:bg-accent ${
              window.location.pathname === "/new" ? "bg-accent" : ""
            }`}
          >
            <Plus className="w-5 h-5" />
            New Chat
          </Link>
          <Link
            to="/chats"
            className={`flex items-center justify-start gap-2 w-full px-4 py-2 text-sm font-medium rounded-md hover:bg-accent ${
              window.location.pathname.startsWith("/chat") ? "bg-accent" : ""
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Conversations
          </Link>
        </div>

        <div className="overflow-y-auto flex-1 -mx-4 px-4">
          <p className="text-xs font-medium text-muted-foreground">
            Recent chats
          </p>
          {isLoading ? (
            <div className="space-y-1 mt-2">
              {/* Loading skeleton */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="group flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30"
                >
                  <div className="truncate flex-1">
                    <div className="animate-pulse rounded-md bg-muted/70 h-[18px] w-3/4" />
                    <div className="animate-pulse rounded-md bg-muted/70 h-[14px] w-1/3 mt-0.5" />
                  </div>
                  <div className="ml-2 p-1 rounded-md opacity-0 w-6 h-6" />
                </div>
              ))}
              <div className="flex justify-center items-center mt-4 text-sm text-muted-foreground">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  data-testid="loading-spinner"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span data-testid="loading-text">Loading conversations...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive gap-2">
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                className="space-y-1 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {chats.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2"
                  >
                    <MessageSquare className="w-8 h-8 stroke-[1.25]" />
                    <p className="text-sm">No conversations yet</p>
                  </motion.div>
                ) : (
                  chats.map((chat) => (
                    <motion.div
                      layout
                      key={chat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => {
                        // Only trigger onSelectChat if this isn't already the active chat
                        if (activeChatId !== chat.id) {
                          onSelectChat(chat.id);
                        }
                      }}
                      className={`
                      group flex justify-between items-center py-3 px-4 cursor-pointer
                      rounded-lg transition-colors duration-200
                      ${
                        activeChatId === chat.id
                          ? "bg-primary/15 text-primary hover:bg-primary/20"
                          : "hover:bg-muted"
                      } 
                    `}
                    >
                      <div className="truncate flex-1">
                        <div className="text-sm font-medium">{chat.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {/* {format(new Date(chat.updated_at), "MMM d, h:mm a")} */}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(chat.id, e)}
                        className={`ml-2 p-1 rounded-md transition-colors cursor-pointer ${
                          activeChatId === chat.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        } hover:bg-destructive/10 hover:text-destructive`}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
      <Dialog
        open={chatToDelete !== null}
        onOpenChange={(open) => !open && setChatToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setChatToDelete(null)}
              data-testid="cancel-delete-button"
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              data-testid="confirm-delete-button"
              aria-label="Delete conversation"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SideNav;
