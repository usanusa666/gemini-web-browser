

import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Import GroundingChunk to use the official type from the SDK and resolve type errors.
import { GoogleGenAI, GroundingChunk, Modality, Type } from '@google/genai';


// --- TYPES ---
interface Tab {
  id: number;
  url: string;
  history: string[];
  historyIndex: number;
  reloadKey: number;
  incognito: boolean;
}

interface Bookmark {
  id: string;
  url:string;
  title: string;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
}

interface Download {
  id: string;
  url: string;
  filename: string;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  controller?: AbortController;
  blobUrl?: string;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingChunk[];
}

interface UserLocation {
    latitude: number;
    longitude: number;
}

interface Settings {
  homepage: string;
  searchEngine: 'google' | 'duckduckgo' | 'bing';
  theme: 'dark' | 'light';
}

interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    tabId: number | null;
}


// --- ICONS ---
const BackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ForwardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ReloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4a12 12 0 0116 16" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AddIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A11.953 11.953 0 0112 13.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M12 21a9.004 9.004 0 008.716-6.747" />
    </svg>
);

const MoreVertIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
);

const StarIcon: React.FC<{ className?: string, filled?: boolean }> = ({ className, filled }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.321h5.367c.338 0 .463.43.197.643l-4.34 3.158a.563.563 0 00-.182.635l1.644 5.061a.563.563 0 01-.81.61l-4.34-3.158a.563.563 0 00-.652 0l-4.34 3.158a.563.563 0 01-.81-.61l1.644-5.061a.563.563 0 00-.182-.635l-4.34-3.158a.563.563 0 01.197-.643h5.367a.563.563 0 00.475-.321L11.48 3.5z" />
    </svg>
);

const IncognitoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l-1.5 1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5l1.5 1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a3 3 0 003-3H9a3 3 0 003 3z" />
    </svg>
);

const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 00-.75.75v12a.75.75 0 00.75.75h.75a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H6.75zm8.25 0a.75.75 0 00-.75.75v12a.75.75 0 00.75.75h.75a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75h-.75z" clipRule="evenodd" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.713-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.55-.22a2.25 2.25 0 012.122 0l.55.22c.55.219 1.02.684 1.11 1.226l.098.591a2.25 2.25 0 003.422 1.84l.433-.432a2.25 2.25 0 013.182 3.182l-.432.433a2.25 2.25 0 001.84 3.422l.591.098c.542.09.95.56 1.17 1.05l.22.55a2.25 2.25 0 010 2.122l-.22.55c-.219.49-.684.96-1.226 1.05l-.591.098a2.25 2.25 0 00-3.422 1.84l.432.433a2.25 2.25 0 01-3.182 3.182l-.433-.432a2.25 2.25 0 00-1.84 3.422l-.098.591c-.09.542-.56 1.007-1.11 1.226l-.55.22a2.25 2.25 0 01-2.122 0l-.55-.22c-.55-.219-1.02-.684-1.11-1.226l-.098-.591a2.25 2.25 0 00-3.422-1.84l-.433.432a2.25 2.25 0 01-3.182-3.182l.432.433a2.25 2.25 0 00-1.84-3.422l-.591-.098c-.542-.09-.95-.56-1.17-1.05l-.22-.55a2.25 2.25 0 010-2.122l.22-.55c.219-.49.684.96 1.226-1.05l.591-.098a2.25 2.25 0 003.422-1.84l-.433-.432a2.25 2.25 0 013.182-3.182l.433.432a2.25 2.25 0 001.84-3.422l.098-.591z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DuplicateIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75c-.621 0-1.125-.504-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);


// --- HELPER FUNCTIONS ---
const getHostname = (url: string): string => {
  try {
    if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('gemini:')) return 'New Tab';
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return 'Invalid URL';
  }
};

const searchEngines = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q='
};

const sanitizeUrl = (url: string, searchEngine: keyof typeof searchEngines): string => {
  if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('gemini:')) return url;
  if (!/^(https?|ftp):\/\//i.test(url)) {
    try {
      new URL(`https://${url}`);
      if (url.includes('.')) {
        return `https://${url}`;
      }
    } catch (e) {
      // Not a valid URL, treat as search
    }
    return `${searchEngines[searchEngine]}${encodeURIComponent(url)}`;
  }
  return url;
};

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});

// --- AI TOOLS PAGE & COMPONENTS ---
const NEW_TAB_PAGE_URL = 'gemini://new-tab';

// FIX: Define the missing AIToolsPage component to resolve the "Cannot find name 'AIToolsPage'" error.
interface AIToolsPageProps {
    theme: 'light' | 'dark';
    incognito: boolean;
}

