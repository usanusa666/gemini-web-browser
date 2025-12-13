export interface Bookmark {
  id: string;
  url: string;
  title: string;
  folderId: string | null;
  createdAt?: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt?: number;
}

export interface BookmarkState {
  bookmarks: Bookmark[];
  folders: Folder[];
}