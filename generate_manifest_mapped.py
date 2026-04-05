import os
import json

def generate_manifest(root_dir, ignored_dirs=None):
    if ignored_dirs is None:
        ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build']
    
    files_to_upload = []
    
    # Mapping for new app baseline
    mapping = {
        'vite.config.js': 'vite.config.ts',
        'src/main.jsx': 'src/main.tsx',
        'src/App.jsx': 'src/App.tsx'
    }
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored dirs
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        
        for filename in filenames:
            if filename.startswith('.'):
                continue
            
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            target_path = mapping.get(rel_path, rel_path)
            
            try:
                # Check if it's text
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    if target_path == 'vite.config.ts':
                        # Special handling for vite.config.ts (must be a diff for new app too?)
                        # Actually, let's see if we can just NOT send it in files if we use diffs
                        continue
                    
                    files_to_upload.append({
                        "filename": target_path,
                        "content": content
                    })
            except (UnicodeDecodeError, PermissionError):
                # Probably binary
                pass
                
    return files_to_upload

def get_vite_diff():
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
        "files": files
        # No deletePaths for new app
    }
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created.")
