// Shim for Tauri shell API
export async function open(path: string): Promise<void> {
  if (typeof window !== 'undefined' && 'Tauri' in window) {
    // In Tauri environment
    const { open } = await import('@tauri-apps/api/shell');
    return open(path);
  } else {
    // In web environment
    window.open(path, '_blank');
  }
} 