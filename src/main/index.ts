import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { WebCrawler, CrawlResult } from './crawler'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    // titleBarOverlay: {
    //   color: '#00000000',
    //   symbolColor: '#ffffff',
    //   height: 30
    // },
    transparent: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Crawler functionality
  let crawler: WebCrawler | null = null

  ipcMain.handle('start-crawl', async (_, url: string) => {
    if (crawler) {
      await crawler.close()
    }

    crawler = new WebCrawler((currentUrl: string, results: CrawlResult[]) => {
      // Send progress updates to renderer
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.webContents.send('crawl-progress', {
          currentUrl,
          results: results.map(r => ({
            url: r.url,
            status: r.status,
            title: r.title,
            error: r.error
          })),
          domains: crawler!.getAllDiscoveredDomains()
        })
      }
    })

    try {
      const results = await crawler.crawl(url)
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.webContents.send('crawl-complete', {
          results: results.map(r => ({
            url: r.url,
            status: r.status,
            title: r.title,
            error: r.error
          })),
          domains: crawler.getAllDiscoveredDomains()
        })
      }
      return { success: true, results }
    } catch (error) {
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.webContents.send('crawl-error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('stop-crawl', async () => {
    if (crawler) {
      await crawler.close()
      crawler = null
    }
    return { success: true }
  })

  // Window controls
  ipcMain.on('window-minimize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.minimize()
  })

  ipcMain.on('window-maximize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  ipcMain.on('window-close', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
