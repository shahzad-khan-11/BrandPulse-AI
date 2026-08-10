import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  X, 
  Plus,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Smile,
  Globe,
  Megaphone,
  Lightbulb,
  FileText,
  TrendingDown
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Markdown from './Markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
  actions?: Array<{ label: string; action: string; filter?: string }>;
}

interface AIAssistantProps {
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Widget at the bottom of the left sidebar
export const AIAssistantWidget: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  return (
    <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/10 to-slate-900 border border-indigo-900/35 relative overflow-hidden group shadow-md select-none">
      {/* Corner ambient glow */}
      <div className="absolute -top-6 -right-6 h-12 w-12 rounded-full bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-colors" />
      
      <div className="flex items-center gap-2.5 mb-2 relative z-10">
        <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
          <Bot className="h-4.5 w-4.5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-205">AI Assistant</h4>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">BrandPulse Intelligence</p>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
        Need help with your workspace? Ask me to analyze threats, sentiment or summarize reviews.
      </p>
      
      <button
        onClick={onOpen}
        className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Sparkles className="h-3 w-3" />
        Open AI Assistant
      </button>
    </div>
  );
};

// Resizable right sliding chat panel
export const AIAssistantPanel: React.FC<AIAssistantProps> = ({ brandId, isOpen, onClose }) => {
  const { user } = useAuth();
  
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Morning';
    if (hr >= 12 && hr < 17) return 'Afternoon';
    if (hr >= 17 && hr < 22) return 'Evening';
    return 'Night';
  };

  const getGreetingMessage = () => {
    const firstName = user?.name ? user.name.split(' ')[0] : 'Guest';
    return `Good ${getGreeting()}, ${firstName} 👋\n\nWelcome back.\n\nI'm monitoring your selected brand in real time.\n\nI can help you with:\n\n• Brand reputation\n\n• Latest news\n\n• Risk analysis\n\n• Executive reports\n\n• Market trends\n\n• Competitor monitoring\n\n• Recommendations\n\nAsk me anything about your brand.`;
  };

  const [messages, setMessages] = useState<Message[]>([]);
  
  // Reset chat history when selected brand switches
  useEffect(() => {
    if (user) {
      setMessages([
        {
          role: 'model',
          text: getGreetingMessage()
        }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, user]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  
  const [hasReports, setHasReports] = useState(false);
  const [hasHighRisk, setHasHighRisk] = useState(false);
  const [hasNegativeSentiment, setHasNegativeSentiment] = useState(false);
  const [hasNewMentions, setHasNewMentions] = useState(false);

  // Fetch contextual metrics for suggestions
  useEffect(() => {
    if (!brandId || !isOpen) return;
    
    const fetchContextStats = async () => {
      try {
        const mentionsRes = await api.get(`/mentions/brand/${brandId}?limit=30`);
        if (mentionsRes.data.success) {
          const list = mentionsRes.data.data || [];
          setHasNewMentions(list.length > 0);
          setHasHighRisk(list.some((m: any) => m.priority === 'critical' || m.priority === 'high'));
          setHasNegativeSentiment(
            list.filter((m: any) => m.sentiment === 'negative').length > 
            list.filter((m: any) => m.sentiment === 'positive').length
          );
        }

        const reportsRes = await api.get(`/executive-reports/brand/${brandId}`);
        if (reportsRes.data.success) {
          setHasReports((reportsRes.data.data || []).length > 0);
        }
      } catch (err) {
        console.error('Failed to load stats for assistant suggestions:', err);
      }
    };

    fetchContextStats();
  }, [brandId, isOpen]);

  const handleSuggestionClick = async (promptText: string) => {
    if (loading || !promptText.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: promptText }]);
    setLoading(true);
    
    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));
      
      const res = await api.post('/assistant/chat', {
        brandId,
        message: promptText,
        history: conversationHistory
      });
      
      if (res.data && res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: res.data.response,
            actions: res.data.actions || [],
          }
        ]);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err: any) {
      console.error('Failed to send suggestion to AI Assistant:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unknown database query or connection error';
      setMessages(prev => [
        ...prev,
        { 
          role: 'model', 
          text: `I apologize, but I encountered an error: **${errMsg}**.\n\nPlease verify your workspace contains active brand details, or ensure that your \`GEMINI_API_KEY\` environment variable is configured.` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = () => {
    return [
      {
        id: 'brand_health',
        icon: <BarChart3 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />,
        title: 'Analyze Brand Health',
        desc: 'Review overall brand performance and sentiment.',
        prompt: 'Analyze overall brand health.'
      },
      {
        id: 'trending',
        icon: <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />,
        title: 'Trending Topics',
        desc: 'Find trending discussions affecting the brand.',
        prompt: 'Identify emerging issues.'
      },
      {
        id: 'risks',
        icon: <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${hasHighRisk ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />,
        title: hasHighRisk ? 'Analyze Crisis' : 'Reputation Risks',
        desc: hasHighRisk ? 'Review critical threats in mentions.' : 'Identify potential reputation threats.',
        prompt: hasHighRisk ? 'What are the biggest reputation risks and critical issues right now?' : 'What are the biggest reputation risks?'
      },
      {
        id: 'sentiment',
        icon: hasNegativeSentiment ? (
          <TrendingDown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        ) : (
          <Smile className="h-3.5 w-3.5 text-emerald-450 shrink-0" />
        ),
        title: hasNegativeSentiment ? 'Negative Sentiment' : 'Sentiment Summary',
        desc: hasNegativeSentiment ? 'Detail why negative reviews increased.' : 'Generate a complete sentiment overview.',
        prompt: hasNegativeSentiment 
          ? 'Show negative sentiment trends and summarize customer complaints.' 
          : 'Show positive sentiment highlights and overall sentiment summary.'
      },
      {
        id: 'regional',
        icon: <Globe className="h-3.5 w-3.5 text-teal-400 shrink-0" />,
        title: 'Regional Insights',
        desc: 'Analyze mentions by city and language.',
        prompt: 'Show regional performance and compare brand sentiment across cities.'
      },
      {
        id: 'latest',
        icon: <Megaphone className="h-3.5 w-3.5 text-pink-400 shrink-0" />,
        title: hasNewMentions ? 'New Mentions' : 'Latest Mentions',
        desc: hasNewMentions ? 'Review newly parsed comments.' : 'Summarize the latest monitored mentions.',
        prompt: hasNewMentions ? 'Summarize today\'s latest mentions and list active feedback.' : 'Summarize today\'s latest mentions.'
      },
      {
        id: 'recommendations',
        icon: <Lightbulb className="h-3.5 w-3.5 text-yellow-400 shrink-0" />,
        title: 'AI Action Plan',
        desc: 'Suggest actions to improve brand reputation.',
        prompt: 'Recommend actions to improve brand reputation and management focus.'
      },
      {
        id: 'report',
        icon: <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />,
        title: hasReports ? 'Summarize Report' : 'Executive Report',
        desc: hasReports ? 'Synthesize generated PDF summary.' : 'Create an executive-level summary.',
        prompt: hasReports 
          ? 'Summarize the generated executive report and list main takeaways.' 
          : 'Generate an executive report and strategic action plan.'
      }
    ];
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Resizing mouse listeners
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // Map history format: [{ role: 'user'|'model', text: string }]
      const conversationHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await api.post('/assistant/chat', {
        brandId,
        message: userMessage,
        history: conversationHistory
      });

      if (res.data && res.data.success) {
        window.dispatchEvent(new CustomEvent('refetch-notifications'));
        setMessages(prev => [...prev, { role: 'model', text: res.data.response }]);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err: any) {
      console.error('Failed to send message to AI Assistant:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unknown database query or connection error';
      setMessages(prev => [
        ...prev,
        { 
          role: 'model', 
          text: `I apologize, but I encountered an error: **${errMsg}**.\n\nPlease verify your workspace contains active brand details, or ensure that your \`GEMINI_API_KEY\` environment variable is configured.` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = messages.filter(m => m.role === 'user').length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 z-[9998] theme-modal-overlay backdrop-blur-sm cursor-pointer" 
            onClick={onClose}
          />
          
          {/* Main sliding chat panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
            className="fixed top-0 right-0 h-full z-[9999] theme-surface border-l shadow-2xl flex flex-col relative select-none" style={{ width: `${width}px`, borderColor: 'var(--color-border)' }}
          >
            {/* Resizing handle on the left edge */}
            <div
              onMouseDown={startResizing}
              className="absolute left-0 top-0 w-1.5 h-full cursor-ew-resize hover:bg-indigo-500/25 transition-colors z-50 flex items-center justify-center group"
            >
              <div className="w-[1px] h-12 bg-slate-800 group-hover:bg-indigo-400 group-hover:h-20 transition-all" />
            </div>

            {/* Topbar header */}
            <div className="px-5 h-16 border-b flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/10 relative overflow-hidden shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="absolute top-0 right-0 w-32 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <Bot className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-205">Workspace Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Gemini Context Aware</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                <button
                  onClick={() => {
                    setMessages([
                      {
                        role: 'model',
                        text: getGreetingMessage()
                      }
                    ]);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-100/50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-400 transition-all cursor-pointer flex items-center gap-1"
                  title="Start a new conversation"
                >
                  <Plus className="h-3 w-3" />
                  New Chat
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Close Assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Conversation messages viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 select-text">
              {messages.map((msg, index) => {
                const isModel = msg.role === 'model';
                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 ${isModel ? '' : 'flex-row-reverse'}`}
                  >
                    {/* Role Avatar icon */}
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                      isModel 
                        ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' 
                        : 'bg-purple-500/10 border-purple-500/25 text-purple-400'
                    }`}>
                      {isModel ? <Bot className="h-4 w-4" /> : 'ME'}
                    </div>

                    {/* Chat Bubble card */}
                    <div className={`p-3.5 rounded-2xl max-w-[80%] border ${
                      isModel
                        ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 text-slate-800 dark:text-slate-200'
                    }`}>
                      <Markdown content={msg.text} />
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator state */}
              {loading && (
                <div className="flex items-start gap-3 animate-pulse">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-2xl flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">BrandPulse AI is searching context...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
             </div>

             <AnimatePresence>
               {showSuggestions && !loading && (
                 <motion.div
                   initial={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                   className="border-t bg-slate-50/80 dark:bg-slate-950/20 py-3 select-none shrink-0 overflow-hidden" 
                   style={{ borderColor: 'var(--color-border)' }}
                 >
                   {/* Desktop Suggestion Grid */}
                   <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 px-4 max-h-40 overflow-y-auto custom-scrollbar">
                     {getSuggestions().map((s) => (
                       <button
                         key={s.id}
                         type="button"
                         onClick={() => handleSuggestionClick(s.prompt)}
                         className="p-2.5 bg-slate-100 dark:bg-slate-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/35 rounded-xl text-left transition-all duration-300 group cursor-pointer flex flex-col justify-between shrink-0 min-w-0"
                       >
                         <div className="flex items-center gap-1.5 min-w-0">
                           {s.icon}
                           <span className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 truncate">
                             {s.title}
                           </span>
                         </div>
                         <p className="text-[8px] text-slate-500 group-hover:text-slate-450 mt-1 leading-normal font-bold line-clamp-2">
                           {s.desc}
                         </p>
                       </button>
                     ))}
                   </div>

                   {/* Mobile Scrollable suggestion chips */}
                   <div className="flex sm:hidden overflow-x-auto gap-2 px-4 pb-1 scrollbar-none snap-x snap-mandatory">
                     {getSuggestions().map((s) => (
                       <button
                         key={s.id}
                         type="button"
                         onClick={() => handleSuggestionClick(s.prompt)}
                         className="px-3.5 py-2 bg-slate-100 dark:bg-slate-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/35 rounded-xl text-left transition-all shrink-0 flex items-center gap-2 max-w-[200px] snap-start cursor-pointer"
                       >
                         {s.icon}
                         <div className="min-w-0">
                           <span className="text-[9px] font-black uppercase tracking-wider text-slate-355 block truncate">
                             {s.title}
                           </span>
                           <span className="text-[7px] text-slate-500 block truncate mt-0.5 font-bold">
                             {s.desc}
                           </span>
                         </div>
                       </button>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {/* Input query field form */}
            <form 
              onSubmit={handleSend}
              className="p-4 border-t flex items-center gap-2 shrink-0 bg-slate-50/80 dark:bg-slate-900/10" style={{ borderColor: 'var(--color-border)' }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Ask assistant to summarize threats or marketing campaigns..."
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-9 w-9 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 rounded-xl flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
