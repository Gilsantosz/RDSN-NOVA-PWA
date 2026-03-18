import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, Plus, Trash } from 'lucide-react';
import { MODULOS_PERMISSOES } from '@/components/hooks/usePermissoes';
import { cn } from '@/lib/utils';

function getIcon(label) {
  if (label.includes('Visualizar')) return <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors" />;
  if (label.includes('Editar') || label.includes('Registrar') || label.includes('Fechar') || label.includes('Configurar') || label.includes('Gerenciar') || label.includes('Ajustar')) return <Edit3 className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" />;
  if (label.includes('Criar') || label.includes('Exportar')) return <Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />;
  if (label.includes('Excluir') || label.includes('Cancelar')) return <Trash className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 transition-colors" />;
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
    <div className="space-y-6">
      {MODULOS_PERMISSOES.map((modulo) => {
        const completo = isModuloCompleto(modulo);
        const parcial = isModuloParcial(modulo);
        return (
          <Card key={modulo.modulo} className="group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/20 overflow-hidden shadow-sm dark:shadow-none backdrop-blur-3xl rounded-[2rem] transition-all hover:shadow-lg dark:hover:shadow-purple-500/5 hover:-translate-y-0.5">
            <CardHeader className="relative border-b border-slate-100 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.01] py-4 px-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative z-10">
                <CardTitle className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-800 dark:text-white italic flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  {modulo.label}
                  <div className="flex gap-2">
                    {completo && <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 shadow-none rounded-full">Acesso Total</Badge>}
                    {parcial && <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 shadow-none rounded-full">Acesso Parcial</Badge>}
                  </div>
                </CardTitle>
                <div className="flex items-center gap-4 bg-white/50 dark:bg-white/[0.03] px-4 py-2 rounded-full border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Master Toggle</span>
                  <Switch 
                    checked={completo} 
                    onCheckedChange={(v) => handleModuloToggle(modulo, v)}
                    className="data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500 scale-90"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modulo.acoes.map((acao) => (
                  <label
                    key={acao.key}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group/item relative overflow-hidden",
                      permissoes[acao.key] 
                        ? "bg-slate-50 dark:bg-white/[0.06] border-purple-500/20 dark:border-purple-500/30 shadow-sm" 
                        : "bg-transparent border-slate-100 dark:border-white/[0.02] hover:bg-slate-50/50 dark:hover:bg-white/[0.03] hover:border-slate-200 dark:hover:border-white/10"
                    )}
                  >
                    {permissoes[acao.key] && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -mr-8 -mt-8 blur-xl" />
                    )}
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        permissoes[acao.key] 
                          ? "bg-white dark:bg-slate-800 shadow-xl shadow-purple-500/10 border border-purple-500/10" 
                          : "bg-slate-50/50 dark:bg-slate-900 border border-transparent"
                      )}>
                        {getIcon(acao.label)}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider transition-colors",
                          permissoes[acao.key] ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                        )}>
                          {acao.label}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 opacity-60">
                           Acesso Nível {permissoes[acao.key] ? 'Ativado' : 'Restrito'}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={permissoes[acao.key] === true}
                      onCheckedChange={() => handleToggle(acao.key)}
                      className="data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500 scale-75"
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