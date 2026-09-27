import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Music2,
} from 'lucide-react';
import {
  AI_MODES,
  ALL_MODELS,
  AiModeConfig,
  AiModelInfo,
  AppSettings,
  Conversation,
  Message,
  ThemeMode,
} from '../types/chat';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { HistoryDrawer } from './HistoryDrawer';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { ModeSelectorSheet } from './ModeSelectorSheet';
import { ModelSelectorSheet } from './ModelSelectorSheet';
import { SettingsDialog } from './SettingsDialog';
import { WelcomeView } from './WelcomeView';
import { AudioStudio } from './AudioStudio';

export const ChatScreen: React.FC = () => {
  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());

  // Conversation & Messages State
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    storage.getAllConversations()
  );
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Model & Mode
  const [activeModel, setActiveModel] = useState<AiModelInfo>(() => {
    return (
      ALL_MODELS.find((m) => m.id === settings.defaultModelId) || ALL_MODELS[0]
    );
  });
  const [activeMode, setActiveMode] = useState<AiModeConfig>(() => {
    return AI_MODES[settings.defaultModeId] || AI_MODES.chat;
  });

  // Composer State
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dialogs & Sheets
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showAudioStudio, setShowAudioStudio] = useState(false);

  // Abort controller for cancelling generation
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      settings.themeMode === 'dark' ||
      (settings.themeMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.themeMode]);

  // Load messages whenever current conversation changes
  useEffect(() => {
    if (currentConversation) {
      setMessages(storage.getMessages(currentConversation.id));
      if (currentConversation.modelId) {
        const found = ALL_MODELS.find((m) => m.id === currentConversation.modelId);
        if (found) setActiveModel(found);
      }
      if (currentConversation.mode && AI_MODES[currentConversation.mode]) {
        setActiveMode(AI_MODES[currentConversation.mode]);
      }
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // Auto-scroll on new messages or streaming changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Save settings helper
  const handleUpdateSettings = (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    storage.saveSettings(updated);
  };

  // Select conversation
  const handleSelectConversation = (id: string) => {
    if (currentConversation?.id === id) return;
    if (isGenerating) handleStopGenerating();
    const conv = storage.getConversationById(id);
    if (conv) {
      setCurrentConversation(conv);
    }
  };

  // New Chat
  const handleNewChat = () => {
    if (isGenerating) handleStopGenerating();
    setCurrentConversation(null);
    setMessages([]);
    setInputText('');
    setSelectedImage(null);
  };

  // Rename conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    const conv = storage.getConversationById(id);
    if (conv) {
      const updated = { ...conv, title: newTitle, updatedAt: Date.now() };
      storage.saveConversation(updated);
      setConversations(storage.getAllConversations());
      if (currentConversation?.id === id) {
        setCurrentConversation(updated);
      }
    }
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    storage.deleteConversation(id);
    setConversations(storage.getAllConversations());
    if (currentConversation?.id === id) {
      handleNewChat();
    }
  };

  // Clear all chats
  const handleClearAllChats = () => {
    storage.deleteAllConversations();
    setConversations([]);
    handleNewChat();
  };

  // Send message
  const handleSendMessage = async (promptOverride?: string) => {
    const promptToSend = promptOverride ?? inputText;
    const imageToSend = selectedImage;

    if (!promptToSend.trim() && !imageToSend) return;
    if (isGenerating) return;

    // Reset composer
    setInputText('');
    setSelectedImage(null);
    setIsGenerating(true);

    let activeConv = currentConversation;
    if (!activeConv) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: storage.generateCleanTitle(promptToSend),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: activeModel.id,
        mode: activeMode.id,
      };
      storage.saveConversation(newConv);
      setConversations(storage.getAllConversations());
      setCurrentConversation(newConv);
      activeConv = newConv;
    } else if (activeConv.title === 'New Chat') {
      const newTitle = storage.generateCleanTitle(promptToSend);
      activeConv = { ...activeConv, title: newTitle, updatedAt: Date.now() };
      storage.saveConversation(activeConv);
      setConversations(storage.getAllConversations());
      setCurrentConversation(activeConv);
    }

    // 1. Add User Message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: activeConv.id,
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
      status: 'completed',
      imageUri: imageToSend,
    };
    storage.saveMessage(userMessage);

    // 2. Add Assistant Streaming Placeholder
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: activeConv.id,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      status: 'streaming',
    };
    storage.saveMessage(assistantMessage);
    setMessages(storage.getMessages(activeConv.id));

    // Abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let streamedContent = '';

    try {
      if (settings.isStreamingEnabled) {
        await api.streamChat({
          modelId: activeModel.id,
          systemInstruction: activeMode.systemInstruction,
          mode: activeMode.id,
          history: messages,
          prompt: promptToSend,
          image: imageToSend,
          temperature: settings.temperature,
          customApiKey: settings.customApiKey,
          signal: controller.signal,
          onChunk: (chunk) => {
            streamedContent += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id ? { ...m, content: streamedContent } : m
              )
            );
          },
        });

        storage.updateMessage(assistantMessage.id, {
          content: streamedContent,
          status: 'completed',
        });
      } else {
        const fullAnswer = await api.generateChat({
          modelId: activeModel.id,
          systemInstruction: activeMode.systemInstruction,
          mode: activeMode.id,
          history: messages,
          prompt: promptToSend,
          image: imageToSend,
          temperature: settings.temperature,
          customApiKey: settings.customApiKey,
        });

        storage.updateMessage(assistantMessage.id, {
          content: fullAnswer,
          status: 'completed',
        });
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        storage.updateMessage(assistantMessage.id, {
          content: streamedContent || 'Response stopped.',
          status: 'completed',
        });
      } else {
        storage.updateMessage(assistantMessage.id, {
          content: err?.message || 'Failed to generate response.',
          status: 'error',
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      if (activeConv) {
        setMessages(storage.getMessages(activeConv.id));
      }
    }
  };

  // Stop generating
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Regenerate last AI message
  const handleRegenerateLastMessage = () => {
    if (!currentConversation || isGenerating) return;
    const currentMsgs = storage.getMessages(currentConversation.id);
    const lastAi = [...currentMsgs].reverse().find((m) => m.role === 'model');
    const lastUser = [...currentMsgs].reverse().find((m) => m.role === 'user');

    if (lastAi && lastUser) {
      storage.deleteMessagesFrom(currentConversation.id, lastAi.timestamp);
      setMessages(storage.getMessages(currentConversation.id));
      handleSendMessage(lastUser.content);
    }
  };

  // Edit user message
  const handleEditUserMessage = (editedText: string) => {
    if (!currentConversation || isGenerating) return;
    const currentMsgs = storage.getMessages(currentConversation.id);
    const lastUser = [...currentMsgs].reverse().find((m) => m.role === 'user');

    if (lastUser) {
      storage.deleteMessagesFrom(currentConversation.id, lastUser.timestamp);
      setMessages(storage.getMessages(currentConversation.id));
      handleSendMessage(editedText);
    }
  };

  // Set message feedback
  const handleFeedback = (messageId: string, feedback: 'up' | 'down' | null) => {
    storage.updateMessage(messageId, { feedback });
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
  };

  // Filter grouped conversations
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const groupedConversations = React.useMemo(
    () => storage.groupConversations(filteredConversations),
    [filteredConversations]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0F1117] dark:text-slate-100">
      {/* Desktop Persistent Sidebar (>840px) */}
      <div className="hidden md:flex h-full w-72 shrink-0">
        <HistoryDrawer
          groupedConversations={groupedConversations}
          currentConversationId={currentConversation?.id || null}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setShowSettingsDialog(true)}
        />
      </div>

      {/* Mobile Drawer (Overlay) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-50 h-full w-80 max-w-[85vw] shadow-2xl">
            <HistoryDrawer
              groupedConversations={groupedConversations}
              currentConversationId={currentConversation?.id || null}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onRenameConversation={handleRenameConversation}
              onDeleteConversation={handleDeleteConversation}
              onOpenSettings={() => setShowSettingsDialog(true)}
              onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top AppBar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3.5 dark:border-[#2F3547] dark:bg-[#181B26]">
          {/* Left: Mobile Drawer button + Title area */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Open menu"
              data-testid="drawer_toggle_button"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Clickable title area to select model */}
            <button
              onClick={() => setShowModelSheet(true)}
              className="flex items-center gap-2.5 rounded-full px-2.5 py-1 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              data-testid="top_bar_title_area"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#6366F1] via-[#06B6D4] to-[#8B5CF6] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="max-w-[140px] sm:max-w-[240px] truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {currentConversation?.title || 'Zenith AI'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  {activeModel.name} • {activeMode.title}
                </span>
              </div>
            </button>
          </div>

          {/* Right: New Chat + Settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="New Chat"
              data-testid="top_new_chat_button"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowAudioStudio(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Audio Studio"
              data-testid="audio_studio_button"
            >
              <Music2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettingsDialog(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Settings"
              data-testid="top_settings_button"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Messages Body */}
        <main className="flex-1 overflow-y-auto" data-testid="messages_list">
          {messages.length === 0 ? (
            <WelcomeView onSelectPrompt={handleSendMessage} />
          ) : (
            <div className="mx-auto max-w-4xl py-4">
              {messages.map((msg, index) => {
                const isLastAi =
                  index === messages.map((m) => m.role).lastIndexOf('model');
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isStreaming={isGenerating}
                    isLastAiMessage={isLastAi}
                    onRegenerate={handleRegenerateLastMessage}
                    onEditUserMessage={handleEditUserMessage}
                    onFeedback={(fb) => handleFeedback(msg.id, fb)}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Message Composer Bottom Bar */}
        <MessageComposer
          inputText={inputText}
          onInputTextChange={setInputText}
          selectedImage={selectedImage}
          onImageSelected={setSelectedImage}
          currentModel={activeModel}
          onOpenModelSelector={() => setShowModelSheet(true)}
          currentMode={activeMode}
          onOpenModeSelector={() => setShowModeSheet(true)}
          isGenerating={isGenerating}
          onSend={() => handleSendMessage()}
          onStop={handleStopGenerating}
          sendOnEnter={settings.sendOnEnter}
        />
      </div>

      {/* Model Selector Sheet */}
      {showModelSheet && (
        <ModelSelectorSheet
          selectedModelId={activeModel.id}
          onModelSelected={setActiveModel}
          onClose={() => setShowModelSheet(false)}
        />
      )}

      {/* Mode Selector Sheet */}
      {showModeSheet && (
        <ModeSelectorSheet
          selectedMode={activeMode}
          onModeSelected={setActiveMode}
          onClose={() => setShowModeSheet(false)}
        />
      )}

      {showAudioStudio && <AudioStudio onClose={() => setShowAudioStudio(false)} customApiKey={settings.customApiKey} />}

      {/* Settings Dialog */}
      {showSettingsDialog && (
        <SettingsDialog
          settings={settings}
          onUpdateTheme={(theme: ThemeMode) => handleUpdateSettings({ themeMode: theme })}
          onUpdateStreaming={(enabled: boolean) =>
            handleUpdateSettings({ isStreamingEnabled: enabled })
          }
          onUpdateHaptic={(enabled: boolean) =>
            handleUpdateSettings({ isHapticEnabled: enabled })
          }
          onUpdateTemperature={(temperature: number) =>
            handleUpdateSettings({ temperature })
          }
          onUpdateDefaultModel={(defaultModelId: string) =>
            handleUpdateSettings({ defaultModelId })
          }
          onUpdateApiKey={(customApiKey: string) =>
            handleUpdateSettings({ customApiKey })
          }
          onClearAllChats={handleClearAllChats}
          onClose={() => setShowSettingsDialog(false)}
        />
      )}
    </div>
  );
};
