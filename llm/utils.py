"""
Shared utilities for DSPy optimization and evaluation modules.

This module contains shared functions that are used by both evaluation and optimization
modules to avoid circular import dependencies.
"""

import json
import os
import tempfile
import shutil
from pathlib import Path
from typing import Any


def atomic_write_json(file_path: Path, data: Any) -> None:
    """
    Atomically write JSON data to file using temporary file + move.
    
    Args:
        file_path: Target file path
        data: Data to write as JSON
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create temporary file in same directory to ensure same filesystem
    temp_fd, temp_path = tempfile.mkstemp(
        suffix='.json.tmp',
        dir=file_path.parent,
        prefix=f'{file_path.stem}_'
    )
    
    try:
        with os.fdopen(temp_fd, 'w') as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())  # Ensure data is written to disk
        
        # Atomic move to final location
        shutil.move(temp_path, file_path)
        
    except Exception as e:
        # Clean up temporary file on error
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise e


def atomic_write_text(file_path: Path, content: str) -> None:
    """
    Atomically write text content to file using temporary file + move.
    
    Args:
        file_path: Target file path
        content: Text content to write
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Create temporary file in same directory to ensure same filesystem
    temp_fd, temp_path = tempfile.mkstemp(
        suffix='.txt.tmp',
        dir=file_path.parent,
        prefix=f'{file_path.stem}_'
    )
    
    try:
        with os.fdopen(temp_fd, 'w') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())  # Ensure data is written to disk
        
        # Atomic move to final location
        shutil.move(temp_path, file_path)
        
    except Exception as e:
        # Clean up temporary file on error
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise e