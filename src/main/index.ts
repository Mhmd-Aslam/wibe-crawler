import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { WebCrawler, CrawlResult } from './crawler'
import { DirectoryFuzzer, type FuzzResult, getAvailableWordlists } from './fuzzer'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    // titleBarOverlay: {
    //   color: '#00000000',
    //   symbolColor: '#ffffff',
    //   height: 30
    // },
    // Improve Windows snapping and maximize behavior for frameless windows
    frame: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
    thickFrame: true,
    // Transparency can interfere with snapping/maximize on Windows. Keep transparency off on win32.
    transparent: process.platform === 'win32' ? false : true,
    backgroundColor: '#000000',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Emit window state to renderer for UI updates
  const sendWindowState = () => {
    const focused = BrowserWindow.getFocusedWindow()
    if (focused) {
      focused.webContents.send('window-state', {
        isMaximized: focused.isMaximized(),
        isMinimized: focused.isMinimized()
      })
    }
  }
  mainWindow.on('maximize', sendWindowState)
  mainWindow.on('unmaximize', sendWindowState)
  mainWindow.on('minimize', sendWindowState)
  mainWindow.on('restore', sendWindowState)

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
  let fuzzer: DirectoryFuzzer | null = null

  ipcMain.handle('start-crawl', async (_, url: string, context?: any) => {
    if (crawler) {
      await crawler.close()
    }

    console.log(context);

    crawler = new WebCrawler(
      context,
      (currentUrl: string, results: CrawlResult[]) => {
        // Send progress updates to renderer
        const window = BrowserWindow.getFocusedWindow()
        if (window) {
          window.webContents.send('crawl-progress', {
            currentUrl,
            results: results.map((r) => ({
              url: r.url,
              status: r.status,
              title: r.title,
              forms: r.forms,
              apiCalls: r.apiCalls,
              cookies: r.cookies,
              emails: r.emails,
              assets: r.assets,
              error: r.error
            })),
            domains: crawler!.getAllDiscoveredDomains(),
            allApiCalls: crawler!.getAllApiCalls(),
            allCookies: crawler!.getAllCookies(),
            allEmails: crawler!.getAllEmails(),
            allAssets: crawler!.getAllAssets()
          })
        }
      },
      (urls: string[]) => {
        // Send URL discovery updates to renderer
        const window = BrowserWindow.getFocusedWindow()
        if (window) {
          window.webContents.send('urls-discovered', {
            urls
          })
        }
      }
    )

    try {
      console.log('start crawl', context)
      const results = await crawler.crawl(url, 10000)
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.webContents.send('crawl-complete', {
          results: results.map((r) => ({
            url: r.url,
            status: r.status,
            title: r.title,
            forms: r.forms,
            apiCalls: r.apiCalls,
            cookies: r.cookies,
            emails: r.emails,
            assets: r.assets,
            error: r.error
          })),
          domains: crawler.getAllDiscoveredDomains(),
          allApiCalls: crawler.getAllApiCalls(),
          allCookies: crawler.getAllCookies(),
          allEmails: crawler.getAllEmails(),
          allAssets: crawler.getAllAssets()
        })
      }
      return { success: true, results }
    } catch (error) {
      console.error(error)
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
      // Signal cooperative stop first
      try {
        crawler.stop()
      } catch (err) {
        console.error(err)
      }
      await crawler.close()
      crawler = null
    }
    return { success: true }
  })

  ipcMain.handle('submit-form', async (_, formData) => {
    if (!crawler) {
      crawler = new WebCrawler(undefined)
      await crawler.init()
    }

    try {
      const result = await crawler.submitForm(formData)
      return { success: true, result }
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Directory fuzzing functionality
  ipcMain.handle('get-wordlists', async () => {
    try {
      const wordlists = getAvailableWordlists()
      return { success: true, wordlists }
    } catch (error) {
      console.error(error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('start-fuzz', async (_, options: {
    baseUrl: string
    wordlist: string
    extensions: string[]
    concurrency: number
  }) => {
    if (fuzzer) {
      fuzzer.stop()
      fuzzer = null
    }

    try {
      fuzzer = new DirectoryFuzzer(
        options.baseUrl,
        options.wordlist,
        options.extensions,
        options.concurrency
      )

      const window = BrowserWindow.getFocusedWindow()

      fuzzer.fuzz(
        (result: FuzzResult) => {
          if (window) {
            window.webContents.send('fuzz-progress', result)
          }
        },
        (results: FuzzResult[]) => {
          if (window) {
            window.webContents.send('fuzz-complete', { results })
          }
          fuzzer = null
        }
      )

      return {
        success: true,
        totalPaths: fuzzer.getWordlistSize()
      }
    } catch (error) {
      console.error(error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  ipcMain.handle('stop-fuzz', async () => {
    if (fuzzer) {
      fuzzer.stop()
      fuzzer = null
      const window = BrowserWindow.getFocusedWindow()
      if (window) {
        window.webContents.send('fuzz-stopped')
      }
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
      const focused = BrowserWindow.getFocusedWindow()
      if (focused) {
        focused.webContents.send('window-state', {
          isMaximized: focused.isMaximized(),
          isMinimized: focused.isMinimized()
        })
      }
    }
  })

  // Optional: allow renderer to request current window state
  ipcMain.handle('window-get-state', () => {
    const window = BrowserWindow.getFocusedWindow()
    return window
      ? { isMaximized: window.isMaximized(), isMinimized: window.isMinimized() }
      : { isMaximized: false, isMinimized: false }
  })

  // Support dblclick on custom title bar to toggle maximize
  ipcMain.on('window-toggle-maximize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) window.unmaximize()
      else window.maximize()
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
