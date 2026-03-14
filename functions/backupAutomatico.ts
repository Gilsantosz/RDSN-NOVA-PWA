import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

const RETENCAO_DIAS = 7;

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();

    if (user?.role !== 'admin') {
      return buildCorsResponse({ error: 'Não autorizado' }, { status: 403 });
    }

    const inicio = Date.now();
    const dataBackup = new Date().toISOString();

    console.log('[Backup Automático] Iniciando backup...');

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
      usuariosInternos
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
      rdsn.asServiceRole.entities.UsuarioInterno.list()
    ]);

    // Criar estrutura de backup
    const backup = {
      versao: '1.0',
      data_backup: dataBackup,
      tipo: 'AUTOMATICO',
      gerado_por: 'Sistema Automático',
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
        }))
      },
      estatisticas: {
        total_reservas: reservas.length,
        total_baixas: baixas.length,
        total_sequencias: sequencias.length,
        total_produtos: produtos.length,
        total_clientes: clientes.length,
        total_setores: setores.length,
        total_movimentacoes: movimentacoes.length,
        total_auditorias: auditorias.length,
        total_alertas: alertas.length,
        total_notificacoes: notificacoes.length,
        total_usuarios: usuariosInternos.length
      }
    };

    const totalRegistros = Object.values(backup.dados).reduce(
      (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
      0
    );

    const backupJson = JSON.stringify(backup, null, 2);
    const tamanhoBytes = new Blob([backupJson]).size;

    // Criar arquivo de backup
    const nomeArquivo = `backup_auto_${dataBackup.replace(/[:.]/g, '-')}.json`;
    const file = new File([backupJson], nomeArquivo, { type: 'application/json' });

    // Upload do arquivo
    const { file_url } = await rdsn.asServiceRole.integrations.Core.UploadFile({ file });

    const duracao = Date.now() - inicio;

    // Registrar no histórico
    await rdsn.asServiceRole.entities.BackupHistorico.create({
      data_backup: dataBackup,
      status: 'SUCESSO',
      tipo: 'AUTOMATICO',
      total_registros: totalRegistros,
      tamanho_bytes: tamanhoBytes,
      arquivo_url: file_url,
      duracao_ms: duracao,
      detalhes: JSON.stringify(backup.estatisticas)
    });

    console.log(`[Backup Automático] Backup realizado com sucesso: ${totalRegistros} registros, ${(tamanhoBytes / 1024).toFixed(1)} KB`);

    // === LIMPEZA DE BACKUPS ANTIGOS (retenção de 7 dias) ===
    let backupsRemovidos = 0;
    try {
      const todosBackups = await rdsn.asServiceRole.entities.BackupHistorico.list('-created_date');
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - RETENCAO_DIAS);

      const backupsAntigos = todosBackups.filter(b => {
        const dataBackup = new Date(b.data_backup || b.created_date);
        return dataBackup < dataLimite;
      });

      for (const backupAntigo of backupsAntigos) {
        await rdsn.asServiceRole.entities.BackupHistorico.delete(backupAntigo.id);
        backupsRemovidos++;
      }

      if (backupsRemovidos > 0) {
        console.log(`[Backup Automático] ${backupsRemovidos} backup(s) antigo(s) removidos (retenção: ${RETENCAO_DIAS} dias)`);
      }
    } catch (limpezaError) {
      console.error('[Backup Automático] Erro na limpeza de backups antigos:', limpezaError.message);
    }

    return buildCorsResponse({
      sucesso: true,
      mensagem: 'Backup automático realizado com sucesso',
      arquivo_url: file_url,
      total_registros: totalRegistros,
      tamanho_mb: (tamanhoBytes / 1024 / 1024).toFixed(2),
      duracao_ms: duracao,
      backups_antigos_removidos: backupsRemovidos,
      retencao_dias: RETENCAO_DIAS
    });

  } catch (error) {
    console.error('[Backup Automático] Erro:', error.message);

    try {
      const rdsn = createClientFromRequest(req);
      await rdsn.asServiceRole.entities.BackupHistorico.create({
        data_backup: new Date().toISOString(),
        status: 'FALHA',
        tipo: 'AUTOMATICO',
        erro: error.message
      });
    } catch (e) {
      console.error('[Backup Automático] Erro ao registrar falha:', e.message);
    }

    return buildCorsResponse({
      sucesso: false,
      erro: error.message
    }, { status: 500 });
  }
});