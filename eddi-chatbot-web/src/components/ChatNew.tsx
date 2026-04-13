import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import SideNav from './chat/sidenav';
import { useChat } from '../hooks/useChat';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Database,
  Activity,
  Server,
  Radio,
  RefreshCw,
  ArrowUp,
  Plus,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { newConversation } from '@/lib/api';
import { useAppContext, User } from '@/AppContext';

const CATEGORIES = [
  {
    label: 'Recommend DB',
    icon: Database,
    prompt: 'Recommend a database for ',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    examples: [
      'I need a database for a new microservice, transactional and structured data, ACID compliant, open source',
      'We have a vendor application that needs a database with Microsoft licensing',
      'Recommend a database for structured analytics data, large dataset over 300 GB',
    ],
  },
  {
    label: 'Provision DB',
    icon: Server,
    prompt: 'Provision a new database ',
    color: '#008555',
    bgColor: '#E6F4EF',
    borderColor: '#B3D9CC',
    examples: [
      'Provision a PostgreSQL database for the payments team',
      'Create a new MySQL instance for staging',
      'Set up a MongoDB cluster for analytics',
    ],
  },
  {
    label: 'Health',
    icon: Activity,
    prompt: 'Run a health check on ',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    examples: [
      'Check health of production PostgreSQL cluster',
      'Show me slow queries on the transactions DB',
      'Are there any connection pool issues right now?',
    ],
  },
  {
    label: 'Kafka Assist',
    icon: Radio,
    prompt: 'Help me with Kafka ',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    examples: [
      'How do I create or modify a topic in the Kafka portal?',
      'I need a service account and API key for my Kafka application',
      'How does authentication and authorization work for Kafka?',
      'I have a Kafka integration issue, how do I get help?',
    ],
  },
];

const DEFAULT_EXAMPLES = [
  'Show me slow queries on production',
  'Explore schema for employee database',
  'Check index usage on transactions table',
];

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
    <div className="bg-background text-foreground w-full h-[100vh] flex divide-x divide-border">
      <SideNav
        activeChatId={chatId || currentChatId}
        onSelectChat={setCurrentChatId}
        refreshTrigger={refreshTrigger}
      />
      <div className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #F8FAFB 0%, #FFFFFF 100%)' }}>
        <div className="max-w-[820px] w-full px-6">
          <div className="flex flex-col items-center gap-10">

            {/* Greeting */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: '#E6F4EF', color: '#008555', border: '1px solid #B3D9CC' }}>
                <Sparkles className="w-3 h-3" />
                Database Operations Assistant
              </div>
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1A1E2E', lineHeight: '1.3' }}>
                {getGreeting()}
              </h1>
            </div>

            {/* Input Area */}
            <div className="w-full">
              <div className="relative w-full rounded-2xl bg-white"
                style={{
                  border: '1px solid #DEE2E6',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                }}>
                <textarea
                  ref={textareaRef}
                  className="w-full p-5 pb-16 rounded-2xl bg-transparent resize-none focus:outline-none text-[15px]"
                  style={{ color: '#1A1E2E', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  placeholder="Describe your task, paste a query, or ask a question..."
                  rows={3}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#868E96' }}>
                      <Plus className="w-5 h-5" />
                    </button>
                    {selectedCategory && (() => {
                      const cat = CATEGORIES.find(c => c.label === selectedCategory);
                      if (!cat) return null;
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: cat.bgColor, color: cat.color, border: `1px solid ${cat.borderColor}` }}
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
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#008555' }} />
                    ) : (
                      <button
                        className="p-2.5 rounded-xl transition-all cursor-pointer"
                        style={{
                          background: message.trim() ? '#008555' : '#E9ECEF',
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
                className="p-2 rounded-full transition-colors flex-shrink-0"
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
                      className="flex flex-col items-center gap-2.5 flex-shrink-0 group cursor-pointer"
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-md"
                        style={{
                          background: isSelected ? cat.color : cat.bgColor,
                          border: `1.5px solid ${isSelected ? cat.color : cat.borderColor}`,
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
                className="p-2 rounded-full transition-colors flex-shrink-0"
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
                  const hoverColor = activeCat?.color ?? '#008555';
                  const hoverBg = activeCat?.bgColor ?? '#E6F4EF';
                  const hoverBorder = activeCat?.borderColor ?? '#B3D9CC';
                  return (
                    <button
                      key={prompt}
                      onClick={() => handleExampleClick(prompt)}
                      className="px-5 py-2.5 text-sm rounded-full transition-all cursor-pointer hover:shadow-sm"
                      style={{
                        background: '#FFFFFF',
                        color: '#495057',
                        border: '1px solid #DEE2E6',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = hoverBorder;
                        e.currentTarget.style.color = hoverColor;
                        e.currentTarget.style.background = hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#DEE2E6';
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
