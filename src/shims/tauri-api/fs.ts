/**
 * Mock implementation of Tauri fs API for development
 */

export function writeTextFile(path: string, contents: string): Promise<void> {
  console.log('Mock Tauri fs.writeTextFile called with:', { path, contentLength: contents.length });
  return Promise.resolve();
} 