import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import SideNav from './chat/sidenav';
import { useChat } from '../hooks/useChat';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  Plus,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { newConversation } from '@/lib/api';
import { useAppContext, User } from '@/AppContext';
import { CATEGORIES, DEFAULT_EXAMPLES, SHADOWS } from '@/lib/constants';
import theme from '@/lib/chatThemes';

export default function ChatNew() {
  const { chatId } = useParams();
  const { currentChatId, setCurrentChatId } = useChat();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typewriterRef = useRef<number | null>(null);
  const userHasTyped = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppContext();

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Cleanup typewriter on unmount
  useEffect(() => {
    return () => clearTypewriter();
  }, []);

  const onSendMessage = async (msg: string) => {
    if (!msg.trim()) return;
    setIsLoading(true);
    const fullMessage = selectedCategory ? `[${selectedCategory}] ${msg}` : msg;
    const response = await newConversation({ message: fullMessage });
    if (response.conversation_id) {
      setRefreshTrigger((prev) => prev + 1);
      navigate(`/chat/${response.conversation_id}`);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action) {
      setMessage(action);
      onSendMessage(action);
    }
  }, [location.search]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  const clearTypewriter = () => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
  };

  const handleCategoryHover = (prompt: string) => {
    // Don't override if user has manually typed something
    if (userHasTyped.current) return;

    clearTypewriter();
    let i = 0;
    setMessage('');

    typewriterRef.current = window.setInterval(() => {
      if (i < prompt.length) {
        setMessage(prompt.slice(0, i + 1));
        i++;
      } else {
        clearTypewriter();
      }
    }, 30);
  };

  const handleCategoryLeave = () => {
    if (userHasTyped.current) return;

    clearTypewriter();
    setMessage('');
  };

  const handleCategoryClick = (label: string) => {
    clearTypewriter();
    if (selectedCategory === label) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(label);
    }
    textareaRef.current?.focus();
  };

  const handleExampleClick = (prompt: string) => {
    clearTypewriter();
    userHasTyped.current = true;
    setMessage(prompt);
    textareaRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    userHasTyped.current = e.target.value.length > 0;
    // No setIsTyping needed here
  };

  const getGreeting = () => {
    const name = currentUser?.given_name || 'Developer';
    return `Hi ${name}, what do you want to explore?`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(message);
    }
  };

  return (
    <div className="bg-background text-foreground w-full h-screen flex divide-x divide-border">
      <SideNav
        activeChatId={chatId || currentChatId}
        onSelectChat={setCurrentChatId}
        refreshTrigger={refreshTrigger}
      />
      <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(180deg, ${theme.landing.bg} 0%, ${theme.landing.gradientTo} 100%)` }}>
        <div className="max-w-205 w-full px-6">
          <div className="flex flex-col items-center gap-10">

            {/* Greeting */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: theme.landing.badgeBg, color: theme.landing.badgeText, border: `1px solid ${theme.landing.badgeBorder}` }}>
                <Sparkles className="w-3 h-3" />
                Database Operations Assistant
              </div>
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.sidebar.text, lineHeight: '1.3' }}>
                {getGreeting()}
              </h1>
            </div>

            {/* Input Area */}
            <div className="w-full">
              <div className="relative w-full rounded-2xl bg-white"
                style={{
                  border: `1px solid ${theme.input.border}`,
                  boxShadow: SHADOWS.md,
                }}>
                <textarea
                  ref={textareaRef}
                  className="w-full p-5 pb-16 rounded-2xl bg-transparent resize-none focus:outline-none text-[15px]"
                  style={{ color: theme.sidebar.text }}
                  placeholder="Describe your task, paste a query, or ask a question..."
                  rows={3}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: theme.actions.color }}>
                      <Plus className="w-5 h-5" />
                    </button>
                    {selectedCategory && (() => {
                      const cat = CATEGORIES.find(c => c.label === selectedCategory);
                      if (!cat) return null;
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                        >
                          <cat.icon className="w-3.5 h-3.5" />
                          {cat.label}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCategory(null); }}
                            className="ml-0.5 hover:opacity-70 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-3">
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.input.buttonBg }} />
                    ) : (
                      <button
                        className="p-2.5 rounded-xl transition-all cursor-pointer"
                        style={{
                          background: message.trim() ? theme.input.buttonBg : theme.input.border,
                          color: message.trim() ? '#FFFFFF' : '#ADB5BD',
                          boxShadow: message.trim() ? '0 2px 6px rgba(0,133,85,0.3)' : 'none',
                          cursor: message.trim() ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() => onSendMessage(message)}
                        disabled={!message.trim()}
                      >
                        <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Category Buttons */}
            <div className="flex items-center gap-3 w-full overflow-visible">
              <button
                onClick={() => scrollCategories('left')}
                className="p-2 rounded-full transition-colors shrink-0"
                style={{ color: '#ADB5BD' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto overflow-y-visible flex-1 justify-center py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => handleCategoryClick(cat.label)}
                      onMouseEnter={() => handleCategoryHover(cat.prompt)}
                      onMouseLeave={handleCategoryLeave}
                      className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer"
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-md"
                        style={{
                          background: isSelected ? cat.color : cat.bg,
                          border: `1.5px solid ${isSelected ? cat.color : cat.border}`,
                        }}
                      >
                        {isSelected ? (
                          <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                        ) : (
                          <cat.icon
                            className="w-7 h-7 transition-colors"
                            style={{ color: cat.color }}
                          />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium transition-colors"
                        style={{ color: isSelected ? cat.color : '#495057' }}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => scrollCategories('right')}
                className="p-2 rounded-full transition-colors shrink-0"
                style={{ color: '#ADB5BD' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Example Prompts */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm flex items-center gap-2" style={{ color: '#868E96', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                {selectedCategory ? `Try a ${selectedCategory} prompt` : 'Try an example prompt'}
                <RefreshCw className="w-3.5 h-3.5" />
              </span>
              <div className="flex flex-wrap justify-center gap-2.5">
                {(selectedCategory
                  ? CATEGORIES.find(c => c.label === selectedCategory)?.examples ?? DEFAULT_EXAMPLES
                  : DEFAULT_EXAMPLES
                ).map((prompt) => {
                  const activeCat = selectedCategory
                    ? CATEGORIES.find(c => c.label === selectedCategory)
                    : null;
                  const hoverColor = activeCat?.color ?? theme.input.buttonBg;
                  const hoverBg = activeCat?.bg ?? theme.landing.badgeBg;
                  const hoverBorder = activeCat?.border ?? theme.landing.badgeBorder;
                  return (
                    <button
                      key={prompt}
                      onClick={() => handleExampleClick(prompt)}
                      className="px-5 py-2.5 text-sm rounded-full transition-all cursor-pointer hover:shadow-sm"
                      style={{
                        background: '#FFFFFF',
                        color: '#495057',
                        border: `1px solid ${theme.input.border}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = hoverBorder;
                        e.currentTarget.style.color = hoverColor;
                        e.currentTarget.style.background = hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = theme.input.border;
                        e.currentTarget.style.color = '#495057';
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      {prompt}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
