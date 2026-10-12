import React, { useState } from 'react';
import { X, FileText, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../../services/api.js';
import { UploadedDocument } from '../../types.js';
import { MarkdownRenderer } from '../MarkdownRenderer.js';

interface SummarizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedDoc: UploadedDocument | null;
}

export const SummarizerModal: React.FC<SummarizerModalProps> = ({
  isOpen,
  onClose,
  attachedDoc,
}) => {
  const [text, setText] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [useDoc, setUseDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.summarizeContent({
        text: text.trim(),
        docId: useDoc && attachedDoc ? attachedDoc.docId : undefined,
        length,
      });
      setSummary(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to summarize text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Educational Summarizer
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Condense academic texts, papers, and notes into short, medium, or detailed takeaways
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
          {/* Length options */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Summary Depth
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'short', label: 'Short (TL;DR)', desc: '3-5 key bullets' },
                { id: 'medium', label: 'Medium (Key Points)', desc: 'Balanced overview' },
                { id: 'detailed', label: 'Detailed (In-depth)', desc: 'Comprehensive breakdown' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLength(opt.id as any)}
                  type="button"
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    length === opt.id
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-medium'
                      : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-750 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-zinc-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {attachedDoc && (
            <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                id="sumDoc"
                checked={useDoc}
                onChange={e => setUseDoc(e.target.checked)}
                className="rounded text-teal-500 focus:ring-teal-500"
              />
              <label htmlFor="sumDoc" className="cursor-pointer">
                Summarize content from attached file:{' '}
                <span className="font-semibold text-teal-400">{attachedDoc.filename}</span>
              </label>
            </div>
          )}

          {!useDoc && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Paste Text / Article to Summarize
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={6}
                placeholder="Paste lecture excerpts, research paper abstracts, or reading material here..."
                className="w-full text-xs rounded-xl p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-teal-500 resize-none"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSummarize}
              disabled={isLoading || (!text.trim() && !(useDoc && attachedDoc))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-md shadow-teal-900/30 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Distilling Key Insights...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {summary && (
            <div className="mt-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151515] text-zinc-800 dark:text-zinc-100">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-500 flex items-center gap-1.5">
                  <FileText size={14} />
                  {length.toUpperCase()} Summary
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
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
              </div>
              <MarkdownRenderer content={summary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
