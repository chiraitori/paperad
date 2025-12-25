// Manga Types
export interface Manga {
  id: string;
  title: string;
  author: string;
  artist?: string;
  description: string;
  coverImage: string;
  genres: string[];
  status: string;
  chapters: Chapter[];
  rating?: number;
  lastUpdated: string;
  source: string;
}

export interface Chapter {
  id: string;
  mangaId: string;
  number: number;
  title: string;
  pages: Page[];
  releaseDate: string;
  isRead: boolean;
}

export interface Page {
  id: string;
  chapterId: string;
  pageNumber: number;
  imageUrl: string;
}

// Source Types
export interface MangaSource {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;
}

// Reading Progress
export interface ReadingProgress {
  mangaId: string;
  chapterId: string;
  pageNumber: number;
  lastRead: string;
}

// Library Types
export interface LibraryEntry {
  manga: Manga;
  addedAt: string;
  lastReadChapter?: string;
  progress: ReadingProgress | null;
  isFavorite: boolean;
}

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  success: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

// Navigation Types
export type RootStackParamList = {
  Main: undefined;
  MangaDetail: { mangaId: string; sourceId?: string };
  Reader: { mangaId: string; chapterId: string; sourceId?: string };
  Search: undefined;
  Settings: undefined;
  GeneralSettings: undefined;
  ThemeSettings: undefined;
  Backups: undefined;
  Extensions: undefined;
  ExtensionDetail: { extension: any };
  ExtensionSettings: { extensionId: string; extensionName: string };
  AddRepository: undefined;
  BrowseAllRepositories: undefined;
  BrowseRepository: { repoId: string; repoName: string; repoBaseUrl: string };
  Developer: undefined;
  Credits: undefined;
  Category: { sourceId: string; sectionId: string; title: string; initialItems?: any[]; tagId?: string };
  SearchResults: { sourceId: string; sourceName: string; query: string; initialItems?: any[] };
  GenreList: { sourceId: string; tags: { id: string; label: string }[] };
};

export type BottomTabParamList = {
  Discover: undefined;
  Search: undefined;
  Library: undefined;
  History: undefined;
  Settings: undefined;
};
