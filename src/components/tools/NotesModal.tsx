import React, { useState } from 'react';
import { X, BookOpen, Sparkles, Loader2, Copy, Check, Download } from 'lucide-react';
import { api } from '../../services/api.js';
import { UploadedDocument } from '../../types.js';
import { MarkdownRenderer } from '../MarkdownRenderer.js';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedDoc: UploadedDocument | null;
}

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, attachedDoc }) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [useDoc, setUseDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.generateNotes({
        topic: topic.trim() || (useDoc && attachedDoc ? attachedDoc.filename : 'Academic Study Topic'),
        level,
        docId: useDoc && attachedDoc ? attachedDoc.docId : undefined,
      });
      setNotes(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate study notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!notes) return;
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (!notes) return;
    const blob = new Blob([notes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(topic || 'Study_Notes').replace(/\s+/g, '_')}_Notes.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Study Notes Generator
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Organized notes with definitions, formulas, analogies & quick-revision checklists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Topic / Subject to Summarize
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Thermodynamics, Graph Theory, World War I, Organic Reactions..."
                className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Target Level
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-blue-500"
              >
                <option value="Beginner">Beginner (Foundational)</option>
                <option value="Intermediate">Intermediate (Undergraduate)</option>
                <option value="Advanced">Advanced (Graduate / Deep-dive)</option>
                <option value="Exam preparation">Exam Prep (High-yield recall)</option>
              </select>
            </div>
          </div>

          {attachedDoc && (
            <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                id="notesUseDoc"
                checked={useDoc}
                onChange={e => setUseDoc(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="notesUseDoc" className="cursor-pointer">
                Extract notes directly from attached file:{' '}
                <span className="font-semibold text-blue-400">{attachedDoc.filename}</span>
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isLoading || (!topic.trim() && !(useDoc && attachedDoc))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-md shadow-blue-900/30 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Synthesizing Academic Notes...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Notes</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {notes && (
            <div className="mt-4 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151515] text-zinc-800 dark:text-zinc-100">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                  <BookOpen size={14} />
                  Synthesized Study Notes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 cursor-pointer"
                    title="Download as Markdown file"
                  >
                    <Download size={12} />
                    <span>Download (.md)</span>
                  </button>
                </div>
              </div>
              <MarkdownRenderer content={notes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
