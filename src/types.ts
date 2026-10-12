export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam preparation';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  documentName?: string;
  docId?: string;
  learningLevel?: LearningLevel;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  learningLevel: LearningLevel;
  subject: string;
  docIds: string[];
  messages: ChatMessage[];
}

export interface UploadedDocument {
  docId: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
  pageCount: number;
  charCount: number;
  isScanned: boolean;
  previewText?: string;
  warning?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizData {
  title: string;
  difficulty: string;
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string;
}

export interface FlashcardDeck {
  deckTitle: string;
  cards: Flashcard[];
}

export type ActiveTool = 'none' | 'code-tutor' | 'quiz' | 'notes' | 'flashcards' | 'study-plan' | 'summarize';
