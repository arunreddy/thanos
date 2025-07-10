#!/usr/bin/env python3
"""
Repository File Combiner/Splitter
Combines multiple files into a single file and can split them back.
Supports text compression and binary file encoding.
"""

import os
import argparse
import hashlib
import zlib
import base64
import glob
import stat
import re
from datetime import datetime
from pathlib import Path
import json
import sys


# Default configuration embedded in the script
DEFAULT_CONFIG = {
    "paths": [
        "*.py",
        "*.md",
        "*.yml",
        "*.yaml",
        "*.json",
        "*.toml",
        "*.sh",
        "Dockerfile",
        "eddi-chatbot-api/**/*.py",
        "eddi-chatbot-nlu/**/*.py",
        "eddi-chatbot-nlu/**/*.yml",
        "eddi-chatbot-nlu/**/*.yaml",
        "eddi-chatbot-web/src/**/*.ts",
        "eddi-chatbot-web/src/**/*.tsx",
        "eddi-chatbot-web/src/**/*.js",
        "eddi-chatbot-web/src/**/*.jsx",
        "eddi-chatbot-web/*.json",
        "eddi-chatbot-web/*.ts",
        "eddi-chatbot-web/*.js",
        "scripts/**/*.sh",
        "docs/**/*.md"
    ],
    "exclude": [
        "repo.py",
        "config.json",
        "docker-compose.yml",
        "Dockerfile",
        "*.pyc",
        "__pycache__/*",
        ".git/*",
        "*.log",
        "*.tar.gz",
        "venv/*",
        ".venv/*",
        "node_modules/*",
        "dist/*",
        "build/*",
        "htmlcov/*",
        "models/*.tar.gz",
        "uv.lock",
        "pnpm-lock.yaml",
        "package-lock.json",
        "*.egg-info/*",
        ".pytest_cache/*",
        ".coverage",
        "coverage.xml",
        "*.swp",
        "*.swo",
        "*~",
        ".DS_Store",
        "Thumbs.db",
        ".env",
        ".env.local",
        ".env.development.local",
        ".env.test.local",
        ".env.production.local",
        "*.sqlite",
        "*.sqlite3",
        "*.db"
    ]
}


