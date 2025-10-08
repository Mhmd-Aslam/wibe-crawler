import puppeteer, { Browser } from 'puppeteer'

export interface FormField {
  name: string
  type: string
  value?: string
  required: boolean
  placeholder?: string
}

export interface DetectedForm {
  id: string
  action: string
  method: string
  url: string
  fields: FormField[]
}

export interface CrawlResult {
  url: string
  status: number
  title?: string
  links: string[]
  domains: string[]
  forms: DetectedForm[]
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

  async crawl(startUrl: string, maxPages: number = 50, batchSize: number = 20): Promise<CrawlResult[]> {
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
      
      // Get batch of URLs to crawl
      const batchUrls: string[] = []
      while (batchUrls.length < batchSize && this.urlQueue.length > 0 && this.crawledUrls.size + batchUrls.length < maxPages) {
        const url = this.urlQueue.shift()!
        if (!this.crawledUrls.has(url)) {
          batchUrls.push(url)
          this.crawledUrls.add(url)
        }
      }

      if (batchUrls.length === 0) break

      // Crawl batch simultaneously
      const batchPromises = batchUrls.map(url => 
        this.crawlPage(url).catch(error => ({
          url,
          status: 0,
          links: [],
          domains: [],
          forms: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        } as CrawlResult))
      )

      const batchResults = await Promise.all(batchPromises)
      this.results.push(...batchResults)

      // Process all results to add new links to queue
      for (const result of batchResults) {
        if (result.links.length > 0) {
          const newLinks = result.links.filter(link => 
            !this.crawledUrls.has(link) && 
            !this.urlQueue.includes(link) &&
            this.isSameDomain(link)
          )
          this.urlQueue.push(...newLinks)
        }

        // Notify progress for each completed URL
        if (this.onProgress) {
          this.onProgress(result.url, [...this.results])
        }
      }

      // Small delay between batches to be respectful
      await this.delay(200)
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

      // Extract all forms
      const forms = await page.evaluate((currentUrl) => {
        const formElements = Array.from(document.querySelectorAll('form'))
        return formElements.map((form, index) => {
          const action = form.action || currentUrl
          const method = form.method.toLowerCase() || 'get'
          
          const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
          const fields = inputs.map(input => {
            const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            return {
              name: element.name || element.id || `field_${Math.random().toString(36).substr(2, 9)}`,
              type: element.type || element.tagName.toLowerCase(),
              value: element.value || '',
              required: element.hasAttribute('required'),
              placeholder: element.getAttribute('placeholder') || ''
            }
          }).filter(field => field.type !== 'submit' && field.type !== 'button')

          return {
            id: `form_${index}_${Math.random().toString(36).substr(2, 9)}`,
            action,
            method,
            url: currentUrl,
            fields
          }
        })
      }, url)

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
        domains: Array.from(networkRequests),
        forms
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

  async submitForm(formData: {
    url: string
    action: string
    method: string
    fields: Record<string, string>
  }): Promise<{
    status: number
    headers: Record<string, string>
    body: string
    error?: string
  }> {
    if (!this.browser) {
      await this.init()
    }

    const page = await this.browser!.newPage()
    
    try {
      // Navigate to the page containing the form
      await page.goto(formData.url, { waitUntil: 'domcontentloaded' })
      
      // Fill the form fields
      for (const [fieldName, fieldValue] of Object.entries(formData.fields)) {
        try {
          const selector = `[name="${fieldName}"], #${fieldName}`
          await page.waitForSelector(selector, { timeout: 5000 })
          await page.type(selector, fieldValue)
        } catch (error) {
          console.warn(`Could not fill field ${fieldName}:`, error)
        }
      }

      // Submit the form and capture the response
      const [response] = await Promise.all([
        page.waitForResponse(response => 
          response.url().includes(new URL(formData.action, formData.url).pathname) ||
          response.url() === formData.action
        ),
        page.evaluate((action) => {
          const form = Array.from(document.querySelectorAll('form')).find(f => 
            f.action.includes(action) || f.action === action
          )
          if (form) {
            form.submit()
          } else {
            // Fallback: try to find and click submit button
            const submitBtn = document.querySelector('input[type="submit"], button[type="submit"]') as HTMLElement
            if (submitBtn) submitBtn.click()
          }
        }, formData.action)
      ])

      const headers: Record<string, string> = response.headers()

      const body = await response.text()

      return {
        status: response.status(),
        headers,
        body
      }

    } catch (error) {
      return {
        status: 0,
        headers: {},
        body: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      await page.close()
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}