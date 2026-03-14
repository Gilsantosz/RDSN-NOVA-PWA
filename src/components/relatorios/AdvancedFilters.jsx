import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Sliders } from 'lucide-react';

export default function AdvancedFilters({
  filters,
  onFilterChange,
  opcoesDisponiveis,
  statusOptions,
  isExpanded,
  onToggleExpanded
}) {
  const [tempFilters, setTempFilters] = useState(filters);

  const handleApply = () => {
    onFilterChange(tempFilters);
    onToggleExpanded(false);
  };

  const handleReset = () => {
    const resetFilters = {
      dataInicio: '',
      dataFim: '',
      letra_produto: 'TODOS',
      cliente: 'TODOS',
      status: 'TODOS',
      celula: 'TODOS',
      operador: 'TODOS'
    };
    setTempFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const handleChange = (field, value) => {
    const updated = { ...tempFilters, [field]: value };
    setTempFilters(updated);
  };

  return (
    <div className="space-y-4">
      {!isExpanded && (
        <Button
          variant="outline"
          onClick={() => onToggleExpanded(true)}
          className="w-full justify-start text-left"
        >
          <Sliders className="w-4 h-4 mr-2" />
          Filtros Avançados
        </Button>
      )}

      {isExpanded && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Filtros Avançados</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onToggleExpanded(false)}
              className="h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Período */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Período</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Data Início</Label>
                    <Input
                      type="date"
                      value={tempFilters.dataInicio}
                      onChange={(e) => handleChange('dataInicio', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Data Fim</Label>
                    <Input
                      type="date"
                      value={tempFilters.dataFim}
                      onChange={(e) => handleChange('dataFim', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleChange('dataInicio', today);
                      handleChange('dataFim', today);
                    }}
                    className="text-blue-600"
                  >
                    Hoje
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                      handleChange('dataInicio', firstDay);
                      handleChange('dataFim', lastDay);
                    }}
                    className="text-blue-600"
                  >
                    Mês Atual
                  </Button>
                </div>
              </div>

              {/* Produto e Status */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Produto e Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Produto</Label>
                    <Select
                      value={tempFilters.letra_produto}
                      onValueChange={(v) => {
                        handleChange('letra_produto', v);
                        handleChange('celula', 'TODOS');
                        handleChange('operador', 'TODOS');
                      }}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        {opcoesDisponiveis.letras.map(letra => (
                          <SelectItem key={letra} value={letra}>{letra}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={tempFilters.status}
                      onValueChange={(v) => handleChange('status', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        {statusOptions.map(st => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Cliente, Célula e Operador */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Recursos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Cliente</Label>
                    <Select
                      value={tempFilters.cliente}
                      onValueChange={(v) => handleChange('cliente', v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos ({opcoesDisponiveis.clientes.length})</SelectItem>
                        {opcoesDisponiveis.clientes.map(cli => (
                          <SelectItem key={cli} value={cli}>{cli}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Célula</Label>
                    <Select
                      value={tempFilters.celula}
                      onValueChange={(v) => {
                        handleChange('celula', v);
                        handleChange('operador', 'TODOS');
                      }}
                      disabled={opcoesDisponiveis.celulas.length === 0}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todas ({opcoesDisponiveis.celulas.length})</SelectItem>
                        {opcoesDisponiveis.celulas.map(cel => (
                          <SelectItem key={cel} value={cel}>{cel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Operador</Label>
                    <Select
                      value={tempFilters.operador}
                      onValueChange={(v) => handleChange('operador', v)}
                      disabled={opcoesDisponiveis.operadores.length === 0}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos ({opcoesDisponiveis.operadores.length})</SelectItem>
                        {opcoesDisponiveis.operadores.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-4 border-t border-blue-200">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Aplicar Filtros
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Resetar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}