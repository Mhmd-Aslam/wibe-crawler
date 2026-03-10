<script lang="ts">
  export let allEmails = []
</script>

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">Emails ({allEmails.length})</h2>
  </div>
  {#if allEmails.length > 0}
    <div class="space-y-2">
      {#each allEmails as email (email)}
        <div class="border border-gray-700 p-3 hover:bg-gray-900 transition-colors">
          <div class="flex justify-between items-center">
            <p class="text-xs text-gray-300 break-all font-mono">{email}</p>
            <button
              on:click={() => navigator.clipboard.writeText(email)}
              class="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-blue-400 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center text-gray-500 py-8">
      <p class="text-sm">No emails detected</p>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background-color: black;
  }
</style>
