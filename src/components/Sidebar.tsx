import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Code2,
  HelpCircle,
  BookOpen,
  Layers,
  Calendar,
  FileText,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react';
import { Conversation, LearningLevel, ActiveTool } from '../types.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  learningLevel: LearningLevel;
  onChangeLearningLevel: (level: LearningLevel) => void;
  subject: string;
  onChangeSubject: (subject: string) => void;
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  serverOnline: boolean;
}

const LEARNING_LEVELS: { id: LearningLevel; label: string; desc: string }[] = [
  { id: 'Beginner', label: 'Beginner', desc: 'Core intuition & analogies' },
  { id: 'Intermediate', label: 'Intermediate', desc: 'Balanced concepts & rigor' },
  { id: 'Advanced', label: 'Advanced', desc: 'Deep theory & edge cases' },
  { id: 'Exam preparation', label: 'Exam Prep', desc: 'High-yield points & test tips' },
];

const SUBJECTS = [
  'General Academic',
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'History',
  'Literature',
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  learningLevel,
  onChangeLearningLevel,
  subject,
  onChangeSubject,
  activeTool,
  onSelectTool,
  onOpenSettings,
  theme,
  onToggleTheme,
  serverOnline,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some(m => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (convId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#171717] text-zinc-200 border-r border-zinc-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full md:w-0'
        } ${!isOpen ? 'pointer-events-none' : ''}`}
      >
        {/* Top Header & Branding */}
        <div className="flex items-center justify-between p-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
              <GraduationCap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight text-zinc-100">
                <span>EduMind AI</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Groq
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">AI Educational Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors md:flex hidden cursor-pointer"
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors md:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onSelectTool('none');
              onNewChat();
            }}
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-750 text-zinc-100 font-medium text-sm transition-all border border-zinc-700/60 shadow-xs hover:border-zinc-650 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                <Plus size={15} />
              </div>
              <span>New study chat</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">⌘K</span>
          </button>
        </div>

        {/* Educational Tools Navigation */}
        <div className="px-3 pb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-1.5">
            Academic Tools
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onSelectTool('code-tutor')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'code-tutor'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <Code2 size={15} className="text-emerald-400 shrink-0" />
              <span>AI Code Tutor</span>
            </button>
            <button
              onClick={() => onSelectTool('quiz')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'quiz'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <HelpCircle size={15} className="text-amber-400 shrink-0" />
              <span>Quiz Generator</span>
            </button>
            <button
              onClick={() => onSelectTool('notes')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'notes'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <BookOpen size={15} className="text-blue-400 shrink-0" />
              <span>Notes Generator</span>
            </button>
            <button
              onClick={() => onSelectTool('flashcards')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'flashcards'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <Layers size={15} className="text-purple-400 shrink-0" />
              <span>Flashcards</span>
            </button>
            <button
              onClick={() => onSelectTool('study-plan')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'study-plan'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <Calendar size={15} className="text-rose-400 shrink-0" />
              <span>Study Planner</span>
            </button>
            <button
              onClick={() => onSelectTool('summarize')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'summarize'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <FileText size={15} className="text-teal-400 shrink-0" />
              <span>Summarizer</span>
            </button>
          </div>
        </div>

        {/* Learning Preferences */}
        <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Learning Mode
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">{learningLevel}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {LEARNING_LEVELS.map(lvl => (
              <button
                key={lvl.id}
                onClick={() => onChangeLearningLevel(lvl.id)}
                type="button"
                className={`text-[11px] py-1 px-1.5 rounded-md text-center transition-all cursor-pointer truncate ${
                  learningLevel === lvl.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'
                }`}
                title={lvl.desc}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>Subject</span>
            <select
              value={subject}
              onChange={e => onChangeSubject(e.target.value)}
              className="bg-zinc-800 text-zinc-200 text-[11px] rounded px-1.5 py-0.5 border border-zinc-700 focus:outline-hidden focus:border-emerald-500"
            >
              {SUBJECTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Chat History */}
        <div className="px-3 py-1.5 border-t border-zinc-800/70">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-zinc-850/80 text-zinc-200 placeholder-zinc-500 border border-zinc-750 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Recent Chats
          </div>
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-500">
              {searchQuery ? 'No matching chats found' : 'No previous conversations'}
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = activeConversationId === conv.id && activeTool === 'none';
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectTool('none');
                    onSelectConversation(conv.id);
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 font-medium'
                      : 'text-zinc-300 hover:bg-zinc-850/70 hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                    <MessageSquare size={14} className="shrink-0 text-zinc-400 group-hover:text-emerald-400" />
                    {isEditing ? (
                      <form
                        onSubmit={e => handleSaveRename(conv.id, e)}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 flex-1"
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full bg-zinc-900 text-zinc-100 px-1.5 py-0.5 text-xs rounded border border-emerald-500 focus:outline-hidden"
                        />
                        <button
                          type="submit"
                          className="p-0.5 text-emerald-400 hover:text-emerald-300"
                          title="Save"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-0.5 text-zinc-400 hover:text-zinc-200"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button
                        onClick={e => handleStartRename(conv, e)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                        title="Rename conversation"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-700/60"
                        title="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                serverOnline ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-medium text-zinc-300">
              {serverOnline ? 'Groq AI Active' : 'Connecting...'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              type="button"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={onOpenSettings}
              type="button"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Settings & Diagnostics"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
