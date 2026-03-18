import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, ArrowDownToLine } from 'lucide-react';
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

export default function ExportarRelatorio({ dados, colunas, titulo, resumo, filtrosAplicados, observacoes }) {
  const [exportando, setExportando] = useState(null);

  const exportarExcel = async () => {
    if (!dados || dados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setExportando('excel');
    const loadingToast = toast.loading('Gerando Excel...');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema';
      workbook.created = new Date();

      // -- ABA RESUMO --
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

      const addInfoRow = (label, value) => {
        resumoSheet.getCell(`A${row}`).value = label;
        resumoSheet.getCell(`A${row}`).font = { name: 'Arial', size: 10, bold: true };
        resumoSheet.getCell(`B${row}`).value = value;
        resumoSheet.getCell(`B${row}`).font = { name: 'Arial', size: 10 };
        row++;
      };

      addInfoRow('Gerado em:', new Date().toLocaleString('pt-BR'));
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
        rh.value = 'RESUMO';
        rh.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        rh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
        row++;
        Object.entries(resumo).forEach(([key, val]) => {
          addInfoRow(key, typeof val === 'number' ? val.toLocaleString('pt-BR') : val);
        });
      }

      resumoSheet.columns = [{ width: 25 }, { width: 25 }, { width: 20 }, { width: 20 }];

      // -- ABA DADOS --
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
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
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

        // Colorir status
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
      });

      // Rodapé
      const footerRow = dadosSheet.addRow({});
      footerRow.getCell(1).value = `Total: ${dados.length} registros`;
      footerRow.getCell(1).font = { name: 'Arial', size: 9, bold: true, italic: true };

      dadosSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: dados.length + 1, column: colunas.length }
      };
      dadosSheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Gerar e baixar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(titulo || 'relatorio').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Excel exportado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast.error('Erro ao gerar Excel: ' + (error.message || 'Erro desconhecido'), { id: loadingToast });
    } finally {
      setExportando(null);
    }
  };

  const exportarPDF = async () => {
    if (!dados || dados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setExportando('pdf');
    const loadingToast = toast.loading('Gerando PDF...');

    try {
      const numCols = colunas.length;
      const orientacao = numCols > 7 ? 'landscape' : 'portrait';
      const doc = new jsPDF({ orientation: orientacao });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const marginLeft = 10;
      const marginRight = 10;
      const usableWidth = pageWidth - marginLeft - marginRight;

      // Cabeçalho
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text((titulo || 'Relatorio').toUpperCase(), pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 25, { align: 'center' });

      let y = 42;

      // Filtros
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

      // Resumo
      if (resumo && Object.keys(resumo).length > 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(marginLeft, y, usableWidth, 10, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        const resumoTexto = Object.entries(resumo)
          .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString('pt-BR') : v}`)
          .join('   |   ');
        doc.text(resumoTexto, marginLeft + 3, y + 6);
        y += 14;
      }

      // Observações
      if (observacoes && observacoes.trim()) {
        doc.setFillColor(254, 249, 195);
        doc.rect(marginLeft, y, usableWidth, 8, 'F');
        doc.setTextColor(120, 53, 15);
        doc.setFontSize(7);
        doc.setFont(undefined, 'italic');
        doc.text('Obs: ' + observacoes.substring(0, 200), marginLeft + 3, y + 5);
        y += 11;
      }

      // Calcular largura colunas
      const colWidths = colunas.map(col => col.width || 14);
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const scaleFactor = usableWidth / totalWidth;
      const scaledWidths = colWidths.map(w => w * scaleFactor);

      // Header da tabela
      const drawTableHeader = () => {
        doc.setFillColor(100, 116, 139);
        doc.rect(marginLeft, y, usableWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');

        let xPos = marginLeft + 1;
        colunas.forEach((col, idx) => {
          const maxChars = Math.floor(scaledWidths[idx] / 2);
          const label = (col.label || col.key).substring(0, maxChars);
          doc.text(label, xPos, y + 5);
          xPos += scaledWidths[idx];
        });
        y += 10;
      };

      drawTableHeader();

      // Dados
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6.5);

      dados.forEach((item, rowIdx) => {
        if (y > pageHeight - 18) {
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(6);
          doc.text(`Pag ${doc.internal.pages.length - 1}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
          doc.addPage();
          y = 15;
          drawTableHeader();
          doc.setFont(undefined, 'normal');
          doc.setFontSize(6.5);
        }

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

      // Rodapé final
      y += 3;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.text(`Total: ${dados.length} registros`, marginLeft, y);

      // Rodapé em todas as paginas
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

      doc.save(`${(titulo || 'relatorio').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success('PDF exportado com sucesso!', { id: loadingToast });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF: ' + (error.message || 'Erro desconhecido'), { id: loadingToast });
    } finally {
      setExportando(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-12 px-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider gap-2 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
          disabled={!!exportando}
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/40">
        <DropdownMenuItem onClick={exportarExcel} disabled={!!exportando} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-sm text-slate-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800">
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Planilha (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportarPDF} disabled={!!exportando} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-sm text-slate-700 dark:text-slate-200 mt-1 focus:bg-slate-100 dark:focus:bg-slate-800">
          <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          Documento (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}