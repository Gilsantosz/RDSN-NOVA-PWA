import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();

    if (user?.role !== 'admin') {
      return buildCorsResponse({ error: 'Não autorizado - apenas admins' }, { status: 403 });
    }

    const { confirmar_codigo } = await req.json();

    // Exigir código de confirmação para evitar acidentes
    if (confirmar_codigo !== 'REDEFINIR-SISTEMA') {
      return buildCorsResponse({ 
        error: 'Código de confirmação inválido. Digite REDEFINIR-SISTEMA para confirmar.',
        requer_confirmacao: true
      }, { status: 400 });
    }

    console.log('[Redefinir] Iniciando limpeza de dados transacionais...');
    console.log('[Redefinir] Executado por:', user.email);

    // Primeiro, fazer backup antes de limpar
    console.log('[Redefinir] Executando backup de segurança...');
    try {
      await rdsn.functions.invoke('backupDados', {});
      console.log('[Redefinir] Backup de segurança realizado com sucesso');
    } catch (backupErr) {
      console.error('[Redefinir] Erro no backup de segurança:', backupErr.message);
      // Continuar mesmo com erro no backup
    }

    // Entidades transacionais que devem ser limpas
    const entidadesTransacionais = [
      'ReservaLote',
      'BaixaLote',
      'SequenciaAnual',
      'NumeracaoLivre',
      'BloqueioIntervalo',
      'MovimentacaoEstoque',
      'Auditoria',
      'Alerta',
      'Notificacao',
      'ProducaoDia',
      'ProducaoDiaLote',
      'PCPOrdemProducao',
      'PCPProducaoDiaria',
      'PCPSimulacao',
      'BackupHistorico',
      'HistoricoAuditoria',
      'AuditoriaUsuarios',
      'Etiqueta',
      'LogIntegracao'
    ];

    const resultados = {};
    let totalRemovido = 0;

    for (const entidade of entidadesTransacionais) {
      try {
        const registros = await rdsn.asServiceRole.entities[entidade].list();
        
        if (registros.length === 0) {
          resultados[entidade] = { removidos: 0 };
          continue;
        }

        for (const reg of registros) {
          await rdsn.asServiceRole.entities[entidade].delete(reg.id);
        }

        resultados[entidade] = { removidos: registros.length };
        totalRemovido += registros.length;
        console.log(`[Redefinir] ${entidade}: ${registros.length} registros removidos`);
      } catch (err) {
        console.error(`[Redefinir] Erro ao limpar ${entidade}:`, err.message);
        resultados[entidade] = { removidos: 0, erro: err.message };
      }
    }

    console.log(`[Redefinir] Concluído: ${totalRemovido} registros removidos`);
    console.log('[Redefinir] Dados mantidos: Clientes, Produtos, Setores, Clientes PCP');

    return buildCorsResponse({
      sucesso: true,
      mensagem: `Sistema redefinido: ${totalRemovido} registros transacionais removidos. Clientes, Produtos, Setores e Clientes PCP mantidos.`,
      total_removido: totalRemovido,
      detalhes: resultados,
      dados_mantidos: ['Clientes', 'Produtos', 'Setores', 'Clientes PCP']
    });

  } catch (error) {
    console.error('[Redefinir] Erro:', error.message);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});