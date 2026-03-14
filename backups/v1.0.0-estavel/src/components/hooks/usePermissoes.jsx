import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';

// Definição centralizada de todos os módulos e ações granulares
export const MODULOS_PERMISSOES = [
  {
    modulo: 'dashboard',
    label: 'Dashboard',
    acoes: [
      { key: 'dashboard.visualizar', label: 'Visualizar Dashboard' },
    ]
  },
  {
    modulo: 'reservas',
    label: 'Reservas',
    acoes: [
      { key: 'reservas.visualizar', label: 'Visualizar' },
      { key: 'reservas.criar', label: 'Criar' },
      { key: 'reservas.editar', label: 'Editar' },
      { key: 'reservas.excluir', label: 'Excluir / Cancelar' },
      { key: 'reservas.baixa', label: 'Registrar Baixas' },
      { key: 'reservas.exportar', label: 'Exportar' },
    ]
  },
  {
    modulo: 'producao',
    label: 'Produção',
    acoes: [
      { key: 'producao.visualizar', label: 'Visualizar' },
      { key: 'producao.registrar', label: 'Registrar Produção' },
      { key: 'producao.fechar', label: 'Fechar Sessão' },
    ]
  },
  {
    modulo: 'baixas',
    label: 'Baixas',
    acoes: [
      { key: 'baixas.visualizar', label: 'Visualizar' },
      { key: 'baixas.registrar', label: 'Registrar' },
    ]
  },
  {
    modulo: 'estoque',
    label: 'Estoque',
    acoes: [
      { key: 'estoque.visualizar', label: 'Visualizar' },
      { key: 'estoque.editar', label: 'Editar / Ajustar' },
      { key: 'estoque.configurar', label: 'Configurar Mínimos' },
    ]
  },
  {
    modulo: 'clientes',
    label: 'Clientes',
    acoes: [
      { key: 'clientes.visualizar', label: 'Visualizar' },
      { key: 'clientes.criar', label: 'Criar' },
      { key: 'clientes.editar', label: 'Editar' },
      { key: 'clientes.excluir', label: 'Excluir' },
    ]
  },
  {
    modulo: 'produtos',
    label: 'Produtos',
    acoes: [
      { key: 'produtos.visualizar', label: 'Visualizar' },
      { key: 'produtos.criar', label: 'Criar' },
      { key: 'produtos.editar', label: 'Editar' },
      { key: 'produtos.excluir', label: 'Excluir' },
    ]
  },
  {
    modulo: 'relatorios',
    label: 'Relatórios',
    acoes: [
      { key: 'relatorios.visualizar', label: 'Visualizar' },
      { key: 'relatorios.exportar', label: 'Exportar' },
    ]
  },
  {
    modulo: 'auditoria',
    label: 'Auditoria',
    acoes: [
      { key: 'auditoria.visualizar', label: 'Visualizar Auditoria' },
      { key: 'auditoria.usuarios', label: 'Auditoria de Usuários' },
    ]
  },
  {
    modulo: 'alertas',
    label: 'Alertas',
    acoes: [
      { key: 'alertas.visualizar', label: 'Visualizar' },
      { key: 'alertas.gerenciar', label: 'Gerenciar / Configurar' },
    ]
  },
  {
    modulo: 'agendamento',
    label: 'Agendamento',
    acoes: [
      { key: 'agendamento.visualizar', label: 'Visualizar' },
      { key: 'agendamento.editar', label: 'Editar' },
    ]
  },
  {
    modulo: 'pcp',
    label: 'PCP - Planejamento',
    acoes: [
      { key: 'pcp.visualizar', label: 'Visualizar Prog. Mensal' },
      { key: 'pcp.editar', label: 'Editar OPs e Produção' },
      { key: 'pcp.simulacao', label: 'Simulação de Plano' },
      { key: 'pcp.clientes', label: 'Cadastro de Clientes PCP' },
    ]
  },
  {
    modulo: 'usuarios',
    label: 'Usuários',
    acoes: [
      { key: 'usuarios.visualizar', label: 'Visualizar' },
      { key: 'usuarios.criar', label: 'Criar' },
      { key: 'usuarios.editar', label: 'Editar' },
      { key: 'usuarios.excluir', label: 'Excluir' },
      { key: 'usuarios.permissoes', label: 'Gerenciar Permissões' },
    ]
  },
  {
    modulo: 'setores',
    label: 'Setores',
    acoes: [
      { key: 'setores.visualizar', label: 'Visualizar' },
      { key: 'setores.editar', label: 'Editar' },
    ]
  },
  {
    modulo: 'integracoes',
    label: 'Integrações',
    acoes: [
      { key: 'integracoes.visualizar', label: 'Visualizar' },
      { key: 'integracoes.editar', label: 'Editar' },
    ]
  },
  {
    modulo: 'configuracoes',
    label: 'Configurações',
    acoes: [
      { key: 'configuracoes.visualizar', label: 'Visualizar' },
      { key: 'configuracoes.editar', label: 'Editar' },
    ]
  },
];

