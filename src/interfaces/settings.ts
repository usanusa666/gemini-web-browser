export interface Settings {
  homepage: string;
  searchEngine: 'google' | 'duckduckgo' | 'bing';
  theme: 'dark' | 'light';
  fontSize: number;
  enableAutoUpdate: boolean;
  enableGeolocation: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}