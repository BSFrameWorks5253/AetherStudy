import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ChatMessage } from '../../services/api';
import {
  MessageSquare,
  Hash,
  Send,
  Smile,
  Shield,
  Crown,
  Users,
  Search,
  BookOpen,
  Calculator,
  Briefcase,
  TrendingUp,
  Laptop,
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  topic: string;
  icon: React.ComponentType<{ className?: string }>;
  unread?: number;
}

const DEFAULT_CHANNELS_STD12: Channel[] = [
  {
    id: 'general',
    name: 'general-study-lounge',
    topic: 'Everyday peer study chatter, study routines & revision motivation',
    icon: MessageSquare,
  },
  {
    id: 'accounts',
    name: 'accounts-bk-solutions',
    topic: 'Partnership Final Accounts, Reconstitution, Dissolution & adjustments',
    icon: Calculator,
  },
  {
    id: 'ocm',
    name: 'ocm-case-studies',
    topic: 'Principles of management, business services & consumer rights queries',
    icon: Briefcase,
  },
  {
    id: 'economics',
    name: 'economics-forum',
    topic: 'Micro/Macro economics, demand elasticity & national income concepts',
    icon: TrendingUp,
  },
  {
    id: 'maths',
    name: 'maths-stats-doubts',
    topic: 'Mathematical logic, matrices, calculus & linear regression solving',
    icon: Calculator,
  },
  {
    id: 'it',
    name: 'it-tech-queries',
    topic: 'Advanced web designing, CSS flex, JavaScript & SEO concepts',
    icon: Laptop,
  },
  {
    id: 'english',
    name: 'english-writing-skills',
    topic: 'Expansion of ideas, summary writing, novel questions & poetry',
    icon: BookOpen,
  },
];

const DEFAULT_CHANNELS_GENERAL: Channel[] = [
  {
    id: 'general',
    name: 'general-lounge',
    topic: 'Peer discussion room for study tips and mutual preparation',
    icon: MessageSquare,
  },
  {
    id: 'doubts',
    name: 'curriculum-doubts',
    topic: 'Post homework problems and textbook questions for peer guidance',
    icon: BookOpen,
  },
];

const EMOJI_LIST = ['👍', '❤️', '💡', '🔥', '💯', '🚀', '📚', '✨'];

export const CommunityLounge: React.FC = () => {
  const { currentUser, isSuperAdmin, activeStandard } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const channels = activeStandard === '12' ? DEFAULT_CHANNELS_STD12 : DEFAULT_CHANNELS_GENERAL;
  const currentChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  // Fetch messages for standard & channel
  const loadMessages = async () => {
    try {
      const data = await api.getChatMessages(activeStandard, activeChannelId);
      setMessages(data);
    } catch (e) {
      console.warn('Could not load chat messages:', e);
    }
  };

  useEffect(() => {
    loadMessages();
    // Auto-poll every 3.5 seconds for real-time WhatsApp/Discord experience
    const interval = setInterval(loadMessages, 3500);
    return () => clearInterval(interval);
  }, [activeStandard, activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const newMsg = await api.sendChatMessage({
        standard: activeStandard,
        channelId: activeChannelId,
        senderEmail: currentUser?.email || 'student@example.com',
        senderName: currentUser?.email ? currentUser.email.split('@')[0] : 'Student',
        senderRole: currentUser?.role || 'USER',
        content: textToSend,
      });

      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const updatedReactions = await api.reactToChatMessage(messageId, emoji, activeStandard, activeChannelId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: updatedReactions } : m))
      );
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-text">
      {/* ========================================================
          LEFT: DISCORD / WHATSAPP CHANNEL LIST
      ======================================================== */}
      <div className="w-64 md:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Server / Lounge Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Class {activeStandard} Study Lounge
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Peer Discussion & Doubts
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            Live
          </span>
        </div>

        {/* Channel Search Input */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search channels..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Channel Navigation Links */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Discussion Channels
          </div>

          {filteredChannels.map((channel) => {
            const Icon = channel.icon;
            const isActive = channel.id === activeChannelId;

            return (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center space-x-2 truncate mr-2">
                  <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{channel.name}</span>
                </div>
                <Icon className={`w-3.5 h-3.5 shrink-0 opacity-70 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </button>
            );
          })}
        </div>

        {/* User Presence Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate mr-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold uppercase">
              {currentUser?.email ? currentUser.email[0] : 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.email ? currentUser.email.split('@')[0] : 'Guest'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Online in Std {activeStandard}</span>
              </div>
            </div>
          </div>
          {isSuperAdmin && (
            <span title="Super Admin">
              <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            </span>
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT: DISCORD / WHATSAPP CHAT FEED & INPUT
      ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/50 dark:bg-slate-950">
        {/* Channel Header Bar */}
        <div className="h-14 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2 truncate">
            <Hash className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
            <div className="truncate">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {currentChannel.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentChannel.topic}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Users className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Standard {activeStandard} Peers</span>
            </div>
          </div>
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Welcome Notice Banner */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-1">
              <Hash className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Welcome to #{currentChannel.name}!
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              This is the official peer chatroom for Standard {activeStandard}. Feel free to discuss concepts, exchange notes, and clarify doubts.
            </p>
          </div>

          {/* Messages Feed */}
          {messages.map((msg) => {
            const isMe = msg.senderEmail.toLowerCase() === (currentUser?.email || '').toLowerCase();
            const isMsgSuperAdmin = msg.senderRole === 'SUPER_ADMIN';
            const isMsgAdmin = msg.senderRole === 'ADMIN';

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 group animate-fade-in ${
                  isMe ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* User Avatar */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${
                    isMsgSuperAdmin
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 ring-2 ring-purple-500/20'
                      : isMsgAdmin
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-700'
                      : 'bg-gradient-to-br from-brand-600 to-emerald-600'
                  }`}
                >
                  {msg.senderName ? msg.senderName[0].toUpperCase() : 'U'}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-xl flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Meta Header */}
                  <div className="flex items-center space-x-1.5 mb-1 text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {msg.senderName}
                    </span>

                    {/* Role Badge */}
                    {isMsgSuperAdmin ? (
                      <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-extrabold text-[9px] flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" /> Super Admin
                      </span>
                    ) : isMsgAdmin ? (
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-[9px] flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Faculty
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[9px]">
                        Std {msg.standard}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Reactions Pill Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-black/10 dark:border-white/10">
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                              isMe
                                ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Reaction Emoji Toolbar on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-1.5 py-0.5 shadow-sm">
                    {['👍', '❤️', '💡', '🔥'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform text-xs p-0.5"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box (WhatsApp / Discord style) */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center space-x-2">
            {/* Emoji Quick Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-14 left-0 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex items-center gap-1.5 z-30 animate-fade-in">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 text-base hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${currentChannel.name} (Class ${activeStandard})...`}
              className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-4 py-3 text-xs font-medium border border-transparent focus:border-brand-500 dark:focus:border-brand-500 text-slate-900 dark:text-white outline-none"
            />

            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="p-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-2xl shadow-md shadow-brand-500/20 transition-all shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommunityLounge;
