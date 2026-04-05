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
    tailwindcss: { garden: {} },
    autoprefixer: {},
  },
}
""" # Note: template had tailwindcss: {} but I might have added something. Wait, baseline check.
}
# Correction: get_app_template had tailwindcss: {}
TEMPLATE_BASELINES["postcss.config.js"] = """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"""

def generate_manifest(root_dir):
    ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build', 'functions']
    files_to_upload = []
    delete_paths = []
    
    excluded_files = ['manifest.json', 'vite.config.js'] # vite.config.js becomes .ts
    for i in range(1, 11):
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
                    if target_path.endswith('.jsx'):
                        delete_paths.append(target_path)
                        target_path = target_path[:-4] + '.tsx'
                    elif target_path.endswith('.js'):
                        delete_paths.append(target_path)
                        target_path = target_path[:-3] + '.ts'
                    
                    # Special handling for vite.config.js -> vite.config.ts
                    if rel_path == 'vite.config.js': # though we skip it in excluded_files
                        pass # handled below

                    if target_path in TEMPLATE_BASELINES:
                        files_to_upload.append({
                            "filename": target_path,
                            "diffs": [{"from": TEMPLATE_BASELINES[target_path], "to": content}]
                        })
                    else:
                        files_to_upload.append({"filename": target_path, "content": content})
                        
            except (UnicodeDecodeError, PermissionError):
                pass
    
    # Handle vite.config.ts if not yet added
    local_vite_path = os.path.join(root_dir, 'vite.config.js')
    if os.path.exists(local_vite_path):
        with open(local_vite_path, 'r', encoding='utf-8') as f:
            local_vite_content = f.read()
            files_to_upload.append({
                "filename": "vite.config.ts",
                "diffs": [{"from": TEMPLATE_BASELINES["vite.config.ts"], "to": local_vite_content}]
            })

    # Add template files that we are REPLACING to the upload list if they weren't in the local file system
    # but we want to change them.
    # Actually, all relevant ones should be covered.

    return files_to_upload, delete_paths

if __name__ == "__main__":
    files, deletes = generate_manifest('.')
    manifest = {
        "files": files,
        "deletePaths": deletes
    }
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created.")