class RepoCombinerSplitter:
    def __init__(self, config_file='config.json', compress=True):
        self.config_file = config_file
        self.compress = compress
        self.delimiter = "=" * 40  # Shorter delimiter
        self.file_marker = "=F:{path}"  # Compact file marker
        self.metadata_marker = "=M:"  # Compact metadata marker
        self.content_marker = "=C:"  # Compact content marker
        self.end_marker = "=E"  # Compact end marker
        
    
    def normalize_line_endings(self, content):
        """Normalize line endings to LF (Unix style) for consistent handling."""
        # Replace CRLF with LF, then CR with LF
        return content.replace('\r\n', '\n').replace('\r', '\n')
        
    def combine_chatbot_components(self):
        """Combine chatbot components into three separate files."""
        components = {
            'eddi-chatbot-api': {
                'paths': ['eddi-chatbot-api/*.py', 'eddi-chatbot-api/**/*.py', 'eddi-chatbot-api/pyproject.toml'],
                'exclude': ['*.pyc', '__pycache__/*', '*.log', 'htmlcov/*', 'uv.lock', '.venv/*'],
                'output': 'chatbot-api-combined.txt'
            },
            'eddi-chatbot-nlu': {
                'paths': ['eddi-chatbot-nlu/*.py', 'eddi-chatbot-nlu/**/*.py', 'eddi-chatbot-nlu/**/*.yml', 'eddi-chatbot-nlu/**/*.yaml', 'eddi-chatbot-nlu/pyproject.toml'],
                'exclude': ['*.pyc', '__pycache__/*', '*.log', '*.tar.gz', 'models/*.tar.gz', 'uv.lock', '.venv/*'],
                'output': 'chatbot-nlu-combined.txt'
            },
            'eddi-chatbot-web': {
                'paths': ['eddi-chatbot-web/src/**/*.ts', 'eddi-chatbot-web/src/**/*.tsx', 'eddi-chatbot-web/src/**/*.js', 'eddi-chatbot-web/src/**/*.jsx', 'eddi-chatbot-web/*.json', 'eddi-chatbot-web/*.ts', 'eddi-chatbot-web/*.js'],
                'exclude': ['node_modules/*', 'dist/*', '*.log', 'pnpm-lock.yaml'],
                'output': 'chatbot-web-combined.txt'
            }
        }
        
        for component_name, config in components.items():
            print(f"\nProcessing {component_name}...")
            self.combine_files_with_config(config['paths'], config['exclude'], config['output'])
    
    def combine_files_with_config(self, paths, exclude_patterns, output_file):
        """Combine files with specific paths and exclusions."""
        # Expand paths
        all_files = self.expand_paths(paths)
        
        # Apply exclusions
        filtered_files = []
        for file in all_files:
            excluded = False
            for pattern in exclude_patterns:
                if glob.fnmatch.fnmatch(file, pattern):
                    excluded = True
                    break
            if not excluded:
                filtered_files.append(file)
        
        print(f"Found {len(filtered_files)} files to combine")
        
        with open(output_file, 'w', encoding='utf-8') as out:
            # Write header
            out.write(f"{self.delimiter}\n")
            out.write(f"# Combined Repository Files\n")
            out.write(f"# Generated: {datetime.now().isoformat()}\n")
            out.write(f"# Total Files: {len(filtered_files)}\n")
            out.write(f"# Compression: {'Enabled' if self.compress else 'Disabled'}\n")
            out.write(f"{self.delimiter}\n\n")
            
            for file_path in filtered_files:
                try:
                    print(f"Processing: {file_path}")
                    
                    # Get metadata
                    metadata = self.get_file_metadata(file_path)
                    
                    # Read content
                    content = self.read_file_content(file_path, metadata)
                    
                    # Write to combined file (normalize path separators for cross-platform compatibility)
                    normalized_path = file_path.replace('\\', '/')
                    out.write(f"{self.delimiter}\n")
                    out.write(f"{self.file_marker.format(path=normalized_path)}\n")
                    out.write(f"{self.metadata_marker}\n")
                    out.write(f"{json.dumps(metadata, separators=(',', ':'))}\n")
                    out.write(f"{self.content_marker}\n")
                    out.write(content)
                    out.write(f"\n{self.end_marker}\n")
                    out.write(f"{self.delimiter}\n\n")
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    continue
        
        print(f"Patched {len(filtered_files)} files into {output_file}")
        
    def load_config(self):
        """Load configuration from JSON file or use default."""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    content = f.read().strip()
                    if not content:  # Empty file (like /dev/null)
                        print(f"Config file {self.config_file} is empty, using default configuration")
                        return DEFAULT_CONFIG
                    config = json.loads(content)
                return config
            except (json.JSONDecodeError, OSError):
                print(f"Error reading config file {self.config_file}, using default configuration")
                return DEFAULT_CONFIG
        else:
            print(f"Config file {self.config_file} not found, using default configuration")
            return DEFAULT_CONFIG
    
    def get_file_metadata(self, file_path):
        """Extract metadata from a file."""
        stats = os.stat(file_path)
        
        # Check if file is binary
        is_binary = self.is_binary_file(file_path)
        
        # Use short keys for better compression
        metadata = {
            's': stats.st_size,  # size
            'm': stats.st_mtime,  # modified
            'c': stats.st_ctime,  # created
            'p': stat.filemode(stats.st_mode),  # permissions
            'o': stats.st_mode,  # mode
            'b': is_binary,  # is_binary
            'z': self.compress,  # compressed
            'e': 'utf-8' if not is_binary else 'base64'  # encoding
        }
        
        # Calculate checksum
        with open(file_path, 'rb') as f:
            metadata['h'] = hashlib.sha256(f.read()).hexdigest()  # hash
            
        return metadata
    
    def is_binary_file(self, file_path):
        """Check if a file is binary."""
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(512)
                if b'\x00' in chunk:  # Null bytes indicate binary
                    return True
                
            # Try to decode as text
            with open(file_path, 'r', encoding='utf-8') as f:
                f.read()
            return False
        except (UnicodeDecodeError, PermissionError):
            return True
    
    def read_file_content(self, file_path, metadata):
        """Read file content and optionally compress it."""
        if metadata['b']:  # is_binary
            with open(file_path, 'rb') as f:
                content = f.read()
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Normalize line endings for cross-platform compatibility
            content = self.normalize_line_endings(content)
            # Convert to bytes for consistent handling
            content = content.encode('utf-8')
        
        # Always use base64 encoding for everything
        if self.compress:
            # Compress with zlib first, then base64 encode
            compressed = zlib.compress(content)
            content = base64.b64encode(compressed).decode('ascii')
        else:
            # Just base64 encode without compression
            content = base64.b64encode(content).decode('ascii')
            
        return content
    
    def write_file_content(self, content, file_path, metadata):
        """Write content back to file, decompressing if needed."""
        # Handle both old and new metadata key formats
        is_compressed = metadata.get('z', metadata.get('compressed', False))
        is_binary = metadata.get('b', metadata.get('is_binary', False))
        file_mode = metadata.get('o', metadata.get('mode', None))
        
        try:
            # Decode base64 first
            decoded_content = base64.b64decode(content.encode('ascii'))
            
            # Decompress if needed
            if is_compressed:
                decoded_content = zlib.decompress(decoded_content)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Write content
            if is_binary:
                # Write binary content directly
                with open(file_path, 'wb') as f:
                    f.write(decoded_content)
            else:
                # Decode to text and write
                text_content = decoded_content.decode('utf-8')
                with open(file_path, 'w', encoding='utf-8', newline='') as f:
                    f.write(text_content)
            
            # Restore file permissions if available
            if file_mode:
                try:
                    os.chmod(file_path, file_mode)
                except:
                    pass  # Ignore permission errors
                    
        except Exception as e:
            print(f"Error decompressing content: {e}")
            raise
    
    def expand_paths(self, paths):
        """Expand glob patterns and return list of files."""
        all_files = []
        
        for path in paths:
            if '*' in path or '?' in path or '[' in path:
                # It's a glob pattern
                matches = glob.glob(path, recursive=True)
                all_files.extend(matches)
            elif os.path.isdir(path):
                # It's a directory, get all files recursively
                for root, _, files in os.walk(path):
                    for file in files:
                        all_files.append(os.path.join(root, file))
            elif os.path.isfile(path):
                # It's a single file
                all_files.append(path)
            else:
                print(f"Warning: Path not found: {path}")
        
        # Remove duplicates and sort
        all_files = sorted(list(set(all_files)))
        return all_files
    
    def patch_files(self, output_file='patch.txt'):
        """Patch multiple files into a single file."""
        config = self.load_config()
        paths = config.get('paths', [])
        exclude_patterns = config.get('exclude', [])
        
        if not paths:
            print("No paths specified in config file")
            return
        
        # Expand paths
        all_files = self.expand_paths(paths)
        
        # Apply exclusions
        filtered_files = []
        for file in all_files:
            excluded = False
            for pattern in exclude_patterns:
                if glob.fnmatch.fnmatch(file, pattern):
                    excluded = True
                    break
            if not excluded:
                filtered_files.append(file)
        
        print(f"Found {len(filtered_files)} files to combine")
        
        with open(output_file, 'w', encoding='utf-8') as out:
            # Write header
            out.write(f"{self.delimiter}\n")
            out.write(f"# Combined Repository Files\n")
            out.write(f"# Generated: {datetime.now().isoformat()}\n")
            out.write(f"# Total Files: {len(filtered_files)}\n")
            out.write(f"# Compression: {'Enabled' if self.compress else 'Disabled'}\n")
            out.write(f"{self.delimiter}\n\n")
            
            for file_path in filtered_files:
                try:
                    print(f"Processing: {file_path}")
                    
                    # Get metadata
                    metadata = self.get_file_metadata(file_path)
                    
                    # Read content
                    content = self.read_file_content(file_path, metadata)
                    
                    # Write to combined file (normalize path separators for cross-platform compatibility)
                    normalized_path = file_path.replace('\\', '/')
                    out.write(f"{self.delimiter}\n")
                    out.write(f"{self.file_marker.format(path=normalized_path)}\n")
                    out.write(f"{self.metadata_marker}\n")
                    out.write(f"{json.dumps(metadata, separators=(',', ':'))}\n")
                    out.write(f"{self.content_marker}\n")
                    out.write(content)
                    out.write(f"\n{self.end_marker}\n")
                    out.write(f"{self.delimiter}\n\n")
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    continue
        
        print(f"Patched {len(filtered_files)} files into {output_file}")
    
    def merge_files(self, input_file='patch.txt', output_dir='.'):
        """Merge a patched file back into individual files."""
        if not os.path.exists(input_file):
            print(f"Input file not found: {input_file}")
            return
        
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        i = 0
        files_processed = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Look for file marker (handle both old and new formats)
            if line.startswith("=F:") or line.startswith("### FILE:"):
                if line.startswith("=F:"):
                    file_path = line[len("=F:"):].strip()
                else:
                    file_path = line[len("### FILE:"):].strip()
                # Normalize path separators for current OS
                file_path = file_path.replace('\\', os.sep).replace('/', os.sep)
                metadata = {}
                content_lines = []
                
                # Skip to metadata
                i += 1
                while i < len(lines) and not (lines[i].strip().startswith(self.metadata_marker) or lines[i].strip().startswith("### METADATA:")):
                    i += 1
                
                # Read metadata
                if i < len(lines) and (lines[i].strip().startswith(self.metadata_marker) or lines[i].strip().startswith("### METADATA:")):
                    i += 1
                    metadata_str = ""
                    while i < len(lines) and not (lines[i].strip().startswith(self.content_marker) or lines[i].strip().startswith("### CONTENT:")):
                        metadata_str += lines[i]
                        i += 1
                    
                    try:
                        metadata = json.loads(metadata_str)
                    except json.JSONDecodeError as e:
                        print(f"Error parsing metadata for {file_path}: {e}")
                        metadata = {}
                
                # Read content
                if i < len(lines) and (lines[i].strip().startswith(self.content_marker) or lines[i].strip().startswith("### CONTENT:")):
                    i += 1
                    while i < len(lines) and not (lines[i].strip().startswith(self.end_marker) or lines[i].strip().startswith("### END_FILE")):
                        content_lines.append(lines[i])
                        i += 1
                
                # Process the file
                if file_path and content_lines:
                    content = ''.join(content_lines).strip()
                    
                    # Adjust path if output directory is specified
                    if output_dir != '.':
                        file_path = os.path.join(output_dir, file_path)
                    
                    try:
                        self.write_file_content(content, file_path, metadata)
                        
                        # Verify checksum if available
                        checksum = metadata.get('h', metadata.get('checksum', None))
                        if checksum:
                            new_metadata = self.get_file_metadata(file_path)
                            new_checksum = new_metadata.get('h', new_metadata.get('checksum', None))
                            if new_checksum == checksum:
                                print(f"✓ Restored: {file_path} (checksum verified)")
                            else:
                                print(f"⚠ Restored: {file_path} (checksum mismatch!)")
                        else:
                            print(f"✓ Restored: {file_path}")
                        
                        files_processed += 1
                        
                    except Exception as e:
                        print(f"Error restoring {file_path}: {e}")
            
            i += 1
        
        print(f"\nMerged {files_processed} files")


