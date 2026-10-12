import React, { useState } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  BookmarkCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { FlashcardDeck, UploadedDocument } from '../../types.js';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedDoc: UploadedDocument | null;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  onClose,
  attachedDoc,
}) => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(8);
  const [useDoc, setUseDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);

  // Deck state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());
  const [reviewIds, setReviewIds] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setReviewIds(new Set());
    try {
      const result = await api.generateFlashcards({
        topic: topic.trim() || (useDoc && attachedDoc ? attachedDoc.filename : 'Academic Subject'),
        count,
        docId: useDoc && attachedDoc ? attachedDoc.docId : undefined,
      });
      setDeck(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate flashcards deck');
    } finally {
      setIsLoading(false);
    }
  };

  const currentCard = deck?.cards?.[currentIndex];
  const totalCards = deck?.cards?.length || 0;

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const markMastered = () => {
    if (!currentCard) return;
    setMasteredIds(prev => new Set(prev).add(currentCard.id));
    setReviewIds(prev => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNext();
  };

  const markNeedReview = () => {
    if (!currentCard) return;
    setReviewIds(prev => new Set(prev).add(currentCard.id));
    setMasteredIds(prev => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Interactive Study Flashcards
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Active recall testing with flip cards, category badges & mastery tracking
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!deck ? (
            /* Flashcard Deck Creator Form */
            <div className="space-y-4 max-w-xl mx-auto py-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Deck Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Molecular Biology, Spanish Vocabulary, Calculus Derivatives..."
                  className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              {attachedDoc && (
                <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    id="flashcardDoc"
                    checked={useDoc}
                    onChange={e => setUseDoc(e.target.checked)}
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="flashcardDoc" className="cursor-pointer">
                    Generate deck from uploaded document:{' '}
                    <span className="font-semibold text-purple-400">{attachedDoc.filename}</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Deck Size
                </label>
                <select
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-purple-500"
                >
                  <option value={6}>6 Flashcards (Quick sprint)</option>
                  <option value={8}>8 Flashcards (Recommended)</option>
                  <option value={12}>12 Flashcards (Deep session)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || (!topic.trim() && !(useDoc && attachedDoc))}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-md shadow-purple-900/30 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Generating Flashcard Deck...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Create Flashcards Deck</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* Flashcard Viewer */
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Progress and status */}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {deck.deckTitle || topic}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500 font-medium">
                    Mastered: {masteredIds.size}
                  </span>
                  <span className="text-amber-500 font-medium">
                    Review: {reviewIds.size}
                  </span>
                  <button
                    onClick={() => setDeck(null)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-200"
                    title="New deck"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
                />
              </div>

              {/* Interactive Flashcard Card */}
              {currentCard && (
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="relative min-h-[260px] rounded-2xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 select-none shadow-lg border border-purple-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-100 hover:border-purple-500/60"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                      {currentCard.category || 'Concept'}
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">
                      {currentIndex + 1} / {totalCards}
                    </span>
                  </div>

                  <div className="my-auto py-4 text-center">
                    {!isFlipped ? (
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase tracking-wider text-purple-400 font-semibold block">
                          Question / Prompt
                        </span>
                        <h3 className="text-lg sm:text-xl font-semibold leading-relaxed text-zinc-50">
                          {currentCard.front}
                        </h3>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
                          Answer / Key Insight
                        </span>
                        <p className="text-base sm:text-lg text-zinc-100 leading-relaxed font-normal">
                          {currentCard.back}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
                    <RotateCw size={13} className="text-purple-400" />
                    <span>Click anywhere to flip card ({isFlipped ? 'showing answer' : 'showing question'})</span>
                  </div>
                </div>
              )}

              {/* Controls bar */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="Previous card"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={markNeedReview}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCw size={13} />
                    <span>Needs Review</span>
                  </button>
                  <button
                    onClick={markMastered}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <BookmarkCheck size={14} />
                    <span>Mastered</span>
                  </button>
                </div>

                <button
                  onClick={handleNext}
                  disabled={currentIndex === totalCards - 1}
                  className="p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="Next card"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
