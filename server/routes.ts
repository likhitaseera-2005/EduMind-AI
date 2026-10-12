import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  GROQ_MODEL,
  buildEducationalSystemInstruction,
  createGroqChatCompletion,
  createGroqChatStream,
  formatGroqError,
  LearningLevel,
} from './groq.js';
import { parseDocument, retrieveRelevantChunks, getDocument, deleteDocument } from './documentParser.js';
import {
  listConversations,
  getConversation,
  saveConversation,
  createConversation,
  deleteConversation,
  clearAllConversations,
  ChatMessage,
} from './storage.js';

export const apiRouter = Router();

// Configure multer for in-memory file uploads with 15MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const isTxt = file.mimetype.startsWith('text/') || file.originalname.toLowerCase().endsWith('.txt');
    if (isPdf || isTxt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF (.pdf) and Plain Text (.txt) documents are accepted.'));
    }
  },
});

// Helper for consistent structured JSON error responses
function sendError(res: Response, statusCode: number, message: string, details?: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json({
    success: false,
    error: message,
    details: details ? String(details) : undefined,
  });
}

// Ensure all API routes default to application/json charset UTF-8
apiRouter.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 1. Health check: GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  const hasKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0;
  res.json({
    success: true,
    status: 'ok',
    provider: 'Groq',
    model: GROQ_MODEL,
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
    service: 'EduMind AI Backend (Groq Powered)',
  });
});

// 2. Conversations CRUD
apiRouter.get('/conversations', (_req: Request, res: Response) => {
  try {
    const list = listConversations();
    res.json({ success: true, conversations: list });
  } catch (err: any) {
    sendError(res, 500, 'Failed to fetch conversations', err?.message);
  }
});

apiRouter.post('/conversations', (req: Request, res: Response) => {
  try {
    const { title, learningLevel, subject } = req.body || {};
    const conv = createConversation({
      title: title || 'New Study Session',
      learningLevel: learningLevel || 'Intermediate',
      subject: subject || 'General Academic',
    });
    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    sendError(res, 500, 'Failed to create conversation', err?.message);
  }
});

apiRouter.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const conv = getConversation(req.params.id);
    if (!conv) {
      return sendError(res, 404, 'Conversation not found');
    }
    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    sendError(res, 500, 'Failed to load conversation', err?.message);
  }
});

apiRouter.patch('/conversations/:id', (req: Request, res: Response) => {
  try {
    const conv = getConversation(req.params.id);
    if (!conv) {
      return sendError(res, 404, 'Conversation not found');
    }
    const { title, learningLevel, subject } = req.body || {};
    if (title !== undefined) conv.title = String(title).trim();
    if (learningLevel !== undefined) conv.learningLevel = learningLevel;
    if (subject !== undefined) conv.subject = String(subject).trim();
    const updated = saveConversation(conv);
    res.json({ success: true, conversation: updated });
  } catch (err: any) {
    sendError(res, 500, 'Failed to update conversation', err?.message);
  }
});

apiRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const ok = deleteConversation(req.params.id);
    if (!ok) {
      return sendError(res, 404, 'Conversation not found');
    }
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err: any) {
    sendError(res, 500, 'Failed to delete conversation', err?.message);
  }
});

apiRouter.delete('/conversations', (_req: Request, res: Response) => {
  try {
    clearAllConversations();
    res.json({ success: true, message: 'All conversations cleared' });
  } catch (err: any) {
    sendError(res, 500, 'Failed to clear conversations', err?.message);
  }
});

// Shared upload handler
const handleUpload = (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 413, 'File is too large. Maximum supported file size is 15MB.');
      }
      return sendError(res, 400, err.message || 'File upload failed');
    }
    if (!req.file) {
      return sendError(res, 400, 'No file was provided in the upload request.');
    }

    try {
      const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const parsed = await parseDocument(
        docId,
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer
      );
      res.json({
        success: true,
        document: {
          docId: parsed.docId,
          filename: parsed.filename,
          sizeBytes: parsed.sizeBytes,
          uploadedAt: parsed.uploadedAt,
          pageCount: parsed.pageCount,
          charCount: parsed.charCount,
          isScanned: parsed.isScanned,
          previewText: parsed.previewText,
          warning: parsed.warning,
        },
      });
    } catch (parseErr: any) {
      console.error('[Upload Error]', parseErr);
      return sendError(res, 422, parseErr.message || 'Failed to process document content.');
    }
  });
};

