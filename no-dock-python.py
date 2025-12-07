#!/usr/bin/env python3
"""
Wrapper to run Python scripts/modules without showing in macOS dock.
Uses AppKit to prevent dock icon from appearing.

Usage:
    python3 no-dock-python.py <script.py> [args...]
    python3 no-dock-python.py -m <module.name> [args...]
"""
import sys
import os
import runpy

def main():
    if len(sys.argv) < 2:
        print("Usage: no-dock-python.py <script> [args...] or no-dock-python.py -m <module> [args...]", file=sys.stderr)
        sys.exit(1)

    # Try to use AppKit to hide dock icon (macOS only)
    try:
        import AppKit
        # NSApplicationActivationPolicyProhibited prevents dock icon
        # Create or get the shared application instance
        try:
            app = AppKit.NSApplication.sharedApplication()
            app.setActivationPolicy_(AppKit.NSApplicationActivationPolicyProhibited)
        except (AttributeError, Exception) as e:
            # If setting activation policy fails, continue anyway
            # This can happen if the app is already initialized with GUI requirements
            pass
    except ImportError:
        # AppKit not available (not macOS or not installed), run normally
        pass

    # Check if running as module (-m flag)
    if sys.argv[1] == '-m':
        if len(sys.argv) < 3:
            print("Error: -m flag requires module name", file=sys.stderr)
            sys.exit(1)

        # Get module name and arguments
        module_name = sys.argv[2]
        module_args = sys.argv[3:]

        # Replace sys.argv with the module's arguments
        sys.argv = [module_name] + module_args

        # Run the module
        runpy.run_module(module_name, run_name='__main__')
    else:
        # Running as script file
        script_path = sys.argv[1]
        script_args = sys.argv[2:]

        # Execute the target script
        with open(script_path, 'r') as f:
            script_code = f.read()

        # Set up globals for the script
        script_globals = {
            '__name__': '__main__',
            '__file__': os.path.abspath(script_path),
            'sys': sys,
        }

        # Replace sys.argv with the script's arguments
        sys.argv = [script_path] + script_args

        # Execute the script
        exec(compile(script_code, script_path, 'exec'), script_globals)

if __name__ == '__main__':
    main()
