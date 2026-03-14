import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';
import ExcelJS from 'npm:exceljs@4.4.0';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    let userName = 'Sistema';
    try {
      const user = await rdsn.auth.me();
      if (user) userName = user.full_name || user.email || 'Sistema';
    } catch (e) {
      userName = 'Usuario do Sistema';
    }

    const body = await req.json();
    const { formato, titulo, dados, colunas, resumo, filtrosAplicados, observacoes } = body;

    if (!dados || !Array.isArray(dados) || dados.length === 0) {
      return buildCorsResponse({ error: 'Nenhum dado para exportar' }, { status: 400 });
    }

    if (!colunas || !Array.isArray(colunas) || colunas.length === 0) {
      return buildCorsResponse({ error: 'Colunas nao definidas' }, { status: 400 });
    }

    if (formato === 'excel' || formato === 'xlsx') {
      return await gerarExcel({ titulo, dados, colunas, resumo, filtrosAplicados, observacoes, userName });
    } else if (formato === 'pdf') {
      return await gerarPDF({ titulo, dados, colunas, resumo, filtrosAplicados, observacoes, userName });
    } else {
      return buildCorsResponse({ error: 'Formato nao suportado. Use: excel ou pdf' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na exportacao:', error);
    return buildCorsResponse({ error: 'Erro interno: ' + error.message }, { status: 500 });
  }
});

