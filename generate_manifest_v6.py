import os
import json

def generate_manifest(root_dir):
    ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build', 'functions']
    files_to_upload = []
    
    excluded_files = ['vite.config.js', 'manifest.json', 'generate_manifest.py', 'generate_manifest_diff.py', 'generate_manifest_mapped.py', 'generate_manifest_full_ts.py', 'generate_manifest_final.py', 'generate_manifest_v5.py']
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        for filename in filenames:
            if filename.startswith('.'): continue
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            if rel_path in excluded_files: continue
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    files_to_upload.append({"filename": rel_path, "content": content})
            except (UnicodeDecodeError, PermissionError):
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
        "diffs": [{"from": baseline_config, "to": my_config}]
    }

if __name__ == "__main__":
    files = generate_manifest('.')
    files.append(get_vite_diff())
    manifest = {"files": files}
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created.")
