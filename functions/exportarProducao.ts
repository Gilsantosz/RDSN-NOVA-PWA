import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    
    // Obter nome do usuário do localStorage (usuário interno)
    let userEmail = 'sistema@interno.com';
    try {
      const user = await rdsn.auth.me();
      if (user) {
        userEmail = user.email || userEmail;
      }
    } catch (err) {
      // Autenticação interna - usar padrão
      userEmail = 'usuario@sistema.com';
    }

    const { formato, setor_id, data_inicio, data_fim } = await req.json();

    // Buscar dados de produção
    let reservas = await rdsn.entities.ReservaLote.list();
    let baixas = await rdsn.entities.BaixaLote.list();

    // Filtrar por setor se fornecido
    if (setor_id && setor_id !== 'TODOS') {
      reservas = reservas.filter(r => r.setor_id === setor_id);
      const reservaIds = reservas.map(r => r.id);
      baixas = baixas.filter(b => reservaIds.includes(b.reserva_id));
    }

    // Filtrar por data se fornecido
    if (data_inicio) {
      const inicio = new Date(data_inicio);
      reservas = reservas.filter(r => new Date(r.created_date) >= inicio);
      baixas = baixas.filter(b => new Date(b.created_date) >= inicio);
    }
    if (data_fim) {
      const fim = new Date(data_fim);
      reservas = reservas.filter(r => new Date(r.created_date) <= fim);
      baixas = baixas.filter(b => new Date(b.created_date) <= fim);
    }

    // Preparar dados consolidados
    const dadosExportacao = reservas.map(reserva => {
      const baixasReserva = baixas.filter(b => b.reserva_id === reserva.id);
      return {
        codigo_lote: reserva.codigo_completo,
        cliente: reserva.cliente,
        modelo: reserva.modelo,
        quantidade_reservada: reserva.quantidade,
        quantidade_produzida: reserva.quantidade_baixada,
        status: reserva.status,
        data_reserva: reserva.created_date,
        numero_inicial: reserva.numero_inicial,
        numero_final: reserva.numero_final,
        mes_producao: reserva.mes_producao,
        baixas: baixasReserva.map(b => ({
          quantidade: b.quantidade,
          tipo: b.tipo,
          data: b.created_date,
          operador: b.operador
        }))
      };
    });

    let conteudo, contentType, filename;

    if (formato === 'JSON') {
      conteudo = JSON.stringify({
        exportacao: {
          data_geracao: new Date().toISOString(),
          usuario: userEmail,
          total_registros: dadosExportacao.length,
          dados: dadosExportacao
        }
      }, null, 2);
      contentType = 'application/json';
      filename = `producao_${Date.now()}.json`;
    } else if (formato === 'CSV') {
      // Cabeçalhos CSV
      const headers = ['Código Lote', 'Cliente', 'Modelo', 'Qtd Reservada', 'Qtd Produzida', 'Status', 'Data Reserva', 'Num Inicial', 'Num Final'];
      const linhas = dadosExportacao.map(d => [
        d.codigo_lote,
        d.cliente || '',
        d.modelo || '',
        d.quantidade_reservada,
        d.quantidade_produzida,
        d.status,
        new Date(d.data_reserva).toLocaleDateString('pt-BR'),
        d.numero_inicial,
        d.numero_final
      ].join(','));
      conteudo = [headers.join(','), ...linhas].join('\n');
      contentType = 'text/csv';
      filename = `producao_${Date.now()}.csv`;
    } else if (formato === 'XML') {
      // Gerar XML
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<exportacao>
  <metadados>
    <data_geracao>${new Date().toISOString()}</data_geracao>
    <usuario>${userEmail}</usuario>
    <total_registros>${dadosExportacao.length}</total_registros>
  </metadados>
  <dados>
    ${dadosExportacao.map(d => `
    <lote>
      <codigo>${d.codigo_lote}</codigo>
      <cliente>${d.cliente || ''}</cliente>
      <modelo>${d.modelo || ''}</modelo>
      <quantidade_reservada>${d.quantidade_reservada}</quantidade_reservada>
      <quantidade_produzida>${d.quantidade_produzida}</quantidade_produzida>
      <status>${d.status}</status>
      <data_reserva>${d.data_reserva}</data_reserva>
      <numero_inicial>${d.numero_inicial}</numero_inicial>
      <numero_final>${d.numero_final}</numero_final>
    </lote>`).join('')}
  </dados>
</exportacao>`;
      conteudo = xml;
      contentType = 'application/xml';
      filename = `producao_${Date.now()}.xml`;
    } else {
      return buildCorsResponse({ error: 'Formato não suportado' }, { status: 400 });
    }

    return new Response(conteudo, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    return buildCorsResponse({ 
      error: error.message 
    }, { status: 500 });
  }
});