// 3. Document Upload endpoints (support both /upload and /documents/upload)
apiRouter.post('/upload', handleUpload);
apiRouter.post('/documents/upload', handleUpload);

apiRouter.get('/documents/:docId', (req: Request, res: Response) => {
  try {
    const doc = getDocument(req.params.docId);
    if (!doc) {
      return sendError(res, 404, 'Document not found');
    }
    res.json({
      success: true,
      document: {
        docId: doc.docId,
        filename: doc.filename,
        sizeBytes: doc.sizeBytes,
        uploadedAt: doc.uploadedAt,
        pageCount: doc.pageCount,
        charCount: doc.charCount,
        isScanned: doc.isScanned,
        previewText: doc.previewText,
        warning: doc.warning,
      },
    });
  } catch (err: any) {
    sendError(res, 500, 'Error retrieving document', err?.message);
  }
});

apiRouter.delete('/documents/:docId', (req: Request, res: Response) => {
  try {
    const ok = deleteDocument(req.params.docId);
    res.json({ success: ok, message: ok ? 'Document removed' : 'Document not found' });
  } catch (err: any) {
    sendError(res, 500, 'Error removing document', err?.message);
  }
});

// Helper to format conversation history into OpenAI/Groq standard messages
function buildGroqMessages(
  systemInstruction: string,
  history: ChatMessage[],
  newPrompt: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  // Sliding context window of the 10 most recent messages to manage tokens reliably
  const recent = history.slice(-10);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
  ];

  for (const msg of recent) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: newPrompt,
  });

  return messages;
}

