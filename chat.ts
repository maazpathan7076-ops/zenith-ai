export type ThemeMode = 'system' | 'light' | 'dark';

export interface AiModeConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  systemInstruction: string;
}

export const AI_MODES: Record<string, AiModeConfig> = {
  chat: {
    id: 'chat',
    title: 'Chat',
    subtitle: 'Everyday AI',
    description: 'Natural conversation, creative writing, advice, and problem solving.',
    accentColor: '#6366F1', // Indigo
    systemInstruction:
      'You are Zenith AI, a versatile, highly intelligent, thoughtful, and precise AI assistant. Format your responses with clean Markdown, clear headers, code blocks with syntax highlighting language tags when applicable, and standard LaTeX math ($...$ or $$...$$) for formulas. Be helpful, concise when appropriate, and thorough when detailed answers are needed.',
  },
  web_search: {
    id: 'web_search',
    title: 'Web Search',
    subtitle: 'Live Information',
    description: 'Find recent information, news, fact-checking, and real-time knowledge.',
    accentColor: '#0EA5E9', // Sky
    systemInstruction:
      'You are Zenith AI in Web Search mode. Provide the most up-to-date, fact-checked, and reliable information. Clearly state sources or reference points where relevant. If information is uncertain or constantly evolving, state caveats transparently. Use clean Markdown structure with bullet points and bold highlights for readability.',
  },
  deep_research: {
    id: 'deep_research',
    title: 'Deep Research',
    subtitle: 'Comprehensive Analysis',
    description: 'Multi-step in-depth investigation, synthesis, and structured reporting.',
    accentColor: '#8B5CF6', // Violet
    systemInstruction:
      'You are Zenith AI in Deep Research mode. Approach questions with rigorous multi-dimensional analysis, empirical reasoning, and structured depth. Organize responses with an Executive Summary, Key Findings / Core Arguments, In-Depth Thematic Analysis, Counter-perspectives / Nuance, and Concrete Takeaways or Recommendations.',
  },
  create_image: {
    id: 'create_image',
    title: 'Create Image',
    subtitle: 'Visual Synthesis',
    description: 'Conceptualize, describe, and craft visual artwork and detailed image prompts.',
    accentColor: '#EC4899', // Pink
    systemInstruction:
      'You are Zenith AI in Visual Art & Image Studio mode. When a user requests an image or artwork, provide a vivid, highly descriptive artistic prompt breakdown including Subject, Art Style, Lighting, Composition, Color Palette, and Camera/Medium settings. If connected to an image generation endpoint, synthesize visual parameters.',
  },
};

export type ModelIndicator = 'Fast' | 'High Quality' | 'Balanced' | 'Image Gen';

export interface AiModelInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  indicator: ModelIndicator;
  maxOutputTokens?: number;
  isDefault?: boolean;
}

export const ALL_MODELS: AiModelInfo[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Zenith 3.8 Flash',
    badge: 'Default',
    description: 'Intelligent, ultra-fast responses for everyday chat, writing, and analysis.',
    indicator: 'Fast',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Zenith 3.1 Pro',
    badge: 'Deep Thinking',
    description: 'Advanced reasoning, complex coding, mathematics, and comprehensive problem solving.',
    indicator: 'High Quality',
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Zenith Flash Lite',
    badge: 'Instant',
    description: 'Lightweight and lightning fast for rapid answers and low latency tasks.',
    indicator: 'Fast',
  },
];

export const DEFAULT_MODEL: AiModelInfo = ALL_MODELS[0];

export interface AppSettings {
  themeMode: ThemeMode;
  defaultModelId: string;
  defaultModeId: string;
  isStreamingEnabled: boolean;
  isHapticEnabled: boolean;
  temperature: number;
  customApiKey: string;
  speechLanguage: string;
  sendOnEnter: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  defaultModelId: 'gemini-3.8-flash',
  defaultModeId: 'chat',
  isStreamingEnabled: true,
  isHapticEnabled: true,
  temperature: 0.7,
  customApiKey: '',
  speechLanguage: 'en-US',
  sendOnEnter: false,
};

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  mode: string;
  isPinned?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'model' | 'error';
  content: string;
  timestamp: number;
  status: 'streaming' | 'completed' | 'error';
  imageUri?: string | null;
  feedback?: 'up' | 'down' | null;
}

export type ConversationGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

export interface GroupedConversations {
  group: ConversationGroup;
  items: Conversation[];
}
