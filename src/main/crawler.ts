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

export interface ApiCall {
  id: string
  endpoint: string
  method: string
  params: string
  headers: Record<string, string>
  responseStatus?: number
  responseHeaders?: Record<string, string>
}

export interface CookieData {
  id: string
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite?: string
  expires?: number
}

export interface CrawlResult {
  url: string
  status: number
  title?: string
  links: string[]
  domains: string[]
  forms: DetectedForm[]
  apiCalls: ApiCall[]
  cookies: CookieData[]
  error?: string
}

export class WebCrawler {
  private browser: Browser | null = null
  private crawledUrls = new Set<string>()
  private urlQueue: string[] = []
  private baseUrl: string = ''
  private results: CrawlResult[] = []
  private discoveredDomains = new Set<string>()
  private allApiCalls = new Map<string, ApiCall>()
  private allCookies = new Map<string, CookieData>()
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
          apiCalls: [],
          cookies: [],
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
    const pageApiCalls: ApiCall[] = []
    const pageCookies: CookieData[] = []
    const apiDomains = new Set<string>()
    
    // Listen to network requests to capture API calls and domains
    page.on('request', (request) => {
      try {
        const requestUrl = new URL(request.url())
        const isApiCall = this.isApiEndpoint(request.url(), request.method())
        
        if (isApiCall) {
          const apiCall: ApiCall = {
            id: `api_${Math.random().toString(36).substr(2, 9)}`,
            endpoint: request.url(),
            method: request.method(),
            params: this.extractParams(request.url()),
            headers: request.headers()
          }
          pageApiCalls.push(apiCall)
          this.allApiCalls.set(apiCall.id, apiCall)
          apiDomains.add(requestUrl.hostname)
          this.discoveredDomains.add(requestUrl.hostname)
        }
      } catch {
        // Ignore invalid URLs
      }
    })

    // Listen to responses to capture API response data
    page.on('response', (response) => {
      try {
        const requestUrl = response.url()
        const isApiCall = this.isApiEndpoint(requestUrl, response.request().method())
        
        if (isApiCall) {
          const existingApiCall = pageApiCalls.find(api => api.endpoint === requestUrl)
          if (existingApiCall) {
            existingApiCall.responseStatus = response.status()
            existingApiCall.responseHeaders = response.headers()
          }
        }
      } catch {
        // Ignore errors
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

      // Get cookies from the page
      const cookies = await page.cookies()
      cookies.forEach(cookie => {
        const cookieData: CookieData = {
          id: `cookie_${Math.random().toString(36).substr(2, 9)}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly || false,
          sameSite: cookie.sameSite as string,
          expires: cookie.expires
        }
        pageCookies.push(cookieData)
        this.allCookies.set(cookieData.id, cookieData)
        this.discoveredDomains.add(cookie.domain)
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
        domains: Array.from(apiDomains),
        forms,
        apiCalls: pageApiCalls,
        cookies: pageCookies
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

  getAllApiCalls(): ApiCall[] {
    return Array.from(this.allApiCalls.values())
  }

  getAllCookies(): CookieData[] {
    return Array.from(this.allCookies.values())
  }

  private isApiEndpoint(url: string, method: string): boolean {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname.toLowerCase()
      
      // Common API patterns
      const apiPatterns = [
        '/api/',
        '/rest/',
        '/graphql',
        '/v1/',
        '/v2/',
        '/v3/',
        '.json',
        '.xml'
      ]
      
      // Check if URL contains API patterns
      const hasApiPattern = apiPatterns.some(pattern => 
        path.includes(pattern) || url.includes(pattern)
      )
      
      // Check HTTP methods typically used for APIs
      const isApiMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
                          (method === 'GET' && hasApiPattern)
      
      // Check content type headers would be ideal but not available in request event
      return hasApiPattern || isApiMethod
    } catch {
      return false
    }
  }

  private extractParams(url: string): string {
    try {
      const urlObj = new URL(url)
      const params = Array.from(urlObj.searchParams.keys())
      return params.length > 0 ? params.join(', ') : 'none'
    } catch {
      return 'none'
    }
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