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
from datetime import datetime
from pathlib import Path
import json
import sys


class RepoCombinerSplitter:
    def __init__(self, config_file='config.json', compress=True):
        self.config_file = config_file
        self.compress = compress
        self.delimiter = "#" * 80
        self.file_marker = "### FILE: {path}"
        self.metadata_marker = "### METADATA:"
        self.content_marker = "### CONTENT:"
        self.end_marker = "### END_FILE"
        
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
                    
                    # Write to combined file
                    out.write(f"{self.delimiter}\n")
                    out.write(f"{self.file_marker.format(path=file_path)}\n")
                    out.write(f"{self.metadata_marker}\n")
                    out.write(f"{json.dumps(metadata, indent=2)}\n")
                    out.write(f"{self.content_marker}\n")
                    out.write(content)
                    out.write(f"\n{self.end_marker}\n")
                    out.write(f"{self.delimiter}\n\n")
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    continue
        
        print(f"Combined {len(filtered_files)} files into {output_file}")
        
    def load_config(self):
        """Load configuration from JSON file."""
        with open(self.config_file, 'r') as f:
            config = json.load(f)
        return config
    
    def get_file_metadata(self, file_path):
        """Extract metadata from a file."""
        stats = os.stat(file_path)
        
        # Check if file is binary
        is_binary = self.is_binary_file(file_path)
        
        metadata = {
            'size': stats.st_size,
            'modified': stats.st_mtime,
            'created': stats.st_ctime,
            'permissions': stat.filemode(stats.st_mode),
            'mode': stats.st_mode,
            'is_binary': is_binary,
            'compressed': self.compress,
            'encoding': 'utf-8' if not is_binary else 'base64'
        }
        
        # Calculate checksum
        with open(file_path, 'rb') as f:
            metadata['checksum'] = hashlib.sha256(f.read()).hexdigest()
            
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
        if metadata['is_binary']:
            with open(file_path, 'rb') as f:
                content = f.read()
            # Base64 encode binary content
            content = base64.b64encode(content).decode('ascii')
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        
        # Compress if requested
        if self.compress:
            if metadata['is_binary']:
                # Already base64 encoded, just compress the string
                compressed = zlib.compress(content.encode('utf-8'))
                content = base64.b64encode(compressed).decode('ascii')
            else:
                # Compress text content
                compressed = zlib.compress(content.encode('utf-8'))
                content = base64.b64encode(compressed).decode('ascii')
            
        return content
    
    def write_file_content(self, content, file_path, metadata):
        """Write content back to file, decompressing if needed."""
        # Decompress if needed
        if metadata.get('compressed', False):
            try:
                # Decode base64 and decompress
                compressed = base64.b64decode(content.encode('ascii'))
                content = zlib.decompress(compressed)
                
                if metadata.get('is_binary', False):
                    # For binary files, content is still base64 encoded after decompression
                    content = content.decode('utf-8')
                else:
                    # For text files, convert bytes to string
                    content = content.decode('utf-8')
            except Exception as e:
                print(f"Error decompressing content: {e}")
                raise
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Write content
        if metadata.get('is_binary', False):
            # Decode base64 for binary files
            binary_content = base64.b64decode(content.encode('ascii'))
            with open(file_path, 'wb') as f:
                f.write(binary_content)
        else:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        # Restore file permissions if available
        if 'mode' in metadata:
            try:
                os.chmod(file_path, metadata['mode'])
            except:
                pass  # Ignore permission errors
    
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
                for root, dirs, files in os.walk(path):
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
    
    def combine_files(self, output_file='combined.txt'):
        """Combine multiple files into a single file."""
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
                    
                    # Write to combined file
                    out.write(f"{self.delimiter}\n")
                    out.write(f"{self.file_marker.format(path=file_path)}\n")
                    out.write(f"{self.metadata_marker}\n")
                    out.write(f"{json.dumps(metadata, indent=2)}\n")
                    out.write(f"{self.content_marker}\n")
                    out.write(content)
                    out.write(f"\n{self.end_marker}\n")
                    out.write(f"{self.delimiter}\n\n")
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    continue
        
        print(f"Combined {len(filtered_files)} files into {output_file}")
    
    def split_files(self, input_file='combined.txt', output_dir='.'):
        """Split a combined file back into individual files."""
        if not os.path.exists(input_file):
            print(f"Input file not found: {input_file}")
            return
        
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        i = 0
        files_processed = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Look for file marker
            if line.startswith("### FILE:"):
                file_path = line[len("### FILE:"):].strip()
                metadata = {}
                content_lines = []
                
                # Skip to metadata
                i += 1
                while i < len(lines) and not lines[i].strip().startswith(self.metadata_marker):
                    i += 1
                
                # Read metadata
                if i < len(lines) and lines[i].strip().startswith(self.metadata_marker):
                    i += 1
                    metadata_str = ""
                    while i < len(lines) and not lines[i].strip().startswith(self.content_marker):
                        metadata_str += lines[i]
                        i += 1
                    
                    try:
                        metadata = json.loads(metadata_str)
                    except json.JSONDecodeError as e:
                        print(f"Error parsing metadata for {file_path}: {e}")
                        metadata = {}
                
                # Read content
                if i < len(lines) and lines[i].strip().startswith(self.content_marker):
                    i += 1
                    while i < len(lines) and not lines[i].strip().startswith(self.end_marker):
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
                        if 'checksum' in metadata:
                            new_metadata = self.get_file_metadata(file_path)
                            if new_metadata['checksum'] == metadata['checksum']:
                                print(f"✓ Restored: {file_path} (checksum verified)")
                            else:
                                print(f"⚠ Restored: {file_path} (checksum mismatch!)")
                        else:
                            print(f"✓ Restored: {file_path}")
                        
                        files_processed += 1
                        
                    except Exception as e:
                        print(f"Error restoring {file_path}: {e}")
            
            i += 1
        
        print(f"\nRestored {files_processed} files")


def main():
    parser = argparse.ArgumentParser(description='Combine and split repository files')
    parser.add_argument('command', choices=['combine', 'split', 'chatbot'], 
                        help='Command to execute')
    parser.add_argument('-c', '--config', default='config.json',
                        help='Configuration file (default: config.json)')
    parser.add_argument('-o', '--output', default=None,
                        help='Output file for combine or directory for split')
    parser.add_argument('-i', '--input', default='combined.txt',
                        help='Input file for split command (default: combined.txt)')
    parser.add_argument('--no-compress', action='store_true',
                        help='Disable compression')
    parser.add_argument('--create-config', action='store_true',
                        help='Create a sample configuration file')
    
    args = parser.parse_args()
    
    # Create sample config if requested
    if args.create_config:
        sample_config = {
            'paths': [
                'src/',
                'tests/',
                '*.py',
                'README.md',
                'docs/**/*.md'
            ],
            'exclude': [
                '*.pyc',
                '__pycache__/*',
                '.git/*',
                '*.log',
                'venv/*',
                'node_modules/*'
            ]
        }
        
        with open('config.json', 'w') as f:
            json.dump(sample_config, f, indent=2)
        
        print("Created sample config.json")
        return
    
    # Initialize combiner/splitter
    rcs = RepoCombinerSplitter(config_file=args.config, compress=not args.no_compress)
    
    if args.command == 'combine':
        output_file = args.output or 'combined.txt'
        rcs.combine_files(output_file)
    
    elif args.command == 'split':
        output_dir = args.output or '.'
        rcs.split_files(args.input, output_dir)
    
    elif args.command == 'chatbot':
        rcs.combine_chatbot_components()


if __name__ == '__main__':
    main()