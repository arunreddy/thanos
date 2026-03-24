import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Trash2,
  MoreVertical,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

import { Button } from "../../ui/button";
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
import { useAppContext, User } from "@/AppContext";
import { SystemStatusDot } from "../../StatusIndicator";

interface ChatsListProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  refreshTrigger?: number;
  newlyCreatedChatId?: string | null;
}

// For testing purposes only
export const _testHandleDeleteConfirm = (id: string | null) => {
  if (!id) return false;
  return true;
};

export const _testActiveIdComparison = (
  activeChatId: string | null,
  id: string
) => {
  if (activeChatId === id) return true;
  return false;
};

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

const NAV_ACTIONS = [
  { id: "new", icon: Plus, label: "New Chat", href: "/new" },
  { id: "search", icon: Search, label: "Search" },
  { id: "chats", icon: MessageSquare, label: "Chats" },
  { id: "settings", icon: Settings, label: "Settings" },
];

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const { user, signOut } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setLoadingUser(false);
    }
  }, [user]);

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

  const refreshChatsInBackground = async () => {
    if (isBackgroundLoading) return;
    try {
      setIsBackgroundLoading(true);
      const data = await getConversations();
      setChats(data);
      setError(null);
      if (newlyCreatedChatId && data.length > 0) {
        const newChat = data.find(
          (chat: Chat) => chat.id === newlyCreatedChatId
        );
        if (newChat) {
          setTimeout(() => {
            onSelectChat(newlyCreatedChatId);
          }, 100);
        }
      }
    } catch (err) {
      console.error("Background refresh error:", err);
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

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
    if (!_checkIdExists(id)) return;
    try {
      await deleteConversation(id!);
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== id));
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
    setChatToDelete(null);
  };

  const onLogoutClicked = () => {
    signOut();
    setCurrentUser(null);
  };

  const handleNavAction = (id: string) => {
    if (id === "new") {
      navigate("/new");
    }
    // search, chats, settings can be expanded later
  };

  const userName = currentUser?.name || "Dev User";
  const userEmail = currentUser?.email || "developer@example.com";
  const userInitials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "DU";

  // --- Collapsed sidebar ---
  if (collapsed) {
    return (
      <>
        <motion.div
          initial={{ width: 240 }}
          animate={{ width: 56 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex flex-col items-center border-r h-full py-3 flex-shrink-0"
          style={{ background: '#F0F2F5', borderColor: '#DEE2E6' }}
        >
          {/* Logo + Toggle */}
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded-lg mb-3 transition-colors cursor-pointer"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Expand sidebar"
          >
            <img src="/citizens-logo.png" alt="DB Agentic Ops" className="w-7 h-7" />
          </button>

          {/* Nav action icons */}
          <div className="flex flex-col items-center gap-1">
            {NAV_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleNavAction(action.id)}
                className="p-2.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: '#495057' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                title={action.label}
              >
                <action.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Status dot */}
          <div className="mb-3">
            <SystemStatusDot />
          </div>

          {/* User avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer"
              style={{ background: '#1A1E2E' }}
              title={userName}
            >
              {userInitials}
            </button>
            {showUserMenu && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-white rounded-lg py-1 z-50"
                style={{ border: '1px solid #DEE2E6', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                <button
                  onClick={() => { onLogoutClicked(); setShowUserMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                  style={{ color: '#DC3545' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE8EA'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
          {showUserMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
          )}
        </motion.div>

        <Dialog open={chatToDelete !== null} onOpenChange={(open) => !open && setChatToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Conversation</DialogTitle>
              <DialogDescription>Are you sure you want to delete this conversation? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setChatToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // --- Expanded sidebar ---
  return (
    <>
      <motion.div
        initial={{ width: 56 }}
        animate={{ width: 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex flex-col border-r h-full flex-shrink-0"
        style={{ background: '#F0F2F5', borderColor: '#DEE2E6' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #DEE2E6' }}>
          <div className="flex items-center gap-2.5">
            <img src="/citizens-logo.png" alt="DB Agentic Ops" className="w-7 h-7" />
            <span className="text-sm font-semibold" style={{ color: '#1A1E2E' }}>
              DB Agentic Ops
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: '#868E96' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Actions */}
        <div className="px-3 py-2 flex flex-col gap-0.5">
          {NAV_ACTIONS.map((action) => {
            if (action.href) {
              return (
                <Link
                  key={action.id}
                  to={action.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: '#495057' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <action.icon className="w-[18px] h-[18px]" />
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.id}
                onClick={() => handleNavAction(action.id)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer"
                style={{ color: '#495057' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <action.icon className="w-[18px] h-[18px]" />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* History Section */}
        <div className="px-3 mt-2" style={{ borderTop: '1px solid #DEE2E6' }}>
          <div className="px-3 pt-3 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#ADB5BD' }}>
              History
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-3" style={{ scrollbarWidth: 'thin' }}>
          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-2.5 px-3 rounded-lg">
                  <div className="animate-pulse rounded h-4 w-3/4" style={{ background: '#E9ECEF' }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-6">
              <p className="text-xs" style={{ color: '#DC3545' }}>{error}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                className="space-y-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {chats.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 gap-2"
                  >
                    <MessageSquare className="w-6 h-6" style={{ color: '#CED4DA' }} />
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>No conversations yet</p>
                  </motion.div>
                ) : (
                  chats.map((chat) => (
                    <motion.div
                      layout
                      key={chat.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => {
                        if (activeChatId !== chat.id) {
                          onSelectChat(chat.id);
                        }
                      }}
                      className="group flex justify-between items-center py-2 px-3 cursor-pointer rounded-lg transition-all duration-150"
                      style={{
                        background: activeChatId === chat.id ? '#E6F4EF' : 'transparent',
                        color: activeChatId === chat.id ? '#008555' : '#495057',
                      }}
                      onMouseEnter={(e) => {
                        if (activeChatId !== chat.id) {
                          e.currentTarget.style.background = '#E4E7EB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeChatId !== chat.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span className="text-sm truncate flex-1 font-medium">
                        {chat.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteClick(chat.id, e)}
                        className="ml-1 p-1 rounded transition-colors cursor-pointer"
                        style={{
                          opacity: activeChatId === chat.id ? 1 : 0,
                          color: '#868E96',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#DC3545';
                          e.currentTarget.style.background = 'rgba(220,53,69,0.1)';
                          e.currentTarget.parentElement!.querySelector('button')!.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#868E96';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Status */}
        <div className="px-4 py-2" style={{ borderTop: '1px solid #DEE2E6' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium" style={{ color: '#ADB5BD' }}>System Status</span>
            <SystemStatusDot />
          </div>
        </div>

        {/* User Profile */}
        <div className="px-3 py-3 relative" style={{ borderTop: '1px solid #DEE2E6' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: '#1A1E2E' }}
            >
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#1A1E2E' }}>
                {userName}
              </p>
              <p className="text-[11px] truncate" style={{ color: '#ADB5BD' }}>
                {userEmail}
              </p>
            </div>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1 rounded-lg transition-colors cursor-pointer"
              style={{ color: '#868E96' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              aria-label="User menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {showUserMenu && (
            <div
              className="absolute bottom-full right-3 mb-2 w-40 bg-white rounded-lg py-1 z-50"
              style={{ border: '1px solid #DEE2E6', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <button
                onClick={() => { onLogoutClicked(); setShowUserMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2"
                style={{ color: '#DC3545' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE8EA'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
          {showUserMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
          )}
        </div>
      </motion.div>

      <Dialog open={chatToDelete !== null} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>Are you sure you want to delete this conversation? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChatToDelete(null)} data-testid="cancel-delete-button" aria-label="Cancel deletion">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} data-testid="confirm-delete-button" aria-label="Delete conversation">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SideNav;
