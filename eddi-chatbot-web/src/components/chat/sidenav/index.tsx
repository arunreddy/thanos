import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
  MoreVertical,
} from "lucide-react";
import { Link } from "react-router";

import { CATEGORY_STYLES, SHADOWS } from "@/lib/constants";
import theme from "@/lib/chatThemes";

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

function parseChatCategory(title: string): { category: string | null; cleanTitle: string } {
  const m = title?.match(/^\[([^\]]+)\]\s*/);
  if (m && CATEGORY_STYLES[m[1]]) return { category: m[1], cleanTitle: title.slice(m[0].length) };
  return { category: null, cleanTitle: title };
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  // Backend returns UTC timestamps without timezone suffix — ensure they parse as UTC
  const normalized = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(normalized).toLocaleDateString();
}

interface ChatsListProps {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  refreshTrigger?: number;
  newlyCreatedChatId?: string | null;
}

export const _testHandleDeleteConfirm = (id: string | null) => {
  if (!id) return false;
  return true;
};

export const _testActiveIdComparison = (activeChatId: string | null, id: string) => {
  if (activeChatId === id) return true;
  return false;
};

export const _testTryCatch = async (shouldThrow: boolean) => {
  try {
    if (shouldThrow) throw new Error("Test error");
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user, signOut } = useAppContext();

  useEffect(() => {
    if (user) setCurrentUser(user);
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
        const newChat = data.find((chat: Chat) => chat.id === newlyCreatedChatId);
        if (newChat) setTimeout(() => onSelectChat(newlyCreatedChatId), 100);
      }
    } catch (err) {
      console.error("Background refresh error:", err);
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchChats();
  }, [user?.email]);

  useEffect(() => {
    if (!user) fetchChats();
  }, []);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) refreshChatsInBackground();
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
      setChats((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
    setChatToDelete(null);
  };

  const onLogoutClicked = () => {
    signOut();
    setCurrentUser(null);
  };

  // Expand sidebar and optionally activate search
  const expandWithSearch = () => {
    setCollapsed(false);
    setTimeout(() => searchInputRef.current?.focus(), 250);
  };

  const expandSidebar = () => setCollapsed(false);

  const userName = currentUser?.name || "Dev User";
  const userEmail = currentUser?.email || "developer@example.com";
  const userInitials = currentUser
    ? `${currentUser.given_name?.[0] ?? ""}${currentUser.family_name?.[0] ?? ""}`.toUpperCase() || "U"
    : "DU";
  const userAvatarColor = theme.userAvatar.bg;

  // Filter chats by search query
  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => {
        const { cleanTitle } = parseChatCategory(c.title);
        return cleanTitle.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : chats;

  const deleteDialog = (
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
  );

  // ── Collapsed sidebar ──────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <motion.div
          initial={{ width: 260 }}
          animate={{ width: 56 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex flex-col items-center border-r h-full py-3 gap-1 shrink-0"
          style={{ background: theme.sidebar.activeBg, borderColor: theme.sidebar.border }}
        >
          {/* Expand toggle */}
          <button
            onClick={expandSidebar}
            className="p-2 rounded-lg mb-1 transition-colors cursor-pointer"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-5 h-5" style={{ color: '#495057' }} />
          </button>

          {/* New Chat */}
          <Link
            to="/new"
            className="p-2.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: '#495057' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </Link>

          {/* Search → expands sidebar */}
          <button
            onClick={expandWithSearch}
            className="p-2.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: '#495057' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Search conversations"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Chats → expands sidebar */}
          <button
            onClick={expandSidebar}
            className="p-2.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: '#495057' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="View conversations"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className="flex-1" />
          <div className="mb-2"><SystemStatusDot /></div>

          {/* User avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold cursor-pointer shrink-0"
              style={{ background: userAvatarColor, border: '2px solid #fff', boxShadow: SHADOWS.sm }}
              title={userName}
            >
              {userInitials}
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-lg py-1 z-50"
                  style={{ border: `1px solid ${theme.sidebar.border}`, boxShadow: SHADOWS.lg }}>
                  <button
                    onClick={() => { onLogoutClicked(); setShowUserMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
                    style={{ color: '#DC3545' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE8EA'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
        {deleteDialog}
      </>
    );
  }

  // ── Expanded sidebar ───────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ width: 56 }}
        animate={{ width: 268 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex flex-col border-r h-full shrink-0"
        style={{ background: theme.sidebar.activeBg, borderColor: theme.sidebar.border }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${theme.sidebar.border}` }}>
          <div className="flex items-center gap-2.5">
            <img src="/citizens-logo.png" alt="DB Agentic Ops" className="w-7 h-7" />
            <span className="text-sm font-semibold" style={{ color: theme.sidebar.text }}>DB Agentic Ops</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: theme.sidebar.textDim }}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.sidebar.hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <Link
            to="/new"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: theme.sidebar.newChatBg, color: theme.sidebar.newChatText }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2D3348'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = theme.sidebar.newChatBg; }}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Link>
        </div>

        {/* Search bar */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: theme.sidebar.bg, border: `1px solid ${theme.sidebar.border}` }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: theme.sidebar.textDim }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none min-w-0"
              style={{ color: theme.sidebar.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="cursor-pointer shrink-0">
                <X className="w-3.5 h-3.5" style={{ color: theme.sidebar.textDim }} />
              </button>
            )}
          </div>
        </div>

        {/* History label + count */}
        <div className="px-4 pb-1.5 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.sidebar.textDim }}>
            {searchQuery ? `Results (${filteredChats.length})` : `History (${chats.length})`}
          </span>
          {isBackgroundLoading && (
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: theme.sidebar.textDim, borderTopColor: 'transparent' }} />
          )}
        </div>

        {/* Conversation list */}
        <div className="overflow-y-auto flex-1 px-2 pb-2" style={{ scrollbarWidth: 'thin' }}>
          {isLoading ? (
            <div className="space-y-1.5 px-1 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: '#EAEDF0' }}>
                  <div className="w-6 h-6 rounded-md animate-pulse shrink-0" style={{ background: '#DEE2E6' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded-md animate-pulse w-3/4" style={{ background: '#DEE2E6' }} />
                    <div className="h-2.5 rounded-md animate-pulse w-1/2" style={{ background: '#E9ECEF' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 px-3">
              <p className="text-xs text-center" style={{ color: '#DC3545' }}>{error}</p>
              <button onClick={fetchChats}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ background: '#FEE8EA', color: '#DC3545' }}>
                Retry
              </button>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2.5 px-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: theme.sidebar.border }}>
                {searchQuery
                  ? <Search className="w-5 h-5" style={{ color: theme.sidebar.textDim }} />
                  : <MessageSquare className="w-5 h-5" style={{ color: theme.sidebar.textDim }} />}
              </div>
              <p className="text-[13px] font-medium text-center" style={{ color: theme.sidebar.text }}>
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </p>
              <p className="text-[11px] text-center" style={{ color: theme.sidebar.textDim }}>
                {searchQuery ? 'Try a different search term' : 'Start a new chat to get going'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-0.5 pt-0.5">
                {filteredChats.map((chat) => {
                  const { category, cleanTitle } = parseChatCategory(chat.title);
                  const catStyle = category ? CATEGORY_STYLES[category] : null;
                  const CatIcon = catStyle?.icon ?? MessageSquare;
                  const isActive = activeChatId === chat.id;
                  return (
                    <motion.div
                      layout
                      key={chat.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => { if (!isActive) onSelectChat(chat.id); }}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                      style={{
                        background: isActive ? theme.sidebar.activeBg : 'transparent',
                        boxShadow: isActive ? SHADOWS.sm : 'none',
                        border: isActive ? `1px solid ${theme.sidebar.border}` : '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = theme.sidebar.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Category icon */}
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: catStyle?.bg ?? theme.sidebar.border, color: catStyle?.color ?? theme.sidebar.textDim }}
                      >
                        <CatIcon className="w-3 h-3" />
                      </div>

                      {/* Title + timestamp — all on one line */}
                      <div className="flex-1 min-w-0 flex items-baseline gap-1.5 overflow-hidden">
                        <p
                          className="text-[12.5px] font-medium truncate shrink"
                          style={{ color: isActive ? theme.sidebar.text : '#343A40' }}
                        >
                          {cleanTitle || "New Conversation"}
                        </p>
                        {chat.last_message_at && (
                          <span className="text-[10px] shrink-0" style={{ color: theme.sidebar.textDim }}>
                            · {timeAgo(chat.last_message_at)}
                          </span>
                        )}
                      </div>

                      {/* Delete button — inline, visible on hover */}
                      <button
                        onClick={(e) => handleDeleteClick(chat.id, e)}
                        className="p-1 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                        style={{ color: theme.sidebar.textDim }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#DC3545'; e.currentTarget.style.background = 'rgba(220,53,69,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = theme.sidebar.textDim; e.currentTarget.style.background = 'transparent'; }}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer: status + user */}
        <div className="shrink-0" style={{ borderTop: `1px solid ${theme.sidebar.border}` }}>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[11px]" style={{ color: theme.sidebar.textDim }}>System</span>
            <SystemStatusDot />
          </div>

          <div className="px-3 pb-3 relative">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
              style={{ background: theme.sidebar.hoverBg }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: userAvatarColor, border: '2px solid #fff', boxShadow: SHADOWS.sm }}>
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: theme.sidebar.text }}>{userName}</p>
                <p className="text-[10px] truncate" style={{ color: theme.sidebar.textDim }}>{userEmail}</p>
              </div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                style={{ color: theme.sidebar.textDim }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.sidebar.border; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-full right-3 mb-1.5 w-40 bg-white rounded-xl py-1 z-50"
                  style={{ border: `1px solid ${theme.sidebar.border}`, boxShadow: SHADOWS.lg }}>
                  <button
                    onClick={() => { onLogoutClicked(); setShowUserMenu(false); }}
                    className="w-full px-3 py-2.5 text-left text-[13px] flex items-center gap-2.5 transition-colors"
                    style={{ color: '#DC3545' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
      {deleteDialog}
    </>
  );
};

export default SideNav;