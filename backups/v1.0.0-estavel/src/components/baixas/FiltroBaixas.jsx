import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save, FolderOpen, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function FiltroBaixas({ filtros, onChange, baixas, setores }) {
  const [filtrosSalvos, setFiltrosSalvos] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [nomeFiltro, setNomeFiltro] = useState('');
  const [selectedClientes, setSelectedClientes] = useState([]);
  const [selectedCodigos, setSelectedCodigos] = useState([]);
  const [selectedOperadores, setSelectedOperadores] = useState([]);
  const [selectedTipos, setSelectedTipos] = useState([]);
  const [selectedDeSetores, setSelectedDeSetores] = useState([]);
  const [selectedParaSetores, setSelectedParaSetores] = useState([]);
  const [dataInicio, setDataInicio] = useState(null);
  const [dataFim, setDataFim] = useState(null);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('filtrosBaixas');
    if (saved) {
      setFiltrosSalvos(JSON.parse(saved));
    }
  }, []);

  // Extrair valores únicos para sugestões
  const sugestoes = useMemo(() => {
    const clientes = new Set();
    const codigos = new Set();
    const operadores = new Set();
    const deSetores = new Set();
    const paraSetores = new Set();

    baixas.forEach(baixa => {
      if (baixa.reserva?.cliente) clientes.add(baixa.reserva.cliente);
      if (baixa.reserva?.codigo_produto) codigos.add(baixa.reserva.codigo_produto);
      if (baixa.operador) operadores.add(baixa.operador);
      if (baixa.de_setor) deSetores.add(baixa.de_setor);
      if (baixa.para_setor) paraSetores.add(baixa.para_setor);
    });

    return {
      clientes: Array.from(clientes).sort(),
      codigos: Array.from(codigos).sort(),
      operadores: Array.from(operadores).sort(),
      deSetores: Array.from(deSetores).sort(),
      paraSetores: Array.from(paraSetores).sort()
    };
  }, [baixas]);

  // Aplicar filtros sempre que houver mudança
  const aplicarFiltros = () => {
    onChange({
      clientes: selectedClientes,
      codigos: selectedCodigos,
      operadores: selectedOperadores,
      tipos: selectedTipos,
      deSetores: selectedDeSetores,
      paraSetores: selectedParaSetores,
      dataInicio: dataInicio ? format(dataInicio, 'yyyy-MM-dd') : '',
      dataFim: dataFim ? format(dataFim, 'yyyy-MM-dd') : ''
    });
  };

  useEffect(() => {
    aplicarFiltros();
  }, [selectedClientes, selectedCodigos, selectedOperadores, selectedTipos, selectedDeSetores, selectedParaSetores, dataInicio, dataFim]);

  const handleLimpar = () => {
    setSelectedClientes([]);
    setSelectedCodigos([]);
    setSelectedOperadores([]);
    setSelectedTipos([]);
    setSelectedDeSetores([]);
    setSelectedParaSetores([]);
    setDataInicio(null);
    setDataFim(null);
  };

  const handleSalvarFiltro = () => {
    if (!nomeFiltro.trim()) return;

    const novoFiltro = {
      id: Date.now(),
      nome: nomeFiltro,
      filtros: {
        clientes: selectedClientes,
        codigos: selectedCodigos,
        operadores: selectedOperadores,
        tipos: selectedTipos,
        deSetores: selectedDeSetores,
        paraSetores: selectedParaSetores,
        dataInicio,
        dataFim
      }
    };

    const novosF = [...filtrosSalvos, novoFiltro];
    setFiltrosSalvos(novosF);
    localStorage.setItem('filtrosBaixas', JSON.stringify(novosF));
    setShowSaveDialog(false);
    setNomeFiltro('');
  };

  const handleCarregarFiltro = (filtro) => {
    setSelectedClientes(filtro.filtros.clientes || []);
    setSelectedCodigos(filtro.filtros.codigos || []);
    setSelectedOperadores(filtro.filtros.operadores || []);
    setSelectedTipos(filtro.filtros.tipos || []);
    setSelectedDeSetores(filtro.filtros.deSetores || []);
    setSelectedParaSetores(filtro.filtros.paraSetores || []);
    setDataInicio(filtro.filtros.dataInicio || null);
    setDataFim(filtro.filtros.dataFim || null);
    setShowLoadDialog(false);
  };

  const handleDeletarFiltro = (id) => {
    const novosF = filtrosSalvos.filter(f => f.id !== id);
    setFiltrosSalvos(novosF);
    localStorage.setItem('filtrosBaixas', JSON.stringify(novosF));
  };

  const MultiSelectField = ({ label, options, selected, onChange, placeholder }) => (
    <div className="space-y-2">
      <Label className="text-slate-700 dark:text-slate-300 font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(item => (
          <Badge key={item} variant="secondary" className="pr-1 dark:bg-slate-800 dark:text-slate-200">
            {item}
            <button
              onClick={() => onChange(selected.filter(i => i !== item))}
              className="ml-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Select onValueChange={(value) => {
        if (!selected.includes(value)) {
          onChange([...selected, value]);
        }
      }}>
        <SelectTrigger className="bg-white dark:bg-slate-900 dark:border-slate-800">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.filter(opt => !selected.includes(opt)).map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const filtrosAtivos =
    selectedClientes.length +
    selectedCodigos.length +
    selectedOperadores.length +
    selectedTipos.length +
    selectedDeSetores.length +
    selectedParaSetores.length +
    (dataInicio ? 1 : 0) +
    (dataFim ? 1 : 0);

  return (
    <>
      <Card className="border-2 border-blue-200 dark:border-blue-900/30 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-lg transition-colors">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Linha 1: Multi-selects básicos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MultiSelectField
                label="Clientes"
                options={sugestoes.clientes}
                selected={selectedClientes}
                onChange={setSelectedClientes}
                placeholder="Selecione clientes..."
              />
              <MultiSelectField
                label="Códigos de Produto"
                options={sugestoes.codigos}
                selected={selectedCodigos}
                onChange={setSelectedCodigos}
                placeholder="Selecione códigos..."
              />
              <MultiSelectField
                label="Operadores"
                options={sugestoes.operadores}
                selected={selectedOperadores}
                onChange={setSelectedOperadores}
                placeholder="Selecione operadores..."
              />
            </div>

            {/* Linha 2: Tipos e Setores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-medium">Tipos de Baixa</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTipos.map(tipo => (
                    <Badge key={tipo} variant="secondary" className="pr-1 dark:bg-slate-800 dark:text-slate-200">
                      {tipo}
                      <button
                        onClick={() => setSelectedTipos(selectedTipos.filter(t => t !== tipo))}
                        className="ml-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(value) => {
                  if (!selectedTipos.includes(value)) {
                    setSelectedTipos([...selectedTipos, value]);
                  }
                }}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 dark:border-slate-800">
                    <SelectValue placeholder="Selecione tipos..." />
                  </SelectTrigger>
                  <SelectContent>
                    {['MANUAL', 'COLETA'].filter(t => !selectedTipos.includes(t)).map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <MultiSelectField
                label="De Setores"
                options={sugestoes.deSetores}
                selected={selectedDeSetores}
                onChange={setSelectedDeSetores}
                placeholder="Selecione setores origem..."
              />
              <MultiSelectField
                label="Para Setores"
                options={sugestoes.paraSetores}
                selected={selectedParaSetores}
                onChange={setSelectedParaSetores}
                placeholder="Selecione setores destino..."
              />
            </div>

            {/* Linha 3: Date Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-medium">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      className="rounded-md border dark:border-slate-800 dark:bg-slate-950"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-medium">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      className="rounded-md border dark:border-slate-800 dark:bg-slate-950"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {filtrosAtivos > 0 && (
                  <span className="font-medium">{filtrosAtivos} filtro{filtrosAtivos > 1 ? 's' : ''} ativo{filtrosAtivos > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowLoadDialog(true)} className="dark:border-slate-800 dark:bg-slate-900 border dark:text-slate-100">
                  <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
                  Carregar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} className="dark:border-slate-800 dark:bg-slate-900 border dark:text-slate-100">
                  <Save className="w-4 h-4 mr-2 text-emerald-500" />
                  Salvar
                </Button>
                <Button variant="outline" size="sm" onClick={handleLimpar} className="dark:border-slate-800 dark:bg-slate-900 border dark:text-slate-100">
                  <X className="w-4 h-4 mr-2 text-red-500" />
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Salvar Filtro */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Salvar Conjunto de Filtros</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Dê um nome para este conjunto de filtros para reutilizar depois.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            placeholder="Nome do filtro..."
            value={nomeFiltro}
            onChange={(e) => setNomeFiltro(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input dark:border-slate-800 bg-transparent dark:bg-slate-950 px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-slate-100"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-100">
              Cancelar
            </Button>
            <Button onClick={handleSalvarFiltro} disabled={!nomeFiltro.trim()} className="bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Carregar Filtro */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Carregar Filtro Salvo</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Selecione um conjunto de filtros salvo anteriormente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtrosSalvos.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhum filtro salvo ainda</p>
            ) : (
              filtrosSalvos.map(filtro => (
                <div key={filtro.id} className="flex items-center justify-between p-3 border dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <button
                    onClick={() => handleCarregarFiltro(filtro)}
                    className="flex-1 text-left font-medium dark:text-slate-100"
                  >
                    {filtro.nome}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletarFiltro(filtro.id)}
                    className="hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}