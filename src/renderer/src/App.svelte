<script lang="ts">
  import TitleBar from './components/TitleBar.svelte'
  import ScanHeader from './components/ScanHeader.svelte'
  import EmptyState from './components/EmptyState.svelte'
  import TabNavigation from './components/TabNavigation.svelte'
  import UrlsTab from './components/UrlsTab.svelte'
  import DomainsTab from './components/DomainsTab.svelte'
  import VulnerabilitiesTab from './components/VulnerabilitiesTab.svelte'
  import FormsTab from './components/FormsTab.svelte'
  import ApiCallsTab from './components/ApiCallsTab.svelte'
  import CookiesTab from './components/CookiesTab.svelte'
  import EmailsTab from './components/EmailsTab.svelte'
  import ReportSidebar from './components/ReportSidebar.svelte'
  import FormModal from './components/FormModal.svelte'
  import AssetsTab from './components/AssetsTab.svelte'
  import { onMount, onDestroy } from 'svelte'

  let isScanning = false
  let showResults = false
  let selectedCrawledUrl = ''
  let crawledUrls = []
  let discoveredUrls = []
  let crawlStatus = ''
  let allForms = []
  let allApiCalls = []
  let allCookies = []
  let allEmails = []
  let allAssets: Record<string, string[]> = {}
  let selectedForm = null
  let formData = {}
  let formResponse = null
  let isSubmittingForm = false

  const vulnerabilities = [
    {
      id: '1',
      name: 'SQL Injection',
      severity: 'critical' as const,
      description: 'Login form parameter vulnerable to SQL injection',
      size: 3
    },
    {
      id: '2',
      name: 'XSS',
      severity: 'high' as const,
      description: 'Reflected XSS in search parameter',
      size: 2
    },
    {
      id: '3',
      name: 'CSRF',
      severity: 'medium' as const,
      description: 'Missing CSRF protection',
      size: 2
    },
    {
      id: '4',
      name: 'Weak Encryption',
      severity: 'low' as const,
      description: 'MD5 hash detected',
      size: 1
    },
    {
      id: '5',
      name: 'Open Redirect',
      severity: 'medium' as const,
      description: 'Unvalidated redirect parameter',
      size: 1
    },
    {
      id: '6',
      name: 'Info Disclosure',
      severity: 'low' as const,
      description: 'Server version exposed',
      size: 1
    },
    {
      id: '7',
      name: 'Clickjacking',
      severity: 'low' as const,
      description: 'Missing X-Frame-Options',
      size: 1
    },
    {
      id: '8',
      name: 'Path Traversal',
      severity: 'high' as const,
      description: 'Directory traversal in upload',
      size: 2
    }
  ]

  let reportItems = []
  let activeTargetTab = 'urls'
  let discoveredDomains = []

  // Statistics
  $: totalUrls = crawledUrls.length + discoveredUrls.length
  $: assetsCount = Object.values(allAssets || {}).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0)
  $: critical = vulnerabilities.filter((v) => v.severity === 'critical').length
  $: high = vulnerabilities.filter((v) => v.severity === 'high').length
  $: medium = vulnerabilities.filter((v) => v.severity === 'medium').length
  $: low = vulnerabilities.filter((v) => v.severity === 'low').length

  onMount(() => {
    if (window.api?.crawler) {
      window.api.crawler.onProgress((data) => {
        crawlStatus = `Crawling: ${data.currentUrl}`
        crawledUrls = data.results.map((r: any) => r.url)
        discoveredDomains = data.domains || []
        allForms = data.results.flatMap((r: any) => r.forms || [])
        allApiCalls = data.allApiCalls || []
        allCookies = data.allCookies || []
        allEmails = data.allEmails || []
        allAssets = data.allAssets || {}
        showResults = true
      })

      window.api.crawler.onUrlsDiscovered((data) => {
        discoveredUrls = data.urls || []
      })

      window.api.crawler.onComplete((data) => {
        isScanning = false
        showResults = true
        crawlStatus = `Completed: ${data.totalUrlsCrawled} URLs crawled`
        crawledUrls = data.results.map((r: any) => r.url)
        discoveredDomains = data.domains || []
        allForms = data.results.flatMap((r: any) => r.forms || [])
        allApiCalls = data.allApiCalls || []
        allCookies = data.allCookies || []
        allEmails = data.allEmails || []
        allAssets = data.allAssets || {} // Set from IPC complete
        discoveredUrls = []
      })

      window.api.crawler.onError((error) => {
        console.error('Crawler error:', error)
        isScanning = false
        crawlStatus = `Error: ${error.message}`
      })
    }
  })

  onDestroy(() => {
    if (window.api?.crawler) {
      window.api.crawler.removeAllListeners()
    }
  })

  async function startScan(url, context = { cookies: [], localStorage: {} }) {
    if (!url || isScanning) return

    try {
      isScanning = true
      showResults = true
      crawledUrls = []
      discoveredUrls = []
      discoveredDomains = []
      allForms = []
      allApiCalls = []
      allCookies = []
      allEmails = []
      allAssets = {} // Reset on start
      crawlStatus = 'Starting scan...'

      await window.api.crawler.startCrawl(url, context)
    } catch (error) {
      console.error('Failed to start scan:', error)
      isScanning = false
      crawlStatus = 'Failed to start scan'
    }
  }

  async function stopScan() {
    try {
      await window.api.crawler.stopCrawl()
      isScanning = false
      crawlStatus = 'Scan stopped'
    } catch (error) {
      console.error('Failed to stop scan:', error)
    }
  }

  function selectUrl(url) {
    selectedCrawledUrl = url
  }

  function addToReport(vuln) {
    if (!reportItems.find((item) => item.id === vuln.id)) {
      reportItems = [...reportItems, vuln]
    }
  }

  function removeFromReport(id) {
    reportItems = reportItems.filter((item) => item.id !== id)
  }

  function exportReport() {
    console.log('Exporting report...', reportItems)
  }

  function selectForm(form) {
    selectedForm = form
    formData = {}
    formResponse = null
    form.fields.forEach((field: any) => {
      formData[field.name] = field.value || ''
    })
  }

  async function submitForm() {
    if (!selectedForm) return

    try {
      isSubmittingForm = true
      const response = await window.api.crawler.submitForm({
        url: selectedForm.url,
        action: selectedForm.action,
        method: selectedForm.method,
        fields: formData
      })

      if (response.success) {
        formResponse = {
          error: response.result.error,
          status: response.result.status,
          headers: response.result.headers,
          body: response.result.body,
          html: response.result.html,
          finalUrl: response.result.finalUrl
        }
      } else {
        formResponse = {
          error: response.error,
          status: 0,
          headers: {},
          body: '',
          html: '',
          finalUrl: ''
        }
      }
    } catch (error) {
      formResponse = {
        error: error.message,
        status: 0,
        headers: {},
        body: '',
        html: '',
        finalUrl: ''
      }
    } finally {
      isSubmittingForm = false
    }
  }

  function closeFormModal() {
    selectedForm = null
    formData = {}
    formResponse = null
  }

  function handleTabChange(tab) {
    activeTargetTab = tab
  }
