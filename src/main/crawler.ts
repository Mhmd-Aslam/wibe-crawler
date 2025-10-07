import puppeteer, { Browser } from 'puppeteer'

export interface CrawlResult {
  url: string
  status: number
  title?: string
  links: string[]
  domains: string[]
  error?: string
}

export class WebCrawler {
  private browser: Browser | null = null
  private crawledUrls = new Set<string>()
  private urlQueue: string[] = []
  private baseUrl: string = ''
  private results: CrawlResult[] = []
  private discoveredDomains = new Set<string>()
  private onProgress?: (url: string, results: CrawlResult[]) => void

  constructor(onProgress?: (url: string, results: CrawlResult[]) => void) {
    this.onProgress = onProgress
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  }

  async crawl(startUrl: string, maxPages: number = 50): Promise<CrawlResult[]> {
    if (!this.browser) {
      await this.init()
    }

    this.baseUrl = new URL(startUrl).origin
    this.urlQueue = [startUrl]
    this.crawledUrls.clear()
    this.results = []
    this.discoveredDomains.clear()

    while (this.urlQueue.length > 0 && this.crawledUrls.size < maxPages) {
      console.log(this.urlQueue);
      const currentUrl = this.urlQueue.shift()!
      
      if (this.crawledUrls.has(currentUrl)) {
        continue
      }

      this.crawledUrls.add(currentUrl)
      
      try {
        const result = await this.crawlPage(currentUrl)
        this.results.push(result)
        
        // Add new links to queue
        const newLinks = result.links.filter(link => 
          !this.crawledUrls.has(link) && 
          !this.urlQueue.includes(link) &&
          this.isSameDomain(link)
        )
        
        this.urlQueue.push(...newLinks)

        // Notify progress
        if (this.onProgress) {
          this.onProgress(currentUrl, [...this.results])
        }

      } catch (error) {
        console.error(error);
        const errorResult: CrawlResult = {
          url: currentUrl,
          status: 0,
          links: [],
          domains: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        this.results.push(errorResult)

        if (this.onProgress) {
          this.onProgress(currentUrl, [...this.results])
        }
      }

      // Small delay to be respectful
      await this.delay(100)
    }

    return this.results
  }

  private async crawlPage(url: string): Promise<CrawlResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()
    const networkRequests = new Set<string>()
    
    // Listen to network requests to capture domains
    page.on('request', (request) => {
      try {
        const requestUrl = new URL(request.url())
        networkRequests.add(requestUrl.hostname)
        this.discoveredDomains.add(requestUrl.hostname)
      } catch {
        // Ignore invalid URLs
      }
    })
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded'
      })
      
      if (!response) {
        throw new Error('Failed to load page')
      }

      const title = await page.title()
      
      // Extract all links
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        console.log(anchors);
        return anchors.map(anchor => {
          const href = (anchor as HTMLAnchorElement).href
          return href
        }).filter(href => {
          try {
            new URL(href)
            return true
          } catch {
            return false
          }
        })
      })

      // Extract domains from links as well
      links.forEach(link => {
        try {
          const linkUrl = new URL(link)
          this.discoveredDomains.add(linkUrl.hostname)
        } catch {
          // Ignore invalid URLs
        }
      })

      // Normalize and filter links
      const normalizedLinks = links
        .map(link => this.normalizeUrl(link))
        .filter(link => link && this.isSameDomain(link))
        .filter((link, index, arr) => arr.indexOf(link) === index) // Remove duplicates

      return {
        url,
        status: response.status(),
        title,
        links: normalizedLinks,
        domains: Array.from(networkRequests)
      }

    } finally {
      await page.close()
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remove fragment and normalize
      urlObj.hash = ''
      return urlObj.toString()
    } catch {
      return ''
    }
  }

  private isSameDomain(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const baseUrlObj = new URL(this.baseUrl)
      return urlObj.hostname === baseUrlObj.hostname
    } catch {
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getAllDiscoveredDomains(): string[] {
    return Array.from(this.discoveredDomains)
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}