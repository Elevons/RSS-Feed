import { create } from 'zustand';
import { FeedItem, Bucket, SearchConfig, Feed, AutoRefreshConfig } from '../types';
import { persist } from 'zustand/middleware';

interface AppState {
  feeds: Feed[];
  items: FeedItem[];
  buckets: Bucket[];
  searchConfigs: SearchConfig[];
  selectedBucketId: string | null;
  autoRefresh: AutoRefreshConfig;
  addFeed: (url: string) => Promise<void>;
  removeFeed: (id: string) => void;
  addBucket: (bucket: Bucket) => void;
  removeBucket: (id: string) => void;
  toggleReadStatus: (id: string) => void;
  toggleBookmark: (id: string) => void;
  saveSearchConfig: (config: SearchConfig) => void;
  updateFeeds: () => Promise<void>;
  updateFeed: (url: string, feedId: string) => Promise<void>;
  selectBucket: (id: string | null) => void;
  getItemsForBucket: (bucket: Bucket) => FeedItem[];
  setAutoRefresh: (config: AutoRefreshConfig) => void;
}

const createProxyUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(parsedUrl.toString())}`;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
};

// Helper function to normalize URLs for comparison
const normalizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Remove protocol, trailing slashes, and query parameters
    return parsed.hostname + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
};

// Helper function to create a unique key for an article
const createArticleKey = (item: { title: string; link: string }): string => {
  const normalizedUrl = normalizeUrl(item.link);
  const normalizedTitle = item.title.trim().toLowerCase();
  return `${normalizedUrl}|${normalizedTitle}`;
};

// Helper function to process feed items
const processFeedItem = (feedId: string, item: any): FeedItem => ({
  id: crypto.randomUUID(),
  feedId,
  title: item?.title?.trim() || 'Untitled',
  link: item?.link || item?.url || '',
  content: item?.content || item?.description || '',
  pubDate: item?.published || new Date().toISOString(),
  categories: Array.isArray(item?.category) ? item.category : item?.category ? [item.category] : [],
  isRead: false,
  isBookmarked: false,
  author: item?.author || undefined,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      feeds: [],
      items: [],
      buckets: [],
      searchConfigs: [],
      selectedBucketId: null,
      autoRefresh: {
        enabled: false,
        intervalMinutes: 30,
      },

      addFeed: async (url: string) => {
        try {
          if (!url.trim()) {
            throw new Error('Please enter a valid RSS feed URL');
          }

          const { parse } = await import('rss-to-json');
          const proxyUrl = createProxyUrl(url);
          
          const feed = await parse(proxyUrl).catch(error => {
            if (error.message.includes('Network Error')) {
              throw new Error('Network error - please check your internet connection and the feed URL');
            }
            throw error;
          });
          
          if (!feed) {
            throw new Error('Failed to parse feed - received empty response');
          }

          const newFeed: Feed = {
            id: crypto.randomUUID(),
            url,
            title: feed.title || 'Untitled Feed',
            description: feed.description || '',
            lastUpdated: new Date().toISOString(),
          };

          // Process new items
          const newItems = feed.items?.map(item => processFeedItem(newFeed.id, item)) || [];

          set(state => {
            const itemMap = new Map();
            
            // Add existing items first
            state.items.forEach(item => {
              const key = createArticleKey(item);
              itemMap.set(key, item);
            });
            
            // Add new items, preserving any existing state
            newItems.forEach(newItem => {
              const key = createArticleKey(newItem);
              if (!itemMap.has(key)) {
                itemMap.set(key, newItem);
              }
            });

            return {
              feeds: [...state.feeds, newFeed],
              items: Array.from(itemMap.values()),
            };
          });
        } catch (error) {
          console.error('Failed to add feed:', error);
          throw error instanceof Error ? error : new Error('Failed to parse feed');
        }
      },

      updateFeed: async (url: string, feedId: string) => {
        try {
          const { parse } = await import('rss-to-json');
          const proxyUrl = createProxyUrl(url);
          
          const feed = await parse(proxyUrl);
          
          if (!feed) {
            throw new Error('Failed to parse feed');
          }

          // Process new items from the feed
          const newItems = feed.items?.map(item => processFeedItem(feedId, item)) || [];

          set(state => {
            // Get items from other feeds
            const otherFeedItems = state.items.filter(item => item.feedId !== feedId);
            
            // Create a map of all items for deduplication
            const itemMap = new Map();
            
            // Add other feed items first
            otherFeedItems.forEach(item => {
              const key = createArticleKey(item);
              itemMap.set(key, item);
            });
            
            // Add new items, preserving read/bookmark status
            newItems.forEach(newItem => {
              const key = createArticleKey(newItem);
              const existingItem = state.items.find(item => 
                item.feedId === feedId && createArticleKey(item) === key
              );
              
              if (existingItem) {
                // Keep existing status but update content
                itemMap.set(key, {
                  ...existingItem,
                  content: newItem.content,
                  pubDate: newItem.pubDate
                });
              } else {
                itemMap.set(key, newItem);
              }
            });

            return {
              feeds: state.feeds.map(f => 
                f.id === feedId 
                  ? { ...f, lastUpdated: new Date().toISOString() }
                  : f
              ),
              items: Array.from(itemMap.values()),
            };
          });
        } catch (error) {
          console.error('Failed to update feed:', error);
          throw error;
        }
      },

      removeFeed: (id: string) => {
        set(state => ({
          feeds: state.feeds.filter(f => f.id !== id),
          items: state.items.filter(item => item.feedId !== id),
        }));
      },

      addBucket: (bucket: Bucket) => {
        set(state => ({
          buckets: [...state.buckets, bucket],
        }));
      },

      removeBucket: (id: string) => {
        set(state => ({
          buckets: state.buckets.filter(bucket => bucket.id !== id),
          selectedBucketId: state.selectedBucketId === id ? null : state.selectedBucketId,
        }));
      },

      toggleReadStatus: (id: string) => {
        set(state => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, isRead: !item.isRead } : item
          ),
        }));
      },

      toggleBookmark: (id: string) => {
        set(state => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
          ),
        }));
      },

      saveSearchConfig: (config: SearchConfig) => {
        set(state => ({
          searchConfigs: [...state.searchConfigs, config],
        }));
      },

      updateFeeds: async () => {
        const { feeds } = get();
        for (const feed of feeds) {
          try {
            await get().updateFeed(feed.url, feed.id);
          } catch (error) {
            console.error(`Failed to update feed ${feed.url}:`, error);
          }
        }
      },

      selectBucket: (id: string | null) => {
        set({ selectedBucketId: id });
      },

      getItemsForBucket: (bucket: Bucket): FeedItem[] => {
        const items = get().items;
        return items.filter(item => matchItemToBucket(item, bucket));
      },

      setAutoRefresh: (config: AutoRefreshConfig) => {
        set({ autoRefresh: config });
      },
    }),
    {
      name: 'rss-feed-storage',
    }
  )
);

function matchItemToBucket(item: FeedItem, bucket: Bucket): boolean {
  const matchText = (text: string, keywords: string[], operator: 'AND' | 'OR' | 'NOT', useRegex: boolean, caseSensitive: boolean): boolean => {
    const processedText = caseSensitive ? text : text.toLowerCase();
    const processedKeywords = caseSensitive ? keywords : keywords.map(k => k.toLowerCase());

    if (useRegex) {
      try {
        const regexMatches = processedKeywords.map(keyword => {
          const regex = new RegExp(keyword, caseSensitive ? '' : 'i');
          return regex.test(processedText);
        });

        switch (operator) {
          case 'AND':
            return regexMatches.every(match => match);
          case 'OR':
            return regexMatches.some(match => match);
          case 'NOT':
            return regexMatches.every(match => !match);
          default:
            return false;
        }
      } catch {
        return false;
      }
    } else {
      switch (operator) {
        case 'AND':
          return processedKeywords.every(keyword => processedText.includes(keyword));
        case 'OR':
          return processedKeywords.some(keyword => processedText.includes(keyword));
        case 'NOT':
          return processedKeywords.every(keyword => !processedText.includes(keyword));
        default:
          return false;
      }
    }
  };

  // Check title if enabled
  if (bucket.searchInTitle) {
    const titleMatch = matchText(
      item.title,
      bucket.keywords,
      bucket.operator,
      bucket.useRegex,
      bucket.caseSensitive
    );
    if (titleMatch) return true;
  }

  // Check content if enabled
  if (bucket.searchInBody) {
    const contentMatch = matchText(
      item.content,
      bucket.keywords,
      bucket.operator,
      bucket.useRegex,
      bucket.caseSensitive
    );
    if (contentMatch) return true;
  }

  // If neither title nor content matched (or weren't searched), return false
  return false;
}