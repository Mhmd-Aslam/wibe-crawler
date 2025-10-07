import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
}

interface CrawlerAPI {
  startCrawl: (url: string) => Promise<any>
  stopCrawl: () => Promise<any>
  onProgress: (callback: (data: any) => void) => void
  onComplete: (callback: (data: any) => void) => void
  onError: (callback: (data: any) => void) => void
  removeAllListeners: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
      crawler: CrawlerAPI
    }
  }
}
