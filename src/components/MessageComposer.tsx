import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, Paperclip, X, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { UploadedDocument } from '../types.js';

interface MessageComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  attachedDoc: UploadedDocument | null;
  onRemoveDoc: () => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
  placeholder?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isGenerating,
  attachedDoc,
  onRemoveDoc,
  onFileUpload,
  isUploading,
  uploadError,
  placeholder = 'Ask anything in STEM, humanities, coding, or discuss your document...',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && (input.trim() || attachedDoc)) {
        onSend();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    // Reset file input value so re-uploading same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canSend = !isGenerating && (input.trim().length > 0 || attachedDoc !== null);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        </div>
      )}

      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="mb-2 p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-emerald-400" />
          <span>Processing document text & generating semantic index...</span>
        </div>
      )}

      {/* Attached Document Chip */}
      {attachedDoc && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg bg-zinc-800/90 dark:bg-zinc-850 border border-zinc-700/70 text-xs text-zinc-200 shadow-xs">
            <FileText size={14} className="text-emerald-400 shrink-0" />
            <span className="font-medium max-w-[200px] truncate" title={attachedDoc.filename}>
              {attachedDoc.filename}
            </span>
            <span className="text-[11px] text-zinc-400">
              ({(attachedDoc.sizeBytes / 1024).toFixed(0)} KB • {attachedDoc.pageCount} pg)
            </span>
            {attachedDoc.isScanned && (
              <span
                className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                title={attachedDoc.warning}
              >
                <AlertTriangle size={11} />
                Scanned
              </span>
            )}
            <button
              onClick={onRemoveDoc}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 cursor-pointer"
              title="Remove attachment"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl bg-zinc-100 dark:bg-[#2f2f2f] border border-zinc-300 dark:border-zinc-700/80 shadow-md focus-within:border-emerald-500 dark:focus-within:border-emerald-500/80 transition-all">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={handleFileChange}
          className="hidden"
          disabled={isGenerating || isUploading}
        />

        <div className="flex items-end p-2 gap-2">
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || isUploading}
            className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Attach PDF or TXT document (Max 15MB)"
          >
            <Paperclip size={18} />
          </button>

          {/* Multiline auto-expanding textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isGenerating}
            className="flex-1 max-h-[200px] py-2 px-1 text-sm md:text-[15px] bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none focus:outline-hidden leading-relaxed"
          />

          {/* Send or Stop Generation Button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-zinc-700 transition-all cursor-pointer shrink-0"
              title="Stop generating"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                canSend
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs shadow-emerald-700/40'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Send message (Enter)"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>EduMind AI can make mistakes. Verify important academic formulas.</span>
        <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  );
};
