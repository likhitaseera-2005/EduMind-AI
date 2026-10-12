import React, { useRef, useEffect, useState } from 'react';
import {
  Menu,
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  GraduationCap,
  Code2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage, Conversation, LearningLevel } from '../types.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingMessage: string;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  onToggleSidebar: () => void;
  onFileUpload: (file: File) => void;
  learningLevel: LearningLevel;
  subject: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isGenerating,
  streamingMessage,
  onSendMessage,
  onRegenerate,
  onToggleSidebar,
  onFileUpload: _onFileUpload,
  learningLevel,
  subject,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Auto-scroll on new message or stream chunk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting symbols for cleaner voice
    const clean = text
      .replace(/[#*`_$~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const samplePrompts = [
    {
      title: 'Explain Python data structures with examples',
      category: 'Computer Science',
      icon: <Code2 size={16} className="text-emerald-400" />,
      prompt: 'Explain Python data structures (lists, tuples, sets, dictionaries) with clear code examples, memory models, and Big-O time complexity.',
    },
    {
      title: 'Teach me machine learning from the basics',
      category: 'Data Science',
      icon: <Sparkles size={16} className="text-purple-400" />,
      prompt: 'Teach me machine learning from the ground up: start with the intuitive concept of linear regression, loss functions, and gradient descent before mathematics.',
    },
    {
      title: 'Create a quiz from my study notes',
      category: 'Assessment',
      icon: <HelpCircle size={16} className="text-amber-400" />,
      prompt: 'Create a 5-question multiple choice quiz testing my understanding of photosynthesis and cellular respiration with detailed explanations for each answer.',
    },
    {
      title: 'Help me understand this PDF',
      category: 'Document Analysis',
      icon: <FileText size={16} className="text-blue-400" />,
      prompt: 'Can you provide a structured chapter-by-chapter summary of the attached document, highlighting core definitions and key formulas?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#212121]">
      {/* Top Bar Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-[#212121]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {conversation?.title || 'EduMind AI'}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span>{subject}</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {learningLevel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Groq AI Active</span>
          </div>
        </div>
      </div>

      {/* Main Messages or Welcome Screen Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !isGenerating ? (
          /* Welcome Screen */
          <div className="max-w-2xl mx-auto my-auto flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-900/30 mb-6">
              <GraduationCap size={32} />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
              Learn anything. Understand everything.
            </h2>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mb-8 leading-relaxed">
              EduMind AI is your personalized academic companion powered by Groq.
              Master difficult concepts with intuitive analogies, step-by-step problem hints,
              code walkthroughs, and deep document QA.
            </p>

            {/* Prompt Cards Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(p.prompt)}
                  type="button"
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#2a2a2a] hover:bg-zinc-100 dark:hover:bg-[#323232] border border-zinc-200 dark:border-zinc-750/80 transition-all text-left group cursor-pointer shadow-xs hover:border-emerald-500/50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      {p.icon}
                      {p.category}
                    </span>
                    <ArrowRight size={13} className="text-zinc-400 group-hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                </button>
              ))}
            </div>

            {/* Document upload drop prompt */}
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <FileText size={14} className="text-emerald-500" />
              <span>Attach lecture slides or textbook chapters (.pdf or .txt) to ask questions</span>
            </div>
          </div>
        ) : (
          /* Conversation message list */
          <div className="max-w-3xl mx-auto space-y-6 pb-6">
            {messages.map(msg => (
              <div key={msg.id} className="flex gap-3 md:gap-4">
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-medium text-xs">
                      <User size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles size={16} />
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {msg.role === 'user' ? 'You' : 'EduMind AI'}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.documentName && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <FileText size={10} />
                        {msg.documentName}
                      </span>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="text-zinc-800 dark:text-zinc-100 leading-relaxed">
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>

                  {/* Assistant response action buttons */}
                  {msg.role === 'assistant' && (
                    <div className="mt-3 flex items-center gap-1 text-zinc-400">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={13} className="text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={onRegenerate}
                        className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Regenerate response"
                      >
                        <RotateCcw size={13} />
                        <span>Regenerate</span>
                      </button>
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title={speakingId === msg.id ? 'Stop reading' : 'Read aloud'}
                      >
                        {speakingId === msg.id ? (
                          <>
                            <VolumeX size={13} className="text-amber-500" />
                            <span className="text-amber-500">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Currently streaming response chunk */}
            {isGenerating && streamingMessage && (
              <div className="flex gap-3 md:gap-4">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center animate-pulse">
                    <Sparkles size={16} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      EduMind AI
                    </span>
                    <span className="text-[10px] text-emerald-500 animate-pulse font-mono">
                      Generating...
                    </span>
                  </div>
                  <MarkdownRenderer content={streamingMessage} />
                </div>
              </div>
            )}

            {/* Loading spinner if generating but no chunks yet */}
            {isGenerating && !streamingMessage && (
              <div className="flex gap-3 md:gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-600/80 text-white flex items-center justify-center">
                  <Sparkles size={16} className="animate-spin" />
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Formulating educational explanation...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
