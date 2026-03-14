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

    const { letra_produto, ano, setor_id, numero_inicial, numero_final, reserva_id, motivo } = await req.json();

    if (!letra_produto || !ano || !setor_id || !numero_inicial || !numero_final) {
      return buildCorsResponse({
        error: 'Parâmetros obrigatórios: letra_produto, ano, setor_id, numero_inicial, numero_final'
      }, { status: 400 });
    }

    // Criar bloqueio com expiração de 24 horas
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24);

    const bloqueio = await rdsn.asServiceRole.entities.BloqueioIntervalo.create({
      letra_produto,
      ano,
      setor_id,
      numero_inicial,
      numero_final,
      usuario_id: user.id,
      reserva_id,
      motivo: motivo || 'Bloqueio automático de intervalo alocado',
      expira_em: expiraEm.toISOString()
    });

    return buildCorsResponse({
      success: true,
      bloqueio_id: bloqueio.id,
      expira_em: expiraEm.toISOString(),
      mensagem: 'Intervalo bloqueado com sucesso por 24 horas'
    });

  } catch (error) {
    console.error('Erro ao bloquear intervalo:', error);
    return buildCorsResponse({
      error: error.message || 'Erro ao bloquear intervalo'
    }, { status: 500 });
  }
});