import React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, GroundingChunk, Modality, Type, GenerateContentResponse } from '@google/genai';

// --- ELECTRON TYPES ---
declare global {
    interface Window {
        electronAPI: {
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            closeWindow: () => void;
        };
    }
}

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
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.55-.22a2.25 2.25 0 012.122 0l.55.22c.55.219 1.02.684 1.11 1.226l.098.591a2.25 2.25 0 003.422 1.84l.433-.432a2.25 2.25 0 013.182 3.182l-.432.433a2.25 2.25 0 001.84 3.422l.591.098c.542.09.95.56 1.17 1.05l.22.55a2.25 2.25 0 010 2.122l-.22.55c-.219.49-.684.96-1.226 1.05l-.591.098a2.25 2.25 0 00-3.422 1.84l.432.433a2.25 2.25 0 01-3.182 3.182l-.433-.432a2.25 2.25 0 00-1.84 3.422l.098.591c-.09.542-.56 1.007-1.11 1.226l-.55.22a2.25 2.25 0 01-2.122 0l-.55-.22c-.55-.219-1.02-.684-1.11-1.226l-.098-.591a2.25 2.25 0 00-3.422-1.84l-.433.432a2.25 2.25 0 01-3.182-3.182l.432.433a2.25 2.25 0 00-1.84-3.422l-.591-.098c-.542-.09-.95-.56-1.17-1.05l-.22-.55a2.25 2.25 0 010-2.122l.22-.55c.219.49.684.96 1.226-1.05l.591-.098a2.25 2.25 0 003.422-1.84l-.433-.432a2.25 2.25 0 013.182-3.182l.433.432a2.25 2.25 0 001.84-3.422l.098-.591z" />
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

const MovieIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
    </svg>
);

const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 0v-1.5a6 6 0 0 0-12 0v1.5m6 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
);

const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.475 2.118A2.25 2.25 0 0 0 1.5 21h11.218a2.25 2.25 0 0 0 2.08-1.618 3 3 0 0 0-5.78-1.128ZM9.53 16.122a3 3 0 0 0 5.78 1.128 2.25 2.25 0 0 1 2.475 2.118 2.25 2.25 0 0 0 2.148 1.618h1.146a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.211-1.02-.583-1.395l-1.523-1.523a3 3 0 0 0-4.242 0l-1.082 1.082a3 3 0 0 1-4.242 0l-1.523-1.523a3 3 0 0 0-4.242 0l-1.082 1.082a3 3 0 0 1-4.242 0l-1.523-1.523a3 3 0 0 0-4.242 0l-1.082 1.082a3 3 0 0 1-4.242 0l-1.523-1.523a3 3 0 0 0-4.242 0l-1.082 1.082a3 3 0 0 1-4.242 0z" />
    </svg>
);

const FileScanIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-1.5 5.25-3.375m-5.25 3.375-3.75-1.5m3.75 1.5v-2.25c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v2.25m-6.75-6.75-1.5-1.5m1.5 1.5-1.5-1.5m1.5 1.5v5.625c0 .621-.504 1.125-1.125 1.125H9.75M8.25 6H6.75a2.25 2.25 0 0 0-2.25 2.25v7.5a2.25 2.25 0 0 0 2.25 2.25h3a2.25 2.25 0 0 0 2.25-2.25V9.75" />
    </svg>
);

const ImageEditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
);

const MeepyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
        <path d="M12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        <circle cx="8.5" cy="11.5" r="1.5" />
        <circle cx="15.5" cy="11.5" r="1.5" />
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

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- AI TOOLS PAGE & COMPONENTS ---
const NEW_TAB_PAGE_URL = 'gemini://new-tab';
const AI_SUITE_PAGE_URL = 'gemini://ai-suite';

interface AIToolsPageProps {
    incognito: boolean;
    onOpenChat: () => void;
}
interface ToolProps {
}

const ToolContainer: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
    <div className="tool-container">
        <h1 className="tool-title">{title}</h1>
        <div className="tool-content">
            {children}
        </div>
    </div>
);

