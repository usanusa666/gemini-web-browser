import type { Bookmark, Folder, Settings, Tab } from '../interfaces';

export class StorageManager {
  private static readonly KEYS = {
    BOOKMARKS: 'bookmarks',
    FOLDERS: 'folders',
    SETTINGS: 'settings',
    SESSION: 'session',
    DOWNLOADS: 'downloads',
    CHAT_HISTORY: 'chat_history'
  };

  static getBookmarks(): Bookmark[] {
    try {
      const data = localStorage.getItem(this.KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading bookmarks:', error);
      return [];
    }
  }

  static setBookmarks(bookmarks: Bookmark[]): void {
    try {
      localStorage.setItem(this.KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }

  static getFolders(): Folder[] {
    try {
      const data = localStorage.getItem(this.KEYS.FOLDERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading folders:', error);
      return [];
    }
  }

  static setFolders(folders: Folder[]): void {
    try {
      localStorage.setItem(this.KEYS.FOLDERS, JSON.stringify(folders));
    } catch (error) {
      console.error('Error saving folders:', error);
    }
  }

  static getSettings(): Settings {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : this.getDefaultSettings();
    } catch (error) {
      console.error('Error reading settings:', error);
      return this.getDefaultSettings();
    }
  }

  static setSettings(settings: Settings): void {
    try {
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  static getSession(): Tab[] {
    try {
      const data = localStorage.getItem(this.KEYS.SESSION);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading session:', error);
      return [];
    }
  }

  static setSession(tabs: Tab[]): void {
    try {
      const nonIncognitoTabs = tabs.filter(t => !t.incognito);
      localStorage.setItem(this.KEYS.SESSION, JSON.stringify(nonIncognitoTabs));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  static clearAll(): void {
    try {
      Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  static clearBrowsingData(): void {
    try {
      localStorage.removeItem(this.KEYS.SESSION);
      localStorage.removeItem(this.KEYS.DOWNLOADS);
      localStorage.removeItem(this.KEYS.CHAT_HISTORY);
    } catch (error) {
      console.error('Error clearing browsing data:', error);
    }
  }

  private static getDefaultSettings(): Settings {
    return {
      homepage: '',
      searchEngine: 'google',
      theme: 'dark',
      fontSize: 14,
      enableAutoUpdate: true,
      enableGeolocation: true
    };
  }
}