// 4. Chat Endpoint (Normal JSON response)
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, docId, learningLevel, subject } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return sendError(res, 400, 'Message text is required.');
    }

    let conv = conversationId ? getConversation(conversationId) : null;
    if (!conv) {
      conv = createConversation({
        title: message.trim().slice(0, 40) + '...',
        learningLevel: learningLevel || 'Intermediate',
        subject: subject || 'General Academic',
      });
    }

    // Grounding with attached document if provided
    let documentContext = '';
    let documentName = '';
    if (docId) {
      const doc = getDocument(docId);
      if (doc) {
        documentName = doc.filename;
        documentContext = retrieveRelevantChunks(docId, message, 6);
        if (!conv.docIds.includes(docId)) {
          conv.docIds.push(docId);
        }
      }
    }

    const systemInstruction = buildEducationalSystemInstruction({
      learningLevel: (learningLevel || conv.learningLevel) as LearningLevel,
      subject: subject || conv.subject,
      documentContext,
      documentName,
    });

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      documentName: documentName || undefined,
      docId: docId || undefined,
      learningLevel: learningLevel || conv.learningLevel,
    };
    conv.messages.push(userMessage);

    const groqMessages = buildGroqMessages(
      systemInstruction,
      conv.messages.slice(0, -1),
      message.trim()
    );

    const completion = await createGroqChatCompletion({
      messages: groqMessages,
      temperature: 0.6,
    });

    const replyText =
      completion.choices[0]?.message?.content?.trim() ||
      "I'm sorry, I couldn't generate a response. Please try rephrasing your question.";

    const assistantMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_a',
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
      documentName: documentName || undefined,
      docId: docId || undefined,
    };
    conv.messages.push(assistantMessage);

    // Auto-update conversation title if it's still default
    if (conv.messages.length === 2 && (conv.title === 'New Study Session' || conv.title.endsWith('...'))) {
      try {
        const titleResp = await createGroqChatCompletion({
          messages: [
            {
              role: 'system',
              content: 'You generate short, crisp 3-to-5 word academic topic titles.',
            },
            {
              role: 'user',
              content: `Generate a concise 3-to-5 word academic topic title for this user query. Return ONLY the title text, with no quotes or punctuation: "${message.trim()}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 20,
        });
        const cleanTitle = titleResp.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
        if (cleanTitle && cleanTitle.length < 50) {
          conv.title = cleanTitle;
        }
      } catch {
        conv.title = message.trim().slice(0, 32);
      }
    }

    saveConversation(conv);

    res.json({
      success: true,
      reply: replyText,
      conversation: conv,
      assistantMessage,
    });
  } catch (err: any) {
    console.error('[Groq Chat Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, errMsg);
  }
});

// 5. Streaming Chat Endpoint (SSE)
apiRouter.post('/chat/stream', async (req: Request, res: Response) => {
  const { conversationId, message, docId, learningLevel, subject } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return sendError(res, 400, 'Message text is required.');
  }

  // Setup SSE headers with UTF-8 encoding
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let conv = conversationId ? getConversation(conversationId) : null;
  if (!conv) {
    conv = createConversation({
      title: message.trim().slice(0, 32) + '...',
      learningLevel: learningLevel || 'Intermediate',
      subject: subject || 'General Academic',
    });
  }

  // Grounding
  let documentContext = '';
  let documentName = '';
  if (docId) {
    const doc = getDocument(docId);
    if (doc) {
      documentName = doc.filename;
      documentContext = retrieveRelevantChunks(docId, message, 6);
      if (!conv.docIds.includes(docId)) {
        conv.docIds.push(docId);
      }
    }
  }

  const systemInstruction = buildEducationalSystemInstruction({
    learningLevel: (learningLevel || conv.learningLevel) as LearningLevel,
    subject: subject || conv.subject,
    documentContext,
    documentName,
  });

  const userMessage: ChatMessage = {
    id: 'msg_' + Date.now() + '_u',
    role: 'user',
    content: message.trim(),
    timestamp: new Date().toISOString(),
    documentName: documentName || undefined,
    docId: docId || undefined,
  };
  conv.messages.push(userMessage);

  const groqMessages = buildGroqMessages(
    systemInstruction,
    conv.messages.slice(0, -1),
    message.trim()
  );

  let fullReply = '';

  try {
    const stream = await createGroqChatStream({
      messages: groqMessages,
      temperature: 0.6,
    });

    for await (const chunk of stream) {
      const deltaContent = chunk.choices[0]?.delta?.content || '';
      if (deltaContent) {
        fullReply += deltaContent;
        res.write(`data: ${JSON.stringify({ chunk: deltaContent })}\n\n`);
      }
    }

    const assistantMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_a',
      role: 'assistant',
      content: fullReply,
      timestamp: new Date().toISOString(),
      documentName: documentName || undefined,
      docId: docId || undefined,
    };
    conv.messages.push(assistantMessage);

    let updatedTitle = conv.title;
    if (conv.messages.length === 2 && (conv.title === 'New Study Session' || conv.title.endsWith('...'))) {
      try {
        const titleResp = await createGroqChatCompletion({
          messages: [
            {
              role: 'system',
              content: 'Generate concise 3-to-5 word academic titles with no quotes.',
            },
            {
              role: 'user',
              content: `Generate a concise 3-to-5 word topic title for: "${message.trim()}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 20,
        });
        const cleanTitle = titleResp.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
        if (cleanTitle && cleanTitle.length < 50) {
          conv.title = cleanTitle;
          updatedTitle = cleanTitle;
        }
      } catch {
        conv.title = message.trim().slice(0, 32);
        updatedTitle = conv.title;
      }
    }

    saveConversation(conv);

    res.write(
      `data: ${JSON.stringify({
        done: true,
        conversationId: conv.id,
        title: updatedTitle,
        assistantMessage,
      })}\n\n`
    );
    res.end();
  } catch (err: any) {
    console.error('[Groq Stream Error]', err);
    const { message: errMsg } = formatGroqError(err);
    res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
    res.end();
  }
});

// 6. Educational Tools Endpoints

