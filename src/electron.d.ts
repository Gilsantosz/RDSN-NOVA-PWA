export {};

declare global {
  interface Window {
    electronAPI?: {
      onNavigate: (callback: (path: string) => void) => void;
    };
  }
}
