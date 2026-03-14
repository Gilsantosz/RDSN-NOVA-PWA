import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    
    // Verificar autenticação
    const isAuthenticated = await rdsn.auth.isAuthenticated();
    if (!isAuthenticated) {
      return buildCorsResponse({ error: 'Não autorizado' }, { status: 403 });
    }

    let userEmail = 'Sistema';
    try {
      const user = await rdsn.auth.me();
      userEmail = user?.email || 'Sistema';
    } catch (e) {
      // Continuar mesmo sem conseguir pegar o email
    }

    const inicio = Date.now();
    const dataBackup = new Date().toISOString();

    // Buscar todos os dados do sistema
    const [
      reservas,
      baixas,
      sequencias,
      numeracoes,
      bloqueios,
      produtos,
      clientes,
      setores,
      movimentacoes,
      auditorias,
      alertas,
      notificacoes,
      usuariosInternos,
      producaoDia,
      producaoDiaLotes
    ] = await Promise.all([
      rdsn.asServiceRole.entities.ReservaLote.list(),
      rdsn.asServiceRole.entities.BaixaLote.list(),
      rdsn.asServiceRole.entities.SequenciaAnual.list(),
      rdsn.asServiceRole.entities.NumeracaoLivre.list(),
      rdsn.asServiceRole.entities.BloqueioIntervalo.list(),
      rdsn.asServiceRole.entities.Produto.list(),
      rdsn.asServiceRole.entities.Cliente.list(),
      rdsn.asServiceRole.entities.Setor.list(),
      rdsn.asServiceRole.entities.MovimentacaoEstoque.list(),
      rdsn.asServiceRole.entities.Auditoria.list(),
      rdsn.asServiceRole.entities.Alerta.list(),
      rdsn.asServiceRole.entities.Notificacao.list(),
      rdsn.asServiceRole.entities.UsuarioInterno.list(),
      rdsn.asServiceRole.entities.ProducaoDia.list(),
      rdsn.asServiceRole.entities.ProducaoDiaLote.list()
    ]);

    // Criar estrutura de backup
    const backup = {
      versao: '1.0',
      data_backup: dataBackup,
      gerado_por: userEmail,
      dados: {
        reservas,
        baixas,
        sequencias,
        numeracoes,
        bloqueios,
        produtos,
        clientes,
        setores,
        movimentacoes,
        auditorias,
        alertas,
        notificacoes,
        usuarios_internos: usuariosInternos.map(u => ({
          ...u,
          password_hash: '[PROTEGIDO]'
        })),
        producao_dia: producaoDia,
        producao_dia_lotes: producaoDiaLotes
      },
      estatisticas: {
        total_reservas: reservas.length,
        total_baixas: baixas.length,
        total_sequencias: sequencias.length,
        total_produtos: produtos.length,
        total_clientes: clientes.length,
        total_setores: setores.length
      }
    };

    const totalRegistros = Object.values(backup.dados).reduce(
      (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
      0
    );

    const backupJson = JSON.stringify(backup, null, 2);
    const tamanhoBytes = new Blob([backupJson]).size;
    const duracao = Date.now() - inicio;

    // Criar arquivo de backup
    const nomeArquivo = `backup_${dataBackup.replace(/[:.]/g, '-')}.json`;
    const file = new File([backupJson], nomeArquivo, { type: 'application/json' });

    // Upload do arquivo
    const { file_url } = await rdsn.asServiceRole.integrations.Core.UploadFile({ file });

    // Registrar no histórico
    await rdsn.asServiceRole.entities.BackupHistorico.create({
      data_backup: dataBackup,
      status: 'SUCESSO',
      tipo: 'MANUAL',
      total_registros: totalRegistros,
      tamanho_bytes: tamanhoBytes,
      arquivo_url: file_url,
      duracao_ms: duracao,
      detalhes: JSON.stringify(backup.estatisticas)
    });

    return buildCorsResponse({
      sucesso: true,
      mensagem: 'Backup realizado com sucesso',
      arquivo_url: file_url,
      total_registros: totalRegistros,
      tamanho_mb: (tamanhoBytes / 1024 / 1024).toFixed(2),
      duracao_ms: duracao
    });

  } catch (error) {
    // Registrar falha no histórico
    try {
      const rdsn = createClientFromRequest(req);
      await rdsn.asServiceRole.entities.BackupHistorico.create({
        data_backup: new Date().toISOString(),
        status: 'FALHA',
        tipo: 'MANUAL',
        erro: error.message
      });
    } catch (e) {
      console.error('Erro ao registrar falha:', e);
    }

    return buildCorsResponse({
      sucesso: false,
      erro: error.message
    }, { status: 500 });
  }
});