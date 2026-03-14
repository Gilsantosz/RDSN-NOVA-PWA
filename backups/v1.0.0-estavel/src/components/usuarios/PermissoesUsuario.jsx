import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, Plus, Trash2 } from 'lucide-react';
import { MODULOS_PERMISSOES } from '@/components/hooks/usePermissoes';

function getIcon(label) {
  if (label.includes('Visualizar')) return <Eye className="w-3 h-3 text-slate-400" />;
  if (label.includes('Editar') || label.includes('Registrar') || label.includes('Fechar') || label.includes('Configurar') || label.includes('Gerenciar') || label.includes('Ajustar')) return <Edit3 className="w-3 h-3 text-blue-400" />;
  if (label.includes('Criar') || label.includes('Exportar')) return <Plus className="w-3 h-3 text-green-400" />;
  if (label.includes('Excluir') || label.includes('Cancelar')) return <Trash2 className="w-3 h-3 text-red-400" />;
  return null;
}

export default function PermissoesUsuario({ permissoes = {}, onChange }) {
  const handleToggle = (key) => {
    onChange({ ...permissoes, [key]: !permissoes[key] });
  };

  const handleModuloToggle = (modulo, ativar) => {
    const novas = { ...permissoes };
    modulo.acoes.forEach(a => { novas[a.key] = ativar; });
    onChange(novas);
  };

  const isModuloCompleto = (modulo) => modulo.acoes.every(a => permissoes[a.key] === true);
  const isModuloParcial = (modulo) => modulo.acoes.some(a => permissoes[a.key] === true) && !isModuloCompleto(modulo);

  return (
    <div className="space-y-3">
      {MODULOS_PERMISSOES.map((modulo) => {
        const completo = isModuloCompleto(modulo);
        const parcial = isModuloParcial(modulo);
        return (
          <Card key={modulo.modulo} className="border-slate-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  {modulo.label}
                  {completo && <Badge className="bg-green-100 text-green-800 text-[10px]">Completo</Badge>}
                  {parcial && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Parcial</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Tudo</span>
                  <Switch checked={completo} onCheckedChange={(v) => handleModuloToggle(modulo, v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modulo.acoes.map((acao) => (
                  <label
                    key={acao.key}
                    className="flex items-center justify-between p-2 rounded-md border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getIcon(acao.label)}
                      <span className="text-xs text-slate-700">{acao.label}</span>
                    </div>
                    <Switch
                      checked={permissoes[acao.key] === true}
                      onCheckedChange={() => handleToggle(acao.key)}
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}