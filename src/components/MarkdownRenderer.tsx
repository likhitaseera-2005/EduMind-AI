import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose-edu text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-100 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock language={language || 'code'} code={codeString} />
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded text-[13px] font-mono bg-zinc-200/80 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-zinc-300/50 dark:border-zinc-700/50"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-zinc-200 dark:border-zinc-750 shadow-xs">
                <table className="min-w-full divide-y divide-zinc-250 dark:divide-zinc-700 text-left text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-200 font-semibold">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return <th className="px-4 py-2.5 font-medium">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2 border-t border-zinc-200/60 dark:border-zinc-800/60">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-3 border-emerald-500 pl-4 py-1 my-3 text-zinc-600 dark:text-zinc-400 italic bg-emerald-50/40 dark:bg-emerald-950/20 rounded-r-md">
                {children}
              </blockquote>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mt-5 mb-2.5 text-zinc-900 dark:text-zinc-50 tracking-tight">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mt-4 mb-2 text-zinc-900 dark:text-zinc-100 tracking-tight">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mt-3 mb-1.5 text-zinc-800 dark:text-zinc-200">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2 space-y-1.5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1.5">{children}</ol>;
          },
          p({ children }) {
            return <p className="my-2.5">{children}</p>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-500 font-medium"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-700/60 bg-[#141415] text-zinc-200 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-zinc-700/50 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Terminal size={14} className="text-emerald-400" />
          <span className="uppercase tracking-wider font-semibold text-[11px] text-zinc-300">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all bg-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-300 cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13.5px] font-mono leading-relaxed bg-[#121213]">
        <pre className="m-0 text-zinc-200 selection:bg-emerald-500/30 selection:text-emerald-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