const AIToolsPage: React.FC<AIToolsPageProps> = ({ theme, incognito }) => {
    const isDark = theme === 'dark';
    const colors = {
        bg: isDark ? (incognito ? 'bg-gray-900' : 'bg-zinc-800') : (incognito ? 'bg-gray-100' : 'bg-zinc-50'),
        text: isDark ? 'text-zinc-300' : 'text-zinc-700',
        title: isDark ? 'text-white' : 'text-black',
        cardBg: isDark ? 'bg-zinc-700/50' : 'bg-white',
        cardHover: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100',
        cardBorder: isDark ? 'border-zinc-700' : 'border-zinc-200',
        icon: isDark ? 'text-blue-400' : 'text-blue-600',
    };

    const tools = [
        { name: "Generate Image", description: "Create stunning visuals from text prompts.", icon: <SparklesIcon className="w-8 h-8"/> },
        { name: "Summarize Content", description: "Condense long articles or documents.", icon: <UploadIcon className="w-8 h-8"/> },
        { name: "Creative Writing", description: "Get help with stories, poems, or scripts.", icon: <EditIcon className="w-8 h-8"/> },
        { name: "Code Assistant", description: "Generate, debug, and explain code snippets.", icon: <ChatIcon className="w-8 h-8"/> },
    ];

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-8 ${colors.bg} ${colors.text} overflow-y-auto`}>
            <div className="text-center mb-12">
                <h1 className={`text-4xl font-bold ${colors.title} flex items-center justify-center gap-3`}>
                    <SparklesIcon className="w-10 h-10 text-blue-500" />
                    Gemini AI Suite
                </h1>
                <p className="mt-2 text-lg">Your creative and productive co-pilot.</p>
                {incognito && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-200 px-3 py-1 rounded-full text-sm">
                        <IncognitoIcon className="w-4 h-4"/> Incognito Mode
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
                {tools.map(tool => (
                    <div key={tool.name} className={`p-6 rounded-lg shadow-md transition-all cursor-pointer ${colors.cardBg} ${colors.cardHover} border ${colors.cardBorder}`}>
                        <div className={`mb-4 text-blue-500`}>
                            {tool.icon}
                        </div>
                        <h3 className={`text-lg font-semibold mb-2 ${colors.title}`}>{tool.name}</h3>
                        <p className="text-sm">{tool.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CHILD COMPONENTS ---

const TitleBar: React.FC<{ theme: 'light' | 'dark', children: React.ReactNode }> = ({ theme, children }) => {
    const isDark = theme === 'dark';
    const lightGradient = 'from-zinc-200 to-zinc-100';
    const darkGradient = 'from-zinc-800 to-zinc-900';
    const borderColor = isDark ? 'border-zinc-700' : 'border-zinc-300';
    
    return (
        <div className={`h-10 flex items-center pr-2 pl-20 bg-gradient-to-b ${isDark ? darkGradient : lightGradient} border-b ${borderColor} relative drag-region`}>
            {/* The group/controls class on the parent enables group-hover for the icons */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 group/controls no-drag-region">
              <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center group-hover/controls:bg-red-600 transition-colors">
                 {/* Close Icon */}
                 <svg className="w-2 h-2 text-black/60 opacity-0 group-hover/controls:opacity-100" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center group-hover/controls:bg-yellow-600 transition-colors">
                {/* Minimize Icon */}
                <svg className="w-2 h-2 text-black/60 opacity-0 group-hover/controls:opacity-100" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 6H11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center group-hover/controls:bg-green-600 transition-colors">
                {/* Maximize Icon */}
                <svg className="w-2.5 h-2.5 p-px text-black/60 opacity-0 group-hover/controls:opacity-100" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 7.5L1.5 10.5M1.5 10.5V7.5M1.5 10.5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 4.5L10.5 1.5M10.5 1.5V4.5M10.5 1.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {children}
        </div>
    );
};

interface TabBarProps {
  tabs: Tab[];
  activeTabId: number;
  onSelectTab: (id: number) => void;
  onCloseTab: (id: number) => void;
  onNewTab: (incognito: boolean) => void;
  onTabContextMenu: (event: React.MouseEvent, tabId: number) => void;
  theme: 'light' | 'dark';
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab, onTabContextMenu, theme }) => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isIncognito = activeTab?.incognito || false;

  const isDark = theme === 'dark';
  const lightColors = { normal: { tabActive: 'bg-white', tabInactive: 'bg-zinc-200 hover:bg-zinc-300/60', icon: 'text-zinc-500', text: 'text-zinc-700', closeHover: 'hover:bg-zinc-400/50', addHover: 'hover:bg-zinc-300/70', border: 'border-zinc-300' }, incognito: { tabActive: 'bg-gray-200', tabInactive: 'bg-gray-300/80 hover:bg-gray-300', icon: 'text-gray-500', text: 'text-gray-700', closeHover: 'hover:bg-gray-400/50', addHover: 'hover:bg-gray-400/70', border: 'border-gray-400' } };
  const darkColors = { normal: { tabActive: 'bg-zinc-700', tabInactive: 'bg-transparent hover:bg-zinc-700/50', icon: 'text-zinc-400', text: 'text-zinc-300', closeHover: 'hover:bg-zinc-600', addHover: 'hover:bg-zinc-700', border: 'border-zinc-700/50' }, incognito: { tabActive: 'bg-gray-800', tabInactive: 'bg-transparent hover:bg-gray-800/50', icon: 'text-zinc-400', text: 'text-zinc-300', closeHover: 'hover:bg-gray-600', addHover: 'hover:bg-gray-700', border: 'border-gray-700/50' } };
  
  const themeColors = isDark ? darkColors : lightColors;
  const colors = isIncognito ? themeColors.incognito : themeColors.normal;

  return (
    <div className={`flex-1 flex items-end overflow-x-auto h-full`}>
      {tabs.filter(t => t.incognito === isIncognito).map((tab) => {
          const isActive = activeTabId === tab.id;
          const activeClasses = `${colors.tabActive} rounded-t-lg`;
          const inactiveClasses = `${colors.tabInactive} border-r ${colors.border}`;
          return (
            <div 
                key={tab.id} 
                onClick={() => onSelectTab(tab.id)} 
                onContextMenu={(e) => onTabContextMenu(e, tab.id)}
                className={`flex items-center justify-between min-w-[200px] max-w-[200px] h-full px-3 cursor-pointer group transition-colors duration-150 no-drag-region ${ isActive ? activeClasses : inactiveClasses }`}>
              <div className="flex items-center gap-2 truncate">
                {tab.incognito ? <IncognitoIcon className={`w-4 h-4 ${colors.icon} flex-shrink-0`} /> : <GlobeIcon className={`w-4 h-4 ${colors.icon} flex-shrink-0`} />}
                <span className={`text-sm ${colors.text} truncate`}>{getHostname(tab.url)}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }} className={`p-1 rounded-full ${colors.closeHover} opacity-0 group-hover:opacity-100 transition-opacity no-drag-region`}>
                <CloseIcon className={`w-3 h-3 ${colors.text}`} />
              </button>
            </div>
          )
      })}
       <button onClick={() => onNewTab(isIncognito)} className={`p-3 h-full flex items-center ${colors.addHover} no-drag-region`}>
            <AddIcon className={`w-4 h-4 ${colors.text}`} />
        </button>
    </div>
  );
};


interface NavigationBarProps {
  activeTab: Tab;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onToggleBookmark: () => void;
  isBookmarked: boolean;
  onMenuClick: (el: HTMLButtonElement) => void;
  onChatClick: () => void;
  addressBarRef: React.RefObject<HTMLInputElement>;
  theme: 'light' | 'dark';
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onNavigate, onBack, onForward, onReload, onToggleBookmark, isBookmarked, onMenuClick, onChatClick, addressBarRef, theme }) => {
  const [inputValue, setInputValue] = useState(activeTab.url);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  
  const isIncognito = activeTab.incognito;
  const isDark = theme === 'dark';

  const lightColors = { normal: { bg: 'bg-white', buttonHover: 'hover:bg-zinc-200', inputBg: 'bg-zinc-100', inputRing: 'focus:ring-blue-500', text: 'text-zinc-900', icon: 'text-zinc-600', disabled: 'disabled:text-zinc-400 disabled:hover:bg-transparent', bookmarkIcon: 'text-zinc-500', border: 'border-zinc-300' }, incognito: { bg: 'bg-gray-200', buttonHover: 'hover:bg-gray-300', inputBg: 'bg-gray-100', inputRing: 'focus:ring-indigo-500', text: 'text-gray-900', icon: 'text-gray-600', disabled: 'disabled:text-gray-400 disabled:hover:bg-transparent', bookmarkIcon: 'text-gray-500', border: 'border-gray-400' } };
  const darkColors = { normal: { bg: 'bg-zinc-700', buttonHover: 'hover:bg-zinc-600/70', inputBg: 'bg-zinc-800', inputRing: 'focus:ring-blue-500', text: 'text-zinc-300', icon: 'text-zinc-400', disabled: 'disabled:text-zinc-600 disabled:hover:bg-transparent', bookmarkIcon: 'text-zinc-400', border: 'border-zinc-700' }, incognito: { bg: 'bg-gray-800', buttonHover: 'hover:bg-gray-700', inputBg: 'bg-gray-900', inputRing: 'focus:ring-indigo-400', text: 'text-zinc-300', icon: 'text-zinc-400', disabled: 'disabled:text-gray-500 disabled:hover:bg-transparent', bookmarkIcon: 'text-zinc-400', border: 'border-gray-700' } };

  const themeColors = isDark ? darkColors : lightColors;
  const colors = isIncognito ? themeColors.incognito : themeColors.normal;

  useEffect(() => {
    if (activeTab.url !== inputValue && document.activeElement !== addressBarRef.current) {
        setInputValue(activeTab.url.startsWith('gemini:') ? '' : activeTab.url);
    }
  }, [activeTab.url, inputValue, addressBarRef]);

  const handleNavigationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue) {
      onNavigate(inputValue);
      addressBarRef.current?.blur();
    }
  };
  
  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.history.length - 1;

  return (
    <div className={`flex items-center p-2 ${colors.bg} gap-2 border-b ${colors.border}`}>
      <button onClick={onBack} disabled={!canGoBack} className={`p-2 rounded-full ${colors.buttonHover} ${colors.disabled}`}><BackIcon className={`w-5 h-5 ${colors.icon}`} /></button>
      <button onClick={onForward} disabled={!canGoForward} className={`p-2 rounded-full ${colors.buttonHover} ${colors.disabled}`}><ForwardIcon className={`w-5 h-5 ${colors.icon}`} /></button>
      <button onClick={onReload} className={`p-2 rounded-full ${colors.buttonHover}`}><ReloadIcon className={`w-5 h-5 ${colors.icon}`} /></button>
      <form onSubmit={handleNavigationSubmit} className="flex-1 relative flex items-center">
        {isIncognito && <IncognitoIcon className={`absolute left-3 w-5 h-5 ${colors.bookmarkIcon}`} />}
        <input ref={addressBarRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onFocus={(e) => e.target.select()} className={`w-full ${colors.inputBg} ${colors.text} px-10 py-2 rounded-full focus:outline-none focus:ring-2 ${colors.inputRing} text-sm`} placeholder="Search or type a URL" />
        <button type="button" onClick={onToggleBookmark} className={`absolute right-3 p-1 rounded-full ${colors.buttonHover}`}><StarIcon className={`w-5 h-5 ${isBookmarked ? 'text-blue-500' : colors.bookmarkIcon}`} filled={isBookmarked} /></button>
      </form>
      <button onClick={onChatClick} className={`p-2 rounded-full ${colors.buttonHover}`}><ChatIcon className={`w-5 h-5 ${colors.icon}`} /></button>
      <button ref={menuButtonRef} onClick={() => menuButtonRef.current && onMenuClick(menuButtonRef.current)} className={`p-2 rounded-full ${colors.buttonHover}`}><MoreVertIcon className={`w-5 h-5 ${colors.icon}`} /></button>
    </div>
  );
};

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  theme: 'light' | 'dark';
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, messages, isLoading, onSendMessage, theme }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';

    const colors = {
        bg: isDark ? 'bg-zinc-900/95' : 'bg-white/95',
        border: isDark ? 'border-zinc-700' : 'border-zinc-300',
        text: isDark ? 'text-zinc-200' : 'text-zinc-800',
        headerText: isDark ? 'text-white' : 'text-black',
        buttonHover: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200',
        inputBg: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        modelBubble: isDark ? 'bg-zinc-700' : 'bg-zinc-200',
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSendMessage(input);
        setInput('');
    };
    
    return (
        <div className={`fixed top-0 right-0 h-full w-[400px] ${colors.bg} backdrop-blur-sm border-l ${colors.border} shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col z-50`} role="complementary" aria-label="AI Assistant">
            <header className={`flex items-center justify-between p-4 border-b ${colors.border} flex-shrink-0`}>
                <h2 className={`text-lg font-semibold ${colors.headerText}`}>AI Assistant</h2>
                <button onClick={onClose} className={`p-2 rounded-full ${colors.buttonHover}`} aria-label="Close chat panel"><CloseIcon className={`w-5 h-5 ${colors.text}`} /></button>
            </header>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-blue-600 text-white' : `${colors.modelBubble} ${colors.text}`}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                            <div className={`mt-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'} max-w-[85%]`}>
                                <h3 className="font-semibold mb-1">Sources:</h3>
                                <ul className="list-disc list-inside space-y-1">
                                {msg.sources.map((source, i) => (
                                    <li key={i} className="truncate">
                                        <a href={source.web?.uri || source.maps?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                            {source.web?.title || source.maps?.title}
                                        </a>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start">
                        <div className={`${colors.modelBubble} ${colors.text} rounded-lg px-3 py-2 text-sm animate-pulse`}>Thinking...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className={`p-4 border-t ${colors.border} flex-shrink-0`}>
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} className={`flex-1 ${colors.inputBg} ${colors.text} px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`} placeholder="Ask anything..."/>
                    <button type="submit" disabled={isLoading} className="p-3 rounded-full bg-blue-600 text-white disabled:bg-zinc-600 hover:bg-blue-500 transition-colors"><SendIcon className="w-5 h-5"/></button>
                </form>
            </div>
        </div>
    );
};


interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  onNewIncognito: () => void;
  onShowBookmarks: () => void;
  onShowDownloads: () => void;
  onShowSettings: () => void;
  theme: 'light' | 'dark';
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ isOpen, onClose, anchorEl, onNewIncognito, onShowBookmarks, onShowDownloads, onShowSettings, theme }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? 'bg-zinc-800/90' : 'bg-white/90',
    border: isDark ? 'border-zinc-700' : 'border-zinc-200',
    text: isDark ? 'text-zinc-200' : 'text-zinc-800',
    hoverBg: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100',
    divider: isDark ? 'bg-zinc-700' : 'bg-zinc-200'
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !anchorEl?.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorEl]);

  if (!isOpen || !anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const style = { top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right - rect.width/2}px` };

  return (
    <div ref={dropdownRef} style={style} className={`fixed ${colors.bg} ${colors.text} backdrop-blur-sm rounded-md shadow-lg w-56 py-1 z-50 border ${colors.border}`}>
      <button onClick={() => { onNewIncognito(); onClose(); }} className={`flex items-center gap-3 px-4 py-2 text-sm ${colors.hoverBg} w-full text-left`}>
        <IncognitoIcon className="w-5 h-5" /> New Incognito window
      </button>
      <button onClick={() => { onShowBookmarks(); onClose(); }} className={`flex items-center gap-3 px-4 py-2 text-sm ${colors.hoverBg} w-full text-left`}>
        <StarIcon className="w-5 h-5" /> Bookmarks
      </button>
      <button onClick={() => { onShowDownloads(); onClose(); }} className={`flex items-center gap-3 px-4 py-2 text-sm ${colors.hoverBg} w-full text-left`}>
        <DownloadIcon className="w-5 h-5" /> Downloads
      </button>
      <div className={`my-1 h-px ${colors.divider}`} />
      <button onClick={() => { onShowSettings(); onClose(); }} className={`flex items-center gap-3 px-4 py-2 text-sm ${colors.hoverBg} w-full text-left`}>
        <SettingsIcon className="w-5 h-5" /> Settings
      </button>
    </div>
  );
};

interface BookmarksModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookmarks: Bookmark[];
    folders: Folder[];
    onUpdateBookmark: (id: string, updates: Partial<Bookmark>) => void;
    onDeleteBookmark: (id: string) => void;
    onAddFolder: (name: string) => void;
    onUpdateFolder: (id: string, name: string) => void;
    onDeleteFolder: (id: string) => void;
    onNavigate: (url: string) => void;
    theme: 'light' | 'dark';
}

const BookmarksModal: React.FC<BookmarksModalProps> = ({
    isOpen, onClose, bookmarks, folders, onUpdateBookmark, onDeleteBookmark,
    onAddFolder, onUpdateFolder, onDeleteFolder, onNavigate, theme
}) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
    const [editingBookmarkData, setEditingBookmarkData] = useState<{ title: string; url: string }>({ title: '', url: '' });
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const isDark = theme === 'dark';
    const colors = {
        bg: isDark ? 'bg-zinc-900' : 'bg-white',
        border: isDark ? 'border-zinc-700' : 'border-zinc-200',
        text: isDark ? 'text-zinc-200' : 'text-zinc-800',
        headerText: isDark ? 'text-white' : 'text-black',
        buttonHover: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200',
        inputBg: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        itemHover: isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100',
        itemBg: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        subtext: isDark ? 'text-zinc-400' : 'text-zinc-500',
    };

    const handleEditFolder = (folder: Folder) => {
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    const handleSaveFolder = (id: string) => {
        if (editingFolderName.trim()) {
            onUpdateFolder(id, editingFolderName.trim());
        }
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    const handleAddFolder = () => {
        if (newFolderName.trim()) {
            onAddFolder(newFolderName.trim());
            setNewFolderName('');
            setIsAddingFolder(false);
        }
    };
    
    const handleEditBookmark = (bookmark: Bookmark) => {
        setEditingBookmarkId(bookmark.id);
        setEditingBookmarkData({ title: bookmark.title, url: bookmark.url });
    };

    const handleSaveBookmark = (id: string) => {
        if (editingBookmarkData.title.trim() && editingBookmarkData.url.trim()) {
            onUpdateBookmark(id, editingBookmarkData);
        }
        setEditingBookmarkId(null);
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, bookmarkId: string) => {
        e.dataTransfer.setData("bookmarkId", bookmarkId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, folderId: string | null) => {
        e.preventDefault();
        const bookmarkId = e.dataTransfer.getData("bookmarkId");
        onUpdateBookmark(bookmarkId, { folderId });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };


    if (!isOpen) return null;

    const visibleBookmarks = bookmarks.filter(b => b.folderId === selectedFolderId);

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40" onClick={onClose}>
            <div className={`${colors.bg} ${colors.text} rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <header className={`flex items-center justify-between p-4 border-b ${colors.border}`}>
                    <h2 className={`text-lg font-semibold ${colors.headerText} flex items-center gap-2`}><StarIcon className="w-5 h-5"/>Bookmark Manager</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${colors.buttonHover}`}><CloseIcon className={`w-5 h-5 ${colors.text}`} /></button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className={`w-1/3 border-r ${colors.border} flex flex-col`}>
                        <div 
                            className="p-2 overflow-y-auto"
                            onDrop={(e) => handleDrop(e, null)}
                            onDragOver={handleDragOver}
                        >
                            <div onClick={() => setSelectedFolderId(null)} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${selectedFolderId === null ? 'bg-blue-600 text-white' : colors.itemHover}`}>
                                <FolderIcon className="w-5 h-5" />
                                <span className="text-sm">All Bookmarks</span>
                            </div>
                            {folders.map(folder => (
                                <div 
                                    key={folder.id} 
                                    onClick={() => setSelectedFolderId(folder.id)}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    onDragOver={handleDragOver}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer group ${selectedFolderId === folder.id ? 'bg-blue-600 text-white' : colors.itemHover}`}
                                >
                                    {editingFolderId === folder.id ? (
                                        <input
                                            type="text"
                                            value={editingFolderName}
                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                            onBlur={() => handleSaveFolder(folder.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveFolder(folder.id)}
                                            className={`${isDark ? 'bg-zinc-700' : 'bg-zinc-200'} text-sm p-1 rounded w-full`} autoFocus
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 truncate">
                                            <FolderIcon className="w-5 h-5" />
                                            <span className="text-sm truncate">{folder.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                                        <button onClick={() => handleEditFolder(folder)} className={`p-1 rounded-full ${colors.buttonHover}`}><EditIcon className="w-4 h-4"/></button>
                                        <button onClick={() => onDeleteFolder(folder.id)} className={`p-1 rounded-full ${colors.buttonHover}`}><CloseIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={`p-2 border-t ${colors.border} mt-auto`}>
                            {isAddingFolder ? (
                                <div className="flex gap-2">
                                    <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" className={`${colors.inputBg} text-sm p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500`} autoFocus onKeyDown={e => e.key === 'Enter' && handleAddFolder()}/>
                                    <button onClick={handleAddFolder} className="p-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm">Add</button>
                                    <button onClick={() => setIsAddingFolder(false)} className={`p-2 ${colors.buttonHover} rounded-md`}><CloseIcon className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddingFolder(true)} className={`w-full text-left p-2 rounded-md ${colors.itemHover} text-sm flex items-center gap-2`}>
                                    <AddIcon className="w-5 h-5"/> New Folder
                                </button>
                            )}
                        </div>
                    </aside>
                    <main className="w-2/3 p-4 overflow-y-auto">
                        {visibleBookmarks.length > 0 ? (
                        <ul className="space-y-2">
                            {visibleBookmarks.map(bookmark => (
                                <li key={bookmark.id} className={`${isDark ? 'bg-zinc-800' : 'bg-zinc-50'} p-2 rounded-md group`} draggable onDragStart={e => handleDragStart(e, bookmark.id)}>
                                    {editingBookmarkId === bookmark.id ? (
                                        <div className="space-y-2">
                                            <input type="text" placeholder="Title" value={editingBookmarkData.title} onChange={e => setEditingBookmarkData({...editingBookmarkData, title: e.target.value})} className={`${colors.inputBg} w-full text-sm p-1 rounded`} />
                                            <input type="text" placeholder="URL" value={editingBookmarkData.url} onChange={e => setEditingBookmarkData({...editingBookmarkData, url: e.target.value})} className={`${colors.inputBg} w-full text-sm p-1 rounded`} />
                                            <button onClick={() => handleSaveBookmark(bookmark.id)} className="text-xs px-2 py-1 bg-blue-600 rounded hover:bg-blue-500">Save</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div onClick={() => { onNavigate(bookmark.url); onClose(); }} className="cursor-pointer flex-1 truncate">
                                                <p className="text-sm font-medium truncate">{bookmark.title}</p>
                                                <p className={`text-xs ${colors.subtext} truncate`}>{bookmark.url}</p>
                                            </div>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                <button onClick={() => handleEditBookmark(bookmark)} className={`p-1 rounded-full ${colors.buttonHover}`}><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => onDeleteBookmark(bookmark.id)} className={`p-1 rounded-full ${colors.buttonHover}`}><CloseIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                         ) : (
                            <div className={`text-center ${colors.subtext} h-full flex items-center justify-center`}>
                                <p>No bookmarks in this folder.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};


interface DownloadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    downloads: Download[];
    onStartDownload: (url: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
    onClear: () => void;
    theme: 'light' | 'dark';
}

const DownloadsModal: React.FC<DownloadsModalProps> = ({ isOpen, onClose, downloads, onStartDownload, onPause, onResume, onCancel, onClear, theme }) => {
    const [urlInput, setUrlInput] = useState('');
    const isDark = theme === 'dark';

    const colors = {
        bg: isDark ? 'bg-zinc-900' : 'bg-white',
        border: isDark ? 'border-zinc-700' : 'border-zinc-200',
        text: isDark ? 'text-zinc-200' : 'text-zinc-800',
        headerText: isDark ? 'text-white' : 'text-black',
        buttonHover: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200',
        inputBg: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        itemBg: isDark ? 'bg-zinc-800' : 'bg-zinc-50',
        subtext: isDark ? 'text-zinc-400' : 'text-zinc-500',
        progressBg: isDark ? 'bg-zinc-700' : 'bg-zinc-200',
    };

    const handleDownloadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (urlInput) {
            onStartDownload(urlInput);
            setUrlInput('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40" onClick={onClose}>
            <div className={`${colors.bg} rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <header className={`flex items-center justify-between p-4 border-b ${colors.border}`}>
                    <h2 className={`text-lg font-semibold ${colors.headerText} flex items-center gap-2`}><DownloadIcon className="w-5 h-5"/>Downloads</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${colors.buttonHover}`}><CloseIcon className={`w-5 h-5 ${colors.text}`} /></button>
                </header>
                <div className={`p-4 border-b ${colors.border}`}>
                    <form onSubmit={handleDownloadSubmit} className="flex items-center gap-2">
                        <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={`flex-1 ${colors.inputBg} ${colors.text} px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`} placeholder="Paste a download link"/>
                        <button type="submit" className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-semibold">Download</button>
                    </form>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {downloads.length === 0 ? (
                        <div className={`text-center ${colors.subtext} py-10`}>No downloads yet.</div>
                    ) : (
                        downloads.map(d => (
                            <div key={d.id} className={`${colors.itemBg} p-3 rounded-md`}>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 truncate">
                                        <p className={`text-sm font-medium ${colors.text} truncate`}>{d.filename}</p>
                                        <p className={`text-xs ${colors.subtext} capitalize`}>{d.status}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {d.status === 'downloading' && <button onClick={() => onPause(d.id)} className={`p-2 rounded-full ${colors.buttonHover}`}><PauseIcon className={`w-5 h-5 ${colors.text}`}/></button>}
                                        {d.status === 'paused' && <button onClick={() => onResume(d.id)} className={`p-2 rounded-full ${colors.buttonHover}`}><PlayIcon className={`w-5 h-5 ${colors.text}`}/></button>}
                                        {(d.status === 'downloading' || d.status === 'paused') && <button onClick={() => onCancel(d.id)} className={`p-2 rounded-full ${colors.buttonHover}`}><CloseIcon className={`w-5 h-5 ${colors.text}`}/></button>}
                                        {d.status === 'completed' && d.blobUrl && <a href={d.blobUrl} download={d.filename} className="text-sm font-semibold text-blue-400 hover:underline">Open File</a>}
                                        {d.status === 'failed' && <p className="text-xs text-red-400">Failed</p>}
                                    </div>
                                </div>
                                {(d.status === 'downloading' || d.progress > 0) && d.status !== 'failed' && d.status !== 'cancelled' && (
                                    <div className="mt-2">
                                        <div className={`w-full ${colors.progressBg} rounded-full h-1.5`}>
                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${d.progress}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <footer className={`p-4 border-t ${colors.border}`}>
                    <button onClick={onClear} className="text-sm text-blue-400 hover:underline">Clear all</button>
                </footer>
            </div>
        </div>
    );
};

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSave: (newSettings: Settings) => void;
    onClearData: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onClearData }) => {
    const [currentSettings, setCurrentSettings] = useState(settings);
    const isDark = settings.theme === 'dark';

    const colors = {
        bg: isDark ? 'bg-zinc-900' : 'bg-white',
        border: isDark ? 'border-zinc-700' : 'border-zinc-200',
        text: isDark ? 'text-zinc-200' : 'text-zinc-800',
        headerText: isDark ? 'text-white' : 'text-black',
        buttonHover: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200',
        inputBg: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        subtext: isDark ? 'text-zinc-400' : 'text-zinc-500',
    };

    useEffect(() => {
        if (isOpen) {
            setCurrentSettings(settings);
        }
    }, [settings, isOpen]);

    const handleSave = () => {
        onSave(currentSettings);
        onClose();
    };

    const handleSettingChange = (field: keyof Settings, value: string) => {
        setCurrentSettings(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className={`${colors.bg} ${colors.text} rounded-lg shadow-xl w-full max-w-lg flex flex-col`} onClick={e => e.stopPropagation()}>
                <header className={`flex items-center justify-between p-4 border-b ${colors.border}`}>
                    <h2 id="settings-title" className={`text-lg font-semibold ${colors.headerText} flex items-center gap-2`}><SettingsIcon className="w-5 h-5"/>Settings</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${colors.buttonHover}`} aria-label="Close settings"><CloseIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div>
                        <label htmlFor="homepage" className="block text-sm font-medium mb-1">Homepage URL</label>
                        <input 
                            type="url" 
                            id="homepage"
                            value={currentSettings.homepage}
                            onChange={(e) => handleSettingChange('homepage', e.target.value)}
                            placeholder="https://..."
                            className={`w-full ${colors.inputBg} ${colors.text} px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                        />
                    </div>
                    <div>
                        <label htmlFor="searchEngine" className="block text-sm font-medium mb-1">Search Engine</label>
                        <select
                            id="searchEngine"
                            value={currentSettings.searchEngine}
                            onChange={(e) => handleSettingChange('searchEngine', e.target.value)}
                            className={`w-full ${colors.inputBg} ${colors.text} px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-no-repeat bg-right pr-8`}
                            style={{ backgroundImage: `url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="%23${isDark ? '9ca3af' : '6b7280'}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8l4 4 4-4"/></svg>')`}}
                        >
                            <option value="google">Google</option>
                            <option value="duckduckgo">DuckDuckGo</option>
                            <option value="bing">Bing</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="theme" className="block text-sm font-medium mb-1">Appearance</label>
                        <select
                            id="theme"
                            value={currentSettings.theme}
                            onChange={(e) => handleSettingChange('theme', e.target.value)}
                            className={`w-full ${colors.inputBg} ${colors.text} px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-no-repeat bg-right pr-8`}
                            style={{ backgroundImage: `url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="%23${isDark ? '9ca3af' : '6b7280'}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8l4 4 4-4"/></svg>')`}}
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                    <div className={`border-t ${colors.border} pt-4`}>
                        <h3 className="text-md font-semibold mb-2">Privacy and Data</h3>
                        <button onClick={onClearData} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-semibold">Clear Bookmarks & Folders</button>
                        <p className={`text-xs ${colors.subtext} mt-2`}>This will permanently delete all your saved bookmarks and folders.</p>
                    </div>
                </div>
                <footer className={`p-4 border-t ${colors.border} flex justify-end`}>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-semibold">Save and Close</button>
                </footer>
            </div>
        </div>
    );
};

interface ContextMenuProps {
    menu: ContextMenuState;
    onClose: () => void;
    onReload: (tabId: number) => void;
    onDuplicate: (tabId: number) => void;
    onCloseTab: (tabId: number) => void;
    theme: 'light' | 'dark';
}

const ContextMenu: React.FC<ContextMenuProps> = ({ menu, onClose, onReload, onDuplicate, onCloseTab, theme }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';
    
    const colors = {
        bg: isDark ? 'bg-zinc-800/90' : 'bg-white/90',
        border: isDark ? 'border-zinc-700' : 'border-zinc-200',
        text: isDark ? 'text-zinc-200' : 'text-zinc-800',
        hoverBg: isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100',
        divider: isDark ? 'bg-zinc-700' : 'bg-zinc-200'
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menu.isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menu.isOpen, onClose]);

    if (!menu.isOpen || menu.tabId === null) return null;

    const menuItems = [
        { label: 'Reload', icon: ReloadIcon, action: () => onReload(menu.tabId!) },
        { label: 'Duplicate', icon: DuplicateIcon, action: () => onDuplicate(menu.tabId!) },
        { label: 'Close Tab', icon: CloseIcon, action: () => onCloseTab(menu.tabId!) },
    ];

    return (
        <div ref={menuRef} style={{ top: menu.y, left: menu.x }} className={`fixed ${colors.bg} ${colors.text} backdrop-blur-sm rounded-md shadow-lg w-48 py-1 z-50 border ${colors.border}`}>
            {menuItems.map(item => (
                <button
                    key={item.label}
                    onClick={() => { item.action(); onClose(); }}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${colors.hoverBg} w-full text-left`}
                >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                </button>
            ))}
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number>(0);
  const nextId = useRef(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [activeModal, setActiveModal] = useState<'bookmarks' | 'downloads' | 'settings' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorEl = useRef<HTMLElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const addressBarRef = useRef<HTMLInputElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, tabId: null });

  // Settings State
  const [settings, setSettings] = useState<Settings>({ homepage: '', searchEngine: 'google', theme: 'dark'});
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Load persistent data on mount
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem('bookmarks');
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
      const storedFolders = localStorage.getItem('folders');
      if (storedFolders) setFolders(JSON.parse(storedFolders));
      
      const storedSettings = localStorage.getItem('settings');
      const currentSettings = storedSettings ? JSON.parse(storedSettings) : { homepage: '', searchEngine: 'google', theme: 'dark' };
      setSettings(currentSettings);
      
      const storedSession = localStorage.getItem('session');
      if (storedSession) {
        const sessionTabs: Tab[] = JSON.parse(storedSession);
        if (sessionTabs.length > 0) {
            setTabs(sessionTabs);
            setActiveTabId(sessionTabs[0].id);
            nextId.current = Math.max(...sessionTabs.map(t => t.id)) + 1;
        } else {
             // Create initial tab if session is empty
            const initialUrl = currentSettings.homepage || NEW_TAB_PAGE_URL;
            const firstTab: Tab = { id: nextId.current, url: initialUrl, history: [initialUrl], historyIndex: 0, reloadKey: 0, incognito: false };
            setTabs([firstTab]);
            setActiveTabId(firstTab.id);
            nextId.current++;
        }
      } else {
         // Create initial tab if no session
        const initialUrl = currentSettings.homepage || NEW_TAB_PAGE_URL;
        const firstTab: Tab = { id: nextId.current, url: initialUrl, history: [initialUrl], historyIndex: 0, reloadKey: 0, incognito: false };
        setTabs([firstTab]);
        setActiveTabId(firstTab.id);
        nextId.current++;
      }
    } catch (error) { console.error("Failed to load data from localStorage", error); }
    setIsInitialized(true);
  }, []);

  // Save persistent data on change
  useEffect(() => { try { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); } catch(e) { console.error("Failed to save bookmarks", e); } }, [bookmarks]);
  useEffect(() => { try { localStorage.setItem('folders', JSON.stringify(folders)); } catch(e) { console.error("Failed to save folders", e); } }, [folders]);
  useEffect(() => { try { localStorage.setItem('settings', JSON.stringify(settings)); } catch(e) { console.error("Failed to save settings", e); } }, [settings]);
  
  // Save session on change
  useEffect(() => {
    if (isInitialized) {
        try {
            const nonIncognitoTabs = tabs.filter(t => !t.incognito);
            localStorage.setItem('session', JSON.stringify(nonIncognitoTabs));
        } catch(e) {
            console.error("Failed to save session", e);
        }
    }
  }, [tabs, isInitialized]);


  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => console.error("Geolocation error:", error)
    );
  }, []);

  // Effect for cleaning up downloads on unmount
  useEffect(() => {
    return () => {
        setDownloads(currentDownloads => {
            currentDownloads.forEach(d => {
                d.controller?.abort();
                if (d.blobUrl) URL.revokeObjectURL(d.blobUrl);
            });
            return [];
        });
    };
}, []);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs.find(t => !t.incognito) || tabs[0];
  
  const handleNewTab = useCallback((incognito = false) => {
    const defaultUrl = incognito ? NEW_TAB_PAGE_URL : (settings.homepage || NEW_TAB_PAGE_URL);
    const newTab: Tab = { id: nextId.current, url: defaultUrl, history: [defaultUrl], historyIndex: 0, reloadKey: 0, incognito };
    nextId.current++;
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTab.id);
  }, [settings.homepage]);

  const handleSelectTab = useCallback((id: number) => setActiveTabId(id), []);

  const handleCloseTab = useCallback((id: number) => {
    setTabs(prevTabs => {
        const tabToClose = prevTabs.find(t => t.id === id);
        if (!tabToClose) return prevTabs;
        const isIncognito = tabToClose.incognito;
        const remainingTabs = prevTabs.filter(t => t.id !== id);
        const sameModeTabs = remainingTabs.filter(t => t.incognito === isIncognito);

        if (sameModeTabs.length === 0) {
            const otherModeTabs = remainingTabs.filter(t => t.incognito !== isIncognito);
            if (otherModeTabs.length > 0) {
                setActiveTabId(otherModeTabs[0].id);
            } else {
                handleNewTab(false);
                return prevTabs.filter(t => t.id !== id); // will be overwritten by new tab but need to remove this one
            }
        } else if (id === activeTabId) {
            const tabIndex = prevTabs.findIndex(t => t.id === id);
            const newActiveIndex = Math.max(0, tabIndex - 1);
            const newActiveTab = prevTabs.filter(t => t.id !== id)[newActiveIndex] || sameModeTabs[0];
            setActiveTabId(newActiveTab.id);
        }
        return remainingTabs;
    });
}, [activeTabId, handleNewTab]);

  const updateActiveTab = useCallback((updates: Partial<Tab>) => {
    setTabs(prevTabs => prevTabs.map(tab => tab.id === activeTabId ? { ...tab, ...updates } : tab));
  }, [activeTabId]);
  
  const updateTab = useCallback((id: number, updates: Partial<Tab>) => {
      setTabs(prevTabs => prevTabs.map(tab => tab.id === id ? { ...tab, ...updates } : tab));
  }, []);

  const handleNavigate = useCallback((url: string) => {
    if (!activeTab) return;
    const sanitized = sanitizeUrl(url, settings.searchEngine);
    const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    newHistory.push(sanitized);
    updateActiveTab({ url: sanitized, history: newHistory, historyIndex: newHistory.length - 1 });
  }, [activeTab, updateActiveTab, settings.searchEngine]);

  const handleBack = useCallback(() => {
    if (activeTab && activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      updateActiveTab({ url: activeTab.history[newIndex], historyIndex: newIndex });
    }
  }, [activeTab, updateActiveTab]);

  const handleForward = useCallback(() => {
    if (activeTab && activeTab.historyIndex < activeTab.history.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      updateActiveTab({ url: activeTab.history[newIndex], historyIndex: newIndex });
    }
  }, [activeTab, updateActiveTab]);

  const handleReload = useCallback(() => {
    if (activeTab) {
        if(activeTab.url === NEW_TAB_PAGE_URL){
             updateActiveTab({ reloadKey: activeTab.reloadKey + 1 });
        } else {
            const iframe = document.querySelector(`iframe[src="${activeTab.url}"]`) as HTMLIFrameElement;
            if(iframe) iframe.contentWindow?.location.reload();
        }
    }
  }, [activeTab, updateActiveTab]);

  const handleReloadSpecificTab = useCallback((tabId: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) updateTab(tabId, { reloadKey: tab.reloadKey + 1 });
  }, [tabs, updateTab]);

  const handleDuplicateTab = useCallback((tabId: number) => {
    const tabToDuplicate = tabs.find(t => t.id === tabId);
    if (!tabToDuplicate) return;

    const newTab: Tab = {
        ...tabToDuplicate,
        id: nextId.current,
        reloadKey: 0,
    };
    nextId.current++;

    setTabs(prevTabs => {
        const index = prevTabs.findIndex(t => t.id === tabId);
        const newTabs = [...prevTabs];
        newTabs.splice(index + 1, 0, newTab);
        return newTabs;
    });
    setActiveTabId(newTab.id);
  }, [tabs]);
  
  const isCurrentPageBookmarked = activeTab && bookmarks.some(b => b.url === activeTab.url);

  const handleToggleBookmark = useCallback(() => {
    if (!activeTab || activeTab.url.startsWith('data:') || activeTab.url.startsWith('gemini:')) return;
    if (isCurrentPageBookmarked) {
      setBookmarks(bs => bs.filter(b => b.url !== activeTab.url));
    } else {
      setBookmarks(bs => [...bs, { id: crypto.randomUUID(), url: activeTab.url, title: getHostname(activeTab.url), folderId: null }]);
    }
  }, [activeTab, isCurrentPageBookmarked]);
  
    // --- Bookmark & Folder CRUD ---
  const handleUpdateBookmark = (id: string, updates: Partial<Bookmark>) => { setBookmarks(bs => bs.map(b => b.id === id ? { ...b, ...updates } : b)); };
  const handleDeleteBookmark = (id: string) => { setBookmarks(bs => bs.filter(b => b.id !== id)); };
  const handleAddFolder = (name: string) => { const newFolder = { id: crypto.randomUUID(), name }; setFolders(fs => [...fs, newFolder]); };
  const handleUpdateFolder = (id: string, name: string) => { setFolders(fs => fs.map(f => f.id === id ? { ...f, name } : f)); };
  const handleDeleteFolder = (id: string) => { setFolders(fs => fs.filter(f => f.id !== id)); setBookmarks(bs => bs.map(b => b.folderId === id ? { ...b, folderId: null } : b)); };


  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setIsChatLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
            config: {
                tools: [{googleSearch: {}}, {googleMaps: {}}],
                ...(userLocation && { toolConfig: { retrievalConfig: { latLng: { latitude: userLocation.latitude, longitude: userLocation.longitude } } } })
            },
        });
        const text = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        setChatMessages(prev => [...prev, { role: 'model', text, sources }]);
    } catch (error) {
        console.error("Gemini API error:", error);
        setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleStartDownload = async (url: string, existingDownloadId?: string) => {
    const controller = new AbortController();
    const id = existingDownloadId || crypto.randomUUID();
    let filename = 'download';
    try {
        const urlObj = new URL(url);
        filename = urlObj.pathname.split('/').pop() || 'download';
    } catch (e) { /* invalid url, use default */ }
    const newDownload: Download = { id, url, filename, status: 'downloading', progress: 0, controller };
    setDownloads(prev => {
        const existingIndex = prev.findIndex(d => d.id === id);
        if (existingIndex > -1) return prev.map((d, i) => i === existingIndex ? newDownload : d);
        return [...prev, newDownload];
    });
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        if (!response.body) throw new Error('No response body');
        const contentLength = Number(response.headers.get('Content-Length'));
        const reader = response.body.getReader();
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            if (contentLength > 0) {
                const progress = Math.round((receivedLength / contentLength) * 100);
                setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress } : d));
            }
        }
        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'completed', progress: 100, blobUrl, controller: undefined } : d));
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', error: error.message, controller: undefined } : d));
        }
    }
  };

  const handlePauseDownload = (id: string) => {
    setDownloads(prev => {
        const download = prev.find(d => d.id === id);
        download?.controller?.abort();
        return prev.map(d => d.id === id ? { ...d, status: 'paused', controller: undefined } : d);
    });
  };

  const handleResumeDownload = (id: string) => {
      const download = downloads.find(d => d.id === id);
      if (download) handleStartDownload(download.url, id);
  };
  
  const handleCancelDownload = (id: string) => {
    setDownloads(prev => {
        const download = prev.find(d => d.id === id);
        download?.controller?.abort();
        if (download?.blobUrl) URL.revokeObjectURL(download.blobUrl);
        return prev.map(d => d.id === id ? { ...d, status: 'cancelled', progress: 0, controller: undefined, blobUrl: undefined } : d);
    });
  };

  const handleClearDownloads = () => {
    setDownloads(prev => {
        prev.forEach(d => {
            if (d.blobUrl && (d.status === 'completed' || d.status === 'cancelled' || d.status === 'failed')) {
                URL.revokeObjectURL(d.blobUrl);
            }
        });
        return prev.filter(d => d.status === 'downloading' || d.status === 'paused');
    });
  };

  const handleClearBrowserData = () => {
      if (window.confirm('Are you sure you want to clear all bookmarks and folders? This action cannot be undone.')) {
        setBookmarks([]);
        setFolders([]);
    }
  };
  
    const handleTabContextMenu = (event: React.MouseEvent, tabId: number) => {
        event.preventDefault();
        setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY, tabId });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            
            if (modifier) {
                switch (e.key.toLowerCase()) {
                    case 't':
                        e.preventDefault();
                        handleNewTab(activeTab?.incognito || false);
                        break;
                    case 'w':
                        e.preventDefault();
                        if (activeTab) handleCloseTab(activeTab.id);
                        break;
                    case 'r':
                        e.preventDefault();
                        handleReload();
                        break;
                    case 'l':
                        e.preventDefault();
                        addressBarRef.current?.focus();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, handleNewTab, handleCloseTab, handleReload]);

  if (!activeTab || !isInitialized) {
    const initialBg = localStorage.getItem('settings')?.includes('"light"') ? 'bg-white' : 'bg-zinc-900';
    return <div className={`h-screen w-screen ${initialBg}`}></div>
  }
  
  const isDark = settings.theme === 'dark';
  const isIncognito = activeTab.incognito;

  const contentBg = isIncognito
    ? (isDark ? 'bg-gray-900' : 'bg-gray-100')
    : (isDark ? 'bg-zinc-800' : 'bg-zinc-50');

  return (
    <div className={`h-screen w-screen p-2 flex ${isDark ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
        <div className={`h-full w-full flex flex-col ${isDark ? 'text-white' : 'text-zinc-900'} font-sans overflow-hidden rounded-lg shadow-2xl`}>
            <TitleBar theme={settings.theme}>
                <TabBar tabs={tabs} activeTabId={activeTabId} onSelectTab={handleSelectTab} onCloseTab={handleCloseTab} onNewTab={handleNewTab} onTabContextMenu={handleTabContextMenu} theme={settings.theme} />
            </TitleBar>
            
            {activeTab && <NavigationBar activeTab={activeTab} onNavigate={handleNavigate} onBack={handleBack} onForward={handleForward} onReload={handleReload} onToggleBookmark={handleToggleBookmark} isBookmarked={!!isCurrentPageBookmarked} onMenuClick={(el) => { menuAnchorEl.current = el; setMenuOpen(true); }} onChatClick={() => setIsChatOpen(true)} addressBarRef={addressBarRef} theme={settings.theme} />}
            
            <main className={`flex-1 ${contentBg} relative ring-1 ring-inset ${isDark ? 'ring-white/5' : 'ring-black/5'}`}>
                {tabs.map(tab => {
                    if (tab.url === NEW_TAB_PAGE_URL) {
                        return (
                             <div key={`${tab.id}-${tab.reloadKey}`} className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}>
                                <AIToolsPage theme={settings.theme} incognito={tab.incognito} />
                            </div>
                        )
                    }
                    return (
                         <iframe
                            key={`${tab.id}-${tab.reloadKey}`}
                            src={tab.url}
                            className={`w-full h-full border-none ${activeTabId === tab.id ? 'block' : 'hidden'}`}
                            title={`Browser tab content for ${tab.url}`}
                            sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation"
                        ></iframe>
                    )
                })}
            </main>
            
            <ContextMenu
                menu={contextMenu}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
                onReload={handleReloadSpecificTab}
                onDuplicate={handleDuplicateTab}
                onCloseTab={handleCloseTab}
                theme={settings.theme}
            />

            <MenuDropdown 
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                anchorEl={menuAnchorEl.current}
                onNewIncognito={() => handleNewTab(true)}
                onShowBookmarks={() => setActiveModal('bookmarks')}
                onShowDownloads={() => setActiveModal('downloads')}
                onShowSettings={() => setActiveModal('settings')}
                theme={settings.theme}
            />
            <BookmarksModal
                isOpen={activeModal === 'bookmarks'}
                onClose={() => setActiveModal(null)}
                bookmarks={bookmarks}
                folders={folders}
                onUpdateBookmark={handleUpdateBookmark}
                onDeleteBookmark={handleDeleteBookmark}
                onAddFolder={handleAddFolder}
                onUpdateFolder={handleUpdateFolder}
                onDeleteFolder={handleDeleteFolder}
                onNavigate={handleNavigate}
                theme={settings.theme}
            />
            <DownloadsModal 
                isOpen={activeModal === 'downloads'}
                onClose={() => setActiveModal(null)}
                downloads={downloads}
                onStartDownload={handleStartDownload}
                onPause={handlePauseDownload}
                onResume={handleResumeDownload}
                onCancel={handleCancelDownload}
                onClear={handleClearDownloads}
                theme={settings.theme}
            />
            <SettingsModal 
                isOpen={activeModal === 'settings'}
                onClose={() => setActiveModal(null)}
                settings={settings}
                onSave={setSettings}
                onClearData={handleClearBrowserData}
            />
            <ChatPanel 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
                messages={chatMessages} 
                isLoading={isChatLoading} 
                onSendMessage={handleSendMessage} 
                theme={settings.theme}
            />
        </div>
    </div>
  );
};

export default App;