import type { PtyApi, AppApi } from '../preload';

declare global {
  interface Window {
    pty: PtyApi;
    muxApp: AppApi;
  }
}
