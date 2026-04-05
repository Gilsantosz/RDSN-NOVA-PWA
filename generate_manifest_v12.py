import os
import json

TEMPLATE_BASELINES = {
    "vite.config.ts": """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        rollupOptions: {
            maxParallelFileOps: 128,
        },
    },
});
""",
    "src/App.tsx": """import { useState } from 'react';

function App() {
    return <div className=\"app\">APP_CONTENT</div>;
}

export default App;
""",
    "src/main.tsx": """import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
""",
    "src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

/* STYLES */
""",
    "tailwind.config.js": """/** @type {import('tailwindcss').Config} */
export default {
  content: [\"./index.html\",\"./src/**/*.{js,ts,jsx,tsx}\"],
  theme: { extend: {} },
  plugins: [],
}
""",
    "postcss.config.js": """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"""
}

# Explicitly keep these as .js if they exist locally
ROOT_CONFIGS = ["tailwind.config.js", "postcss.config.js", "eslint.config.js"]

def generate_manifest(root_dir):
    ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build', 'functions']
    files_to_upload = []
    
    excluded_files = ['manifest.json', 'vite.config.js']
    for i in range(1, 13):
        excluded_files.append(f'generate_manifest_v{i}.py')
    excluded_files.extend(['generate_manifest.py', 'generate_manifest_diff.py', 'generate_manifest_mapped.py', 'generate_manifest_full_ts.py', 'generate_manifest_final.py', 'generate_manifest_final_final.py'])

    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        for filename in filenames:
            if filename.startswith('.') and 'src/' not in dirpath:
                continue
                
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            if rel_path in excluded_files: continue
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    target_path = rel_path
                    
                    # Only map if NOT a root config
                    if rel_path not in ROOT_CONFIGS:
                        if target_path.endswith('.jsx'):
                            target_path = target_path[:-4] + '.tsx'
                        elif target_path.endswith('.js'):
                            target_path = target_path[:-3] + '.ts'
                    
                    if target_path in TEMPLATE_BASELINES:
                        files_to_upload.append({
                            "filename": target_path,
                            "diffs": [{"from": TEMPLATE_BASELINES[target_path], "to": content}]
                        })
                    else:
                        files_to_upload.append({"filename": target_path, "content": content})
                        
            except (UnicodeDecodeError, PermissionError):
                pass
    
    # Handle vite.config.ts
    local_vite_path = os.path.join(root_dir, 'vite.config.js')
    if os.path.exists(local_vite_path):
        with open(local_vite_path, 'r', encoding='utf-8') as f:
            local_vite_content = f.read()
            files_to_upload.append({
                "filename": "vite.config.ts",
                "diffs": [{"from": TEMPLATE_BASELINES["vite.config.ts"], "to": local_vite_content}]
            })

    return files_to_upload

if __name__ == "__main__":
    files = generate_manifest('.')
    manifest = {
        "files": files,
        "deletePaths": []
    }
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created.")
