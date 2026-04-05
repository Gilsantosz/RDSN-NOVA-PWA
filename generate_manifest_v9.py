import os
import json

TEMPLATE_VITE_CONFIG = """import { defineConfig } from 'vite';
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
"""

def generate_manifest(root_dir):
    ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build', 'functions']
    files_to_upload = []
    delete_paths = []
    
    # Files from baseline that we want to replace/delete if they conflict
    baseline_files = ["tailwind.config.js", "postcss.config.js", "eslint.config.js", "src/App.tsx", "src/main.tsx"]
    
    excluded_files = ['manifest.json', 'vite.config.js'] # handled separately
    # Avoid including the generator scripts themselves
    for i in range(1, 10):
        excluded_files.append(f'generate_manifest_v{i}.py')
    excluded_files.extend(['generate_manifest.py', 'generate_manifest_diff.py', 'generate_manifest_mapped.py', 'generate_manifest_full_ts.py', 'generate_manifest_final.py', 'generate_manifest_final_final.py'])

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prevent wandering into ignored dirs
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        
        for filename in filenames:
            # Skip dotfiles at root, but keep those in src (like .secure_vault.ts)
            if filename.startswith('.') and 'src/' not in dirpath:
                continue
                
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            if rel_path in excluded_files:
                continue
            
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
                    
                    # If the file is in our local src and matches a baseline file, we use content
                    # AppDeploy will overwrite the baseline one if the name matches.
                    # But if the extension changed (e.g. App.tsx is already there), we might just be updating it.
                    
                    files_to_upload.append({"filename": target_path, "content": content})
            except (UnicodeDecodeError, PermissionError):
                pass
    
    # Specially handle vite.config.ts with diffs
    local_vite_path = os.path.join(root_dir, 'vite.config.js')
    if os.path.exists(local_vite_path):
        with open(local_vite_path, 'r', encoding='utf-8') as f:
            local_vite_content = f.read()
            files_to_upload.append({
                "filename": "vite.config.ts",
                "diffs": [{"from": TEMPLATE_VITE_CONFIG, "to": local_vite_content}]
            })

    # Cleanup extra stems from error list
    extra_deletes = ["main.js", "test_reserva_datas.js"]
    for d in extra_deletes:
        if d not in delete_paths: delete_paths.append(d)

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
