import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ChatMessage } from '../../services/api';
import { AuthModal } from '../auth/AuthModal';
import {
  MessageSquare,
  Send,
  Smile,
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
  Paperclip,
  MoreVertical,
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  topic: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  unread?: number;
}

const DEFAULT_CHANNELS_STD12: Channel[] = [
  {
    id: 'general',
    name: 'Class 12 Commerce Lounge',
    topic: 'Daily study routines, board tips & group motivation',
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'accounts',
    name: 'Accounts (BK) Doubts & Sums',
    topic: 'Partnership Final Accounts, Balance Sheet & Dissolution',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'economics',
    name: 'Economics Discussion',
    topic: 'Micro/Macro, Utility, Elasticity of Demand & Public Finance',
    icon: TrendingUp,
    color: 'from-sky-500 to-cyan-600',
  },
  {
    id: 'maths',
    name: 'Maths & Statistics Help',
    topic: 'Part 1 Calculus & Part 2 Commercial Math & Regression',
    icon: Calculator,
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'ocm',
    name: 'OCM Case Studies & Theory',
    topic: 'Principles of management, marketing & consumer protection',
    icon: Briefcase,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'it',
    name: 'IT & Web Designing',
    topic: 'Advanced web designing, HTML5/CSS3, SEO & Libre Office',
    icon: Laptop,
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'english',
    name: 'English Writing & Literature',
    topic: 'Novel section, essay writing, comprehension & summary',
    icon: BookOpen,
    color: 'from-teal-500 to-emerald-600',
  },
];

const DEFAULT_CHANNELS_GENERAL: Channel[] = [
  {
    id: 'general',
    name: 'General Study Lounge',
    topic: 'Peer discussion room for study tips and mutual preparation',
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'doubts',
    name: 'Curriculum Doubts',
    topic: 'Post homework problems and textbook questions for peer guidance',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-600',
  },
];

const EMOJI_LIST = ['👍', '❤️', '💡', '🔥', '💯', '🚀', '📚', '✨', '👏', '🙏'];

// WhatsApp style sender colors
const SENDER_COLORS = [
  'text-[#53bdeb] dark:text-[#53bdeb]',
  'text-[#25d366] dark:text-[#25d366]',
  'text-[#ffd279] dark:text-[#ffd279]',
  'text-[#ff6b6b] dark:text-[#ff7f7f]',
  'text-[#bf71f2] dark:text-[#d38df8]',
  'text-[#00c9a7] dark:text-[#00e0b8]',
  'text-[#e056fd] dark:text-[#e056fd]',
];

