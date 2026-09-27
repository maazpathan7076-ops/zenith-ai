import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Edit2,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Message } from '../types/chat';
import { MarkdownContent } from './MarkdownText';

interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
  isLastAiMessage: boolean;
  onRegenerate: () => void;
  onEditUserMessage: (newContent: string) => void;
  onFeedback: (feedback: 'up' | 'down' | null) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  isLastAiMessage,
  onRegenerate,
  onEditUserMessage,
  onFeedback,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendEdit = () => {
    if (editedText.trim()) {
      setIsEditing(false);
      onEditUserMessage(editedText.trim());
    }
  };

  if (isUser) {
    return (
      <div className="flex w-full flex-col items-end px-4 py-2" data-testid="user_message_row">
        <div className="max-w-[85%] md:max-w-[75%] space-y-1.5 flex flex-col items-end">
          {/* Uploaded Image */}
          {message.imageUri && (
            <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm max-w-[240px]">
              <img
                src={message.imageUri}
                alt="User attached file"
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          {isEditing ? (
            <div className="w-full min-w-[280px] rounded-2xl border border-slate-300 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                rows={3}
                autoFocus
              />
              <div className="mt-2.5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedText(message.content);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEdit}
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl rounded-br-xs bg-indigo-100 px-4 py-2.5 text-[15px] leading-relaxed text-indigo-950 shadow-xs dark:bg-indigo-900/60 dark:text-indigo-100"
                data-testid="user_message_bubble"
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>

              {/* Actions row: edit, copy */}
              <div className="flex items-center gap-1 pr-1 text-slate-400">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditedText(message.content);
                  }}
                  className="rounded p-1 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Edit message"
                  data-testid="edit_user_message_button"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCopy}
                  className="rounded p-1 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Copy message"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ASSISTANT (MODEL) MESSAGE
  return (
    <div className="flex w-full flex-col items-start px-4 py-2.5" data-testid="ai_message_row">
      <div className="max-w-[95%] md:max-w-[85%] space-y-2">
        {/* Header with avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#6366F1] via-[#06B6D4] to-[#8B5CF6] text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Zenith AI
          </span>
        </div>

        {/* AI Message Card */}
        <div
          className="rounded-2xl rounded-tl-xs border border-slate-200 bg-white p-4 shadow-xs dark:border-[#2F3547] dark:bg-[#181B26]"
          data-testid="ai_message_bubble"
        >
          {message.status === 'error' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-sm text-rose-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">
                  {message.content || 'An error occurred while generating the response.'}
                </span>
              </div>
              {isLastAiMessage && !isStreaming && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    data-testid="retry_message_button"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <MarkdownContent
              content={message.content}
              isStreaming={isStreaming && message.status === 'streaming'}
            />
          )}
        </div>

        {/* AI Actions Row */}
        {(message.status !== 'streaming' || message.content.length > 0) && (
          <div className="flex items-center gap-1 pl-1 text-slate-400 dark:text-slate-500">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Copy response"
              data-testid="copy_ai_response_button"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>

            {/* Thumbs up */}
            <button
              onClick={() => onFeedback(message.feedback === 'up' ? null : 'up')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800 ${
                message.feedback === 'up'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Good response"
              data-testid="thumbs_up_button"
            >
              <ThumbsUp
                className={`h-4 w-4 ${message.feedback === 'up' ? 'fill-current' : ''}`}
              />
            </button>

            {/* Thumbs down */}
            <button
              onClick={() => onFeedback(message.feedback === 'down' ? null : 'down')}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800 ${
                message.feedback === 'down'
                  ? 'text-rose-500'
                  : 'hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Poor response"
              data-testid="thumbs_down_button"
            >
              <ThumbsDown
                className={`h-4 w-4 ${message.feedback === 'down' ? 'fill-current' : ''}`}
              />
            </button>

            {/* Regenerate (if last AI message) */}
            {isLastAiMessage && !isStreaming && (
              <button
                onClick={onRegenerate}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                title="Regenerate response"
                data-testid="regenerate_button"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
