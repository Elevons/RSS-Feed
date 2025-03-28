import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from './store';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Bucket, FeedItem, SearchConfig } from './types';
// Import from shims for development or real modules in Tauri
import { save as tauriSave } from '@tauri-apps/api/dialog';
import { writeTextFile as tauriWriteTextFile } from '@tauri-apps/api/fs';

// Function to check if we're in a Tauri environment
const isTauriApp = () => {
  return typeof window !== 'undefined' && 'Tauri' in window;
};

// Import Lucide icons
import {
  Settings,
  Rss,
  Search,
  BookmarkPlus,
  Share2,
  Download,
  Upload,
  Plus,
  Trash2,
  Loader2,
  X,
  Hash,
  Filter,
  HelpCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshingFeeds, setRefreshingFeeds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInTitle, setSearchInTitle] = useState(true);
  const [searchInBody, setSearchInBody] = useState(true);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [showRegexHelp, setShowRegexHelp] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // minutes
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  const [newBucket, setNewBucket] = useState<Partial<Bucket>>({
    name: '',
    color: '#BB86FC',
    keywords: [],
    operator: 'AND',
    caseSensitive: false,
    useRegex: false,
    searchInTitle: true,
    searchInBody: true,
  });
  const [newKeyword, setNewKeyword] = useState('');
  const store = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFeed = async () => {
    if (newFeedUrl) {
      try {
        setError(null);
        setIsProcessing(true);
        await store.addFeed(newFeedUrl);
        setNewFeedUrl('');
      } catch (error: any) {
        console.error('Failed to add feed:', error);
        setError(error?.message || 'Failed to add feed');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRefreshFeed = async (feedId: string) => {
    const feed = store.feeds.find(f => f.id === feedId);
    if (feed) {
      try {
        setRefreshingFeeds(prev => [...prev, feedId]);
        await store.updateFeed(feed.url, feedId);
      } catch (error) {
        console.error('Failed to refresh feed:', error);
      } finally {
        setRefreshingFeeds(prev => prev.filter(id => id !== feedId));
      }
    }
  };

  const handleRefreshAllFeeds = async () => {
    try {
      setRefreshingFeeds(store.feeds.map(f => f.id));
      await store.updateFeeds();
      // Set the next refresh time if auto-refresh is enabled
      if (autoRefreshEnabled) {
        const nextTime = new Date();
        nextTime.setMinutes(nextTime.getMinutes() + refreshInterval);
        setNextRefreshTime(nextTime);
      }
    } finally {
      setRefreshingFeeds([]);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (autoRefreshEnabled && refreshInterval > 0) {
      // Set initial next refresh time
      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + refreshInterval);
      setNextRefreshTime(nextTime);
      
      // Set up the interval
      intervalId = window.setInterval(() => {
        handleRefreshAllFeeds();
      }, refreshInterval * 60 * 1000);
    } else {
      setNextRefreshTime(null);
    }
    
    // Cleanup function
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [autoRefreshEnabled, refreshInterval]);

  const handleExportData = async () => {
    try {
      // Create a list of buckets with their respective articles
      const exportData = store.buckets.map(bucket => {
        const items = store.getItemsForBucket(bucket);
        return {
          id: bucket.id,
          name: bucket.name,
          color: bucket.color,
          keywords: bucket.keywords,
          operator: bucket.operator,
          articles: items.map(item => {
            // Get the first 150 characters as a summary, without HTML tags
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            const summary = textContent.trim().substring(0, 150) + (textContent.length > 150 ? '...' : '');
            
            // Extract author from the content or categories if available
            let author = 'Unknown';
            const authorMatch = item.content.match(/author[:\s]+([^<\n]+)/i);
            if (authorMatch && authorMatch[1]) {
              author = authorMatch[1].trim();
            }
            
            return {
              title: item.title,
              link: item.link,
              author: author,
              pubDate: new Date(item.pubDate).toISOString().split('T')[0],
              summary: summary
            };
          })
        };
      });
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Default filename
      const defaultFilename = `rss-buckets-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      try {
        // Check if we're running in Tauri
        if (isTauriApp()) {
          // Use Tauri's save dialog
          const filePath = await tauriSave({
            filters: [{
              name: 'JSON',
              extensions: ['json']
            }],
            defaultPath: defaultFilename
          });
          
          if (filePath) {
            // Write the file using Tauri's filesystem API
            await tauriWriteTextFile(filePath, jsonString);
            return; // Exit early if successful
          }
        }
      } catch (tauriError) {
        console.log('Tauri API failed or not available, falling back to browser method:', tauriError);
      }
      
      // Fallback for web browser environment
      // Try to use the File System Access API if available
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{
              description: 'JSON File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(jsonString);
          await writableStream.close();
          
          return; // Exit early if successful
        } catch (fsError) {
          // User canceled or API failed, fall back to default method
          console.log('File System Access API failed, falling back to download:', fsError);
        }
      }
      
      // Ultimate fallback method for browsers without File System Access API
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      setError('Failed to export data');
    }
  };

  const handleImportOpml = () => {
    // Trigger the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      
      // Read the file
      const text = await file.text();
      
      // Parse the OPML XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      // Find all outline elements with an xmlUrl attribute (RSS feeds)
      const outlines = xmlDoc.querySelectorAll('outline[xmlUrl]');
      
      // Track successful and failed imports
      let successCount = 0;
      let failureCount = 0;
      
      // Add each feed
      for (const outline of outlines) {
        const url = outline.getAttribute('xmlUrl');
        if (url) {
          try {
            await store.addFeed(url);
            successCount++;
          } catch (error) {
            console.error(`Failed to add feed ${url}:`, error);
            failureCount++;
          }
        }
      }
      
      // Show import results
      if (successCount > 0) {
        alert(`Successfully imported ${successCount} feeds${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
      } else if (failureCount > 0) {
        setError(`Failed to import all ${failureCount} feeds`);
      } else {
        setError('No valid feeds found in the OPML file');
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Failed to import OPML:', error);
      setError(error?.message || 'Failed to import OPML file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddBucket = () => {
    if (newBucket.name && newBucket.keywords?.length) {
      store.addBucket({
        id: crypto.randomUUID(),
        name: newBucket.name,
        color: newBucket.color || '#BB86FC',
        keywords: newBucket.keywords,
        operator: newBucket.operator || 'AND',
        caseSensitive: newBucket.caseSensitive || false,
        useRegex: newBucket.useRegex || false,
        searchInTitle: newBucket.searchInTitle || true,
        searchInBody: newBucket.searchInBody || true,
      });
      setNewBucket({
        name: '',
        color: '#BB86FC',
        keywords: [],
        operator: 'AND',
        caseSensitive: false,
        useRegex: false,
        searchInTitle: true,
        searchInBody: true,
      });
      setShowBucketForm(false);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      setNewBucket(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), newKeyword.trim()],
      }));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setNewBucket(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || [],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      console.log(`Moving item ${active.id} to bucket ${over.id}`);
    }
  };

  const filteredItems = useMemo(() => {
    let items = store.items;

    if (store.selectedBucketId) {
      const selectedBucket = store.buckets.find(b => b.id === store.selectedBucketId);
      if (selectedBucket) {
        items = store.getItemsForBucket(selectedBucket);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return items.filter(item => {
        const matchTitle = searchInTitle && item.title.toLowerCase().includes(query);
        const matchBody = searchInBody && item.content.toLowerCase().includes(query);
        const matchCategories = item.categories.some(category => 
          category.toLowerCase().includes(query)
        );
        return matchTitle || matchBody || matchCategories;
      });
    }

    return items;
  }, [store.items, store.selectedBucketId, searchQuery, searchInTitle, searchInBody, store.buckets]);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-[#121212] text-[#E0E0E0] flex">
        {/* Hidden file input for OPML import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".opml,.xml"
          style={{ display: 'none' }}
        />
        
        {/* Sidebar */}
        <div
          className={`${
            showSidebar ? 'w-64' : 'w-16'
          } bg-[#1E1E1E] transition-all duration-300 p-4 flex flex-col`}
        >
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-[#BB86FC] rounded-lg mb-4"
          >
            <Settings className="w-6 h-6" />
          </button>

          {showSidebar && (
            <>
              <div className="mb-6">
                <h2 className="text-[#BB86FC] font-bold mb-2">Import/Export</h2>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleImportOpml}
                    className="p-2 hover:bg-[#2C2C2C] rounded flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Import OPML
                  </button>
                  <button 
                    onClick={handleExportData}
                    className="p-2 hover:bg-[#2C2C2C] rounded flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-[#BB86FC] font-bold mb-2">Auto Refresh</h2>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoRefreshEnabled}
                      onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                      className="rounded"
                    />
                    Enable auto refresh
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                      className="w-16 bg-[#2C2C2C] p-2 rounded"
                      disabled={!autoRefreshEnabled}
                    />
                    <span className="text-sm">minutes</span>
                  </div>
                  
                  {nextRefreshTime && autoRefreshEnabled && (
                    <p className="text-sm text-gray-400">
                      Next refresh at {nextRefreshTime.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[#BB86FC] font-bold">Feeds</h2>
                  <button
                    onClick={handleRefreshAllFeeds}
                    className="p-1 hover:bg-[#BB86FC] rounded"
                    disabled={refreshingFeeds.length > 0}
                    title="Update all feeds"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingFeeds.length > 0 ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    placeholder="Enter RSS URL"
                    className="flex-1 bg-[#2C2C2C] p-2 rounded"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleAddFeed}
                    className={`p-2 bg-[#BB86FC] rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isProcessing || !newFeedUrl.trim()}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {error && (
                  <div className="text-red-500 text-sm mb-2">{error}</div>
                )}
                {store.feeds.map((feed) => (
                  <div
                    key={feed.id}
                    className="flex items-center justify-between p-2 hover:bg-[#2C2C2C] rounded"
                  >
                    <div className="truncate flex-1">
                      <span>{feed.title}</span>
                      {feed.lastUpdated && (
                        <div className="text-xs text-gray-400">
                          Updated: {new Date(feed.lastUpdated).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRefreshFeed(feed.id)}
                        className="text-[#BB86FC] hover:text-[#BB86FC]/80 p-1"
                        disabled={refreshingFeeds.includes(feed.id)}
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingFeeds.includes(feed.id) ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => store.removeFeed(feed.id)}
                        className="text-red-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[#BB86FC] font-bold">Buckets</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => store.selectBucket(null)}
                      className={`p-1 hover:bg-[#BB86FC] rounded ${
                        !store.selectedBucketId ? 'bg-[#BB86FC]' : ''
                      }`}
                      title="Show all articles"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowBucketForm(!showBucketForm)}
                      className="p-1 hover:bg-[#BB86FC] rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showBucketForm && (
                  <div className="bg-[#2C2C2C] p-3 rounded mb-4">
                    <input
                      type="text"
                      value={newBucket.name}
                      onChange={(e) => setNewBucket(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Bucket name"
                      className="w-full bg-[#1E1E1E] p-2 rounded mb-2"
                    />
                    
                    <div className="flex gap-2 mb-2">
                      <input
                        type="color"
                        value={newBucket.color}
                        onChange={(e) => setNewBucket(prev => ({ ...prev, color: e.target.value }))}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <select
                        value={newBucket.operator}
                        onChange={(e) => setNewBucket(prev => ({ ...prev, operator: e.target.value as 'AND' | 'OR' | 'NOT' }))}
                        className="flex-1 bg-[#1E1E1E] p-2 rounded"
                      >
                        <option value="AND">Match ALL keywords</option>
                        <option value="OR">Match ANY keyword</option>
                        <option value="NOT">Match NONE</option>
                      </select>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                        placeholder="Add keyword"
                        className="flex-1 bg-[#1E1E1E] p-2 rounded"
                      />
                      <button
                        onClick={handleAddKeyword}
                        className="p-2 bg-[#BB86FC] rounded hover:bg-opacity-80"
                        disabled={!newKeyword.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {newBucket.keywords?.map((keyword, index) => (
                        <span
                          key={index}
                          className="bg-[#1E1E1E] px-2 py-1 rounded flex items-center gap-1"
                        >
                          <Hash className="w-3 h-3" />
                          {keyword}
                          <button
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 mb-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newBucket.searchInTitle}
                          onChange={(e) => setNewBucket(prev => ({ ...prev, searchInTitle: e.target.checked }))}
                          className="rounded"
                        />
                        Search in headlines
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newBucket.searchInBody}
                          onChange={(e) => setNewBucket(prev => ({ ...prev, searchInBody: e.target.checked }))}
                          className="rounded"
                        />
                        Search in body
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newBucket.caseSensitive}
                          onChange={(e) => setNewBucket(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                          className="rounded"
                        />
                        Case sensitive
                      </label>
                      <div className="flex items-center gap-2 group relative">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newBucket.useRegex}
                            onChange={(e) => setNewBucket(prev => ({ ...prev, useRegex: e.target.checked }))}
                            className="rounded"
                          />
                          Use regex
                        </label>
                        <button
                          onMouseEnter={() => setShowRegexHelp(true)}
                          onMouseLeave={() => setShowRegexHelp(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        {showRegexHelp && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1E1E1E] p-3 rounded-lg shadow-lg z-10 text-sm">
                            <h4 className="font-bold mb-2">Regex Pattern Examples:</h4>
                            <ul className="space-y-1">
                              <li><code>.*</code> - any characters</li>
                              <li><code>\b</code> - word boundary</li>
                              <li><code>\d</code> - any digit</li>
                              <li><code>[aeiou]</code> - any vowel</li>
                              <li><code>+</code> - one or more</li>
                              <li><code>?</code> - zero or one</li>
                              <li><code>^</code> - start of text</li>
                              <li><code>$</code> - end of text</li>
                            </ul>
                            <div className="mt-2 text-xs text-gray-400">
                              Example: <code>cat.*</code> matches "cat", "catch", "category"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddBucket}
                        disabled={!newBucket.name || !newBucket.keywords?.length}
                        className="flex-1 bg-[#BB86FC] p-2 rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Bucket
                      </button>
                      <button
                        onClick={() => setShowBucketForm(false)}
                        className="bg-[#1E1E1E] p-2 rounded hover:bg-opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {store.buckets.map((bucket) => (
                  <div
                    key={bucket.id}
                    onClick={() => store.selectBucket(bucket.id)}
                    className={`flex items-center justify-between p-2 rounded mb-2 cursor-pointer transition-all ${
                      store.selectedBucketId === bucket.id ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: bucket.color }}
                  >
                    <div>
                      <div className="font-medium">{bucket.name}</div>
                      <div className="text-sm opacity-80">
                        {store.getItemsForBucket(bucket).length} articles • {bucket.keywords.length} keywords • {bucket.operator}
                        <br />
                        <span className="text-xs">
                          Search in: {[
                            bucket.searchInTitle && 'headlines',
                            bucket.searchInBody && 'body'
                          ].filter(Boolean).join(' & ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        store.removeBucket(bucket.id);
                      }}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4 relative">
              <Search className="absolute left-3 w-5 h-5 text-[#BB86FC]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="flex-1 bg-[#2C2C2C] pl-10 pr-10 p-2 rounded border border-[#BB86FC] focus:outline-none focus:ring-2 focus:ring-[#BB86FC]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchInTitle}
                    onChange={(e) => setSearchInTitle(e.target.checked)}
                    className="rounded border-gray-400"
                  />
                  Search in headlines
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchInBody}
                    onChange={(e) => setSearchInBody(e.target.checked)}
                    className="rounded border-gray-400"
                  />
                  Search in body
                </label>
              </div>
              <p className="text-sm text-gray-400">
                {store.selectedBucketId ? (
                  <>
                    Showing articles in bucket "
                    {store.buckets.find(b => b.id === store.selectedBucketId)?.name}"
                  </>
                ) : (
                  'Showing all articles'
                )}
                {searchQuery && ` • Found ${filteredItems.length} ${filteredItems.length === 1 ? 'result' : 'results'}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#2C2C2C] p-4 rounded-lg hover:ring-2 hover:ring-[#BB86FC] transition-all"
              >
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {new Date(item.pubDate).toLocaleDateString()}
                </p>
                <div className="flex justify-between items-center">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#BB86FC] hover:underline"
                  >
                    Read More
                  </a>
                  <div className="flex gap-2">
                    <button
                      onClick={() => store.toggleBookmark(item.id)}
                      className={`p-1 rounded hover:bg-[#BB86FC] hover:bg-opacity-20 ${
                        item.isBookmarked ? 'text-[#BB86FC]' : ''
                      }`}
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-[#BB86FC] hover:bg-opacity-20">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

export default App;