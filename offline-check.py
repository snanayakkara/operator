#!/usr/bin/env python3
"""
Quick offline functionality check for VAD and repetition guard features.
Run this script to validate that the enhancements work without network access.
"""

import subprocess
import sys
import os
import requests
import time

def print_banner():
    print("🔒 Offline Whisper Server Functionality Check")
    print("=" * 50)

def check_dependencies():
    """Check if required dependencies are available"""
    print("📦 Checking dependencies...")
    
    deps = {
        'numpy': False,
        'soundfile': False,
        'webrtcvad': False,
        'mlx_whisper': False,
        'flask': False
    }
    
    for dep in deps:
        try:
            __import__(dep)
            deps[dep] = True
            print(f"   ✅ {dep}")
        except ImportError:
            print(f"   ❌ {dep} (missing)")
    
    missing = [dep for dep, available in deps.items() if not available]
    if missing:
        print(f"\n⚠️ Missing dependencies: {', '.join(missing)}")
        print("   Run: pip install -r requirements-whisper.txt")
        return False
    
    print("   ✅ All dependencies available")
    return True

def run_unit_tests():
    """Run the offline unit test suite"""
    print("\n🧪 Running unit tests...")
    
    if not os.path.exists('tests/test_vad_repetition.py'):
        print("   ❌ Test file not found")
        return False
    
    try:
        result = subprocess.run([
            sys.executable, 'tests/test_vad_repetition.py'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("   ✅ Unit tests passed")
            return True
        else:
            print("   ❌ Unit tests failed")
            print(f"   Output: {result.stdout}")
            print(f"   Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("   ⏱️ Unit tests timed out")
        return False
    except Exception as e:
        print(f"   ❌ Unit test error: {e}")
        return False

def test_server_endpoints():
    """Test server endpoints if server is running"""
    print("\n🌐 Testing server endpoints...")
    
    base_url = 'http://localhost:8001'
    
    # Check if server is running
    try:
        response = requests.get(f"{base_url}/v1/health", timeout=5)
        if response.status_code != 200:
            print("   ⚠️ Server not responding (this is OK for offline check)")
            return True
            
        health_data = response.json()
        print(f"   ✅ Server running: {health_data.get('status', 'unknown')}")
        
        # Test VAD endpoint
        try:
            vad_response = requests.get(f"{base_url}/test/vad", timeout=10)
            vad_data = vad_response.json()
            print(f"   🎙️ VAD test: {vad_data.get('status', 'unknown')} - {vad_data.get('message', '')}")
        except Exception:
            print("   ⚠️ VAD test endpoint failed")
        
        # Test repetition endpoint
        try:
            rep_response = requests.get(f"{base_url}/test/repetition", timeout=5)
            rep_data = rep_response.json()
            print(f"   🔄 Repetition test: {rep_data.get('status', 'unknown')} - {rep_data.get('message', '')}")
        except Exception:
            print("   ⚠️ Repetition test endpoint failed")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running (this is OK for offline check)")
        return True
    except Exception as e:
        print(f"   ❌ Server test error: {e}")
        return False

def test_configuration():
    """Test configuration loading"""
    print("\n⚙️ Testing configuration...")
    
    # Test environment variables
    test_vars = {
        'WHISPER_NO_CONTEXT': '1',
        'VAD_ENABLED': '1',
        'VAD_MODE': '2',
        'REPEAT_LIMIT': '6'
    }
    
    print("   Setting test environment variables:")
    for var, value in test_vars.items():
        os.environ[var] = value
        print(f"     {var}={value}")
    
    # Try to import and check if config is loaded
    try:
        # Import after setting env vars
        import importlib
        import sys
        if 'whisper_server' in sys.modules:
            importlib.reload(sys.modules['whisper_server'])
        else:
            import whisper_server
            
        print("   ✅ Configuration loaded successfully")
        return True
    except Exception as e:
        print(f"   ❌ Configuration error: {e}")
        return False

def main():
    print_banner()
    
    success = True
    
    # Run checks
    if not check_dependencies():
        success = False
    
    if not run_unit_tests():
        success = False
    
    if not test_server_endpoints():
        success = False
    
    if not test_configuration():
        success = False
    
    # Summary
    print("\n" + "=" * 50)
    if success:
        print("✅ All offline checks passed!")
        print("\n💡 Next steps:")
        print("   1. Start server: ./start-whisper-server.sh")
        print("   2. Test VAD: curl http://localhost:8001/test/vad")
        print("   3. Test repetition: curl http://localhost:8001/test/repetition")
        return 0
    else:
        print("❌ Some offline checks failed")
        print("\n💡 Troubleshooting:")
        print("   1. Install missing dependencies: pip install -r requirements-whisper.txt")
        print("   2. Check Python version (requires 3.8+)")
        print("   3. Ensure all files are in the correct location")
        return 1

if __name__ == "__main__":
    sys.exit(main())