const getSenderColor = (name: string): string => {
  if (!name) return SENDER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

interface CommunityLoungeProps {
  isMobileChatOpen?: boolean;
  onMobileChatToggle?: (open: boolean) => void;
}

export const CommunityLounge: React.FC<CommunityLoungeProps> = ({
  isMobileChatOpen: externalMobileChatOpen,
  onMobileChatToggle,
}) => {
  const { currentUser, isAuthenticated, isSuperAdmin, activeStandard } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [internalMobileChat, setInternalMobileChat] = useState<boolean>(false);

  const showMobileChat = externalMobileChatOpen !== undefined ? externalMobileChatOpen : internalMobileChat;
  const setShowMobileChat = (open: boolean) => {
    setInternalMobileChat(open);
    if (onMobileChatToggle) onMobileChatToggle(open);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const channels = activeStandard === '12' ? DEFAULT_CHANNELS_STD12 : DEFAULT_CHANNELS_GENERAL;
  const currentChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

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
          LEFT: WHATSAPP CHATS SIDEBAR
      ======================================================== */}
      <div
        className={`${
          showMobileChat ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-col h-full bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-all`}
      >
        {/* Top Header */}
        <div className="h-14 px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {currentUser?.email ? currentUser.email[0].toUpperCase() : 'A'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Peer Lounge
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Class {activeStandard} Commerce
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Live Groups
            </span>
          </div>
        </div>

        {/* WhatsApp Search Bar */}
        <div className="px-3 py-2 bg-white dark:bg-[#111b21] border-b border-slate-100 dark:border-slate-800/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg pl-9 pr-3 py-1.5 text-xs border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>
        </div>

        {/* Channels List (min-h-0 prevents overflow clipping) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
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
                    : 'hover:bg-slate-50 dark:hover:bg-[#202c33]/70'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a884]" />
                )}

                {/* Channel Icon Avatar */}
                <div className="relative shrink-0 mr-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xs bg-gradient-to-br ${channel.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Channel Meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {channel.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 ml-1">
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

        {/* Bottom User Bar */}
        <div className="h-14 px-3.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 truncate mr-2">
            <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {currentUser?.email ? currentUser.email[0] : 'G'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.email ? currentUser.email.split('@')[0] : 'Guest Visitor'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-[#25d366]' : 'bg-amber-500'}`} />
                <span>{isAuthenticated ? (isSuperAdmin ? 'Super Admin' : 'Student') : 'Read-Only Mode'}</span>
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-bold shadow-xs transition-all shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT: AUTHENTIC WHATSAPP CHAT PANEL
      ======================================================== */}
      <div
        className={`${
          showMobileChat ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full overflow-hidden relative`}
      >
        {/* WhatsApp Top Chat Header */}
        <div className="h-14 px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center space-x-3 truncate">
            <button
              onClick={() => setShowMobileChat(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xs bg-gradient-to-br ${currentChannel.color} shrink-0`}>
              <currentChannel.icon className="w-4 h-4" />
            </div>

            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {currentChannel.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isAuthenticated
                  ? 'online • Class 12 Commerce Discussion'
                  : 'Viewing as Guest • Sign in to chat'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 shrink-0">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#111b21] text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
              Std {activeStandard}
            </span>
            <button className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* WhatsApp Chat Wallpaper with Doodle Grid */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 space-y-3 relative bg-[#efeae2] dark:bg-[#0b141a]"
          style={{
            backgroundImage: `radial-gradient(rgba(0, 168, 132, 0.05) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Centered Date Badge */}
          <div className="flex justify-center my-2">
            <span className="px-3 py-1 rounded-lg bg-white/90 dark:bg-[#182229]/90 text-[10.5px] font-medium text-slate-600 dark:text-slate-400 shadow-2xs border border-slate-200/40 dark:border-slate-700/40">
              Class {activeStandard} Commerce Discussion Group
            </span>
          </div>

          {/* Messages Stream */}
          {messages.map((msg) => {
            const isMe =
              Boolean(isAuthenticated) &&
              Boolean(currentUser?.email) &&
              (
                msg.senderEmail.trim().toLowerCase() === (currentUser?.email || '').trim().toLowerCase() ||
                msg.senderName.trim().toLowerCase() === (currentUser?.email || '').split('@')[0].trim().toLowerCase() ||
                (Boolean(isSuperAdmin) && (msg.senderRole === 'SUPER_ADMIN' || msg.senderName.toLowerCase().includes('admin')))
              );
            const isMsgSuperAdmin = msg.senderRole === 'SUPER_ADMIN';
            const senderColor = getSenderColor(msg.senderName);

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} my-1 animate-fade-in`}
              >
                {/* Speech Bubble Container */}
                <div
                  className={`relative w-fit max-w-[85%] sm:max-w-[72%] md:max-w-[62%] px-3 pt-2 pb-1.5 rounded-lg shadow-xs transition-all ${
                    isMe
                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                      : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'
                  }`}
                >
                  {/* Sender Name in WhatsApp Group Colors */}
                  {!isMe && (
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <span className={`text-[12px] font-bold ${senderColor} truncate`}>
                        {msg.senderName}
                      </span>
                      {isMsgSuperAdmin && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content & Inline Timestamp */}
                  <div className="text-[13px] sm:text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                    <span>{msg.content}</span>
                    {/* Timestamp + Checkmark on the bottom right */}
                    <span className="inline-flex items-center gap-1 float-right mt-1 ml-3 text-[10px] text-slate-500 dark:text-slate-400 select-none">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                    </span>
                  </div>

                  {/* Floating WhatsApp Reaction Pill */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`-mb-3 flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700/80 shadow-xs text-[11px]">
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="flex items-center space-x-0.5 hover:scale-110 transition-transform"
                          >
                            <span>{emoji}</span>
                            {count > 1 && (
                              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                {count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Emoji Bar on Hover */}
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 mt-0.5 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-xs text-xs z-10 ${
                    isMe ? 'mr-1' : 'ml-1'
                  }`}
                >
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
          <div className="px-3 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800/80 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center space-x-2">
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 p-2 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl flex items-center gap-1.5 z-30 animate-fade-in">
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
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Attach"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message"
                className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-2 text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 border-none focus:outline-none shadow-2xs"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 transition-all shrink-0"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-[#00a884] flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  Join the Class {activeStandard} Commerce Chat
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reading materials is open to everyone. Sign in to send messages and ask doubts!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition-all shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Chat</span>
            </button>
          </div>
        )}
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default CommunityLounge;
