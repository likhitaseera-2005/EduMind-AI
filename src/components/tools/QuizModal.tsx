import React, { useState } from 'react';
import { X, HelpCircle, Sparkles, Loader2, CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import { api } from '../../services/api.js';
import { QuizData, UploadedDocument } from '../../types.js';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedDoc: UploadedDocument | null;
}

export const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, attachedDoc }) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [questionCount, setQuestionCount] = useState(5);
  const [useDoc, setUseDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  // Quiz taking state
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setUserAnswers({});
    setSubmitted({});
    try {
      const data = await api.generateQuiz({
        topic: topic.trim() || (useDoc && attachedDoc ? attachedDoc.filename : 'General Academic Subject'),
        difficulty,
        questionCount,
        docId: useDoc && attachedDoc ? attachedDoc.docId : undefined,
      });
      setQuizData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (submitted[questionId]) return; // locked after answering
    setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    setSubmitted(prev => ({ ...prev, [questionId]: true }));
  };

  // Score calculation
  const totalQuestions = quizData?.questions?.length || 0;
  const answeredCount = Object.keys(submitted).length;
  const correctCount = quizData?.questions?.reduce((acc, q) => {
    return userAnswers[q.id] === q.correctIndex ? acc + 1 : acc;
  }, 0) || 0;

  const isCompleted = totalQuestions > 0 && answeredCount === totalQuestions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Quiz Generator
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Interactive MCQs with rationale, scoring, and instant explanations
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
          {!quizData ? (
            /* Quiz Configuration Form */
            <div className="space-y-4 max-w-xl mx-auto py-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Quiz Subject / Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Quantum Mechanics, Sorting Algorithms, European History..."
                  className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {attachedDoc && (
                <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    id="useDoc"
                    checked={useDoc}
                    onChange={e => setUseDoc(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="useDoc" className="cursor-pointer">
                    Base quiz on attached document:{' '}
                    <span className="font-semibold text-amber-400">{attachedDoc.filename}</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Beginner">Beginner (Foundations)</option>
                    <option value="Intermediate">Intermediate (Core Concepts)</option>
                    <option value="Advanced">Advanced (Challenging & Edge Cases)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Question Count
                  </label>
                  <select
                    value={questionCount}
                    onChange={e => setQuestionCount(Number(e.target.value))}
                    className="w-full text-xs rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value={3}>3 Questions (Quick check)</option>
                    <option value={5}>5 Questions (Standard)</option>
                    <option value={10}>10 Questions (Comprehensive test)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || (!topic.trim() && !(useDoc && attachedDoc))}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-md shadow-amber-900/30 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Generating Educational Quiz with Groq...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Generate Quiz Now</span>
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
            /* Quiz In Progress / Completed Screen */
            <div className="space-y-6">
              {/* Score header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
                <div>
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {quizData.title || topic}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Difficulty: <span className="text-amber-400 font-medium">{quizData.difficulty}</span> • Answered: {answeredCount}/{totalQuestions}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-500">
                      Score: {correctCount} / {totalQuestions}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}% Accuracy
                    </div>
                  </div>
                  <button
                    onClick={() => setQuizData(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                    title="Generate another quiz"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* Questions list */}
              <div className="space-y-6">
                {quizData.questions.map((q, idx) => {
                  const hasAnswered = submitted[q.id];
                  const chosenIndex = userAnswers[q.id];
                  const isCorrect = chosenIndex === q.correctIndex;

                  return (
                    <div
                      key={q.id || idx}
                      className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151515]"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                          {q.question}
                        </h4>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 gap-2 pl-9">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = chosenIndex === oIdx;
                          const isThisCorrect = q.correctIndex === oIdx;

                          let btnClasses =
                            'text-left p-3 rounded-lg text-xs transition-all border cursor-pointer ';
                          if (!hasAnswered) {
                            btnClasses +=
                              'bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700';
                          } else {
                            if (isThisCorrect) {
                              btnClasses +=
                                'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-semibold ';
                            } else if (isSelected && !isCorrect) {
                              btnClasses +=
                                'bg-rose-500/20 text-rose-300 border-rose-500 ';
                            } else {
                              btnClasses +=
                                'bg-zinc-100/50 dark:bg-zinc-850/50 text-zinc-400 border-transparent opacity-60 ';
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectOption(q.id, oIdx)}
                              disabled={hasAnswered}
                              className={btnClasses}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-400">
                                    {String.fromCharCode(65 + oIdx)}.
                                  </span>
                                  {opt}
                                </span>
                                {hasAnswered && isThisCorrect && (
                                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                )}
                                {hasAnswered && isSelected && !isCorrect && (
                                  <XCircle size={16} className="text-rose-400 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box shown once answered */}
                      {hasAnswered && (
                        <div className="mt-4 ml-9 p-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                            {isCorrect ? (
                              <span className="text-emerald-500 flex items-center gap-1">
                                <CheckCircle2 size={14} /> Correct!
                              </span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-1">
                                <XCircle size={14} /> Incorrect
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Completion banner */}
              {isCompleted && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Award size={24} />
                  </div>
                  <h4 className="text-base font-bold text-zinc-100">
                    Quiz Completed!
                  </h4>
                  <p className="text-xs text-zinc-300">
                    You scored <span className="font-bold text-emerald-400">{correctCount}</span> out of{' '}
                    <span className="font-bold">{totalQuestions}</span> (
                    {Math.round((correctCount / totalQuestions) * 100)}%).
                  </p>
                  <button
                    onClick={() => {
                      setUserAnswers({});
                      setSubmitted({});
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md"
                  >
                    <RotateCcw size={14} />
                    <span>Retake Quiz</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
