import fs from 'fs';
import path from 'path';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  documentName?: string;
  docId?: string;
  learningLevel?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  learningLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam preparation';
  subject: string;
  docIds: string[];
  messages: ChatMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'conversations.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[Storage] Error creating data directory:', err);
  }
}

function readAll(): Record<string, Conversation> {
  ensureDataDir();
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Storage] Error reading conversations file:', err);
    return {};
  }
}

function writeAll(data: Record<string, Conversation>): void {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error writing conversations file:', err);
  }
}

export function listConversations(): Conversation[] {
  const all = readAll();
  return Object.values(all).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getConversation(id: string): Conversation | undefined {
  const all = readAll();
  return all[id];
}

export function saveConversation(conv: Conversation): Conversation {
  const all = readAll();
  all[conv.id] = {
    ...conv,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
  return all[conv.id];
}

export function createConversation(params: {
  title?: string;
  learningLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam preparation';
  subject?: string;
}): Conversation {
  const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();
  const conv: Conversation = {
    id,
    title: params.title || 'New Study Session',
    createdAt: now,
    updatedAt: now,
    learningLevel: params.learningLevel || 'Intermediate',
    subject: params.subject || 'General Academic',
    docIds: [],
    messages: [],
  };
  return saveConversation(conv);
}

export function deleteConversation(id: string): boolean {
  const all = readAll();
  if (all[id]) {
    delete all[id];
    writeAll(all);
    return true;
  }
  return false;
}

export function clearAllConversations(): void {
  writeAll({});
}
