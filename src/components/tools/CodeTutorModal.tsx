import React, { useState } from 'react';
import { X, Code2, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { api } from '../../services/api.js';
import { MarkdownRenderer } from '../MarkdownRenderer.js';

interface CodeTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = ['Python', 'Java', 'C++', 'C', 'JavaScript', 'TypeScript', 'SQL', 'Rust', 'Go'];
const MODES = [
  { id: 'explain', label: 'Explain & Deconstruct', desc: 'Line-by-line review & concept' },
  { id: 'debug', label: 'Debug & Fix Errors', desc: 'Find bugs, edge cases & remedies' },
  { id: 'complexity', label: 'Big-O Complexity', desc: 'Time & space mathematical analysis' },
  { id: 'optimize', label: 'Optimize & Refactor', desc: 'Idiomatic patterns & speedup' },
];

export const CodeTutorModal: React.FC<CodeTutorModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState('Python');
  const [mode, setMode] = useState('explain');
  const [code, setCode] = useState(
    `# Example: Binary Search Algorithm
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`
  );
  const [question, setQuestion] = useState('Explain how this algorithm operates step-by-step and prove its Big-O time and space complexity.');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.analyzeCode({
        language,
        code,
        question,
        mode,
      });
      setAnalysis(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze code snippet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Code2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                AI Code Tutor
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Deconstruct syntax, analyze algorithms, compute Big-O complexity & debug errors
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

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Controls bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Programming Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Analysis Mode
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-emerald-500"
              >
                {MODES.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Code input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Code Snippet / Implementation
            </label>
            <div className="rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-750 bg-zinc-950">
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                rows={7}
                placeholder="Paste your source code or algorithm here..."
                className="w-full p-3 font-mono text-xs sm:text-[13px] leading-relaxed bg-transparent text-emerald-300 focus:outline-hidden resize-none selection:bg-emerald-500/30"
              />
            </div>
          </div>

          {/* Question / Task prompt */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Specific Question or Task (Optional)
            </label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Prove why the worst case is O(log n) or explain line 4"
              className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Analyze Action button */}
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || (!code.trim() && !question.trim())}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Analyzing Code...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Run Code Tutor</span>
                </>
              )}
            </button>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Results Output */}
          {analysis && (
            <div className="mt-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151515] text-zinc-800 dark:text-zinc-100">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Code Tutor Explanation
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
                      <span>Copy Output</span>
                    </>
                  )}
                </button>
              </div>
              <MarkdownRenderer content={analysis} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
