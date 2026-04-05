import os
import json

def generate_manifest(root_dir):
    ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build', 'functions']
    files_to_upload = []
    delete_paths = []
    
    excluded_files = ['manifest.json', 'generate_manifest.py', 'generate_manifest_diff.py', 'generate_manifest_mapped.py', 'generate_manifest_full_ts.py', 'generate_manifest_final.py', 'generate_manifest_v5.py', 'generate_manifest_v6.py', 'generate_manifest_v7.py', 'generate_manifest_final_final.py']
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        for filename in filenames:
            if filename.startswith('.') and 'src/' not in dirpath:
                continue
                
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            if rel_path in excluded_files: continue
            if rel_path == 'vite.config.js': continue
            
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
                    
                    files_to_upload.append({"filename": target_path, "content": content})
            except (UnicodeDecodeError, PermissionError):
                pass
    
    # Add files from the error list specifically
    extra_deletes = [
        "tailwind.config.js", "main.js", "test_reserva_datas.js", "eslint.config.js", "postcss.config.js",
        "src/Layout.jsx", "main.tsx" # wait, error said main.js vs main.ts
    ]
    for d in extra_deletes:
        if d not in delete_paths: delete_paths.append(d)

    return files_to_upload, delete_paths

if __name__ == "__main__":
    files, deletes = generate_manifest('.')
    
    # Use content for vite.config.ts to avoid diff match errors
    with open('vite.config.js', 'r', encoding='utf-8') as f:
        files.append({"filename": "vite.config.ts", "content": f.read()})
    
    manifest = {
        "files": files,
        "deletePaths": deletes
    }
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created.")
