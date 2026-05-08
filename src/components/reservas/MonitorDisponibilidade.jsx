import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';

export default function MonitorDisponibilidade({ letraProduto, ano, setorId }) {

  const { data: sequencia } = useQuery({
    queryKey: ['sequencia-monitor', letraProduto, ano, setorId],
    queryFn: async () => {
      const seqs = await rdsn.entities.SequenciaAnual.filter({
        letra_produto: letraProduto,
        ano: ano,
        setor_id: setorId
      });
      return seqs[0] || null;
    },
    enabled: !!letraProduto && !!ano && !!setorId
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-monitor', letraProduto, ano, setorId],
    queryFn: async () => {
      return await rdsn.entities.ReservaLote.filter({
        letra_produto: letraProduto,
        ano: ano,
        setor_id: setorId
      });
    },
    enabled: !!letraProduto && !!ano && !!setorId
  });

  const { data: numeracoesLivres = [] } = useQuery({
    queryKey: ['numeracoes-livres-monitor', letraProduto, ano, setorId],
    queryFn: async () => {
      return await rdsn.entities.NumeracaoLivre.filter({
        letra_produto: letraProduto,
        ano: ano,
        setor_id: setorId,
        disponivel: true
      });
    },
    enabled: !!letraProduto && !!ano && !!setorId
  });

  // Cálculos removidos - limite expandido para >1M, sem risco de esgotamento
  const _numeroAtual = sequencia?.ultimo_numero || 0;
  
  const _totalReservado = reservas.reduce((acc, r) => acc + r.quantidade, 0);
  const _totalProduzido = reservas.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);
  const _totalDisponivel = numeracoesLivres.reduce((acc, n) => acc + n.quantidade, 0);

  // Componente removido - sem risco de esgotamento com limite >1M
  return null;
}