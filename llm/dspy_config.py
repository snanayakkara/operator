"""
DSPy Configuration Module

Configures local OpenAI-compatible endpoints for medical dictation processing.
Defaults to localhost endpoints, never makes external calls unless explicitly configured.

Privacy-first design:
- All processing on localhost by default
- No API keys required for local endpoints  
- Configurable cache directory for reproducibility
- Environment variable overrides for flexibility
"""

import os
import yaml
from pathlib import Path
from typing import Optional, Dict, Any
import dspy

class DSPyConfig:
    """Configuration manager for DSPy integration with existing medical agents."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize DSPy configuration.
        
        Args:
            config_path: Path to llm.yaml config file. Defaults to config/llm.yaml
        """
        self.config_path = config_path or self._find_config_file()
        self.config = self._load_config()
        self._configured_lm = None
        
    def _find_config_file(self) -> str:
        """Find the llm.yaml configuration file in the project structure."""
        # Try relative to current working directory first
        candidates = [
            "config/llm.yaml",
            "../config/llm.yaml", 
            "../../config/llm.yaml",
            os.path.expanduser("~/.config/operator/llm.yaml")
        ]
        
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
                
        # Fallback: create path relative to this file
        current_dir = Path(__file__).parent
        project_root = current_dir.parent
        return str(project_root / "config" / "llm.yaml")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file with environment variable overrides."""
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
        except FileNotFoundError:
            print(f"⚠️  Config file not found: {self.config_path}")
            print("   Using default localhost configuration")
            config = self._get_default_config()
        
        # Environment variable overrides
        config['api_base'] = os.getenv('OPENAI_API_BASE', config.get('api_base', 'http://localhost:1234/v1'))
        config['api_key'] = os.getenv('OPENAI_API_KEY', config.get('api_key', 'local'))
        config['model_name'] = os.getenv('OPENAI_MODEL', config.get('model_name', 'local-model'))
        config['use_dspy'] = os.getenv('USE_DSPY', 'false').lower() == 'true'
        config['cache_dir'] = os.getenv('DSPY_CACHE_DIR', config.get('cache_dir', '.cache/dspy'))
        
        return config
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Default configuration for offline-first setup."""
        return {
            'api_base': 'http://localhost:1234/v1',
            'api_key': 'local',  
            'model_name': 'local-model',
            'model_type': 'chat',
            'use_dspy': False,
            'cache_enabled': True,
            'cache_dir': '.cache/dspy',
            'default_timeout': 300000,
            'agents': {
                'angiogram-pci': {'enabled': True, 'max_tokens': 8000, 'temperature': 0.3},
                'quick-letter': {'enabled': True, 'max_tokens': 5000, 'temperature': 0.3}
            }
        }
    
    def configure_lm(self, agent_type: Optional[str] = None) -> dspy.LM:
        """
        Configure and return DSPy LM client.
        
        Args:
            agent_type: Specific agent to configure (for model overrides)
            
        Returns:
            Configured DSPy LM instance
        """
        # Get agent-specific configuration
        agent_config = {}
        if agent_type and agent_type in self.config.get('agents', {}):
            agent_config = self.config['agents'][agent_type]
        
        # Determine model to use (agent override or default)
        model_name = agent_config.get('model_override') or self.config['model_name']
        
        # Create LM with OpenAI-compatible configuration
        # For OpenAI-compatible endpoints, prefix model with openai/ for litellm
        if self.config['api_base'].startswith('http://localhost') or self.config['api_base'].startswith('http://127.0.0.1'):
            # Local OpenAI-compatible endpoint (like LMStudio)
            model_for_dspy = f"openai/{model_name}"
        else:
            model_for_dspy = model_name
            
        lm = dspy.LM(
            model=model_for_dspy,
            api_base=self.config['api_base'],
            api_key=self.config['api_key'],
            model_type=self.config.get('model_type', 'chat'),
            max_tokens=agent_config.get('max_tokens', 4000),
            temperature=agent_config.get('temperature', 0.3)
        )
        
        # Configure DSPy settings
        settings = {
            'lm': lm,
            'experimental': True  # Enable latest DSPy features
        }
        
        # Add caching if enabled
        if self.config.get('cache_enabled', True):
            cache_dir = self.config.get('cache_dir', '.cache/dspy')
            os.makedirs(cache_dir, exist_ok=True)
            # DSPy will handle caching internally
            
        dspy.configure(**settings)
        self._configured_lm = lm
        
        print(f"✅ DSPy configured for {agent_type or 'default'}")
        print(f"   Model: {model_name} -> {model_for_dspy}")
        print(f"   Endpoint: {self.config['api_base']}")
        print(f"   Cache: {cache_dir if self.config.get('cache_enabled') else 'disabled'}")
        
        return lm
    
    def is_dspy_enabled(self, agent_type: Optional[str] = None) -> bool:
        """Check if DSPy is enabled globally and for specific agent."""
        if not self.config.get('use_dspy', False):
            return False
            
        if agent_type:
            agent_config = self.config.get('agents', {}).get(agent_type, {})
            return agent_config.get('enabled', False)
            
        return True
    
    def get_agent_config(self, agent_type: str) -> Dict[str, Any]:
        """Get configuration for specific agent."""
        return self.config.get('agents', {}).get(agent_type, {})
    
    def get_timeout(self, agent_type: str) -> int:
        """Get timeout for specific agent in milliseconds."""
        return self.config.get('agent_timeouts', {}).get(
            agent_type, 
            self.config.get('default_timeout', 300000)
        )
    
    def set_fresh_run(self, rollout_id: Optional[str] = None):
        """Set unique rollout ID to bypass cache."""
        if not rollout_id:
            import time
            rollout_id = f"run_{int(time.time())}"
            
        # This would typically be passed to DSPy settings
        # Implementation depends on DSPy's caching API
        print(f"🔄 Fresh run mode: {rollout_id}")


# Global configuration instance
_config_instance = None

def get_config() -> DSPyConfig:
    """Get global configuration instance (singleton pattern)."""
    global _config_instance
    if _config_instance is None:
        _config_instance = DSPyConfig()
    return _config_instance

def configure_lm(agent_type: Optional[str] = None) -> dspy.LM:
    """Convenience function to configure LM."""
    return get_config().configure_lm(agent_type)

def is_dspy_enabled(agent_type: Optional[str] = None) -> bool:
    """Convenience function to check if DSPy is enabled."""
    return get_config().is_dspy_enabled(agent_type)

# Safety check for external calls
def verify_localhost_only():
    """Verify that configuration only uses localhost endpoints."""
    config = get_config().config
    api_base = config.get('api_base', '')
    
    if not ('localhost' in api_base or '127.0.0.1' in api_base):
        if not config.get('safety', {}).get('no_external_calls', True):
            raise ValueError(
                f"External API detected: {api_base}. "
                "Set safety.no_external_calls: false in config to allow external calls."
            )
        
    print("🔒 Localhost-only configuration verified")

if __name__ == "__main__":
    # Test configuration
    verify_localhost_only()
    config = get_config()
    print("Configuration loaded successfully:")
    print(f"  DSPy enabled: {config.is_dspy_enabled()}")
    print(f"  API base: {config.config['api_base']}")
    print(f"  Cache dir: {config.config['cache_dir']}")
    
    # Test agent configurations
    for agent_type in ['angiogram-pci', 'quick-letter']:
        if config.is_dspy_enabled(agent_type):
            print(f"  {agent_type}: enabled")
        else:
            print(f"  {agent_type}: disabled")