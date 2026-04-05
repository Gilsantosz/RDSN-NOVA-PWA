import os
import json
import base64

def generate_manifest(root_dir, ignored_dirs=None):
    if ignored_dirs is None:
        ignored_dirs = ['.git', 'node_modules', '.gemini', 'dist', 'release', 'backups', 'build']
    
    files_to_upload = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored dirs
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs and not d.startswith('.')]
        
        for filename in filenames:
            if filename.startswith('.'):
                continue
            
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
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

def get_delete_paths():
    # Files from the react-vite baseline that we don't want because we use .js/.jsx
    return [
        "vite.config.ts",
        "src/main.tsx",
        "src/App.tsx"
    ]

if __name__ == "__main__":
    manifest = {
        "files": generate_manifest('.'),
        "deletePaths": get_delete_paths()
    }
    with open('manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("Manifest created with", len(manifest['files']), "files and", len(manifest['deletePaths']), "deletions.")
