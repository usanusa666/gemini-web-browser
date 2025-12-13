export interface AIToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface ImageGenConfig {
  prompt: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages: number;
}

export interface VideoGenConfig {
  prompt: string;
  imageFile?: File;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
}