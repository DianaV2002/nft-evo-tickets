/// <reference types="vite/client" />

// Polyfills for Solana browser compatibility
import type { Buffer as BufferType } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof BufferType;
  }

  // Also declare global Buffer
  const Buffer: typeof BufferType;
}
