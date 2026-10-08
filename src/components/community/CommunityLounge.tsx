import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ChatMessage } from '../../services/api';
import { AuthModal } from '../auth/AuthModal';
import {
  MessageSquare,
  Send,
  Smile,
  Shield,
  Crown,
  Search,
  BookOpen,
  Calculator,
  Briefcase,
  TrendingUp,
  Laptop,
  CheckCheck,
  Lock,
  LogIn,
  ArrowLeft,
  MessageCircle,
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
    name: 'Class 12 Commerce Lounge',
    topic: 'Daily study routines, board tips & group motivation',
    icon: MessageSquare,
  },
  {
    id: 'accounts',
    name: 'Accounts (BK) Doubts & Sums',
    topic: 'Partnership Final Accounts, Balance Sheet & Dissolution',
    icon: Calculator,
  },
  {
    id: 'economics',
    name: 'Economics Discussion',
    topic: 'Micro/Macro, Utility, Elasticity of Demand & Public Finance',
    icon: TrendingUp,
  },
  {
    id: 'maths',
    name: 'Maths & Statistics Help',
    topic: 'Part 1 Calculus & Part 2 Commercial Math & Regression',
    icon: Calculator,
  },
  {
    id: 'ocm',
    name: 'OCM Case Studies & Theory',
    topic: 'Principles of management, marketing & consumer protection',
    icon: Briefcase,
  },
  {
    id: 'it',
    name: 'IT & Web Designing',
    topic: 'Advanced web designing, HTML5/CSS3, SEO & Libre Office',
    icon: Laptop,
  },
  {
    id: 'english',
    name: 'English Writing & Literature',
    topic: 'Novel section, essay writing, comprehension & summary',
    icon: BookOpen,
  },
];

const DEFAULT_CHANNELS_GENERAL: Channel[] = [
  {
    id: 'general',
    name: 'General Study Lounge',
    topic: 'Peer discussion room for study tips and mutual preparation',
    icon: MessageSquare,
  },
  {
    id: 'doubts',
    name: 'Curriculum Doubts',
    topic: 'Post homework problems and textbook questions for peer guidance',
    icon: BookOpen,
  },
];

const EMOJI_LIST = ['👍', '❤️', '💡', '🔥', '💯', '🚀', '📚', '✨', '👏', '🙏'];

// Generates persistent colors for sender names like WhatsApp group chats
const SENDER_COLORS = [
  'text-emerald-600 dark:text-emerald-400',
  'text-sky-600 dark:text-sky-400',
  'text-purple-600 dark:text-purple-400',
  'text-amber-600 dark:text-amber-400',
  'text-rose-600 dark:text-rose-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-teal-600 dark:text-teal-400',
];

