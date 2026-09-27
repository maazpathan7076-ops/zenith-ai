import React, { useState } from 'react';
import {
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { Conversation, GroupedConversations } from '../types/chat';

interface HistoryDrawerProps {
  groupedConversations: GroupedConversations[];
  currentConversationId: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  onCloseMobileDrawer?: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  groupedConversations,
  currentConversationId,
  searchQuery,
  onSearchQueryChange,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onCloseMobileDrawer,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingConv, setRenamingConv] = useState<Conversation | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deletingConv, setDeletingConv] = useState<Conversation | null>(null);

  const handleOpenRename = (conv: Conversation) => {
    setActiveMenuId(null);
    setRenamingConv(conv);
    setRenameTitle(conv.title);
  };

  const handleConfirmRename = () => {
    if (renamingConv && renameTitle.trim()) {
      onRenameConversation(renamingConv.id, renameTitle.trim());
      setRenamingConv(null);
    }
  };

  const handleOpenDelete = (conv: Conversation) => {
    setActiveMenuId(null);
    setDeletingConv(conv);
  };

  const handleConfirmDelete = () => {
    if (deletingConv) {
      onDeleteConversation(deletingConv.id);
      setDeletingConv(null);
    }
  };

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-slate-200 bg-white p-3.5 dark:border-[#2F3547] dark:bg-[#181B26]"
      data-testid="history_drawer"
    >
      {/* Header Branding */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#6366F1] via-[#06B6D4] to-[#8B5CF6] text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
            Zenith AI
          </span>
        </div>
        {onCloseMobileDrawer && (
          <button
            onClick={onCloseMobileDrawer}
            className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <button
        onClick={() => {
          onNewChat();
          onCloseMobileDrawer?.();
        }}
        className="mb-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
        data-testid="drawer_new_chat_button"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">New Chat</span>
      </button>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search chats..."
          className="h-9 w-full rounded-xl border border-transparent bg-slate-100 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 dark:bg-[#232736] dark:text-slate-100 dark:placeholder-slate-500"
          data-testid="search_chats_input"
        />
      </div>

      {/* Grouped Conversations List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {groupedConversations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {searchQuery ? 'No conversations found' : 'No chat history yet'}
          </div>
        ) : (
          groupedConversations.map((group) => (
            <div key={group.group} className="space-y-1">
              <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.group}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((conv) => {
                  const isSelected = conv.id === currentConversationId;
                  const isMenuOpen = activeMenuId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="group relative flex items-center justify-between rounded-xl transition-colors"
                      data-testid={`conversation_item_${conv.id}`}
                    >
                      <button
                        onClick={() => {
                          onSelectConversation(conv.id);
                          onCloseMobileDrawer?.();
                        }}
                        className={`flex flex-1 items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                            : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-[#232736]/70'
                        }`}
                      >
                        <MessageSquare
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isSelected
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{conv.title}</span>
                      </button>

                      {/* Dropdown menu trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : conv.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Chat options"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-2 top-8 z-30 w-32 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#2F3547] dark:bg-[#1E2130]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenRename(conv)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => handleOpenDelete(conv)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings at bottom */}
      <div className="border-t border-slate-200 pt-2 dark:border-[#2F3547]">
        <button
          onClick={() => {
            onOpenSettings();
            onCloseMobileDrawer?.();
          }}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#232736]"
          data-testid="drawer_settings_button"
        >
          <Settings className="h-4 w-4 text-slate-500" />
          <span>Settings</span>
        </button>
      </div>

      {/* Rename Dialog Modal */}
      {renamingConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-[#181B26]">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Rename Chat
            </h3>
            <input
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:text-slate-100"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRenamingConv(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-[#181B26]">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Delete Chat?
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This will permanently remove "{deletingConv.title}" and its messages.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeletingConv(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
