import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();

    if (!user || user.role !== 'admin') {
      return buildCorsResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      usuario_afetado_id,
      usuario_afetado_nome,
      tipo_acao,
      descricao,
      dados_antes,
      dados_depois
    } = payload;

    const auditoria = await rdsn.asServiceRole.entities.AuditoriaUsuarios.create({
      usuario_admin_id: user.id,
      usuario_admin_nome: user.full_name,
      usuario_afetado_id,
      usuario_afetado_nome,
      tipo_acao,
      descricao,
      dados_antes: dados_antes ? JSON.stringify(dados_antes) : null,
      dados_depois: dados_depois ? JSON.stringify(dados_depois) : null,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    });

    return buildCorsResponse({ success: true, auditoria });
  } catch (error) {
    console.error('Error registering audit:', error);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});