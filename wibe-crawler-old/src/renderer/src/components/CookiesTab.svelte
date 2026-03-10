<script lang="ts">
  export let allCookies
</script>

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">Cookies ({allCookies.length})</h2>
  </div>
  <div class="space-y-2">
    {#each allCookies as cookie}
      <div class="border border-gray-700 p-3 hover:bg-gray-900">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-sm text-white">{cookie.name}</h3>
          <div class="flex gap-2">
            {#if cookie.secure}
              <span class="text-xs font-mono text-green-400">Secure</span>
            {/if}
            {#if cookie.httpOnly}
              <span class="text-xs font-mono text-blue-400">HttpOnly</span>
            {/if}
            {#if cookie.sameSite}
              <span class="text-xs font-mono text-purple-400">SameSite={cookie.sameSite}</span>
            {/if}
          </div>
        </div>
        <p class="text-gray-400 text-xs font-mono break-all">{cookie.value}</p>
        <div class="mt-2 text-xs text-gray-500">
          <div>Domain: {cookie.domain}</div>
          <div>Path: {cookie.path}</div>
          {#if cookie.expires}
            <div>Expires: {cookie.expires}</div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="text-center text-gray-500 py-8">
        <p class="text-sm">No cookies found</p>
      </div>
    {/each}
  </div>
</div>