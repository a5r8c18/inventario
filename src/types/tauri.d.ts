// Declaración global para TypeScript
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export {};
