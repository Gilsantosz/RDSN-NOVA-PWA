import React from 'react';
import { useSetor } from '@/components/context/SetorContext';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { AlertTriangle, Factory } from 'lucide-react';

/**
 * Guard que bloqueia acesso/registro PCP se nenhum setor específico estiver selecionado.
 * Usado em páginas e modais do módulo PCP.
 * 
 * @param {string} [action] - Descrição da ação bloqueada (ex: "criar nova OP")
 * @param {boolean} [inline] - Se true, renderiza como banner em vez de bloquear tela inteira
 * @param {React.ReactNode} children - Conteúdo a renderizar quando desbloqueado
 */
export default function PCPSetorGuard({ children, action = 'realizar esta ação', inline = false }) {
  const { setorAtivo, isAdmin } = useSetor();

  const { data: setores = [] } = useQuery({
    queryKey: ['setores-all'],
    queryFn: () => rdsn.entities.Setor.list('nome', 200),
    staleTime: 60000,
  });
  const setor = setores.find(s => s.id === setorAtivo) || null;

  const bloqueado = !setorAtivo || setorAtivo === 'ALL';

  if (!bloqueado) return children;

  const nomeSetor = setor?.nome || setorAtivo;

  if (inline) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3 text-sm text-amber-800 mb-4">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
        <div>
          <strong>Setor não selecionado.</strong> Para {action}, selecione um setor específico no seletor de setor no topo da página.
          Registros PCP são isolados por setor.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
        <Factory className="w-10 h-10 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Setor não selecionado</h2>
      <p className="text-slate-500 max-w-sm mb-4">
        Para {action}, selecione um <strong>setor específico</strong> no seletor de setor no topo da página.
      </p>
      <div className="px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
        ⚠ Os dados PCP são isolados por setor. Selecione seu setor para continuar.
      </div>
    </div>
  );
}

/**
 * Hook para obter o setor ativo com nome, para exibir em formulários
 */
export function usePCPSetor() {
  const { setorAtivo, isAdmin } = useSetor();
  const bloqueado = !setorAtivo || setorAtivo === 'ALL';

  const { data: setores = [] } = useQuery({
    queryKey: ['setores-all'],
    queryFn: () => rdsn.entities.Setor.list('nome', 200),
    staleTime: 60000,
  });

  const setor = setores.find(s => s.id === setorAtivo) || null;

  return { setorAtivo, bloqueado, setor, nomeSetor: setor?.nome || (bloqueado ? 'Todos os Setores' : setorAtivo) };
}