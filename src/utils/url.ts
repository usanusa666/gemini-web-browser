const searchEngines = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q='
};

export const sanitizeUrl = (url: string, searchEngine: keyof typeof searchEngines = 'google'): string => {
  if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('gemini:')) return url;
  
  if (!/^(https?|ftp):\/\//i.test(url)) {
    try {
      new URL(`https://${url}`);
      if (url.includes('.')) {
        return `https://${url}`;
      }
    } catch (e) {
    }
    return `${searchEngines[searchEngine]}${encodeURIComponent(url)}`;
  }
  
  return url;
};

export const getHostname = (url: string): string => {
  try {
    if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('gemini:')) return 'New Tab';
    
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return 'Invalid URL';
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
};