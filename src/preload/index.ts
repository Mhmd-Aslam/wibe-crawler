import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },
  crawler: {
    startCrawl: (url: string) => ipcRenderer.invoke('start-crawl', url),
    stopCrawl: () => ipcRenderer.invoke('stop-crawl'),
    submitForm: (formData: any) => ipcRenderer.invoke('submit-form', formData),
    onProgress: (callback: (data: any) => void) => {
      ipcRenderer.on('crawl-progress', (_, data) => callback(data))
    },
    onComplete: (callback: (data: any) => void) => {
      ipcRenderer.on('crawl-complete', (_, data) => callback(data))
    },
    onError: (callback: (data: any) => void) => {
      ipcRenderer.on('crawl-error', (_, data) => callback(data))
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('crawl-progress')
      ipcRenderer.removeAllListeners('crawl-complete')
      ipcRenderer.removeAllListeners('crawl-error')
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
