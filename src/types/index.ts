export interface FeedItem {
  id: string;
  feedId: string;  // Add this to track which feed the item belongs to
  title: string;
  link: string;
  content: string;
  pubDate: string;
  categories: string[];
  isRead: boolean;
  isBookmarked: boolean;
  author?: string;
}

export interface Bucket {
  id: string;
  name: string;
  color: string;
  keywords: string[];
  operator: 'AND' | 'OR' | 'NOT';
  caseSensitive: boolean;
  useRegex: boolean;
  searchInTitle: boolean;
  searchInBody: boolean;
}

export interface SearchConfig {
  id: string;
  name: string;
  keywords: string[];
  operator: 'AND' | 'OR' | 'NOT';
  caseSensitive: boolean;
  useRegex: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface Feed {
  id: string;
  url: string;
  title: string;
  description: string;
  lastUpdated: string;
}

export interface AutoRefreshConfig {
  enabled: boolean;
  intervalMinutes: number;
}