const getSenderColor = (name: string): string => {
  if (!name) return SENDER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

export const CommunityLounge: React.FC = () => {
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);

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
    const interval = setInterval(loadMessages, 3500);
    return () => clearInterval(interval);
  }, [activeStandard, activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

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
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    try {
      const updatedReactions = await api.reactToChatMessage(
        msgId,
        emoji,
        activeStandard,
        activeChannelId
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, reactions: updatedReactions } : m))
      );
    } catch (err) {
      console.warn('Could not send emoji reaction:', err);
    }
  };

  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.topic.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] select-text">
      {/* ========================================================
          LEFT: WHATSAPP SIDEBAR (CHATS LIST)
      ======================================================== */}
      <div
        className={`${
          showMobileChat ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-col h-full bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-all`}
      >
        {/* WhatsApp Green Top Header */}
        <div className="p-3.5 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shadow-inner">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Peer Lounge</h2>
              <p className="text-[10px] text-white/80">Class {activeStandard} Commerce Groups</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">
              WhatsApp Mode
            </span>
          </div>
        </div>

        {/* WhatsApp Search Input Bar */}
        <div className="p-2.5 bg-white dark:bg-[#111b21] border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search or start new discussion..."
              className="w-full bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl pl-9 pr-3 py-2 text-xs border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>
        </div>

        {/* Channels / Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredChannels.map((channel) => {
            const Icon = channel.icon;
            const isActive = channel.id === activeChannelId;

            return (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannelId(channel.id);
                  setShowMobileChat(true);
                }}
                className={`w-full flex items-center px-3.5 py-3 text-left transition-colors relative ${
                  isActive
                    ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                    : 'hover:bg-slate-50 dark:hover:bg-[#202c33]/60'
                }`}
              >
                {/* Chat Group Avatar */}
                <div className="relative shrink-0 mr-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xs ${
                      isActive
                        ? 'bg-[#00a884]'
                        : 'bg-slate-400 dark:bg-slate-700 text-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white dark:border-[#111b21]" />
                </div>

                {/* Chat Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {channel.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 ml-1">
                      Std {activeStandard}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {channel.topic}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* WhatsApp Profile / Sign-in Status Footer */}
        <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 truncate mr-2">
            <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
              {currentUser?.email ? currentUser.email[0] : 'G'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.email ? currentUser.email.split('@')[0] : 'Guest Visitor'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-[#25d366]' : 'bg-amber-500'}`} />
                <span>{isAuthenticated ? (isSuperAdmin ? 'Super Admin' : 'Classmate') : 'Read-Only Mode'}</span>
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-2.5 py-1 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-white text-[11px] font-bold shadow-xs transition-all shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT: AUTHENTIC WHATSAPP CONVERSATION PANEL
      ======================================================== */}
      <div
        className={`${
          showMobileChat ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full overflow-hidden relative`}
      >
        {/* WhatsApp Top Chat Header Bar */}
        <div className="h-14 px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center space-x-3 truncate">
            {/* Mobile Back to Chat List Button */}
            <button
              onClick={() => setShowMobileChat(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>

            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {currentChannel.name}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isAuthenticated
                  ? `Active Class ${activeStandard} Commerce Community`
                  : 'Viewing as Guest • Sign in to chat'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 shrink-0">
            <span className="hidden sm:inline text-[11px] font-bold px-2.5 py-1 rounded-full bg-white dark:bg-[#111b21] text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
              Class {activeStandard}
            </span>
          </div>
        </div>

        {/* WhatsApp Messages Feed with Pattern Background */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 relative bg-[#efeae2] dark:bg-[#0b141a]"
          style={{
            backgroundImage: `radial-gradient(rgba(0, 168, 132, 0.04) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Centered WhatsApp Date Badge */}
          <div className="flex justify-center my-2">
            <span className="px-3.5 py-1 rounded-lg bg-white/90 dark:bg-[#182229]/90 text-[10px] font-bold text-slate-600 dark:text-slate-400 shadow-xs border border-slate-200/50 dark:border-slate-700/50 tracking-wider uppercase">
              Class {activeStandard} Commerce Discussion Group
            </span>
          </div>

          {/* Messages Feed */}
          {messages.map((msg) => {
            const isMe =
              isAuthenticated &&
              currentUser?.email &&
              msg.senderEmail.toLowerCase() === currentUser.email.toLowerCase();
            const isMsgSuperAdmin = msg.senderRole === 'SUPER_ADMIN';
            const isMsgAdmin = msg.senderRole === 'ADMIN';
            const senderColor = getSenderColor(msg.senderName);

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                {/* WhatsApp Chat Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-md md:max-w-lg p-2.5 sm:p-3 rounded-2xl shadow-xs relative transition-all ${
                    isMe
                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-xs border border-emerald-200/50 dark:border-emerald-800/40'
                      : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-xs border border-slate-200/60 dark:border-slate-800/80'
                  }`}
                >
                  {/* Sender Name in WhatsApp Group Colors */}
                  {!isMe && (
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className={`text-[11px] font-bold truncate ${senderColor}`}>
                        {msg.senderName}
                      </span>
                      {isMsgSuperAdmin ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> Super Admin
                        </span>
                      ) : isMsgAdmin ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> Faculty
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Message Content */}
                  <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words pr-12">
                    {msg.content}
                  </p>

                  {/* Timestamp & Double Checkmarks (WhatsApp Style) */}
                  <div className="flex items-center justify-end space-x-1 mt-1 -mb-1 text-[10px] text-slate-500 dark:text-slate-400 float-right">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && (
                      <span title="Delivered & Read">
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      </span>
                    )}
                  </div>

                  {/* Reactions Pill Toolbar */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                      {Object.entries(msg.reactions).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                            isMe
                              ? 'bg-white/40 dark:bg-black/20 text-slate-800 dark:text-white border-emerald-300/40 dark:border-emerald-700/40'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Emoji Reaction on Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 mt-0.5 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-xs text-xs">
                  {['👍', '❤️', '🔥', '💡'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      className="hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================
            WHATSAPP BOTTOM DOCK: INPUT OR SIGN-IN PROMPT
        ======================================================== */}
        {isAuthenticated ? (
          /* Logged In WhatsApp Message Input Bar */
          <div className="p-2.5 sm:p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center space-x-2">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-14 left-0 p-2.5 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex items-center gap-1.5 z-30 animate-fade-in">
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
                className="p-2 rounded-full text-slate-500 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Add Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white dark:bg-[#2a3942] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-normal text-slate-900 dark:text-white placeholder:text-slate-400 border border-transparent focus:outline-none shadow-2xs"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 transition-all shrink-0"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Unauthenticated Prompt: Login is only compulsory for chatting! */
          <div className="p-3.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-[#00a884] flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Join the Class {activeStandard} WhatsApp Conversation
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Login is only required for chatting and posting doubts. Reading materials is free!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAuthModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition-all shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Chat</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Auth Modal for instant peer lounge login */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default CommunityLounge;
