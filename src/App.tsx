import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { MessageComposer } from './components/MessageComposer.js';
import { CodeTutorModal } from './components/tools/CodeTutorModal.js';
import { QuizModal } from './components/tools/QuizModal.js';
import { NotesModal } from './components/tools/NotesModal.js';
import { FlashcardsModal } from './components/tools/FlashcardsModal.js';
import { StudyPlannerModal } from './components/tools/StudyPlannerModal.js';
import { SummarizerModal } from './components/tools/SummarizerModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { api } from './services/api.js';
import { Conversation, LearningLevel, UploadedDocument, ActiveTool } from './types.js';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('edumind_theme') as 'dark' | 'light') || 'dark';
  });

  // Learning preferences
  const [learningLevel, setLearningLevel] = useState<LearningLevel>(() => {
    return (localStorage.getItem('edumind_learning_level') as LearningLevel) || 'Intermediate';
  });
  const [subject, setSubject] = useState<string>(() => {
    return localStorage.getItem('edumind_subject') || 'General Academic';
  });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<ActiveTool>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Chat message & input state
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Attached document state
  const [attachedDoc, setAttachedDoc] = useState<UploadedDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('edumind_theme', theme);
  }, [theme]);

  // Persist learning preferences
  useEffect(() => {
    localStorage.setItem('edumind_learning_level', learningLevel);
  }, [learningLevel]);

  useEffect(() => {
    localStorage.setItem('edumind_subject', subject);
  }, [subject]);

  // Initial load: check health & fetch conversations
  useEffect(() => {
    async function init() {
      try {
        const health = await api.getHealth();
        setServerOnline(health.success);
      } catch (err) {
        console.warn('[Server Health Warning]', err);
        setServerOnline(false);
      }

      try {
        const list = await api.getConversations();
        setConversations(list);
        if (list.length > 0 && !activeConversationId) {
          setActiveConversationId(list[0].id);
        }
      } catch (err) {
        console.error('[Failed to fetch conversations]', err);
      }
    }
    init();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape') {
        setActiveTool('none');
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Create new chat
  const handleNewChat = useCallback(async () => {
    try {
      const newConv = await api.createConversation({
        learningLevel,
        subject,
      });
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveTool('none');
      setInput('');
      setStreamingMessage('');
    } catch (err) {
      console.error('[Create Chat Error]', err);
    }
  }, [learningLevel, subject]);

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => {
        const next = prev.filter(c => c.id !== id);
        if (activeConversationId === id) {
          setActiveConversationId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    } catch (err) {
      console.error('[Delete Conversation Error]', err);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await api.updateConversation(id, { title: newTitle });
      setConversations(prev => prev.map(c => (c.id === id ? updated : c)));
    } catch (err) {
      console.error('[Rename Error]', err);
    }
  };

  // Clear all conversations
  const handleClearAll = async () => {
    try {
      await api.clearAllConversations();
      setConversations([]);
      setActiveConversationId(null);
    } catch (err) {
      console.error('[Clear All Error]', err);
    }
  };

  // Document upload handler
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const doc = await api.uploadDocument(file);
      setAttachedDoc(doc);
      if (doc.warning) {
        setUploadError(doc.warning);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Document upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Document remove handler
  const handleRemoveDoc = () => {
    if (attachedDoc) {
      api.deleteDocument(attachedDoc.docId).catch(console.error);
    }
    setAttachedDoc(null);
    setUploadError(null);
  };

  // Stop active generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend !== undefined ? textToSend : input).trim();
    if (!messageContent && !attachedDoc) return;
    if (isGenerating) return;

    let convId = activeConversationId;

    // If no active conversation, create one first
    if (!convId) {
      try {
        const created = await api.createConversation({
          title: messageContent.slice(0, 36) + '...',
          learningLevel,
          subject,
        });
        setConversations(prev => [created, ...prev]);
        setActiveConversationId(created.id);
        convId = created.id;
      } catch (err) {
        console.error('Failed to create session:', err);
        return;
      }
    }

    // Append optimistic user message
    const tempUserMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user' as const,
      content: messageContent,
      timestamp: new Date().toISOString(),
      documentName: attachedDoc?.filename,
      docId: attachedDoc?.docId,
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: [...c.messages, tempUserMessage],
          };
        }
        return c;
      })
    );

    // Clear input & reset streaming buffer
    setInput('');
    setStreamingMessage('');
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentDoc = attachedDoc;

    try {
      let accumulatedReply = '';
      await api.streamChat(
        {
          conversationId: convId,
          message: messageContent,
          docId: currentDoc?.docId,
          learningLevel,
          subject,
        },
        // On stream chunk
        (chunk: string) => {
          accumulatedReply += chunk;
          setStreamingMessage(accumulatedReply);
        },
        // On stream completion
        (doneData: any) => {
          setIsGenerating(false);
          setStreamingMessage('');
          abortControllerRef.current = null;
          if (doneData.assistantMessage) {
            setConversations(prev =>
              prev.map(c => {
                if (c.id === convId) {
                  return {
                    ...c,
                    title: doneData.title || c.title,
                    messages: [...c.messages, doneData.assistantMessage],
                  };
                }
                return c;
              })
            );
          }
        },
        // On error
        (err: Error) => {
          setIsGenerating(false);
          setStreamingMessage('');
          abortControllerRef.current = null;
          console.error('[Chat Error]', err);
          const errorMessage = {
            id: 'msg_' + Date.now() + '_err',
            role: 'assistant' as const,
            content: `⚠️ **Unable to complete response:** ${err.message}\n\nPlease check your server connection or try asking again.`,
            timestamp: new Date().toISOString(),
          };
          setConversations(prev =>
            prev.map(c => {
              if (c.id === convId) {
                return {
                  ...c,
                  messages: [...c.messages, errorMessage],
                };
              }
              return c;
            })
          );
        },
        controller.signal
      );
    } catch (err: any) {
      console.error('[Execution Error]', err);
      setIsGenerating(false);
      setStreamingMessage('');
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const lastUserMsg = [...activeConversation.messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={id => setActiveConversationId(id)}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        learningLevel={learningLevel}
        onChangeLearningLevel={setLearningLevel}
        subject={subject}
        onChangeSubject={setSubject}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        serverOnline={serverOnline}
      />

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <ChatArea
          conversation={activeConversation}
          messages={activeConversation?.messages || []}
          isGenerating={isGenerating}
          streamingMessage={streamingMessage}
          onSendMessage={handleSendMessage}
          onRegenerate={handleRegenerate}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onFileUpload={handleFileUpload}
          learningLevel={learningLevel}
          subject={subject}
        />

        {/* Fixed Message Composer */}
        <MessageComposer
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          onStop={handleStopGeneration}
          isGenerating={isGenerating}
          attachedDoc={attachedDoc}
          onRemoveDoc={handleRemoveDoc}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      </main>

      {/* Dedicated Academic Tool Modals */}
      <CodeTutorModal
        isOpen={activeTool === 'code-tutor'}
        onClose={() => setActiveTool('none')}
      />

      <QuizModal
        isOpen={activeTool === 'quiz'}
        onClose={() => setActiveTool('none')}
        attachedDoc={attachedDoc}
      />

      <NotesModal
        isOpen={activeTool === 'notes'}
        onClose={() => setActiveTool('none')}
        attachedDoc={attachedDoc}
      />

      <FlashcardsModal
        isOpen={activeTool === 'flashcards'}
        onClose={() => setActiveTool('none')}
        attachedDoc={attachedDoc}
      />

      <StudyPlannerModal
        isOpen={activeTool === 'study-plan'}
        onClose={() => setActiveTool('none')}
      />

      <SummarizerModal
        isOpen={activeTool === 'summarize'}
        onClose={() => setActiveTool('none')}
        attachedDoc={attachedDoc}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
        learningLevel={learningLevel}
        onChangeLearningLevel={setLearningLevel}
        subject={subject}
        onChangeSubject={setSubject}
        onClearAllConversations={handleClearAll}
      />
    </div>
  );
}
