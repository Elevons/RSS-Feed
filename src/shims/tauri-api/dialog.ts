/**
 * Mock implementation of Tauri dialog API for development
 */

export function save(options?: {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<string | null> {
  console.log('Mock Tauri dialog.save called with options:', options);
  return Promise.resolve('/mock/path/to/file.json');
} 