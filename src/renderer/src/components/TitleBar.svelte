<script lang="ts">
  import { Minus, Square, X } from '@lucide/svelte'

  function minimize() {
    window.api.windowControls.minimize()
  }

  function maximize() {
    window.api.windowControls.maximize()
  }

  function close() {
    window.api.windowControls.close()
  }
</script>

<div class="title-bar flex justify-between items-center h-10 bg-transparent select-none rounded-t-xl border-b border-neutral-50/10" style="-webkit-app-region: drag;">
  <div class="flex-1"></div>
  
  <div class="window-controls flex gap-3 px-2" style="-webkit-app-region: no-drag;">
    <button 
      class="control-button hover:bg-white/10 transition-colors duration-200 w-fit h-8 flex items-center justify-center"
      on:click={minimize}
    >
      <Minus size={16} class="text-white/45" />
    </button>
    
    <button 
      class="control-button hover:bg-white/10 transition-colors duration-200 w-fit h-8 flex items-center justify-center"
      on:click={maximize}
    >
      <Square size={14} class="text-white/45" />
    </button>
    
    <button 
      class="control-button hover:bg-red-500 transition-colors duration-200 w-fit h-8 flex items-center justify-center"
      on:click={close}
    >
      <X size={16} class="text-white/45" />
    </button>
  </div>
</div>

<style>
  .title-bar {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .control-button {
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-button:focus {
    outline: none;
  }
</style>