// Mapeamento de navigation pages -> permissão necessária para acessar
export const PERMISSAO_PAGINA = {
  Dashboard: 'dashboard.visualizar',
  Alertas: 'alertas.visualizar',
  Agendamento: 'agendamento.visualizar',
  Reservas: 'reservas.visualizar',
  Producao: 'producao.visualizar',
  Baixas: 'baixas.visualizar',
  EtiquetasLote: 'producao.visualizar',
  Estoque: 'estoque.visualizar',
  Relatorios: 'relatorios.visualizar',
  AuditoriaNumeracao: 'auditoria.visualizar',
  Sequencias: 'setores.visualizar',
  Setores: 'setores.visualizar',
  ConfiguracaoAlertas: 'alertas.gerenciar',
  Executivo: 'relatorios.visualizar',
  Usuarios: 'usuarios.visualizar',
  Auditoria: 'auditoria.visualizar',
  Integracoes: 'integracoes.visualizar',
  LogsIntegracao: 'integracoes.visualizar',
  ConfiguracoesGerais: 'configuracoes.visualizar',
  TarefasAgendadas: 'agendamento.editar',
  Clientes: 'clientes.visualizar',
  Produtos: 'produtos.visualizar',
  PCPProgramacaoMensal: 'pcp.visualizar',
  PCPSimulacaoPlano: 'pcp.simulacao',
  PCPCadastroClientes: 'pcp.clientes',
};

export function usePermissoes() {
  const { data: currentUser } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => {
      const user = localStorage.getItem('internalUser');
      return user ? JSON.parse(user) : null;
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Buscar o role do usuário e suas permissões consolidadas
  const { data: rolePermissoes } = useQuery({
    queryKey: ['role-permissoes', currentUser?.role_custom],
    queryFn: async () => {
      if (!currentUser?.role_custom) return {};
      const roles = await base44.entities.PermissaoRole.filter({ role: currentUser.role_custom });
      if (roles.length > 0 && roles[0].permissoes) {
        return roles[0].permissoes;
      }
      return {};
    },
    enabled: !!currentUser?.role_custom,
    staleTime: 0,
    gcTime: 0,
  });

  const isAdmin = currentUser?.role_custom === 'Admin';

  // Permissões efetivas: customizadas do usuário sobrescrevem as do role
  const permissoesEfetivas = React.useMemo(() => {
    const rolePerms = rolePermissoes || {};
    const userPerms = currentUser?.permissoes_customizadas || {};
    return { ...rolePerms, ...userPerms };
  }, [rolePermissoes, currentUser?.permissoes_customizadas]);

  const temPermissao = (permissaoKey) => {
    if (isAdmin) return true;
    if (!permissaoKey) return false;

    // Checa permissão no formato novo (modulo.acao)
    if (permissoesEfetivas[permissaoKey] === true) return true;

    // Retrocompat: checa formato antigo (ex: criar_reservas -> reservas.criar)
    const legacyMap = {
      acessar_dashboard: 'dashboard.visualizar',
      criar_reservas: 'reservas.criar',
      editar_reservas: 'reservas.editar',
      deletar_reservas: 'reservas.excluir',
      registrar_producao: 'producao.registrar',
      gerenciar_estoque: 'estoque.editar',
      visualizar_relatorios: 'relatorios.visualizar',
      exportar_dados: 'relatorios.exportar',
      visualizar_auditoria: 'auditoria.visualizar',
      criar_usuarios: 'usuarios.criar',
      editar_usuarios: 'usuarios.editar',
      deletar_usuarios: 'usuarios.excluir',
      acessar_agendamento: 'agendamento.visualizar',
    };
    const mappedKey = legacyMap[permissaoKey];
    if (mappedKey && permissoesEfetivas[mappedKey] === true) return true;

    return false;
  };

  const temQualquerPermissao = (permissoesList) => {
    if (isAdmin) return true;
    return permissoesList.some(perm => temPermissao(perm));
  };

  const temTodasPermissoes = (permissoesList) => {
    if (isAdmin) return true;
    return permissoesList.every(perm => temPermissao(perm));
  };

  return {
    temPermissao,
    temQualquerPermissao,
    temTodasPermissoes,
    isAdmin,
    permissoes: permissoesEfetivas,
    currentUser,
    rolePermissoes: rolePermissoes || {},
  };
}