const ImageGenTool: React.FC<ToolProps> = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setImageUrl('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                },
            });
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            setImageUrl(`data:image/jpeg;base64,${base64ImageBytes}`);
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError(`An unknown error occurred: ${String(e)}`);
            }
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ToolContainer title="Generate Image with Imagen 4">
             <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A futuristic city skyline at sunset, with flying cars..." />
             <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                <option value="1:1">Square (1:1)</option>
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="4:3">Standard (4:3)</option>
                <option value="3:4">Tall (3:4)</option>
             </select>
             <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
                {isLoading ? 'Generating...' : 'Generate'}
             </button>
             {error && <p className="error-message">{error}</p>}
             {imageUrl && <img src={imageUrl} alt="Generated image" className="generated-image" />}
        </ToolContainer>
    );
};

const ImageEditTool: React.FC<ToolProps> = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt || !imageFile) {
            setError('Please provide an image and a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResultUrl('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Data = await fileToBase64(imageFile);
            
            const imagePart = { inlineData: { data: base64Data, mimeType: imageFile.type } };
            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    setResultUrl(`data:${part.inlineData.mimeType};base64,${base64ImageBytes}`);
                    break;
                }
            }
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError(`An unknown error occurred: ${String(e)}`);
            }
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <ToolContainer title="Edit Image with Nano Banana">
             <input type="file" accept="image/*" onChange={handleFileChange} />
             {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
             <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Add a retro film grain effect..." />
             <button onClick={handleGenerate} disabled={isLoading || !imageFile} className="btn-primary">
                {isLoading ? 'Generating...' : 'Generate'}
             </button>
             {error && <p className="error-message">{error}</p>}
             {resultUrl && <img src={resultUrl} alt="Edited image" className="generated-image" />}
        </ToolContainer>
    );
};

const VideoGenTool: React.FC<ToolProps> = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    
    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(hasKey);
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt && !imageFile) {
            setError('Please provide a prompt or an image.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Initializing video generation...');
        setError('');
        setVideoUrl('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const payload: any = {
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt || 'Animate this image.',
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: aspectRatio,
                }
            };

            if (imageFile) {
                payload.image = {
                    imageBytes: await fileToBase64(imageFile),
                    mimeType: imageFile.type,
                };
            }

            let operation = await ai.models.generateVideos(payload);
            setLoadingMessage('Video is processing. This can take a few minutes...');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) {
                throw new Error(String(operation.error.message || 'Unknown error during operation.'));
            }
            
            setLoadingMessage('Finalizing video...');
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error('Video generation failed to produce a link.');

            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) throw new Error('Failed to download the generated video.');
            
            const blob = await videoResponse.blob();
            setVideoUrl(URL.createObjectURL(blob));

        } catch (e) {
            let message = e instanceof Error ? e.message : String(e);

            if (message.includes("Requested entity was not found")) {
                message = "API Key is invalid or expired. Please select a new key.";
                setHasApiKey(false);
            }
            setError(`An error occurred: ${message}`);
            console.error(e);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    return (
        <ToolContainer title="Generate Video with Veo">
             {!hasApiKey ? (
                 <div className="api-key-prompt">
                    <p>Veo requires an API key with billing enabled.</p>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Learn more about billing</a>
                    <button onClick={handleSelectKey} className="btn-primary">
                        Select API Key
                    </button>
                 </div>
             ) : (
                <>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A vibrant coral reef teeming with life..." />
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="9:16">Portrait (9:16)</option>
                    </select>
                    <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
                        {isLoading ? 'Generating...' : 'Generate Video'}
                    </button>
                </>
             )}
             {isLoading && <p className="loading-message">{loadingMessage}</p>}
             {error && <p className="error-message">{error}</p>}
             {videoUrl && <video src={videoUrl} controls autoPlay className="generated-video" />}
        </ToolContainer>
    );
};

const TtsTool: React.FC<ToolProps> = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const handleGenerate = async () => {
        if (!text) {
            setError('Please enter some text.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAudioBuffer(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error('No audio data received.');
            
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const buffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
            setAudioBuffer(buffer);
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError(`An unknown error occurred: ${String(e)}`);
            }
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlay = () => {
        if (audioBuffer && audioContextRef.current) {
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start(0);
        }
    };

    return (
        <ToolContainer title="Generate Speech (TTS)">
             <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Hello, world! I am a friendly AI assistant." />
             <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
                {isLoading ? 'Generating...' : 'Generate Speech'}
             </button>
             {audioBuffer && (
                <button onClick={handlePlay} className="btn-secondary">
                    Play Audio
                </button>
             )}
             {error && <p className="error-message">{error}</p>}
        </ToolContainer>
    );
};

const ReasoningTool: React.FC<ToolProps> = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [response, setResponse] = useState('');

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResponse('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const result: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }
                },
            });
            setResponse(result.text);
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError(`An unknown error occurred: ${String(e)}`);
            }
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ToolContainer title="Complex Reasoning with Gemini 2.5 Pro">
             <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Explain the theory of general relativity as if you were explaining it to a high school student, including its key principles and real-world implications..." />
             <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
                {isLoading ? 'Thinking...' : 'Submit'}
             </button>
             {error && <p className="error-message">{error}</p>}
             {response && <div className="response-box"><pre>{response}</pre></div>}
        </ToolContainer>
    );
};

