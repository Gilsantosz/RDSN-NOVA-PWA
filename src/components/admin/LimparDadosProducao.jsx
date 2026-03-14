import React, { useState } from 'react';
import { rdsn } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Trash2, Loader, Filter, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LimparDadosProducao() {
  const [showDialog, setShowDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [modoExclusao, setModoExclusao] = useState('total');
  const [filtros, setFiltros] = useState({
    codigos: [],
    clientes: [],
    modelos: [],
    numero_inicial: '',
    numero_final: ''
  });
  const [inputValues, setInputValues] = useState({
    codigo: '',
    cliente: '',
    modelo: ''
  });

  // Buscar dados para os filtros
  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-filtros'],
    queryFn: () => rdsn.entities.ReservaLote.list()
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-filtros'],
    queryFn: () => rdsn.entities.Cliente.list()
  });

  // Extrair opções únicas
  const codigosDisponiveis = [...new Set(reservas.map(r => r.codigo_produto).filter(Boolean))];
  const clientesDisponiveis = [...new Set([
    ...clientes.map(c => c.nome),
    ...reservas.map(r => r.cliente)
  ].filter(Boolean))];
  const modelosDisponiveis = [...new Set(reservas.map(r => r.modelo).filter(Boolean))];

  const addFiltro = (tipo, valor) => {
    if (!valor.trim()) return;
    
    const normalizado = valor.trim();
    if (filtros[tipo].includes(normalizado)) {
      toast.error('Este valor já foi adicionado');
      return;
    }
    
    setFiltros({
      ...filtros,
      [tipo]: [...filtros[tipo], normalizado]
    });
    setInputValues({ ...inputValues, [tipo.replace('s', '')]: '' });
  };

  const removeFiltro = (tipo, valor) => {
    setFiltros({
      ...filtros,
      [tipo]: filtros[tipo].filter(v => v !== valor)
    });
  };

  const handleKeyPress = (e, tipo) => {
    if (e.key === 'Enter') {
      const campo = tipo.replace('s', '');
      addFiltro(tipo, inputValues[campo]);
    }
  };

  const handleLimpar = async () => {
    setIsDeleting(true);
    try {
      // Incluir ID do usuário interno para validação de permissão no backend
      let internalUserId = null;
      try {
        const u = localStorage.getItem('internalUser');
        if (u) internalUserId = JSON.parse(u).id;
      } catch {}

      const payload = modoExclusao === 'total'
        ? { internalUserId }
        : { filtros, internalUserId };
      const response = await rdsn.functions.invoke('limparDadosProducao', payload);
      
      if (response.data.success) {
        setResultados(response.data.resultados);
        toast.success(response.data.mensagem);
        setShowDialog(false);
        
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const temFiltrosAtivos = filtros.codigos.length > 0 || 
    filtros.clientes.length > 0 || 
    filtros.modelos.length > 0 || 
    filtros.numero_inicial || 
    filtros.numero_final;

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Limpeza de Dados de Produção
          </CardTitle>
          <CardDescription>
            Remova registros de produção do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={modoExclusao} onValueChange={setModoExclusao} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="total">Exclusão Total</TabsTrigger>
              <TabsTrigger value="seletiva">Exclusão Seletiva</TabsTrigger>
            </TabsList>
            
            <TabsContent value="total" className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta ação é irreversível! Serão deletados TODOS os registros: reservas, baixas, sequências, numerações livres, bloqueios, notificações, alertas, movimentações de estoque, auditorias, tarefas, relatórios e KPIs.
                </AlertDescription>
              </Alert>
              
              <Button
                variant="destructive"
                onClick={() => setShowDialog(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Todos os Dados
              </Button>
            </TabsContent>
            
            <TabsContent value="seletiva" className="space-y-4">
              <Alert>
                <Filter className="h-4 w-4" />
                <AlertDescription>
                  Defina filtros para deletar apenas registros específicos. Deixe em branco para não filtrar.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {/* Código do Produto */}
                <div className="space-y-2">
                  <Label>Código do Produto (múltipla escolha)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite e pressione Enter"
                      value={inputValues.codigo}
                      onChange={(e) => setInputValues({...inputValues, codigo: e.target.value})}
                      onKeyPress={(e) => handleKeyPress(e, 'codigos')}
                      list="codigos-list"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addFiltro('codigos', inputValues.codigo)}
                    >
                      Adicionar
                    </Button>
                  </div>
                  <datalist id="codigos-list">
                    {codigosDisponiveis.map(cod => (
                      <option key={cod} value={cod} />
                    ))}
                  </datalist>
                  {filtros.codigos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filtros.codigos.map(cod => (
                        <Badge key={cod} variant="secondary" className="gap-1">
                          {cod}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeFiltro('codigos', cod)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <Label>Cliente (múltipla escolha)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite e pressione Enter"
                      value={inputValues.cliente}
                      onChange={(e) => setInputValues({...inputValues, cliente: e.target.value})}
                      onKeyPress={(e) => handleKeyPress(e, 'clientes')}
                      list="clientes-list"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addFiltro('clientes', inputValues.cliente)}
                    >
                      Adicionar
                    </Button>
                  </div>
                  <datalist id="clientes-list">
                    {clientesDisponiveis.map(cli => (
                      <option key={cli} value={cli} />
                    ))}
                  </datalist>
                  {filtros.clientes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filtros.clientes.map(cli => (
                        <Badge key={cli} variant="secondary" className="gap-1">
                          {cli}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeFiltro('clientes', cli)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modelo */}
                <div className="space-y-2">
                  <Label>Modelo (múltipla escolha)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite e pressione Enter"
                      value={inputValues.modelo}
                      onChange={(e) => setInputValues({...inputValues, modelo: e.target.value})}
                      onKeyPress={(e) => handleKeyPress(e, 'modelos')}
                      list="modelos-list"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addFiltro('modelos', inputValues.modelo)}
                    >
                      Adicionar
                    </Button>
                  </div>
                  <datalist id="modelos-list">
                    {modelosDisponiveis.map(mod => (
                      <option key={mod} value={mod} />
                    ))}
                  </datalist>
                  {filtros.modelos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filtros.modelos.map(mod => (
                        <Badge key={mod} variant="secondary" className="gap-1">
                          {mod}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeFiltro('modelos', mod)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Numeração */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numeração Inicial</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 1000"
                      value={filtros.numero_inicial}
                      onChange={(e) => setFiltros({...filtros, numero_inicial: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Numeração Final</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2000"
                      value={filtros.numero_final}
                      onChange={(e) => setFiltros({...filtros, numero_final: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Registros que corresponderem aos filtros serão deletados permanentemente!
                </AlertDescription>
              </Alert>
              
              <Button
                variant="destructive"
                onClick={() => setShowDialog(true)}
                className="gap-2"
                disabled={!temFiltrosAtivos}
              >
                <Trash2 className="w-4 h-4" />
                Limpar Dados Filtrados
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Limpeza
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {modoExclusao === 'total' ? (
              <>
                <p className="text-sm text-slate-700">
                  Você tem certeza que deseja deletar TODOS os dados de produção?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
                  <p><strong>Será deletado TODO E QUALQUER registro:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Todas as reservas de lotes</li>
                    <li>Todos os registros de baixa</li>
                    <li>Todas as sequências anuais</li>
                    <li>Todas as numerações livres</li>
                    <li>Todos os bloqueios de intervalo</li>
                    <li>Todas as notificações</li>
                    <li>Todos os alertas</li>
                    <li>Todas as movimentações de estoque</li>
                    <li>Todas as auditorias de produção</li>
                    <li>Todas as auditorias de usuários</li>
                    <li>Todas as tarefas agendadas</li>
                    <li>Todos os relatórios customizados</li>
                    <li>Todas as configurações de KPI</li>
                  </ul>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-emerald-800 font-bold">
                    ✅ PRESERVADOS: Produtos, Clientes, Setores e Usuários
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Estes dados cadastrais são mantidos e não serão deletados
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700">
                  Você tem certeza que deseja deletar os dados que correspondem aos filtros?
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p><strong>Filtros aplicados:</strong></p>
                  <ul className="space-y-1">
                    {filtros.codigos.length > 0 && (
                      <li>• Códigos: <strong>{filtros.codigos.join(', ')}</strong></li>
                    )}
                    {filtros.clientes.length > 0 && (
                      <li>• Clientes: <strong>{filtros.clientes.join(', ')}</strong></li>
                    )}
                    {filtros.modelos.length > 0 && (
                      <li>• Modelos: <strong>{filtros.modelos.join(', ')}</strong></li>
                    )}
                    {filtros.numero_inicial && <li>• Numeração inicial: <strong>{filtros.numero_inicial}</strong></li>}
                    {filtros.numero_final && <li>• Numeração final: <strong>{filtros.numero_final}</strong></li>}
                  </ul>
                </div>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Serão deletadas reservas, baixas e dados relacionados que corresponderem a estes critérios!
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLimpar}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirmar Limpeza
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}