// ============================================================
// EXCEL
// ============================================================
async function gerarExcel({ titulo, dados, colunas, resumo, filtrosAplicados, observacoes, userName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = userName;
  workbook.created = new Date();

  // ---- ABA RESUMO ----
  const resumoSheet = workbook.addWorksheet('Resumo');
  let row = 1;

  resumoSheet.mergeCells(`A${row}:D${row}`);
  const titleCell = resumoSheet.getCell(`A${row}`);
  titleCell.value = (titulo || 'RELATORIO').toUpperCase();
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  resumoSheet.getRow(row).height = 30;
  row += 2;

  const addInfoRow = (label, value, bold) => {
    resumoSheet.getCell(`A${row}`).value = label;
    resumoSheet.getCell(`A${row}`).font = { name: 'Arial', size: 10, bold: true };
    resumoSheet.getCell(`B${row}`).value = value;
    resumoSheet.getCell(`B${row}`).font = { name: 'Arial', size: 10, bold: !!bold };
    row++;
  };

  addInfoRow('Gerado em:', new Date().toLocaleString('pt-BR'));
  addInfoRow('Por:', userName);
  row++;

  if (filtrosAplicados && Object.keys(filtrosAplicados).length > 0) {
    resumoSheet.mergeCells(`A${row}:D${row}`);
    const fh = resumoSheet.getCell(`A${row}`);
    fh.value = 'FILTROS APLICADOS';
    fh.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    fh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    row++;
    Object.entries(filtrosAplicados).forEach(([key, val]) => {
      if (val && val !== 'TODOS' && val !== '' && val !== '-') addInfoRow(key, val);
    });
    row++;
  }

  if (resumo && Object.keys(resumo).length > 0) {
    resumoSheet.mergeCells(`A${row}:D${row}`);
    const rh = resumoSheet.getCell(`A${row}`);
    rh.value = 'RESUMO EXECUTIVO';
    rh.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    rh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    row++;
    Object.entries(resumo).forEach(([key, val]) => {
      addInfoRow(key, typeof val === 'number' ? val.toLocaleString('pt-BR') : val, true);
    });
    row++;
  }

  if (observacoes) {
    resumoSheet.mergeCells(`A${row}:D${row}`);
    const oc = resumoSheet.getCell(`A${row}`);
    oc.value = 'Observacoes: ' + observacoes;
    oc.font = { name: 'Arial', size: 9, italic: true };
    oc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
  }

  resumoSheet.columns = [{ width: 25 }, { width: 25 }, { width: 20 }, { width: 20 }];

  // ---- ABA DADOS ----
  const dadosSheet = workbook.addWorksheet('Dados');

  dadosSheet.columns = colunas.map(col => ({
    header: col.label || col.key,
    key: col.key,
    width: col.width || Math.max(12, (col.label || col.key).length + 4)
  }));

  const headerRow = dadosSheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  const statusColors = {
    'RESERVADO': { font: 'FF1E40AF', bg: 'FFDBEAFE' },
    'EM_PRODUCAO': { font: 'FF92400E', bg: 'FFFEF3C7' },
    'PRODUZIDO': { font: 'FF166534', bg: 'FFDCFCE7' },
    'BAIXADO': { font: 'FF6B21A8', bg: 'FFF3E8FF' },
    'CANCELADO': { font: 'FF991B1B', bg: 'FFFEE2E2' },
    'LIBERADO': { font: 'FF0F766E', bg: 'FFCCFBF1' }
  };

  dados.forEach((item, idx) => {
    const rowData = {};
    colunas.forEach(col => {
      rowData[col.key] = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : '-';
    });

    const dataRow = dadosSheet.addRow(rowData);
    dataRow.font = { name: 'Arial', size: 9 };

    const bgColor = idx % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF';
    dataRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'middle' };
    });

    const statusColIdx = colunas.findIndex(c => c.key === 'status');
    if (statusColIdx >= 0) {
      const statusCell = dataRow.getCell(statusColIdx + 1);
      const sv = String(statusCell.value || '').toUpperCase();
      const sc = statusColors[sv];
      if (sc) {
        statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: sc.font } };
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.bg } };
      }
    }

    colunas.forEach((col, colIdx) => {
      if (col.tipo === 'numero' || ['quantidade', 'baixada', 'qtd', 'estoque', 'num_inicial', 'num_final', 'quantidade_baixada', 'qtd_anterior', 'qtd_nova'].includes(col.key)) {
        const cell = dataRow.getCell(colIdx + 1);
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  });

  const footerRow = dadosSheet.addRow({});
  footerRow.height = 20;
  footerRow.getCell(1).value = `Total: ${dados.length} registros`;
  footerRow.getCell(1).font = { name: 'Arial', size: 9, bold: true, italic: true };

  dadosSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: dados.length + 1, column: colunas.length }
  };
  dadosSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=relatorio_${new Date().toISOString().split('T')[0]}.xlsx`
    }
  });
}

// ============================================================
// PDF
// ============================================================
async function gerarPDF({ titulo, dados, colunas, resumo, filtrosAplicados, observacoes, userName }) {
  const numCols = colunas.length;
  const orientacao = numCols > 7 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation: orientacao });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginLeft = 10;
  const marginRight = 10;
  const usableWidth = pageWidth - marginLeft - marginRight;

  // ---- CABECALHO ----
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text((titulo || 'Relatorio').toUpperCase(), pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Por: ${userName}`, pageWidth / 2, 25, { align: 'center' });

  let y = 42;

  // ---- FILTROS ----
  if (filtrosAplicados && Object.keys(filtrosAplicados).length > 0) {
    const filtrosTexto = Object.entries(filtrosAplicados)
      .filter(([, v]) => v && v !== 'TODOS' && v !== '' && v !== '-')
      .map(([k, v]) => `${k}: ${v}`)
      .join('  |  ');

    if (filtrosTexto) {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginLeft, y, usableWidth, 8, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.setFont(undefined, 'italic');
      doc.text('Filtros: ' + filtrosTexto, marginLeft + 3, y + 5);
      y += 11;
    }
  }

  // ---- RESUMO ----
  if (resumo && Object.keys(resumo).length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.rect(marginLeft, y, usableWidth, 10, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');

    const resumoTexto = Object.entries(resumo).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString('pt-BR') : v}`).join('   |   ');
    doc.text(resumoTexto, marginLeft + 3, y + 6);
    y += 14;
  }

  // ---- OBSERVACOES ----
  if (observacoes && observacoes.trim()) {
    doc.setFillColor(254, 249, 195);
    doc.rect(marginLeft, y, usableWidth, 8, 'F');
    doc.setTextColor(120, 53, 15);
    doc.setFontSize(7);
    doc.setFont(undefined, 'italic');
    doc.text('Obs: ' + observacoes.substring(0, 200), marginLeft + 3, y + 5);
    y += 11;
  }

  // ---- CALCULAR LARGURA DAS COLUNAS ----
  const colWidths = colunas.map(col => col.width || 14);
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const scaleFactor = usableWidth / totalWidth;
  const scaledWidths = colWidths.map(w => w * scaleFactor);

  // ---- CABECALHO TABELA ----
  const drawTableHeader = () => {
    doc.setFillColor(100, 116, 139);
    doc.rect(marginLeft, y, usableWidth, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');

    let xPos = marginLeft + 1;
    colunas.forEach((col, idx) => {
      const label = (col.label || col.key).substring(0, Math.floor(scaledWidths[idx] / 2));
      doc.text(label, xPos, y + 5);
      xPos += scaledWidths[idx];
    });

    y += 10;
  };

  drawTableHeader();

  // ---- DADOS ----
  doc.setFont(undefined, 'normal');
  doc.setFontSize(6.5);

  dados.forEach((item, rowIdx) => {
    if (y > pageHeight - 18) {
      // Rodape da pagina
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(6);
      doc.text(`Pagina ${doc.internal.pages.length - 1}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

      doc.addPage();
      y = 15;
      drawTableHeader();
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6.5);
    }

    // Cor alternada
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginLeft, y, usableWidth, 6, 'F');
    }

    doc.setTextColor(51, 65, 85);
    let xPos = marginLeft + 1;
    colunas.forEach((col, idx) => {
      const val = item[col.key];
      let texto = val !== null && val !== undefined ? String(val) : '-';
      const maxChars = Math.floor(scaledWidths[idx] / 2);
      if (texto.length > maxChars) texto = texto.substring(0, maxChars - 1) + '..';
      doc.text(texto, xPos, y + 4);
      xPos += scaledWidths[idx];
    });

    y += 6;
  });

  // ---- RODAPE FINAL ----
  y += 3;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.text(`Total: ${dados.length} registros`, marginLeft, y);

  // Rodape em todas as paginas
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    doc.text('Sistema de Controle de Numeracao', marginLeft, pageHeight - 5);
  }

  const pdfBuffer = doc.output('arraybuffer');

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=relatorio_${new Date().toISOString().split('T')[0]}.pdf`
    }
  });
}