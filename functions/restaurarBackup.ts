import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();

    if (user?.role !== 'admin') {
      return buildCorsResponse({ error: 'Não autorizado' }, { status: 403 });
    }

    const { arquivo_url, entidades_para_restaurar } = await req.json();

    if (!arquivo_url) {
      return buildCorsResponse({ error: 'URL do arquivo de backup é obrigatória' }, { status: 400 });
    }

    console.log('[Restaurar Backup] Baixando arquivo:', arquivo_url);

    // Baixar o arquivo de backup
    const response = await fetch(arquivo_url);
    if (!response.ok) {
      return buildCorsResponse({ error: 'Não foi possível acessar o arquivo de backup' }, { status: 400 });
    }

    const backup = await response.json();

    if (!backup.dados) {
      return buildCorsResponse({ error: 'Arquivo de backup inválido - sem dados' }, { status: 400 });
    }

    console.log('[Restaurar Backup] Backup encontrado:', backup.data_backup, 'Versão:', backup.versao);

    // Mapear nomes do backup para nomes de entidade
    const mapeamento = {
      reservas: 'ReservaLote',
      baixas: 'BaixaLote',
      sequencias: 'SequenciaAnual',
      numeracoes: 'NumeracaoLivre',
      bloqueios: 'BloqueioIntervalo',
      movimentacoes: 'MovimentacaoEstoque',
      auditorias: 'Auditoria',
      alertas: 'Alerta',
      notificacoes: 'Notificacao',
      producao_dia: 'ProducaoDia',
      producao_dia_lotes: 'ProducaoDiaLote',
      // Dados mestres (não restaurados por padrão)
      produtos: 'Produto',
      clientes: 'Cliente',
      setores: 'Setor',
    };

    // Entidades transacionais para restaurar por padrão
    const transacionais = [
      'reservas', 'baixas', 'sequencias', 'numeracoes', 'bloqueios',
      'movimentacoes', 'auditorias', 'alertas', 'notificacoes',
      'producao_dia', 'producao_dia_lotes'
    ];

    const entidadesAlvo = entidades_para_restaurar || transacionais;
    const resultados = {};
    let totalRestaurado = 0;

    for (const chaveBackup of entidadesAlvo) {
      const nomeEntidade = mapeamento[chaveBackup];
      const dados = backup.dados[chaveBackup];

      if (!nomeEntidade || !dados || !Array.isArray(dados) || dados.length === 0) {
        resultados[chaveBackup] = { restaurados: 0, erro: null, pular: !dados || dados.length === 0 };
        continue;
      }

      console.log(`[Restaurar Backup] Restaurando ${nomeEntidade}: ${dados.length} registros`);

      try {
        // Limpar campos internos do sistema antes de inserir
        const dadosLimpos = dados.map(item => {
          const { id, created_date, updated_date, created_by, ...resto } = item;
          // Remover campos null/undefined
          const limpo = {};
          for (const [k, v] of Object.entries(resto)) {
            if (v !== null && v !== undefined) {
              limpo[k] = v;
            }
          }
          return limpo;
        });

        // Inserir em lotes de 20
        const BATCH_SIZE = 20;
        let inseridos = 0;
        for (let i = 0; i < dadosLimpos.length; i += BATCH_SIZE) {
          const lote = dadosLimpos.slice(i, i + BATCH_SIZE);
          await rdsn.asServiceRole.entities[nomeEntidade].bulkCreate(lote);
          inseridos += lote.length;
        }

        resultados[chaveBackup] = { restaurados: inseridos, erro: null };
        totalRestaurado += inseridos;
      } catch (err) {
        console.error(`[Restaurar Backup] Erro ao restaurar ${nomeEntidade}:`, err.message);
        resultados[chaveBackup] = { restaurados: 0, erro: err.message };
      }
    }

    console.log(`[Restaurar Backup] Concluído: ${totalRestaurado} registros restaurados`);

    return buildCorsResponse({
      sucesso: true,
      mensagem: `Restauração concluída: ${totalRestaurado} registros restaurados`,
      backup_data: backup.data_backup,
      total_restaurado: totalRestaurado,
      detalhes: resultados
    });

  } catch (error) {
    console.error('[Restaurar Backup] Erro:', error.message);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});