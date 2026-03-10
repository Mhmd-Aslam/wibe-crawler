from config import env
from langchain_groq import ChatGroq
from pydantic import SecretStr
import random
import time
from typing import List, Optional

class KeyManager:
    """Manages API keys with cooldown tracking."""
    def __init__(self, keys: List[str]):
        self.keys = keys
        self.cooldowns = {key: 0 for key in keys}
    
    def get_healthy_key(self) -> str:
        """Returns a random healthy key. Fallback to any key if all on cooldown."""
        now = time.time()
        healthy_keys = [k for k in self.keys if self.cooldowns[k] < now]
        
        if healthy_keys:
            return random.choice(healthy_keys)
        
        # If all keys on cooldown, pick the one that expires soonest or just random
        print("[Agent] WARNING: All API keys on cooldown! Picking a random one.")
        return random.choice(self.keys) if self.keys else env.GROQ_API_KEY

    def mark_cooldown(self, key: str, duration: int = 3600):
        """Marks a key as being on cooldown for N seconds (default 1 hour)."""
        if key in self.cooldowns:
            print(f"[Agent] Marking key ...{key[-4:]} on cooldown for {duration}s")
            self.cooldowns[key] = time.time() + duration

# Global KeyManager instance
key_manager = KeyManager(env.api_key_pool)

def get_api_key():
    """Get a healthy API key from the manager."""
    return key_manager.get_healthy_key()

def mark_key_cooldown(api_key: str):
    """External hook to penalize a key."""
    key_manager.mark_cooldown(api_key)

def create_llm(model_name: str):
    """Create an LLM instance with a current API key."""
    return ChatGroq(
        api_key=SecretStr(get_api_key()),
        model=model_name,
        temperature=0.1,
        max_retries=2
    )

def refresh_llms():
    """Global refresh of all LLM instances to pick up new keys on rate limit."""
    global llm, FALLBACK_MODELS
    print(f"[Agent] Refreshing LLMs (pool size: {len(env.api_key_pool)})")
    llm = create_llm("llama-3.3-70b-versatile")
    FALLBACK_MODELS = [
        create_llm("llama-3.3-70b-versatile"),
        create_llm("llama-3.1-70b-versatile"),
        create_llm("llama-3.1-8b-instant"),
    ]

# Initialize LLMs
llm = create_llm("llama-3.3-70b-versatile")
FALLBACK_MODELS = [
    create_llm("llama-3.3-70b-versatile"),
    create_llm("llama-3.1-70b-versatile"),
    create_llm("llama-3.1-8b-instant"),
]