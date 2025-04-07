import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";

import Button from "../../ui/button";
import { deleteConversation, getConversations } from "../../../lib/api";
import { Chat } from "../../../types";
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
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

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

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(id);
  };

  const handleDeleteConfirm = async () => {
    const id = chatToDelete;
    if (!id) return;

    try {
      await deleteConversation(id);
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== id));

      if (activeChatId === id) {
        onNewChat();
      }
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
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Conversations</h2>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label="New chat"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-4 px-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 data-testid="loading-spinner" className="w-6 h-6 animate-spin" />
              <p className="text-sm mt-2">Loading conversations...</p>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNewChat}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Start a new chat
                    </Button>
                  </motion.div>
                ) : (
                  chats.map((chat) => (
                    <motion.div
                      layout
                      key={chat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => onSelectChat(chat.id)}
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
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: activeChatId === chat.id ? 1 : 0 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={(e) => handleDeleteClick(chat.id, e)}
                        className={`
                        ml-2 p-1 rounded-md transition-colors cursor-pointer
                        ${
                          activeChatId === chat.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }
                        hover:bg-destructive/10 hover:text-destructive
                      `}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
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
