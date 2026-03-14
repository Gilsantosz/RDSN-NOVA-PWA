import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Abre uma janela de impressão com o conteúdo HTML fornecido, incluindo estilos básicos.
 * @param {string} titulo - Título do relatório
 * @param {string} subtitulo - Subtítulo/filtros ativos
 * @param {string} htmlTabela - HTML da tabela/conteúdo a imprimir
 */
export function imprimirRelatorio({ titulo, subtitulo, htmlTabela }) {
  const janela = window.open('', '_blank', 'width=900,height=700');
  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${titulo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitulo { font-size: 11px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1e293b; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; }
        td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer { margin-top: 20px; font-size: 10px; color: #888; text-align: right; }
        @media print {
          body { padding: 12px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      <div class="subtitulo">${subtitulo || ''}</div>
      ${htmlTabela}
      <div class="footer">Impresso em ${new Date().toLocaleString('pt-BR')}</div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `);
  janela.document.close();
}

/**
 * Botão padrão de imprimir com callback onClick.
 */
export default function BotaoImprimir({ onClick, label = 'Imprimir', size = 'sm', variant = 'outline', className = '' }) {
  return (
    <Button size={size} variant={variant} onClick={onClick} className={`gap-1.5 ${className}`}>
      <Printer className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}