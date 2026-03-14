import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';
import ExcelJS from 'npm:exceljs@4.4.0';
import jsPDF from 'npm:jspdf@2.5.2';

const mapEntidadeParaTabela = {
  'Reservas': 'ReservaLote',
  'Baixas': 'BaixaLote',
  'Clientes': 'Cliente',
  'Produtos': 'Produto',
  'Estoque': 'MovimentacaoEstoque'
};

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();

    if (!user) {
      return buildCorsResponse({ error: 'Não autorizado' }, { status: 401 });
    }

    const { tipo_entidade, campos, filtros = {}, ordenacao = {}, formato = 'csv' } = await req.json();

    if (!tipo_entidade || !campos || campos.length === 0) {
      return buildCorsResponse({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Buscar dados da entidade
    const entidadeNome = mapEntidadeParaTabela[tipo_entidade];
    const dados = await rdsn.entities[entidadeNome].filter(filtros);

    // Ordenar dados
    if (ordenacao.campo) {
      dados.sort((a, b) => {
        const valorA = a[ordenacao.campo];
        const valorB = b[ordenacao.campo];
        
        if (ordenacao.direcao === 'desc') {
          return valorB > valorA ? 1 : -1;
        }
        return valorA > valorB ? 1 : -1;
      });
    }

    // Filtrar apenas campos selecionados
    const dadosFiltrados = dados.map(item => {
      const itemFiltrado = {};
      campos.forEach(campo => {
        itemFiltrado[campo] = item[campo];
      });
      return itemFiltrado;
    });

    // Gerar relatório no formato solicitado
    if (formato === 'csv') {
      const csv = gerarCSV(dadosFiltrados, campos);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=relatorio_${tipo_entidade}_${new Date().toISOString().split('T')[0]}.csv`
        }
      });
    }

    if (formato === 'excel') {
      const excel = await gerarExcel(dadosFiltrados, campos, tipo_entidade);
      return new Response(excel, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=relatorio_${tipo_entidade}_${new Date().toISOString().split('T')[0]}.xlsx`
        }
      });
    }

    if (formato === 'pdf') {
      const pdf = gerarPDF(dadosFiltrados, campos, tipo_entidade);
      return new Response(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=relatorio_${tipo_entidade}_${new Date().toISOString().split('T')[0]}.pdf`
        }
      });
    }

    return buildCorsResponse({ error: 'Formato não suportado' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});

function gerarCSV(dados, campos) {
  if (dados.length === 0) {
    return campos.join(',') + '\n';
  }

  const header = campos.join(',');
  const rows = dados.map(item => 
    campos.map(campo => {
      const valor = item[campo];
      if (valor === null || valor === undefined) return '';
      if (typeof valor === 'string' && valor.includes(',')) {
        return `"${valor}"`;
      }
      return valor;
    }).join(',')
  );

  return header + '\n' + rows.join('\n');
}

async function gerarExcel(dados, campos, tipoEntidade) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório');

  // Adicionar cabeçalhos
  worksheet.addRow(campos);
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Adicionar dados
  dados.forEach(item => {
    const row = campos.map(campo => item[campo]);
    worksheet.addRow(row);
  });

  // Auto-ajustar colunas
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

function gerarPDF(dados, campos, tipoEntidade) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.text(`Relatório de ${tipoEntidade}`, 14, 20);

  // Data
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

  // Total de registros
  doc.text(`Total de registros: ${dados.length}`, 14, 34);

  // Cabeçalhos da tabela
  let y = 45;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  
  const colWidth = 180 / campos.length;
  campos.forEach((campo, i) => {
    doc.text(campo, 14 + (i * colWidth), y);
  });

  // Dados
  doc.setFont(undefined, 'normal');
  y += 7;

  dados.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    campos.forEach((campo, i) => {
      const valor = item[campo]?.toString() || '';
      const textoTruncado = valor.length > 20 ? valor.substring(0, 18) + '...' : valor;
      doc.text(textoTruncado, 14 + (i * colWidth), y);
    });

    y += 6;
  });

  return doc.output('arraybuffer');
}