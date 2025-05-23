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
  updateBucket: (id: string, bucketData: Partial<Bucket>) => void;
  removeBucket: (id: string) => void;
  toggleReadStatus: (id: string) => void;
  toggleBookmark: (id: string) => void;
  saveSearchConfig: (config: SearchConfig) => void;
  updateFeeds: () => Promise<void>;
  updateFeed: (url: string, feedId: string) => Promise<void>;
  selectBucket: (id: string | null) => void;
  getItemsForBucket: (bucket: Bucket) => FeedItem[];
  setAutoRefresh: (config: AutoRefreshConfig) => void;
  itemMatchesBucket: (item: FeedItem, bucket: Bucket) => boolean;
  assignItemToBucket: (itemId: string, bucketId: string) => void;
  removeItemFromBucket: (itemId: string, bucketId: string) => void;
  markAsRead: (itemId: string) => void;
  clearStore: () => void;
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
  bucketIds: [], // Initialize empty array of bucket IDs
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
            // Create a map of all existing items by their key
            const itemMap = new Map();
            
            // First add all existing items to the map
            state.items.forEach(item => {
              const key = createArticleKey(item);
              itemMap.set(key, item);
            });
            
            // Then process new items, updating existing ones or adding new ones
            newItems.forEach(newItem => {
              const key = createArticleKey(newItem);
              const existingItem = itemMap.get(key);
              
              if (existingItem) {
                // Update existing item while preserving its state
                itemMap.set(key, {
                  ...existingItem,
                  // Only update content if it's changed or was empty
                  content: existingItem.content && existingItem.content.length > newItem.content.length ? 
                    existingItem.content : newItem.content,
                  // Update categories if new ones are available
                  categories: newItem.categories?.length ? 
                    Array.from(new Set([...(existingItem.categories || []), ...newItem.categories])) : 
                    existingItem.categories
                });
              } else {
                // Add new item
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

      updateBucket: (id: string, bucketData: Partial<Bucket>) => {
        set(state => ({
          buckets: state.buckets.map(bucket => 
            bucket.id === id ? { ...bucket, ...bucketData } : bucket
          ),
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
        const updatedFeeds = [];
        
        try {
          const { parse } = await import('rss-to-json');
          
          // Create a map to store all items
          const allItemsMap = new Map();
          
          // Add existing items to the map
          get().items.forEach(item => {
            const key = createArticleKey(item);
            allItemsMap.set(key, item);
          });
          
          // Process each feed
          for (const feed of feeds) {
            try {
              const proxyUrl = createProxyUrl(feed.url);
              const parsedFeed = await parse(proxyUrl);
              
              if (parsedFeed) {
                // Process new items from this feed
                const newItems = parsedFeed.items?.map(item => processFeedItem(feed.id, item)) || [];
                
                // Update or add items to the map
                newItems.forEach(newItem => {
                  const key = createArticleKey(newItem);
                  const existingItem = allItemsMap.get(key);
                  
                  if (existingItem) {
                    // Preserve existing state while updating content
                    allItemsMap.set(key, {
                      ...existingItem,
                      // Only update content if it's changed or was empty
                      content: existingItem.content && existingItem.content.length > newItem.content.length ? 
                        existingItem.content : newItem.content,
                      // Update categories if new ones are available
                      categories: newItem.categories?.length ? 
                        Array.from(new Set([...(existingItem.categories || []), ...newItem.categories])) : 
                        existingItem.categories
                    });
                  } else {
                    // Add new item
                    allItemsMap.set(key, newItem);
                  }
                });
                
                // Mark feed as successfully updated
                updatedFeeds.push({
                  ...feed,
                  lastUpdated: new Date().toISOString()
                });
              }
            } catch (error) {
              console.error(`Failed to update feed ${feed.url}:`, error);
              // Keep the original feed entry
              updatedFeeds.push(feed);
            }
          }
          
          // Update state with all processed items
          set({
            feeds: updatedFeeds,
            items: Array.from(allItemsMap.values())
          });
        } catch (error) {
          console.error('Error updating feeds:', error);
          throw error;
        }
      },

      selectBucket: (id: string | null) => {
        set({ selectedBucketId: id });
      },

      getItemsForBucket: (bucket: Bucket): FeedItem[] => {
        const state = get();
        const results = state.items.filter(item => {
          // First check if it's already assigned to this bucket
          if (item.bucketIds && item.bucketIds.includes(bucket.id)) {
            return true;
          }
          
          // Otherwise check if it matches the bucket criteria
          const matches = state.itemMatchesBucket(item, bucket);
          
          // If it matches, permanently assign it to this bucket
          if (matches) {
            set(state => ({
              items: state.items.map(stateItem => 
                stateItem.id === item.id 
                  ? { ...stateItem, bucketIds: [...(stateItem.bucketIds || []), bucket.id] } 
                  : stateItem
              )
            }));
          }
          
          return matches;
        });
        
        return results;
      },

      setAutoRefresh: (config: AutoRefreshConfig) => {
        set({ autoRefresh: config });
      },

      assignItemToBucket: (itemId: string, bucketId: string) => {
        set(state => ({
          items: state.items.map(item => 
            item.id === itemId 
              ? { ...item, bucketIds: [...(item.bucketIds || []), bucketId] } 
              : item
          )
        }));
      },

      removeItemFromBucket: (itemId: string, bucketId: string) => {
        set(state => ({
          items: state.items.map(item => 
            item.id === itemId && item.bucketIds
              ? { ...item, bucketIds: item.bucketIds.filter(id => id !== bucketId) } 
              : item
          )
        }));
      },

      itemMatchesBucket: (item: FeedItem, bucket: Bucket): boolean => {
        const { useRegex, operator, caseSensitive, keywords, searchInTitle, searchInBody } = bucket;
        
        if (!item) return false;
        
        // Skip empty buckets
        if (!keywords || keywords.length === 0) return false;
        
        // Skip if no search areas are selected
        if (!searchInTitle && !searchInBody) return false;
        
        // Create a combined text to search in
        let searchableText = '';
        if (searchInTitle && item.title) {
          searchableText += item.title + ' ';
        }
        if (searchInBody && item.content) {
          searchableText += item.content;
        }
        
        // Process the text based on case sensitivity
        const processedText = caseSensitive ? searchableText : searchableText.toLowerCase();
        
        // Process keywords based on case sensitivity and regex
        const processedKeywords = keywords.map(keyword => {
          // Skip processing empty keywords
          if (!keyword) return '';
          
          if (useRegex) {
            try {
              const flags = caseSensitive ? '' : 'i';
              return new RegExp(keyword, flags);
            } catch (error) {
              console.error(`Invalid regex pattern: ${keyword}`);
              return caseSensitive ? keyword : keyword.toLowerCase();
            }
          }
          return caseSensitive ? keyword : keyword.toLowerCase();
        }).filter(k => k); // Filter out empty keywords
        
        // Apply the matching logic based on the operator
        if (operator === 'AND') {
          return processedKeywords.length > 0 && processedKeywords.every(keyword => {
            if (keyword instanceof RegExp) {
              return keyword.test(processedText);
            }
            return processedText.includes(keyword as string);
          });
        } else if (operator === 'OR') {
          return processedKeywords.length > 0 && processedKeywords.some(keyword => {
            if (keyword instanceof RegExp) {
              return keyword.test(processedText);
            }
            return processedText.includes(keyword as string);
          });
        } else if (operator === 'NOT') {
          return processedKeywords.length > 0 && processedKeywords.every(keyword => {
            if (keyword instanceof RegExp) {
              return !keyword.test(processedText);
            }
            return !processedText.includes(keyword as string);
          });
        }
        
        return false;
      },

      markAsRead: (itemId: string) => 
        set((state) => ({
          items: state.items.map(item => 
            item.id === itemId ? { ...item, isRead: true } : item
          )
        })),

      clearStore: () => {
        set({
          feeds: [],
          items: [],
          buckets: [],
          searchConfigs: [],
          selectedBucketId: null,
          autoRefresh: {
            enabled: false,
            intervalMinutes: 30,
          }
        });
      },
    }),
    {
      name: 'rss-feed-storage',
    }
  )
);