import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();

    if (!user) {
      return buildCorsResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const role = url.searchParams.get('role') || user.role_custom;

    const permissoes = await rdsn.asServiceRole.entities.PermissaoRole.filter({
      role
    });

    if (permissoes.length === 0) {
      return buildCorsResponse({ error: 'Permissões não encontradas para este role' }, { status: 404 });
    }

    return buildCorsResponse({ permissoes: permissoes[0] });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});