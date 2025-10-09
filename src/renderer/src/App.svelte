
<script lang="ts">
  import TitleBar from './components/TitleBar.svelte'
  import { onMount, onDestroy } from 'svelte'
  
  let selectedUrl = ''
  let isScanning = false
  let showResults = false
  let selectedCrawledUrl = ''
  let crawledUrls: string[] = []
  let crawlStatus = ''
  let allForms: any[] = []
  let allApiCalls: any[] = []
  let allCookies: any[] = []
  let selectedForm: any = null
  let formData: Record<string, string> = {}
  let formResponse: any = null
  let isSubmittingForm = false
  
  const vulnerabilities = [
    { id: 1, name: 'SQL Injection', severity: 'critical', description: 'Login form parameter vulnerable to SQL injection', size: 'large' },
    { id: 2, name: 'XSS', severity: 'high', description: 'Reflected XSS in search parameter', size: 'medium' },
    { id: 3, name: 'CSRF', severity: 'medium', description: 'Missing CSRF protection', size: 'medium' },
    { id: 4, name: 'Weak Encryption', severity: 'low', description: 'MD5 hash detected', size: 'small' },
    { id: 5, name: 'Open Redirect', severity: 'medium', description: 'Unvalidated redirect parameter', size: 'small' },
    { id: 6, name: 'Info Disclosure', severity: 'low', description: 'Server version exposed', size: 'small' },
    { id: 7, name: 'Clickjacking', severity: 'low', description: 'Missing X-Frame-Options', size: 'small' },
    { id: 8, name: 'Path Traversal', severity: 'high', description: 'Directory traversal in upload', size: 'medium' }
  ]
  
  let reportItems = []
  let activeTargetTab = 'urls'
  let discoveredDomains: string[] = []
  

  
  // Statistics
  $: stats = {
    totalUrls: crawledUrls.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length
  }

  onMount(() => {
    if (window.api?.crawler) {
      window.api.crawler.onProgress((data) => {
        crawlStatus = `Crawling: ${data.currentUrl}`
        crawledUrls = data.results.map((r: any) => r.url)
        discoveredDomains = data.domains || []
        allForms = data.results.flatMap((r: any) => r.forms || [])
        allApiCalls = data.allApiCalls || []
        allCookies = data.allCookies || []
        showResults = true
      })

      window.api.crawler.onComplete((data) => {
        crawlStatus = 'Crawl complete'
        crawledUrls = data.results.map((r: any) => r.url)
        discoveredDomains = data.domains || []
        allForms = data.results.flatMap((r: any) => r.forms || [])
        allApiCalls = data.allApiCalls || []
        allCookies = data.allCookies || []
        isScanning = false
        showResults = true
      })

      window.api.crawler.onError((data) => {
        crawlStatus = `Error: ${data.error}`
        isScanning = false
      })
    }
  })

  onDestroy(() => {
    if (window.api?.crawler) {
      window.api.crawler.removeAllListeners()
    }
  })
  
  async function startScan() {
    if (!selectedUrl) return
    
    isScanning = true
    crawlStatus = 'Starting crawl...'
    crawledUrls = []
    discoveredDomains = []
    allForms = []
    allApiCalls = []
    allCookies = []
    selectedForm = null
    formResponse = null
    showResults = true
    
    try {
      await window.api.crawler.startCrawl(selectedUrl)
    } catch (error) {
      crawlStatus = `Error: ${error}`
      isScanning = false
    }
  }
  
  function selectUrl(url) {
    selectedCrawledUrl = url
  }
  
  function addToReport(vuln) {
    if (!reportItems.find(item => item.id === vuln.id)) {
      reportItems = [...reportItems, vuln]
    }
  }
  
  function removeFromReport(id) {
    reportItems = reportItems.filter(item => item.id !== id)
  }
  
  function exportReport() {
    alert('Report exported!')
  }

  function selectForm(form: any) {
    selectedForm = form
    formData = {}
    formResponse = null
    form.fields.forEach((field: any) => {
      formData[field.name] = field.value || ''
    })
  }

  async function submitForm() {
    if (!selectedForm) return

    isSubmittingForm = true
    formResponse = null

    try {
      const result = await window.api.crawler.submitForm({
        url: selectedForm.url,
        action: selectedForm.action,
        method: selectedForm.method,
        fields: formData
      })

      if (result.success) {
        formResponse = result.result
      } else {
        formResponse = {
          error: result.error,
          status: 0,
          headers: {},
          body: ''
        }
      }
    } catch (error) {
      formResponse = {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
        headers: {},
        body: ''
      }
    } finally {
      isSubmittingForm = false
    }
  }

  function closeFormModal() {
    selectedForm = null
    formResponse = null
    formData = {}
  }
