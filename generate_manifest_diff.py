import os
import json

def generate_manifest(root_dir, ignored_dirs=None):
    if ignored_dirs is None:
        ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build']
    
    files_to_upload = []
    
    # Files to EXCLUDE from files list (we'll handle them differently)
    excluded_files = ['vite.config.js'] # We'll diff vite.config.ts instead
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored dirs
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        
        for filename in filenames:
            if filename.startswith('.'):
                continue
            
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            if rel_path in excluded_files:
                continue
            
            try:
                # Check if it's text
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    files_to_upload.append({
                        "filename": rel_path,
                        "content": content
                    })
            except (UnicodeDecodeError, PermissionError):
                # Probably binary
                pass
                
    return files_to_upload

def get_vite_diff():
    # Read our local vite.config.js content
    with open('vite.config.js', 'r', encoding='utf-8') as f:
        my_config = f.read()
    
    baseline_config = """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        rollupOptions: {
            maxParallelFileOps: 128,
        },
    },
});"""

    return {
        "filename": "vite.config.ts",
        "diffs": [
            {
                "from": baseline_config,
                "to": my_config
            }
        ]
    }

if __name__ == "__main__":
    files = generate_manifest('.')
    # Add the diff for vite.config.ts
    files.append(get_vite_diff())
    
    manifest = {
        "files": files,
        "deletePaths": [
            "src/main.tsx",
            "src/App.tsx",
            "vite.config.js" # Just in case it's in baseline (unlikely)
        ]
    }
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created.")
