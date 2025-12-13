export interface Tab {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  history: string[];
  historyIndex: number;
  incognito: boolean;
  loading: boolean;
  reloadKey: number;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: number;
}