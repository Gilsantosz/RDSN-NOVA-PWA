const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, 'functions');
const files = fs.readdirSync(functionsDir);

for (const file of files) {
    if (file.endsWith('.ts') && file !== 'supabase-shim.ts' && file !== 'cors.ts' && file !== 'patch-functions.cjs') {
        const filePath = path.join(functionsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Make sure we have the imports
        if (!content.includes('import { handleCors, buildCorsResponse } from \'./cors.ts\';')) {
            content = `import { handleCors, buildCorsResponse } from './cors.ts';\n` + content;
        }

        // Insert handleCors at the start of Deno.serve block if not present
        const serveRegex = /(Deno\.serve\(async\s*\(\s*req[\s\S]*?\)\s*=>\s*\{)(?:\s*try\s*\{)?/;
        if (!content.includes('const corsHandler = handleCors(req);')) {
            content = content.replace(serveRegex, (match) => {
                return match + `\n  const corsHandler = handleCors(req);\n  if (corsHandler) return corsHandler;\n`;
            });
        }

        // Replace Response.json with buildCorsResponse globally
        content = content.replace(/Response\.json\(([\s\S]*?)\}/g, (match) => {
            // Simple replace to respect options map without breaking standard response logic manually
            return match;
        });

        // Instead a generic global regex for Response building:
        content = content.replace(/return Response\.json\((.*?)(,\s*\{(.*?)\})?\);/gs, (match, body, x, options) => {
            if (options) {
                return `return buildCorsResponse(${body}, {${options}});`;
            }
            return `return buildCorsResponse(${body});`;
        });

        fs.writeFileSync(filePath, content);
    }
}
console.log('Automated CORS patching completed successfully across all Edge Functions.');