</script>

<div class="flex flex-col bg-black w-screen h-screen text-white text-sm">
  <TitleBar />
  
  <!-- Header Section -->
  <div class="p-4 border-b border-gray-800">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-base font-medium">Wibe Crawler</h1>
      {#if showResults}
        <div class="flex gap-4 text-xs text-gray-400">
          <span>URLs: {stats.totalUrls}</span>
          <span class="text-red-400">Critical: {stats.critical}</span>
          <span class="text-orange-400">High: {stats.high}</span>
          <span class="text-yellow-400">Medium: {stats.medium}</span>
          <span class="text-blue-400">Low: {stats.low}</span>
        </div>
      {/if}
    </div>
    {#if isScanning && crawlStatus}
      <div class="mb-2 text-xs text-gray-400">{crawlStatus}</div>
    {/if}
    <div class="flex gap-2">
      <input 
        bind:value={selectedUrl}
        placeholder="https://example.com" 
        class="flex-1 bg-transparent border border-gray-700 p-2 px-3 text-xs outline-none focus:border-gray-500"
      />
      <button 
        on:click={startScan}
        disabled={isScanning || !selectedUrl}
        class="border border-gray-700 hover:border-gray-500 disabled:border-gray-800 disabled:text-gray-600 px-4 py-2 text-xs"
      >
        {isScanning ? 'Scanning...' : 'Scan'}
      </button>
    </div>
  </div>
  
  <div class="flex-1 flex overflow-hidden">
    <!-- Main Content Area -->
    <div class="flex-1 p-3 overflow-y-auto">
      {#if !showResults}
        <div class="flex items-center justify-center h-full text-gray-500">
          <div class="text-center">
            <p class="text-sm">Enter a URL to start scanning</p>
          </div>
        </div>
      {:else}
        <div class="h-full flex flex-col">
          <!-- Tab Headers -->
          <div class="flex border-b border-gray-800 mb-4">
            <button
              on:click={() => activeTargetTab = 'urls'}
              class="px-4 py-2 text-xs {activeTargetTab === 'urls' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              URLs ({crawledUrls.length})
            </button>
            <button
              on:click={() => activeTargetTab = 'domains'}
              class="px-4 py-2 text-xs {activeTargetTab === 'domains' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Domains ({discoveredDomains.length})
            </button>
            <button
              on:click={() => activeTargetTab = 'vulnerabilities'}
              class="px-4 py-2 text-xs {activeTargetTab === 'vulnerabilities' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Vulnerabilities
            </button>
            <button
              on:click={() => activeTargetTab = 'forms'}
              class="px-4 py-2 text-xs {activeTargetTab === 'forms' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Forms ({allForms.length})
            </button>
            <button
              on:click={() => activeTargetTab = 'apiCalls'}
              class="px-4 py-2 text-xs {activeTargetTab === 'apiCalls' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              API Calls ({allApiCalls.length})
            </button>
            <button
              on:click={() => activeTargetTab = 'cookies'}
              class="px-4 py-2 text-xs {activeTargetTab === 'cookies' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Cookies ({allCookies.length})
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            {#if activeTargetTab === 'urls'}
              <div class="flex justify-between items-center mb-3">
                <h2 class="text-sm font-medium text-white">Crawled URLs</h2>
              </div>
              <div class="space-y-1">
                {#each crawledUrls as url}
                  <button
                    on:click={() => selectUrl(url)}
                    class="w-full text-left p-2 text-xs hover:bg-gray-900 border border-gray-800 hover:border-gray-600"
                  >
                    <div class="font-mono break-all text-gray-300">{url}</div>
                  </button>
                {/each}
              </div>
            {:else if activeTargetTab === 'domains'}
              <div class="flex justify-between items-center mb-3">
                <h2 class="text-sm font-medium text-white">Discovered Domains</h2>
              </div>
              <div class="space-y-1">
                {#each discoveredDomains as domain}
                  <div class="border border-gray-700 p-3 hover:bg-gray-900">
                    <div class="flex justify-between items-start mb-2">
                      <h3 class="font-medium text-sm text-white">{domain}</h3>
                      <span class="text-xs font-mono text-green-400">active</span>
                    </div>
                  </div>
                {/each}
              </div>
            {:else if activeTargetTab === 'vulnerabilities'}
              <div class="flex justify-between items-center mb-3">
                <h2 class="text-sm font-medium text-white">Vulnerabilities Found</h2>
                <div class="text-xs text-gray-400 font-mono">{selectedCrawledUrl}</div>
              </div>
          
          <!-- Minimal Grid -->
          <div class="grid grid-cols-6 gap-2">
            {#each vulnerabilities as vuln}
              <div class="
                {vuln.size === 'large' ? 'col-span-4' : ''}
                {vuln.size === 'medium' ? 'col-span-3' : ''}
                {vuln.size === 'small' ? 'col-span-2' : ''}
                border
                {vuln.severity === 'critical' ? 'border-red-500' : ''}
                {vuln.severity === 'high' ? 'border-orange-500' : ''}
                {vuln.severity === 'medium' ? 'border-yellow-500' : ''}
                {vuln.severity === 'low' ? 'border-blue-500' : ''}
                p-3 hover:bg-gray-900
              ">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">{vuln.name}</h3>
                  <span class="
                    text-xs font-mono
                    {vuln.severity === 'critical' ? 'text-red-400' : ''}
                    {vuln.severity === 'high' ? 'text-orange-400' : ''}
                    {vuln.severity === 'medium' ? 'text-yellow-400' : ''}
                    {vuln.severity === 'low' ? 'text-blue-400' : ''}
                  ">
                    {vuln.severity}
                  </span>
                </div>
                <p class="text-gray-400 text-xs mb-2">{vuln.description}</p>
                <button
                  on:click={() => addToReport(vuln)}
                  class="text-xs text-gray-400 hover:text-white border-b border-gray-700 hover:border-gray-400"
                >
                  Add to Report
                </button>
              </div>
            {/each}
          </div>
        {:else if activeTargetTab === 'forms'}
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">Forms Found</h2>
          </div>
          <div class="space-y-2">
            {#each allForms as form}
              <div class="border border-gray-700 p-3 hover:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">Form ({form.method.toUpperCase()})</h3>
                  <button
                    on:click={() => selectForm(form)}
                    class="text-xs text-blue-400 hover:text-blue-300 border-b border-blue-700 hover:border-blue-400"
                  >
                    Test Form
                  </button>
                </div>
                <p class="text-gray-400 text-xs mb-1">Action: {form.action}</p>
                <p class="text-gray-400 text-xs mb-1">URL: {form.url}</p>
                <p class="text-gray-400 text-xs">Fields: {form.fields.map(f => f.name).join(', ')}</p>
              </div>
            {:else}
              <div class="text-center text-gray-500 py-8">
                <p class="text-sm">No forms found during crawl</p>
              </div>
            {/each}
          </div>
        {:else if activeTargetTab === 'apiCalls'}
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">API Calls Found</h2>
          </div>
          <div class="space-y-2">
            {#each allApiCalls as api}
              <div class="border border-gray-700 p-3 hover:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white break-all">{api.endpoint}</h3>
                  <div class="flex gap-2">
                    <span class="text-xs font-mono text-green-400">{api.method}</span>
                    {#if api.responseStatus}
                      <span class="text-xs font-mono {api.responseStatus >= 200 && api.responseStatus < 300 ? 'text-green-400' : api.responseStatus >= 400 ? 'text-red-400' : 'text-yellow-400'}">
                        {api.responseStatus}
                      </span>
                    {/if}
                  </div>
                </div>
                <p class="text-gray-400 text-xs">Parameters: {api.params}</p>
                {#if Object.keys(api.headers).length > 0}
                  <details class="mt-2">
                    <summary class="text-xs text-gray-400 cursor-pointer hover:text-white">Headers</summary>
                    <div class="mt-1 text-xs text-gray-500 font-mono">
                      {#each Object.entries(api.headers) as [key, value]}
                        <div>{key}: {value}</div>
                      {/each}
                    </div>
                  </details>
                {/if}
              </div>
            {:else}
              <div class="text-center text-gray-500 py-8">
                <p class="text-sm">No API calls detected during crawl</p>
              </div>
            {/each}
          </div>

        {:else if activeTargetTab === 'cookies'}
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">Cookies Found</h2>
          </div>
          <div class="space-y-2">
            {#each allCookies as cookie}
              <div class="border border-gray-700 p-3 hover:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">{cookie.name}</h3>
                  <div class="flex gap-2">
                    {#if cookie.secure}
                      <span class="text-xs font-mono text-green-400">SECURE</span>
                    {/if}
                    {#if cookie.httpOnly}
                      <span class="text-xs font-mono text-blue-400">HTTP-ONLY</span>
                    {/if}
                    {#if cookie.sameSite}
                      <span class="text-xs font-mono text-purple-400">{cookie.sameSite}</span>
                    {/if}
                  </div>
                </div>
                <p class="text-gray-400 text-xs font-mono break-all">{cookie.value}</p>
                <div class="mt-2 text-xs text-gray-500">
                  <div>Domain: {cookie.domain}</div>
                  <div>Path: {cookie.path}</div>
                  {#if cookie.expires}
                    <div>Expires: {new Date(cookie.expires * 1000).toLocaleString()}</div>
                  {/if}
                </div>
              </div>
            {:else}
              <div class="text-center text-gray-500 py-8">
                <p class="text-sm">No cookies found during crawl</p>
              </div>
            {/each}
          </div>
        {/if}
        </div>
      </div>
      {/if}
    </div>
    
    <!-- Right Panel - Report -->
    {#if reportItems.length > 0}
    <div class="w-64 border-l border-gray-800 p-3 overflow-y-auto">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xs font-medium text-gray-400 uppercase tracking-wide">Report ({reportItems.length})</h2>
        <button
          on:click={exportReport}
          class="text-xs text-gray-400 hover:text-white border-b border-gray-700 hover:border-gray-400"
        >
          Export
        </button>
      </div>
      
      <div class="space-y-2">
        {#each reportItems as item}
          <div class="border-l-2 border-gray-700 pl-2 py-1">
            <div class="flex justify-between items-start">
              <h4 class="text-sm text-white">{item.name}</h4>
              <button
                on:click={() => removeFromReport(item.id)}
                class="text-xs text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <span class="
              text-xs font-mono
              {item.severity === 'critical' ? 'text-red-400' : ''}
              {item.severity === 'high' ? 'text-orange-400' : ''}
              {item.severity === 'medium' ? 'text-yellow-400' : ''}
              {item.severity === 'low' ? 'text-blue-400' : ''}
            ">
              {item.severity}
            </span>
            <p class="text-gray-400 text-xs mt-1">{item.description}</p>
          </div>
        {/each}
      </div>
    </div>
    {/if}
  </div>
</div>

<!-- Form Testing Modal -->
{#if selectedForm}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div class="p-4 border-b border-gray-700">
        <div class="flex justify-between items-center">
          <h2 class="text-sm font-medium text-white">Test Form</h2>
          <button
            on:click={closeFormModal}
            class="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
        <div class="text-xs text-gray-400 mt-1">
          {selectedForm.method.toUpperCase()} {selectedForm.action}
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <div class="p-4">
          <div class="grid grid-cols-1 gap-4 mb-4">
            {#each selectedForm.fields as field}
              <div>
                <span class="block text-xs font-medium text-gray-300 mb-1">
                  {field.name}
                  {#if field.required}
                    <span class="text-red-400">*</span>
                  {/if}
                </span>
                {#if field.type === 'textarea'}
                  <textarea
                    bind:value={formData[field.name]}
                    placeholder={field.placeholder || field.name}
                    class="w-full bg-gray-800 border border-gray-600 text-white text-xs p-2 rounded focus:border-blue-500 focus:outline-none"
                    rows="3"
                  ></textarea>
                {:else if field.type === 'select'}
                  <select
                    bind:value={formData[field.name]}
                    class="w-full bg-gray-800 border border-gray-600 text-white text-xs p-2 rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select option</option>
                  </select>
                {:else}
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    bind:value={formData[field.name]}
                    placeholder={field.placeholder || field.name}
                    class="w-full bg-gray-800 border border-gray-600 text-white text-xs p-2 rounded focus:border-blue-500 focus:outline-none"
                  />
                {/if}
                <div class="text-xs text-gray-500 mt-1">
                  Type: {field.type}
                  {#if field.value}
                    | Default: {field.value}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          
          <div class="flex gap-2 mb-4">
            <button
              on:click={submitForm}
              disabled={isSubmittingForm}
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs px-4 py-2 rounded"
            >
              {isSubmittingForm ? 'Submitting...' : 'Submit Form'}
            </button>
            <button
              on:click={closeFormModal}
              class="border border-gray-600 hover:border-gray-500 text-white text-xs px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
          
          {#if formResponse}
            <div class="border-t border-gray-700 pt-4">
              <h3 class="text-sm font-medium text-white mb-3">Response</h3>
              
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span class="block text-xs font-medium text-gray-300 mb-1">Status Code</span>
                  <div class="text-sm font-mono {formResponse.status >= 200 && formResponse.status < 300 ? 'text-green-400' : formResponse.status >= 400 ? 'text-red-400' : 'text-yellow-400'}">
                    {formResponse.status || 'N/A'}
                  </div>
                </div>
                <div>
                  <span class="block text-xs font-medium text-gray-300 mb-1">Content Type</span>
                  <div class="text-sm font-mono text-gray-400">
                    {formResponse.headers['content-type'] || 'N/A'}
                  </div>
                </div>
              </div>
              
              {#if formResponse.error}
                <div class="mb-4">
                  <span class="block text-xs font-medium text-gray-300 mb-1">Error</span>
                  <div class="bg-gray-800 border border-red-600 text-red-400 text-xs p-3 rounded font-mono">
                    {formResponse.error}
                  </div>
                </div>
              {/if}
              
              {#if Object.keys(formResponse.headers).length > 0}
                <div class="mb-4">
                  <span class="block text-xs font-medium text-gray-300 mb-1">Headers</span>
                  <div class="bg-gray-800 border border-gray-600 text-xs p-3 rounded max-h-32 overflow-y-auto">
                    <pre class="text-gray-300 font-mono">{JSON.stringify(formResponse.headers, null, 2)}</pre>
                  </div>
                </div>
              {/if}
              
              {#if formResponse.body}
                <div>
                  <span class="block text-xs font-medium text-gray-300 mb-1">Response Body</span>
                  <div class="bg-gray-800 border border-gray-600 text-xs p-3 rounded max-h-64 overflow-y-auto">
                    <pre class="text-gray-300 font-mono whitespace-pre-wrap">{formResponse.body}</pre>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}