def main():
    parser = argparse.ArgumentParser(description='Patch and merge repository files')
    parser.add_argument('command', choices=['patch', 'merge', 'chatbot'], 
                        help='Command to execute')
    parser.add_argument('-c', '--config', default='config.json',
                        help='Configuration file (default: config.json)')
    parser.add_argument('-o', '--output', default=None,
                        help='Output file for patch or directory for merge')
    parser.add_argument('-i', '--input', default='patch.txt',
                        help='Input file for merge command (default: patch.txt)')
    parser.add_argument('--no-compress', action='store_true',
                        help='Disable compression')
    parser.add_argument('--create-config', action='store_true',
                        help='Create a sample configuration file')
    
    args = parser.parse_args()
    
    # Create sample config if requested
    if args.create_config:
        with open('config.json', 'w') as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        
        print("Created config.json with default configuration")
        return
    
    # Initialize combiner/splitter
    rcs = RepoCombinerSplitter(config_file=args.config, compress=not args.no_compress)
    
    if args.command == 'patch':
        output_file = args.output or 'patch.txt'
        rcs.patch_files(output_file)
    
    elif args.command == 'merge':
        output_dir = args.output or '.'
        rcs.merge_files(args.input, output_dir)
    
    elif args.command == 'chatbot':
        rcs.combine_chatbot_components()


if __name__ == '__main__':
    main()