</script>

<div class="flex flex-col bg-black w-screen h-screen text-white text-sm">
  <TitleBar />

  <ScanHeader
    {isScanning}
    {showResults}
    {crawlStatus}
    {totalUrls}
    {critical}
    {high}
    {medium}
    {low}
    onStartScan={startScan}
    onStopScan={stopScan}
  />

  <div class="flex-1 flex overflow-hidden">
    <!-- Main Content Area -->
    <div class="flex-1 p-3 overflow-y-auto">
      {#if !showResults}
        <EmptyState message='Enter a URL and click "Start Scan" to begin' />
      {:else}
        <div class="h-full flex flex-col">
          <!-- Tab Navigation -->
          <TabNavigation
            activeTab={activeTargetTab}
            discoveredUrlsCount={discoveredUrls.length}
            formsCount={allForms.length}
            assetsCount={assetsCount}
            apiCallsCount={allApiCalls.length}
            cookiesCount={allCookies.length}
            domainsCount={discoveredDomains.length}
            emailsCount={allEmails.length}
            onTabChange={handleTabChange}
          />

          <!-- Tab Content -->
          <div class="flex-1 overflow-y-auto">
            {#if activeTargetTab === 'urls'}
              <UrlsTab
                {crawledUrls}
                {discoveredUrls}
                selectedUrl={selectedCrawledUrl}
                onSelectUrl={selectUrl}
              />
            {:else if activeTargetTab === 'domains'}
              <DomainsTab {discoveredDomains} />
            {:else if activeTargetTab === 'vulnerabilities'}
              <VulnerabilitiesTab {vulnerabilities} onAddToReport={addToReport} />
            {:else if activeTargetTab === 'forms'}
              <FormsTab {allForms} onSelectForm={selectForm} />
            {:else if activeTargetTab === 'assets'}
              <AssetsTab {allAssets} />
            {:else if activeTargetTab === 'apiCalls'}
              <ApiCallsTab {allApiCalls} />
            {:else if activeTargetTab === 'cookies'}
              <CookiesTab {allCookies} />
            {:else if activeTargetTab === 'emails'}
              <EmailsTab {allEmails} />
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Report Sidebar -->
    {#if reportItems.length > 0}
      <ReportSidebar
        {reportItems}
        onRemoveFromReport={removeFromReport}
        onExportReport={exportReport}
      />
    {/if}
  </div>
</div>

<!-- Form Modal -->
<FormModal
  {selectedForm}
  {formData}
  {formResponse}
  {isSubmittingForm}
  onClose={closeFormModal}
  onSubmit={submitForm}
/>
