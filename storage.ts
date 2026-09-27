import {
  AppSettings,
  Conversation,
  ConversationGroup,
  DEFAULT_SETTINGS,
  GroupedConversations,
  Message,
} from '../types/chat';

const SETTINGS_KEY = 'zenith_settings';
const CONVERSATIONS_KEY = 'zenith_conversations';
const MESSAGES_KEY = 'zenith_messages';

export const storage = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      if (
        !parsed.defaultModelId ||
        parsed.defaultModelId.includes('2.5') ||
        parsed.defaultModelId.includes('3.5')
      ) {
        parsed.defaultModelId = 'gemini-3.8-flash';
      }
      return parsed;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  getAllConversations(): Conversation[] {
    try {
      const data = localStorage.getItem(CONVERSATIONS_KEY);
      if (!data) return [];
      const list: Conversation[] = JSON.parse(data);
      for (const conv of list) {
        if (!conv.modelId || conv.modelId.includes('2.5') || conv.modelId.includes('3.5')) {
          conv.modelId = 'gemini-3.8-flash';
        }
      }
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  getConversationById(id: string): Conversation | null {
    const list = this.getAllConversations();
    return list.find((c) => c.id === id) || null;
  },

  saveConversation(conv: Conversation): void {
    const list = this.getAllConversations();
    const index = list.findIndex((c) => c.id === conv.id);
    if (index >= 0) {
      list[index] = conv;
    } else {
      list.unshift(conv);
    }
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
  },

  deleteConversation(id: string): void {
    const list = this.getAllConversations().filter((c) => c.id !== id);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));

    // Also remove all messages for this conversation
    const allMessages = this.getAllMessages().filter((m) => m.conversationId !== id);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
  },

  deleteAllConversations(): void {
    localStorage.removeItem(CONVERSATIONS_KEY);
    localStorage.removeItem(MESSAGES_KEY);
  },

  getAllMessages(): Message[] {
    try {
      const data = localStorage.getItem(MESSAGES_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  getMessages(conversationId: string): Message[] {
    const all = this.getAllMessages();
    return all
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  saveMessage(msg: Message): void {
    const all = this.getAllMessages();
    const index = all.findIndex((m) => m.id === msg.id);
    if (index >= 0) {
      all[index] = msg;
    } else {
      all.push(msg);
    }
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  },

  updateMessage(id: string, updates: Partial<Message>): void {
    const all = this.getAllMessages();
    const index = all.findIndex((m) => m.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
    }
  },

  deleteMessagesFrom(conversationId: string, timestamp: number): void {
    const all = this.getAllMessages().filter(
      (m) => !(m.conversationId === conversationId && m.timestamp >= timestamp)
    );
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  },

  generateCleanTitle(prompt: string): string {
    const singleLine = prompt.replace(/\n+/g, ' ').trim();
    const cleaned = singleLine.replace(/^["']|["']$/g, '');
    if (cleaned.length <= 36) {
      return cleaned || 'New Chat';
    }
    return cleaned.slice(0, 33).trimEnd() + '...';
  },

  groupConversations(conversations: Conversation[]): GroupedConversations[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    const todayItems: Conversation[] = [];
    const yesterdayItems: Conversation[] = [];
    const previous7DaysItems: Conversation[] = [];
    const olderItems: Conversation[] = [];

    for (const conv of conversations) {
      const convTime = conv.updatedAt;
      if (convTime >= today) {
        todayItems.push(conv);
      } else if (convTime >= yesterday) {
        yesterdayItems.push(conv);
      } else if (convTime >= sevenDaysAgo) {
        previous7DaysItems.push(conv);
      } else {
        olderItems.push(conv);
      }
    }

    const result: GroupedConversations[] = [];
    if (todayItems.length > 0) result.push({ group: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) result.push({ group: 'Yesterday', items: yesterdayItems });
    if (previous7DaysItems.length > 0)
      result.push({ group: 'Previous 7 Days', items: previous7DaysItems });
    if (olderItems.length > 0) result.push({ group: 'Older', items: olderItems });

    return result;
  },
};
