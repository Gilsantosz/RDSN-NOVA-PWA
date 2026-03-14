import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';

const colunasDisponiveis = [
  { id: 'data', label: 'Data', padrao: true },
  { id: 'cliente', label: 'Cliente', padrao: true },
  { id: 'codigo', label: 'Código', padrao: true },
  { id: 'modelo', label: 'Modelo', padrao: true },
  { id: 'letra_ano', label: 'Letra/Ano', padrao: true },
  { id: 'num_inicial', label: 'Nº Inicial', padrao: true },
  { id: 'num_final', label: 'Nº Final', padrao: true },
  { id: 'quantidade', label: 'Qtd', padrao: true },
  { id: 'baixada', label: 'Baixada', padrao: true },
  { id: 'status', label: 'Status', padrao: false },
  { id: 'mes_producao', label: 'Mês Produção', padrao: false },
  { id: 'data_prevista', label: 'Data Prevista', padrao: false }
];

export default function ConfiguracaoPDFDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  templateInicial = null 
}) {
  const [configuracao, setConfiguracao] = useState({
    observacoes: '',
    colunasSelecionadas: templateInicial?.colunas_selecionadas || colunasDisponiveis.filter(c => c.padrao).map(c => c.id),
    orientacao: templateInicial?.orientacao || 'portrait',
    tamanhoFonte: templateInicial?.tamanho_fonte || 9,
    incluirResumo: templateInicial?.incluir_resumo ?? true,
    salvarTemplate: false,
    nomeTemplate: '',
    descricaoTemplate: ''
  });

  const handleToggleColuna = (colunaId) => {
    setConfiguracao(prev => ({
      ...prev,
      colunasSelecionadas: prev.colunasSelecionadas.includes(colunaId)
        ? prev.colunasSelecionadas.filter(id => id !== colunaId)
        : [...prev.colunasSelecionadas, colunaId]
    }));
  };

  const handleConfirmar = () => {
    if (configuracao.colunasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma coluna');
      return;
    }

    if (configuracao.salvarTemplate && !configuracao.nomeTemplate) {
      toast.error('Informe o nome do template');
      return;
    }

    onConfirm(configuracao);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Exportação PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Observações */}
          <div>
            <Label>Observações do Relatório</Label>
            <Textarea
              placeholder="Adicione contexto ou observações para este relatório..."
              value={configuracao.observacoes}
              onChange={(e) => setConfiguracao(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Estas observações aparecerão no cabeçalho do PDF
            </p>
          </div>

          {/* Seleção de Colunas */}
          <div>
            <Label className="mb-3 block">Colunas a Incluir</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border">
              {colunasDisponiveis.map(coluna => (
                <div key={coluna.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={coluna.id}
                    checked={configuracao.colunasSelecionadas.includes(coluna.id)}
                    onCheckedChange={() => handleToggleColuna(coluna.id)}
                  />
                  <label
                    htmlFor={coluna.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {coluna.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {configuracao.colunasSelecionadas.length} coluna(s) selecionada(s)
            </p>
          </div>

          {/* Configurações de Layout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Orientação</Label>
              <Select 
                value={configuracao.orientacao}
                onValueChange={(v) => setConfiguracao(prev => ({ ...prev, orientacao: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Retrato</SelectItem>
                  <SelectItem value="landscape">Paisagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tamanho da Fonte</Label>
              <Select 
                value={String(configuracao.tamanhoFonte)}
                onValueChange={(v) => setConfiguracao(prev => ({ ...prev, tamanhoFonte: parseInt(v) }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Pequena (7pt)</SelectItem>
                  <SelectItem value="8">Média (8pt)</SelectItem>
                  <SelectItem value="9">Normal (9pt)</SelectItem>
                  <SelectItem value="10">Grande (10pt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Incluir Resumo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="incluirResumo"
              checked={configuracao.incluirResumo}
              onCheckedChange={(checked) => setConfiguracao(prev => ({ ...prev, incluirResumo: checked }))}
            />
            <label
              htmlFor="incluirResumo"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Incluir seção de resumo estatístico
            </label>
          </div>

          {/* Salvar como Template */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="salvarTemplate"
                checked={configuracao.salvarTemplate}
                onCheckedChange={(checked) => setConfiguracao(prev => ({ ...prev, salvarTemplate: checked }))}
              />
              <label
                htmlFor="salvarTemplate"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Salvar esta configuração como template
              </label>
            </div>

            {configuracao.salvarTemplate && (
              <div className="space-y-3 ml-6">
                <div>
                  <Label>Nome do Template</Label>
                  <Input
                    placeholder="Ex: Relatório Mensal Padrão"
                    value={configuracao.nomeTemplate}
                    onChange={(e) => setConfiguracao(prev => ({ ...prev, nomeTemplate: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Descrição do template"
                    value={configuracao.descricaoTemplate}
                    onChange={(e) => setConfiguracao(prev => ({ ...prev, descricaoTemplate: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} className="bg-slate-900 hover:bg-slate-800">
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}