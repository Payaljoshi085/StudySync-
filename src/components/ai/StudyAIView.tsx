import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  BookOpen,
  X,
  User,
  GraduationCap,
  Lightbulb,
  FileQuestion,
  HelpCircle,
  Check,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AIConversation, Note, ChatMessage } from '../../types';
import { useToast } from '../../context/ToastContext';

interface StudyAIViewProps {
  initialNoteId?: string | null;
  onClearNoteContext?: () => void;
}

export const StudyAIView: React.FC<StudyAIViewProps> = ({
  initialNoteId,
  onClearNoteContext,
}) => {
  const { success, error, info } = useToast();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Note context
  const [noteContext, setNoteContext] = useState<Note | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);
      if (res.conversations && res.conversations.length > 0) {
        setActiveConvId(res.conversations[0].id);
        setMessages(res.conversations[0].messages || []);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Fetch note context if provided
  useEffect(() => {
    if (initialNoteId) {
      api.getNote(initialNoteId).then((res) => {
        setNoteContext(res.note);
      }).catch(() => {});
    }
  }, [initialNoteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectConversation = (conv: AIConversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
  };

  const handleNewChat = async () => {
    try {
      const res = await api.createConversation('Study Session', noteContext?.id);
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveConvId(res.conversation.id);
      setMessages([]);
    } catch (err) {
      console.error('Error starting new conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
          setMessages(remaining[0].messages || []);
        } else {
          handleNewChat();
        }
      }
      info('Chat conversation deleted');
    } catch (err) {
      error('Failed to delete chat');
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await api.chat({
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        noteContextId: noteContext?.id || null,
        conversationId: activeConvId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: res.content,
        timestamp: new Date().toISOString(),
      };

      setMessages([...newHistory, assistantMsg]);
    } catch (err: any) {
      error(err.message || 'AI assistant request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || loading) return;
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualIdx = messages.length - 1 - lastUserIndex;
    const historyUpToUser = messages.slice(0, actualIdx + 1);
    setMessages(historyUpToUser);
    setLoading(true);

    try {
      const res = await api.chat({
        messages: historyUpToUser.map((m) => ({ role: m.role, content: m.content })),
        noteContextId: noteContext?.id || null,
        conversationId: activeConvId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: res.content,
        timestamp: new Date().toISOString(),
      };

      setMessages([...historyUpToUser, assistantMsg]);
    } catch (err: any) {
      error(err.message || 'Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-zinc-950">
      {/* 1. Left Chat History Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="space-y-4 overflow-y-auto">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>New Study Chat</span>
          </button>

          <div>
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">
              Recent Chats
            </span>
            <div className="mt-2 space-y-1">
              {conversations.map((c) => {
                const isActive = activeConvId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Bot className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{c.title || 'Study Session'}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-300">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Tutor Model</span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-relaxed">
            Optimized for complex STEM formulations, conceptual clarity, and exam revision.
          </p>
        </div>
      </div>

      {/* 2. Main Chat Conversation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
        {/* Context Bar if note attached */}
        {noteContext && (
          <div className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center gap-2 truncate">
              <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-semibold">Active Note Context:</span>
              <span className="truncate underline font-bold">{noteContext.title}</span>
            </div>
            <button
              onClick={() => {
                setNoteContext(null);
                if (onClearNoteContext) onClearNoteContext();
              }}
              className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-white rounded transition-colors"
              title="Clear Note Context"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mx-auto shadow-md">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                How can I assist your studies today?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Ask me to explain intricate concepts, break down step-by-step proofs, construct revision guides, or test your memory.
              </p>

              {/* Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                {[
                  {
                    icon: Lightbulb,
                    title: 'Explain Simply',
                    prompt: 'Explain the core principles of Ohm\'s Law and electrical resistance using a water pipe analogy.',
                  },
                  {
                    icon: FileQuestion,
                    title: 'Quiz My Understanding',
                    prompt: 'Ask me 3 challenging questions to test my understanding of Graph BFS vs DFS traversals.',
                  },
                  {
                    icon: GraduationCap,
                    title: 'Exam Study Guide',
                    prompt: 'What are the top 5 high-yield exam topics examiners love asking about Transformer Attention mechanics?',
                  },
                  {
                    icon: HelpCircle,
                    title: 'Step-by-Step Solver',
                    prompt: 'Can you break down how to approach solving a dynamic programming knapsack problem step-by-step?',
                  },
                ].map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s.prompt)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:border-indigo-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-500">
                          {s.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2">{s.prompt}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>StudySync AI</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyMessage(m.id, m.content)}
                            className="hover:text-zinc-200 p-1 flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-700">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-zinc-400">Synthesizing study response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {messages.length > 0 && (
              <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate Response</span>
                </button>
                <span>StudySync AI is grounded in verified academic principles</span>
              </div>
            )}

            <div className="relative flex items-center">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  noteContext
                    ? `Ask anything about "${noteContext.title}"...`
                    : 'Ask any academic question, paste a problem, or request an explanation...'
                }
                className="w-full pl-4 pr-12 py-3.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || loading}
                className="absolute right-2.5 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