// Quiz Generator
apiRouter.post('/tools/quiz', async (req: Request, res: Response) => {
  try {
    const { topic, difficulty = 'Intermediate', questionCount = 5, docId } = req.body || {};
    if (!topic && !docId) {
      return sendError(res, 400, 'Please provide a topic or select an uploaded document.');
    }

    let docContext = '';
    if (docId) {
      docContext = retrieveRelevantChunks(docId, topic || 'quiz questions', 8);
    }

    const systemPrompt = `You are an expert academic examiner. Create an interactive educational multiple-choice quiz on the topic.
CRITICAL REQUIREMENT: Return a valid JSON object matching this exact schema:
{
  "title": "Title of the Quiz",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Clear explanation of why this option is correct."
    }
  ]
}`;

    const userPrompt = `Create an educational multiple-choice quiz on: "${topic || 'Uploaded Document'}".
Difficulty Level: ${difficulty}
Total Questions: ${Math.min(10, Math.max(2, Number(questionCount) || 5))}
${docContext ? `\nReference Material from document:\n${docContext}\n` : ''}`;

    const completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(raw);
    res.json({ success: true, quiz: parsed });
  } catch (err: any) {
    console.error('[Quiz Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, 'Failed to generate quiz: ' + errMsg);
  }
});

// Notes Generator
apiRouter.post('/tools/notes', async (req: Request, res: Response) => {
  try {
    const { topic, level = 'Intermediate', docId } = req.body || {};
    if (!topic && !docId) {
      return sendError(res, 400, 'Topic or document reference is required.');
    }

    let docContext = '';
    if (docId) {
      docContext = retrieveRelevantChunks(docId, topic || 'overview notes', 8);
    }

    const systemPrompt = `You are a master academic notes compiler and tutor. Create a comprehensive, beautifully structured study notes guide.
Structure the notes with clear Markdown:
# [Topic Title] - Comprehensive Study Notes

## 1. Executive Summary & Core Intuition
(High-level mental model and key premise)

## 2. Essential Terminology & Definitions
(Key vocabulary clearly defined)

## 3. Core Principles & Mechanisms
(Step-by-step breakdown with real-world analogies)

## 4. Key Formulas / Code / Rules
(Mathematical equations in LaTeX like $E = mc^2$, or syntax examples)

## 5. Practical Examples & Case Studies
(Concrete worked examples)

## 6. Common Pitfalls & Misconceptions
(What students frequently confuse and how to avoid it)

## 7. Quick Revision Checklist
(5-7 high-yield bullet points for immediate exam recall)`;

    const userPrompt = `Generate structured study notes for: "${topic || 'Uploaded Document'}".
Level: ${level}
${docContext ? `\nSource Material:\n${docContext}\n` : ''}`;

    const completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    res.json({
      success: true,
      notes: completion.choices[0]?.message?.content || '',
    });
  } catch (err: any) {
    console.error('[Notes Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, 'Failed to generate notes: ' + errMsg);
  }
});

// Flashcards Generator
apiRouter.post('/tools/flashcards', async (req: Request, res: Response) => {
  try {
    const { topic, count = 8, docId } = req.body || {};
    if (!topic && !docId) {
      return sendError(res, 400, 'Topic or document reference is required.');
    }

    let docContext = '';
    if (docId) {
      docContext = retrieveRelevantChunks(docId, topic || 'key terms concepts', 8);
    }

    const systemPrompt = `Generate a high-yield study flashcard deck.
CRITICAL REQUIREMENT: Return a valid JSON object matching this schema:
{
  "deckTitle": "Flashcards on ${topic || 'Topic'}",
  "cards": [
    {
      "id": 1,
      "front": "Concept or Question",
      "back": "Clear, concise definition or insight (with formula if relevant)",
      "category": "Core Concept | Formula | Application | Definition"
    }
  ]
}`;

    const userPrompt = `Create flashcards for: "${topic || 'Uploaded Document'}".
Total Cards: ${Math.min(15, Math.max(4, Number(count) || 8))}
${docContext ? `\nReference Material:\n${docContext}\n` : ''}`;

    const completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content?.trim() || '{}');
    res.json({ success: true, deck: parsed });
  } catch (err: any) {
    console.error('[Flashcards Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, 'Failed to generate flashcards: ' + errMsg);
  }
});

// Study Planner
apiRouter.post('/tools/study-plan', async (req: Request, res: Response) => {
  try {
    const { subject, syllabus, hoursPerWeek = 10, targetDate } = req.body || {};
    if (!subject) {
      return sendError(res, 400, 'Subject is required to generate a study plan.');
    }

    const systemPrompt = `You are an elite academic productivity coach and curriculum architect. Build an actionable, realistic study schedule in Markdown with tables, daily blocks, and retention techniques.`;

    const userPrompt = `Build an actionable study schedule for:
Subject: ${subject}
Syllabus / Scope: ${syllabus || 'Standard college curriculum for this subject'}
Available Study Time: ${hoursPerWeek} hours/week
Target Exam / Completion Date: ${targetDate || '4 weeks from today'}

Include:
1. Overall Strategy & Milestones
2. Week-by-Week breakdown with daily study blocks
3. High-Yield Practice & Self-testing allocations
4. Buffer days for review and past papers
5. 3 Proven memory retention techniques for this specific subject`;

    const completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    res.json({
      success: true,
      plan: completion.choices[0]?.message?.content || '',
    });
  } catch (err: any) {
    console.error('[Study Plan Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, 'Failed to generate study plan: ' + errMsg);
  }
});

// AI Code Tutor
apiRouter.post('/tools/code-tutor', async (req: Request, res: Response) => {
  try {
    const { language = 'Python', code, question, mode = 'explain' } = req.body || {};
    if (!code && !question) {
      return sendError(res, 400, 'Please provide code or a programming question.');
    }

    const systemPrompt = `You are EduMind's AI Senior Code Tutor specializing in Computer Science education powered by Groq.
Deconstruct code, compute Big-O complexity, debug errors, and provide clear explanations.`;

    const userPrompt = `Language: ${language}
Mode: ${mode} (explain | debug | optimize | complexity)
Code Snippet:
\`\`\`${language.toLowerCase()}
${code || '// Direct inquiry without snippet'}
\`\`\`

User Question / Task: ${question || 'Analyze this code, explain its behavior step-by-step, compute Big-O complexity, and provide refactored optimal code.'}

Provide:
1. High-Level Explanation (What the algorithm/code accomplishes conceptually)
2. Line-by-Line or Logic Breakdown
3. Big-O Time & Space Complexity Analysis (with mathematical justification)
4. Edge Cases to Beware Of
5. Refactored / Optimal Code Snippet with explanatory comments`;

    const completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    res.json({
      success: true,
      analysis: completion.choices[0]?.message?.content || '',
    });
  } catch (err: any) {
    console.error('[Code Tutor Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, 'Failed to analyze code: ' + errMsg);
  }
});

// Summarizer
apiRouter.post('/tools/summarize', async (req: Request, res: Response) => {
  try {
    const { text, docId, length = 'medium' } = req.body || {};
    if (!text && !docId) {
      return sendError(res, 400, 'Please provide text or attach a document to summarize.');
    }

    let contentToSummarize = text || '';
    if (docId) {
      const doc = getDocument(docId);
      if (doc) {
        contentToSummarize = doc.fullText.slice(0, 15000);
      }
    }

    const lengthInstructions = {
      short: 'Provide a crisp Executive TL;DR in 3-5 bullet points focusing solely on the core takeaway.',
      medium: 'Provide a structured summary with 1 paragraph overview and 6-8 key conceptual takeaways with explanations.',
      detailed: 'Provide an in-depth breakdown covering main thesis, supporting arguments, critical evidence/formulas, and conclusions.',
    }[length as 'short' | 'medium' | 'detailed'] || 'Provide a balanced summary with key points.';

    const systemPrompt = `You are an expert academic summarizer. Distill complex educational materials into clear, high-retention summaries.`;

    const userPrompt = `Summarize the following educational content.
Summary Depth: ${length}
Instructions: ${lengthInstructions}

Content:
${contentToSummarize}`;

    const completion = await createGroqChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    });

    res.json({
      success: true,
      summary: completion.choices[0]?.message?.content || '',
    });
  } catch (err: any) {
    console.error('[Summarizer Error]', err);
    const { message: errMsg, statusCode } = formatGroqError(err);
    sendError(res, statusCode, 'Failed to summarize content: ' + errMsg);
  }
});
