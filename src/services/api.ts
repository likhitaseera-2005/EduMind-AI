import { Conversation, UploadedDocument, QuizData, FlashcardDeck } from '../types.js';

/**
 * Safely parse JSON from a response, checking Content-Type first
 */
async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  // If response is HTML or not JSON, inspect body and provide useful diagnostic error
  if (contentType.includes('text/html') || !contentType.includes('application/json')) {
    const rawText = await res.text();
    const isHtml = contentType.includes('text/html') || rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html');
    if (isHtml) {
      throw new Error(
        `The server returned an HTML page instead of JSON (Status ${res.status}). The backend service may still be starting, or the route was intercepted by a gateway page.`
      );
    }
    // Try parsing as JSON anyway in case Content-Type header was omitted
    try {
      const fallbackData = JSON.parse(rawText);
      if (!res.ok || fallbackData.success === false) {
        throw new Error(fallbackData.error || `Server request failed with status ${res.status}`);
      }
      return fallbackData as T;
    } catch {
      throw new Error(
        `Unexpected non-JSON response from server (Status ${res.status}, Type: ${contentType || 'unknown'}): ${rawText.slice(0, 150)}`
      );
    }
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Malformed JSON response from server (Status ${res.status}): ${text.slice(0, 150)}`);
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Server request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  /**
   * Health check with optional retry for gateway warmup
   */
  async getHealth(retries = 2): Promise<{
    success: boolean;
    status: string;
    provider?: string;
    model: string;
    hasApiKey: boolean;
    timestamp: string;
  }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/health');
        return await parseResponse(res);
      } catch (err: any) {
        if (attempt < retries && (err?.message?.includes('HTML') || err?.message?.includes('Failed to fetch'))) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Health check failed after multiple attempts');
  },

  async getConversations(retries = 1): Promise<Conversation[]> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/conversations');
        const data = await parseResponse<{ success: boolean; conversations: Conversation[] }>(res);
        return data.conversations;
      } catch (err: any) {
        if (attempt < retries && (err?.message?.includes('HTML') || err?.message?.includes('Failed to fetch'))) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Failed to fetch conversations');
  },

  async createConversation(params?: { title?: string; learningLevel?: string; subject?: string }) {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    const data = await parseResponse<{ success: boolean; conversation: Conversation }>(res);
    return data.conversation;
  },

  async getConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await parseResponse<{ success: boolean; conversation: Conversation }>(res);
    return data.conversation;
  },

  async updateConversation(id: string, updates: Partial<Conversation>) {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await parseResponse<{ success: boolean; conversation: Conversation }>(res);
    return data.conversation;
  },

  async deleteConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    return parseResponse<{ success: boolean; message: string }>(res);
  },

  async clearAllConversations() {
    const res = await fetch('/api/conversations', { method: 'DELETE' });
    return parseResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Uploads PDF or TXT document using multipart/form-data.
   * Note: The browser automatically sets the multipart boundary; do not manually set Content-Type header.
   */
  async uploadDocument(file: File): Promise<UploadedDocument> {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type.startsWith('text/');
    if (!isPdf && !isTxt) {
      throw new Error(`Unsupported file type: "${file.name}". Please upload a PDF (.pdf) or Plain Text (.txt) file.`);
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 15MB.`);
    }

    if (file.size === 0) {
      throw new Error(`The file "${file.name}" is empty (0 bytes). Please upload a valid document.`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await parseResponse<{ success: boolean; document: UploadedDocument }>(res);
    return data.document;
  },

  async deleteDocument(docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    return parseResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Normal (non-streaming) chat request
   */
  async sendMessage(params: {
    conversationId: string;
    message: string;
    docId?: string;
    learningLevel?: string;
    subject?: string;
  }) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return parseResponse<{
      success: boolean;
      reply: string;
      conversation: Conversation;
      assistantMessage: any;
    }>(res);
  },

  /**
   * Streaming chat request (Server-Sent Events)
   */
  async streamChat(
    params: {
      conversationId: string;
      message: string;
      docId?: string;
      learningLevel?: string;
      subject?: string;
    },
    onChunk: (text: string) => void,
    onDone: (data: { conversationId: string; title: string; assistantMessage: any }) => void,
    onError: (err: Error) => void,
    signal?: AbortSignal
  ) {
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal,
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      // Check for non-SSE or HTML responses
      if (!res.ok || contentType.includes('text/html') || !contentType.includes('text/event-stream')) {
        const errorText = await res.text();
        const isHtml = contentType.includes('text/html') || errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html');
        if (isHtml) {
          throw new Error(
            `The server returned an HTML page instead of an event stream (Status ${res.status}). The backend service may still be starting.`
          );
        }
        let message = `Request failed with status ${res.status}`;
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.error || message;
        } catch {
          message = errorText.slice(0, 150) || message;
        }
        throw new Error(message);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by browser environment.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
            if (parsed.done) {
              onDone(parsed);
            }
          } catch (e: any) {
            if (e.message !== 'Unexpected end of JSON input') {
              console.warn('[SSE Parse Error]', e.message);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Chat stream cancelled by user]');
      } else {
        onError(err);
      }
    }
  },

  async generateQuiz(params: { topic?: string; difficulty?: string; questionCount?: number; docId?: string }): Promise<QuizData> {
    const res = await fetch('/api/tools/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseResponse<{ success: boolean; quiz: QuizData }>(res);
    return data.quiz;
  },

  async generateNotes(params: { topic?: string; level?: string; docId?: string }): Promise<string> {
    const res = await fetch('/api/tools/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseResponse<{ success: boolean; notes: string }>(res);
    return data.notes;
  },

  async generateFlashcards(params: { topic?: string; count?: number; docId?: string }): Promise<FlashcardDeck> {
    const res = await fetch('/api/tools/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseResponse<{ success: boolean; deck: FlashcardDeck }>(res);
    return data.deck;
  },

  async generateStudyPlan(params: { subject: string; syllabus?: string; hoursPerWeek?: number; targetDate?: string }): Promise<string> {
    const res = await fetch('/api/tools/study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseResponse<{ success: boolean; plan: string }>(res);
    return data.plan;
  },

  async analyzeCode(params: { language: string; code: string; question?: string; mode?: string }): Promise<string> {
    const res = await fetch('/api/tools/code-tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseResponse<{ success: boolean; analysis: string }>(res);
    return data.analysis;
  },

  async summarizeContent(params: { text?: string; docId?: string; length?: string }): Promise<string> {
    const res = await fetch('/api/tools/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseResponse<{ success: boolean; summary: string }>(res);
    return data.summary;
  },
};
