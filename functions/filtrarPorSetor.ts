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

    const body = await req.json();
    const { entidade, setorAtivo, isAdmin } = body;

    if (!entidade) {
      return buildCorsResponse({ error: 'Entidade não especificada' }, { status: 400 });
    }

    // Admins podem ver tudo
    if (isAdmin) {
      const todos = await rdsn.asServiceRole.entities[entidade].list();
      return buildCorsResponse({ data: todos });
    }

    // Usuários comuns: apenas seu setor
    if (!setorAtivo) {
      return buildCorsResponse({ data: [] });
    }

    // Filtrar por setor_id
    const dados = await rdsn.asServiceRole.entities[entidade].filter({ setor_id: setorAtivo });
    
    return buildCorsResponse({ data: dados });
  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});