const AnalysisTool: React.FC<ToolProps> = () => {
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [response, setResponse] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if(selectedFile.type.startsWith('video/') && selectedFile.size > 20 * 1024 * 1024) { // 20MB limit for demo
                setError('Video file is too large for this demo (max 20MB).');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError('');
        }
    };
    
    const handleAnalyze = async () => {
        if (!file) {
            setError('Please upload a file to analyze.');
            return;
        }
        const userPrompt = prompt || `What is in this ${file.type.split('/')[0]}?`;

        setIsLoading(true);
        setError('');
        setResponse('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const base64Data = await fileToBase64(file);
            
            const filePart = { inlineData: { data: base64Data, mimeType: file.type } };
            const textPart = { text: userPrompt };
            
            let model = 'gemini-2.5-flash';
            if (file.type.startsWith('video/')) {
                model = 'gemini-2.5-pro';
            }

            const result: GenerateContentResponse = await ai.models.generateContent({
                model: model,
                contents: { parts: [filePart, textPart] },
            });
            setResponse(result.text);
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}`);
            } else {
                setError(`An unknown error occurred: ${String(e)}`);
            }
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ToolContainer title="Analyze Image, Audio, or Video">
             <input type="file" accept="image/*,audio/*,video/*" onChange={handleFileChange} />
             {file && <p className="file-info-text">Selected: {file.name} ({file.type})</p>}
             <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What is this? If it's audio, transcribe it." />
             <button onClick={handleAnalyze} disabled={isLoading || !file} className="btn-primary">
                {isLoading ? 'Analyzing...' : 'Analyze'}
             </button>
             {error && <p className="error-message">{error}</p>}
             {response && <div className="response-box"><pre>{response}</pre></div>}
        </ToolContainer>
    );
};


const AIToolsPage: React.FC<AIToolsPageProps> = ({ incognito, onOpenChat }) => {
    const [activeToolId, setActiveToolId] = useState('image-gen');
    
    const tools = [
        { id: 'image-gen', name: 'Generate Image', icon: <SparklesIcon className="icon-sm" />, component: ImageGenTool },
        { id: 'image-edit', name: 'Edit Image', icon: <ImageEditIcon className="icon-sm" />, component: ImageEditTool },
        { id: 'video-gen', name: 'Generate Video', icon: <MovieIcon className="icon-sm" />, component: VideoGenTool },
        { id: 'tts', name: 'Generate Speech', icon: <MicIcon className="icon-sm" />, component: TtsTool },
        { id: 'reasoning', name: 'Complex Reasoning', icon: <BrainIcon className="icon-sm" />, component: ReasoningTool },
        { id: 'analysis', name: 'Analyze File', icon: <FileScanIcon className="icon-sm" />, component: AnalysisTool },
    ];
    
    const ActiveTool = tools.find(t => t.id === activeToolId)!.component;
    const pageClassName = `ai-tools-page ${incognito ? 'incognito' : ''}`;

    return (
        <div className={pageClassName}>
            <aside className="ai-tools-sidebar">
                <div className="sidebar-header">
                    <SparklesIcon className="sidebar-header-icon" />
                    <h1 className="sidebar-header-title">AI Suite</h1>
                </div>
                <nav className="sidebar-nav">
                    {tools.map(tool => (
                        <button key={tool.id} onClick={() => setActiveToolId(tool.id)}
                            className={`sidebar-button ${activeToolId === tool.id ? 'active' : ''}`}>
                            {tool.icon}
                            <span>{tool.name}</span>
                        </button>
                    ))}
                    <div className="menu-divider" />
                    <button onClick={onOpenChat} className="sidebar-button">
                        <ChatIcon className="icon-sm" />
                        <span>AI Assistant</span>
                    </button>
                </nav>
                 {incognito && (
                    <div className="sidebar-footer">
                        <IncognitoIcon className="icon-xs"/> Incognito Mode
                    </div>
                )}
            </aside>
            <main className="ai-tools-main">
                <ActiveTool />
            </main>
        </div>
    );
};


// --- CHILD COMPONENTS ---

const Dashboard: React.FC<{ onSearch: (query: string) => void, incognito: boolean }> = ({ onSearch, incognito }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query);
      }
    };
    
    const quickLinks = [
        { name: 'Google', url: 'https://google.com' },
        { name: 'GitHub', url: 'https://github.com' },
        { name: 'AI Studio', url: 'https://aistudio.google.com/' },
        { name: 'React Docs', url: 'https://react.dev/' },
        { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/'},
        { name: 'Tailwind CSS', url: 'https://tailwindcss.com/'}
    ];

    const pageClass = `dashboard-page ${incognito ? 'incognito' : ''}`;

    return (
      <div className={pageClass}>
        <div className="dashboard-content">
             <h1 className="dashboard-title">Gemini Web Browser</h1>
             <form onSubmit={handleSubmit} className="dashboard-search-form">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="dashboard-search-input"
                  placeholder="Search or type a URL"
                  autoFocus
                />
             </form>

            <div className="quick-links-grid">
              {quickLinks.map(link => (
                  <a key={link.name} href="#" onClick={(e) => { e.preventDefault(); onSearch(link.url);}} className="quick-link">
                      <div className="quick-link-icon">{link.name.charAt(0)}</div>
                      <span className="quick-link-name">{link.name}</span>
                  </a>
              ))}
            </div>

           {incognito && (
                <div className="dashboard-incognito-notice">
                    <IncognitoIcon className="icon-md" />
                    <p>You've gone Incognito</p>
                    <span>Your activity might still be visible to websites you visit, your employer or school, or your internet service provider.</span>
                </div>
            )}
        </div>
      </div>
    );
};

const WindowControls: React.FC = () => (
    <div className="window-controls no-drag">
        <button onClick={() => window.electronAPI?.minimizeWindow()} className="window-control-btn">
            <svg width="10" height="10" viewBox="0 0 10 1"><rect fill="currentColor" width="10" height="1" y="4.5"></rect></svg>
        </button>
        <button onClick={() => window.electronAPI?.maximizeWindow()} className="window-control-btn">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="none" stroke="currentColor" d="M.5.5h9v9h-9z"></path></svg>
        </button>
        <button onClick={() => window.electronAPI?.closeWindow()} className="window-control-btn close">
            <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M.3 9.7c.2.2.4.3.7.3.3 0 .5-.1.7-.3L5 6.4l3.3 3.3c.2.2.5.3.7.3.2 0 .5-.1.7-.3.4-.4.4-1 0-1.4L6.4 5l3.3-3.3c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L5 3.6 1.7.3C1.3-.1 1-.1.6.3c-.4.4-.4 1 0 1.4L3.6 5 .3 8.3c-.4.4-.4 1 0 1.4z"></path></svg>
        </button>
    </div>
);

const TitleBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="title-bar">
            {children}
            <WindowControls />
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
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab, onTabContextMenu }) => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isIncognito = activeTab?.incognito || false;
  
  const containerClass = `tab-bar ${isIncognito ? 'incognito' : ''}`;

  return (
    <div className={containerClass}>
      <div className="tab-list">
        {tabs.filter(t => t.incognito === isIncognito).map((tab) => {
            const isActive = activeTabId === tab.id;
            const tabClass = `tab no-drag ${isActive ? 'active' : ''}`;
            return (
              <div 
                  key={tab.id} 
                  onClick={() => onSelectTab(tab.id)} 
                  onContextMenu={(e) => onTabContextMenu(e, tab.id)}
                  className={tabClass}
                  title={tab.url}
                  >
                <div className="tab-content">
                  {tab.incognito ? <IncognitoIcon className="tab-icon" /> : <GlobeIcon className="tab-icon" />}
                  <span className="tab-title">{getHostname(tab.url)}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }} className="tab-close-btn">
                  <CloseIcon className="icon-xs" />
                </button>
              </div>
            )
        })}
      </div>
       <button onClick={() => onNewTab(isIncognito)} className="new-tab-btn no-drag">
            <AddIcon className="icon-sm" />
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
  onAiSuiteClick: () => void;
  addressBarRef: React.RefObject<HTMLInputElement>;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onNavigate, onBack, onForward, onReload, onToggleBookmark, isBookmarked, onMenuClick, onChatClick, onAiSuiteClick, addressBarRef }) => {
  const [inputValue, setInputValue] = useState(activeTab.url);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  
  const navBarClass = `nav-bar ${activeTab.incognito ? 'incognito' : ''}`;

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
    <div className={navBarClass}>
      <div className="page-controls no-drag">
        <button onClick={onBack} disabled={!canGoBack} className="nav-btn"><BackIcon className="icon-sm" /></button>
        <button onClick={onForward} disabled={!canGoForward} className="nav-btn"><ForwardIcon className="icon-sm" /></button>
        <button onClick={onReload} className="nav-btn"><ReloadIcon className="icon-sm" /></button>
      </div>
      <form onSubmit={handleNavigationSubmit} className="address-bar-form no-drag">
        <input ref={addressBarRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onFocus={(e) => e.target.select()} className="address-bar-input" placeholder="Search or type a URL" />
        <button type="button" onClick={onToggleBookmark} className="bookmark-btn"><StarIcon className={`icon-sm ${isBookmarked ? 'bookmarked' : ''}`} filled={isBookmarked} /></button>
      </form>
      <div className="toolbar-actions no-drag">
        <button onClick={onAiSuiteClick} className="nav-btn" title="AI Suite"><SparklesIcon className="icon-md" /></button>
        <button onClick={onChatClick} className="nav-btn" title="AI Assistant"><ChatIcon className="icon-md" /></button>
        <button ref={menuButtonRef} onClick={() => menuButtonRef.current && onMenuClick(menuButtonRef.current)} className="nav-btn" title="Menu"><MoreVertIcon className="icon-md" /></button>
      </div>
    </div>
  );
};

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, messages, isLoading, onSendMessage }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSendMessage(input);
        setInput('');
    };
    
    return (
        <div className={`chat-panel ${isOpen ? 'open' : ''}`} role="complementary" aria-label="AI Assistant">
            <header className="chat-header">
                <h2 className="chat-title">AI Assistant</h2>
                <button onClick={onClose} className="chat-close-btn" aria-label="Close chat panel"><CloseIcon className="icon-md" /></button>
            </header>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-container ${msg.role}`}>
                        <div className="message-bubble">
                            <p>{msg.text}</p>
                        </div>
                        {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                            <div className="message-sources">
                                <h3>Sources:</h3>
                                <ul>
                                {msg.sources.map((source, i) => (
                                    <li key={i}>
                                        <a href={source.web?.uri || source.maps?.uri} target="_blank" rel="noopener noreferrer">
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
                    <div className="message-container model">
                        <div className="message-bubble loading">Thinking...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                <form onSubmit={handleSubmit} className="chat-form">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} className="chat-input" placeholder="Ask anything..."/>
                    <button type="submit" disabled={isLoading} className="chat-send-btn"><SendIcon className="icon-md"/></button>
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
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ isOpen, onClose, anchorEl, onNewIncognito, onShowBookmarks, onShowDownloads, onShowSettings }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const style = { top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px` };

  return (
    <div ref={dropdownRef} style={style} className="menu-dropdown">
      <button onClick={() => { onNewIncognito(); onClose(); }} className="menu-item">
        <IncognitoIcon className="icon-md" /> New Incognito window
      </button>
      <button onClick={() => { onShowBookmarks(); onClose(); }} className="menu-item">
        <StarIcon className="icon-md" /> Bookmarks
      </button>
      <button onClick={() => { onShowDownloads(); onClose(); }} className="menu-item">
        <DownloadIcon className="icon-md" /> Downloads
      </button>
      <div className="menu-divider" />
      <button onClick={() => { onShowSettings(); onClose(); }} className="menu-item">
        <SettingsIcon className="icon-md" /> Settings
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
}

const BookmarksModal: React.FC<BookmarksModalProps> = ({
    isOpen, onClose, bookmarks, folders, onUpdateBookmark, onDeleteBookmark,
    onAddFolder, onUpdateFolder, onDeleteFolder, onNavigate
}) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
    const [editingBookmarkData, setEditingBookmarkData] = useState<{ title: string; url: string }>({ title: '', url: '' });
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content bookmarks-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2 className="modal-title"><StarIcon className="icon-md"/>Bookmark Manager</h2>
                    <button onClick={onClose} className="modal-close-btn"><CloseIcon className="icon-md" /></button>
                </header>
                <div className="bookmarks-modal-body">
                    <aside className="bookmarks-sidebar">
                        <div 
                            className="bookmarks-folder-list"
                            onDrop={(e) => handleDrop(e, null)}
                            onDragOver={handleDragOver}
                        >
                            <div onClick={() => setSelectedFolderId(null)} className={`bookmarks-folder-item ${selectedFolderId === null ? 'active' : ''}`}>
                                <FolderIcon className="icon-md" />
                                <span>All Bookmarks</span>
                            </div>
                            {folders.map(folder => (
                                <div 
                                    key={folder.id} 
                                    onClick={() => setSelectedFolderId(folder.id)}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    onDragOver={handleDragOver}
                                    className={`bookmarks-folder-item ${selectedFolderId === folder.id ? 'active' : ''}`}
                                >
                                    {editingFolderId === folder.id ? (
                                        <input
                                            type="text"
                                            value={editingFolderName}
                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                            onBlur={() => handleSaveFolder(folder.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveFolder(folder.id)}
                                            className="inline-editor" autoFocus
                                        />
                                    ) : (
                                        <div className="item-content">
                                            <FolderIcon className="icon-md" />
                                            <span>{folder.name}</span>
                                        </div>
                                    )}
                                    <div className="item-actions">
                                        <button onClick={() => handleEditFolder(folder)}><EditIcon className="icon-sm"/></button>
                                        <button onClick={() => onDeleteFolder(folder.id)}><CloseIcon className="icon-sm"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bookmarks-sidebar-footer">
                            {isAddingFolder ? (
                                <div className="add-folder-form">
                                    <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddFolder()}/>
                                    <button onClick={handleAddFolder} className="btn-primary btn-sm">Add</button>
                                    <button onClick={() => setIsAddingFolder(false)} className="btn-icon"><CloseIcon className="icon-sm"/></button>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddingFolder(true)} className="btn-secondary add-folder-btn">
                                    <AddIcon className="icon-md"/> New Folder
                                </button>
                            )}
                        </div>
                    </aside>
                    <main className="bookmarks-main">
                        {visibleBookmarks.length > 0 ? (
                        <ul className="bookmark-list">
                            {visibleBookmarks.map(bookmark => (
                                <li key={bookmark.id} className="bookmark-item" draggable onDragStart={e => handleDragStart(e, bookmark.id)}>
                                    {editingBookmarkId === bookmark.id ? (
                                        <div className="bookmark-edit-form">
                                            <input type="text" placeholder="Title" value={editingBookmarkData.title} onChange={e => setEditingBookmarkData({...editingBookmarkData, title: e.target.value})} />
                                            <input type="text" placeholder="URL" value={editingBookmarkData.url} onChange={e => setEditingBookmarkData({...editingBookmarkData, url: e.target.value})} />
                                            <button onClick={() => handleSaveBookmark(bookmark.id)} className="btn-primary btn-xs">Save</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div onClick={() => { onNavigate(bookmark.url); onClose(); }} className="bookmark-info">
                                                <p className="bookmark-title">{bookmark.title}</p>
                                                <p className="bookmark-url">{bookmark.url}</p>
                                            </div>
                                            <div className="item-actions">
                                                <button onClick={() => handleEditBookmark(bookmark)}><EditIcon className="icon-sm"/></button>
                                                <button onClick={() => onDeleteBookmark(bookmark.id)}><CloseIcon className="icon-sm"/></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                         ) : (
                            <div className="empty-state">
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
}

const DownloadsModal: React.FC<DownloadsModalProps> = ({ isOpen, onClose, downloads, onStartDownload, onPause, onResume, onCancel, onClear }) => {
    const [urlInput, setUrlInput] = useState('');
    
    const handleDownloadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (urlInput) {
            onStartDownload(urlInput);
            setUrlInput('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content downloads-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2 className="modal-title"><DownloadIcon className="icon-md"/>Downloads</h2>
                    <button onClick={onClose} className="modal-close-btn"><CloseIcon className="icon-md" /></button>
                </header>
                <div className="downloads-input-area">
                    <form onSubmit={handleDownloadSubmit} className="download-form">
                        <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="address-bar-input" placeholder="Paste a download link"/>
                        <button type="submit" className="btn-primary">Download</button>
                    </form>
                </div>
                <div className="downloads-list">
                    {downloads.length === 0 ? (
                        <div className="empty-state">No downloads yet.</div>
                    ) : (
                        downloads.map(d => (
                            <div key={d.id} className="download-item">
                                <div className="download-info">
                                    <p className="download-filename">{d.filename}</p>
                                    <p className="download-status">{d.status}</p>
                                </div>
                                <div className="download-actions">
                                    {d.status === 'downloading' && <button onClick={() => onPause(d.id)} className="btn-icon"><PauseIcon className="icon-md"/></button>}
                                    {d.status === 'paused' && <button onClick={() => onResume(d.id)} className="btn-icon"><PlayIcon className="icon-md"/></button>}
                                    {(d.status === 'downloading' || d.status === 'paused') && <button onClick={() => onCancel(d.id)} className="btn-icon"><CloseIcon className="icon-md"/></button>}
                                    {d.status === 'completed' && d.blobUrl && <a href={d.blobUrl} download={d.filename} className="link-primary">Open File</a>}
                                    {d.status === 'failed' && <p className="error-text">Failed</p>}
                                </div>
                                {(d.status === 'downloading' || d.progress > 0) && d.status !== 'failed' && d.status !== 'cancelled' && (
                                    <div className="download-progress-bar">
                                        <div className="progress" style={{ width: `${d.progress}%` }}></div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <footer className="modal-footer">
                    <button onClick={onClear} className="link-primary">Clear all</button>
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
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2 id="settings-title" className="modal-title"><SettingsIcon className="icon-md"/>Settings</h2>
                    <button onClick={onClose} className="modal-close-btn" aria-label="Close settings"><CloseIcon className="icon-md" /></button>
                </header>
                <div className="modal-body settings-body">
                    <div className="form-group">
                        <label htmlFor="homepage">Homepage URL</label>
                        <input 
                            type="url" 
                            id="homepage"
                            value={currentSettings.homepage}
                            onChange={(e) => handleSettingChange('homepage', e.target.value)}
                            placeholder="https://..."
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="searchEngine">Search Engine</label>
                        <select
                            id="searchEngine"
                            value={currentSettings.searchEngine}
                            onChange={(e) => handleSettingChange('searchEngine', e.target.value)}
                        >
                            <option value="google">Google</option>
                            <option value="duckduckgo">DuckDuckGo</option>
                            <option value="bing">Bing</option>
                        </select>
                    </div>
                     <div className="form-group">
                        <label htmlFor="theme">Appearance</label>
                        <select
                            id="theme"
                            value={currentSettings.theme}
                            onChange={(e) => handleSettingChange('theme', e.target.value)}
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                    <div className="settings-section">
                        <h3>Privacy and Data</h3>
                        <button onClick={onClearData} className="btn-danger">Clear Bookmarks & Folders</button>
                        <p>This will permanently delete all your saved bookmarks and folders.</p>
                    </div>
                </div>
                <footer className="modal-footer">
                    <button onClick={handleSave} className="btn-primary">Save and Close</button>
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
}

const ContextMenu: React.FC<ContextMenuProps> = ({ menu, onClose, onReload, onDuplicate, onCloseTab }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    
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
        <div ref={menuRef} style={{ top: menu.y, left: menu.x }} className="context-menu">
            {menuItems.map(item => (
                <button
                    key={item.label}
                    onClick={() => { item.action(); onClose(); }}
                    className="menu-item"
                >
                    <item.icon className="icon-sm" />
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, tabId: null });
  const [settings, setSettings] = useState<Settings>({ homepage: '', searchEngine: 'google', theme: 'dark'});
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
            const initialUrl = currentSettings.homepage || NEW_TAB_PAGE_URL;
            const firstTab: Tab = { id: nextId.current, url: initialUrl, history: [initialUrl], historyIndex: 0, reloadKey: 0, incognito: false };
            setTabs([firstTab]);
            setActiveTabId(firstTab.id);
            nextId.current++;
        }
      } else {
        const initialUrl = currentSettings.homepage || NEW_TAB_PAGE_URL;
        const firstTab: Tab = { id: nextId.current, url: initialUrl, history: [initialUrl], historyIndex: 0, reloadKey: 0, incognito: false };
        setTabs([firstTab]);
        setActiveTabId(firstTab.id);
        nextId.current++;
      }
    } catch (error) { console.error("Failed to load data from localStorage", error); }
    setIsInitialized(true);
  }, []);

  useEffect(() => { try { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); } catch(e) { console.error("Failed to save bookmarks", e); } }, [bookmarks]);
  useEffect(() => { try { localStorage.setItem('folders', JSON.stringify(folders)); } catch(e) { console.error("Failed to save folders", e); } }, [folders]);
  useEffect(() => { try { localStorage.setItem('settings', JSON.stringify(settings)); } catch(e) { console.error("Failed to save settings", e); } }, [settings]);
  
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
    const defaultUrl = NEW_TAB_PAGE_URL;
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
                return prevTabs.filter(t => t.id !== id);
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
        if(activeTab.url.startsWith('gemini:')){
             updateActiveTab({ reloadKey: activeTab.reloadKey + 1 });
        } else {
            const iframe = document.querySelector(`iframe[data-tab-id="${activeTab.id}"]`) as HTMLIFrameElement;
            if(iframe) iframe.contentWindow?.location.reload();
        }
    }
  }, [activeTab, updateActiveTab]);

  const handleReloadSpecificTab = useCallback((tabId: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        if(tab.url.startsWith('gemini:')){
            updateTab(tabId, { reloadKey: tab.reloadKey + 1 });
        } else {
             const iframe = document.querySelector(`iframe[data-tab-id="${tab.id}"]`) as HTMLIFrameElement;
            if(iframe) iframe.contentWindow?.location.reload();
        }
    }
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
    } catch (error) {
        if (error instanceof Error) {
            if (error.name !== 'AbortError') {
                setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', error: error.message, controller: undefined } : d));
            }
        } else {
             setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', error: String(error), controller: undefined } : d));
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
    const initialBg = localStorage.getItem('settings')?.includes('"light"') ? 'bg-light' : 'bg-dark';
    return <div className={`loading-screen ${initialBg}`}></div>
  }
  
  const incognitoClass = activeTab.incognito ? 'incognito' : '';

  return (
    <div className={`app-container theme-${settings.theme}`}>
        <div className="browser-window">
            <header className="browser-header">
                <TitleBar>
                    <TabBar tabs={tabs} activeTabId={activeTabId} onSelectTab={handleSelectTab} onCloseTab={handleCloseTab} onNewTab={handleNewTab} onTabContextMenu={handleTabContextMenu} />
                </TitleBar>
                
                {activeTab && <NavigationBar activeTab={activeTab} onNavigate={handleNavigate} onBack={handleBack} onForward={handleForward} onReload={handleReload} onToggleBookmark={handleToggleBookmark} isBookmarked={!!isCurrentPageBookmarked} onMenuClick={(el) => { menuAnchorEl.current = el; setMenuOpen(true); }} onChatClick={() => setIsChatOpen(true)} onAiSuiteClick={() => handleNavigate(AI_SUITE_PAGE_URL)} addressBarRef={addressBarRef} />}
            </header>
            
            <main className={`main-content ${incognitoClass}`}>
                {tabs.map(tab => {
                    const isVisible = activeTabId === tab.id;
                    if (tab.url === NEW_TAB_PAGE_URL) {
                        return (
                             <div key={`${tab.id}-${tab.reloadKey}`} className={`content-pane ${isVisible ? 'visible' : ''}`}>
                                <Dashboard onSearch={handleNavigate} incognito={tab.incognito}/>
                            </div>
                        )
                    }
                    if (tab.url === AI_SUITE_PAGE_URL) {
                        return (
                             <div key={`${tab.id}-${tab.reloadKey}`} className={`content-pane ${isVisible ? 'visible' : ''}`}>
                                <AIToolsPage incognito={tab.incognito} onOpenChat={() => setIsChatOpen(true)} />
                            </div>
                        )
                    }
                    return (
                         <iframe
                            key={`${tab.id}-${tab.reloadKey}`}
                            data-tab-id={tab.id}
                            src={tab.url}
                            className={`content-pane ${isVisible ? 'visible' : ''}`}
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
            />

            <MenuDropdown 
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                anchorEl={menuAnchorEl.current}
                onNewIncognito={() => handleNewTab(true)}
                onShowBookmarks={() => setActiveModal('bookmarks')}
                onShowDownloads={() => setActiveModal('downloads')}
                onShowSettings={() => setActiveModal('settings')}
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
            />
        </div>
    </div>
  );
};

export default App;
