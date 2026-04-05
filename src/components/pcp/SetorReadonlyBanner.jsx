import React from 'react';
import { useSetor } from '@/components/context/SetorContext';
import { Eye } from 'lucide-react';

/**
 * Banner exibido quando o usuário está em modo "Todos os Setores" (ALL).
 * Indica que a página está em modo somente leitura.
 */
/**
 * Componente funcional para auxiliar outros componentes a verificarem readonly
 */
export function useSetorReadonly() {
  const { setorAtivo } = useSetor();
  return setorAtivo === 'ALL';
}

export default function SetorReadonlyBanner() {
  const isReadonly = useSetorReadonly();
  if (!isReadonly) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-sm mb-4">
      <Eye className="w-4 h-4 flex-shrink-0 text-blue-500" />
      <div>
        <strong>Modo Visualização</strong> — Você está visualizando <em>todos os setores</em>.
        Para editar, selecione um setor específico no seletor acima.
      </div>
    </div>
  );
}
