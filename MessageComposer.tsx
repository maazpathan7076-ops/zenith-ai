import React, { useRef, useEffect } from 'react';
import {
  ChevronDown,
  Globe,
  Image as ImageIcon,
  Mic,
  MicOff,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Square,
  X,
  Brain,
} from 'lucide-react';
import { AiModeConfig, AiModelInfo } from '../types/chat';

interface MessageComposerProps {
  inputText: string;
  onInputTextChange: (text: string) => void;
  selectedImage: string | null;
  onImageSelected: (image: string | null) => void;
  currentModel: AiModelInfo;
  onOpenModelSelector: () => void;
  currentMode: AiModeConfig;
  onOpenModeSelector: () => void;
  isGenerating: boolean;
  onSend: () => void;
  onStop: () => void;
  sendOnEnter?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  inputText,
  onInputTextChange,
  selectedImage,
  onImageSelected,
  currentModel,
  onOpenModelSelector,
  currentMode,
  onOpenModeSelector,
  isGenerating,
  onSend,
  onStop,
  sendOnEnter = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = React.useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [inputText]);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image file must be under 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageSelected(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Web Speech recognition
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onInputTextChange(inputText ? `${inputText} ${transcript}` : transcript);
        }
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Keyboard behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (sendOnEnter) {
        if (!e.shiftKey) {
          e.preventDefault();
          if (inputText.trim() || selectedImage) onSend();
        }
      } else {
        // Default behavior: Enter sends, Shift+Enter adds newline
        if (!e.shiftKey) {
          e.preventDefault();
          if (inputText.trim() || selectedImage) onSend();
        }
      }
    }
  };

  const getModeIcon = (modeId: string) => {
    switch (modeId) {
      case 'web_search':
        return <Globe className="h-3.5 w-3.5" />;
      case 'deep_research':
        return <Brain className="h-3.5 w-3.5" />;
      case 'create_image':
        return <ImageIcon className="h-3.5 w-3.5" />;
      default:
        return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  const getPlaceholder = () => {
    switch (currentMode.id) {
      case 'web_search':
        return 'Search the web with Zenith...';
      case 'deep_research':
        return 'Ask for deep research...';
      case 'create_image':
        return 'Describe an image to generate...';
      default:
        return 'Message Zenith AI...';
    }
  };

  const canSend = inputText.trim().length > 0 || selectedImage !== null;

  return (
    <div className="w-full border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-md dark:border-[#2F3547] dark:bg-[#181B26]/95">
      <div className="mx-auto max-w-4xl space-y-2">
        {/* Top Pill Bar: Mode Selector & Model Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {/* Mode Pill */}
          <button
            onClick={onOpenModeSelector}
            style={{
              color: currentMode.accentColor,
              borderColor: `${currentMode.accentColor}55`,
              backgroundColor: `${currentMode.accentColor}18`,
            }}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-opacity hover:opacity-85"
            data-testid="mode_selector_pill"
          >
            {getModeIcon(currentMode.id)}
            <span>{currentMode.title}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {/* Model Pill */}
          <button
            onClick={onOpenModelSelector}
            className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            data-testid="model_selector_pill"
          >
            <Sparkles className="h-3 w-3 text-indigo-500" />
            <span>{currentModel.name}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
        </div>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="relative inline-block">
            <div className="h-18 w-18 overflow-hidden rounded-xl border border-indigo-400 shadow-sm">
              <img
                src={selectedImage}
                alt="Selected attachment"
                className="h-full w-full object-cover"
              />
            </div>
            <button
              onClick={() => onImageSelected(null)}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-xs hover:bg-slate-800"
              title="Remove attachment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Main Composer Box */}
        <div className="flex items-end gap-1.5 rounded-3xl bg-slate-100/90 p-1.5 dark:bg-[#232736]/90 border border-slate-200/80 dark:border-[#2F3547]">
          {/* File Picker input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Attach Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title="Attach image"
            data-testid="attachment_button"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => onInputTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            rows={1}
            className="max-h-36 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
            data-testid="message_input_field"
          />

          {/* Voice Input Button */}
          {!inputText && !selectedImage && !isGenerating && (
            <button
              onClick={handleVoiceInput}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
              }`}
              title={isRecording ? 'Stop voice input' : 'Voice input'}
              data-testid="voice_input_button"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Send or Stop Button */}
          {isGenerating ? (
            <button
              onClick={onStop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white transition-opacity hover:opacity-90 shadow-xs"
              title="Stop generating"
              data-testid="stop_generating_button"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (canSend) onSend();
              }}
              disabled={!canSend}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                canSend
                  ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                  : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Send message"
              data-testid="send_message_button"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
