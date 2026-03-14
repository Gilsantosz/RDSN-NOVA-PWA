/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Acesso from './pages/Acesso';
import AcessoInterno from './pages/AcessoInterno';
import Agendamento from './pages/Agendamento';
import Alertas from './pages/Alertas';
import Auditoria from './pages/Auditoria';
import AuditoriaNumeracao from './pages/AuditoriaNumeracao';
import Baixas from './pages/Baixas';
import ConfiguracaoAlertas from './pages/ConfiguracaoAlertas';
import ConfiguracoesGerais from './pages/ConfiguracoesGerais';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';
import EtiquetasLote from './pages/EtiquetasLote';
import GateAuth from './pages/GateAuth';
import Home from './pages/Home';
import Integracoes from './pages/Integracoes';
import LogsIntegracao from './pages/LogsIntegracao';
import PCPCadastroClientes from './pages/PCPCadastroClientes';
import PCPDashboard from './pages/PCPDashboard';
import RelatorioExecutivo from './pages/RelatorioExecutivo';
import PCPProgramacaoMensal from './pages/PCPProgramacaoMensal';
import PCPSimulacaoPlano from './pages/PCPSimulacaoPlano';
import Producao from './pages/Producao';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import Reservas from './pages/Reservas';
import Sequencias from './pages/Sequencias';
import Setores from './pages/Setores';
import TarefasAgendadas from './pages/TarefasAgendadas';
import Usuarios from './pages/Usuarios';
import PCPKanban from './pages/PCPKanban';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Acesso": Acesso,
    "AcessoInterno": AcessoInterno,
    "Agendamento": Agendamento,
    "Alertas": Alertas,
    "Auditoria": Auditoria,
    "AuditoriaNumeracao": AuditoriaNumeracao,
    "Baixas": Baixas,
    "ConfiguracaoAlertas": ConfiguracaoAlertas,
    "ConfiguracoesGerais": ConfiguracoesGerais,
    "Dashboard": Dashboard,
    "Estoque": Estoque,
    "EtiquetasLote": EtiquetasLote,
    "GateAuth": GateAuth,
    "Home": Home,
    "Integracoes": Integracoes,
    "LogsIntegracao": LogsIntegracao,
    "PCPCadastroClientes": PCPCadastroClientes,
    "PCPDashboard": PCPDashboard,
    "RelatorioExecutivo": RelatorioExecutivo,
    "PCPProgramacaoMensal": PCPProgramacaoMensal,
    "PCPSimulacaoPlano": PCPSimulacaoPlano,
    "Producao": Producao,
    "Produtos": Produtos,
    "Relatorios": Relatorios,
    "Reservas": Reservas,
    "Sequencias": Sequencias,
    "Setores": Setores,
    "TarefasAgendadas": TarefasAgendadas,
    "Usuarios": Usuarios,
    "PCPKanban": PCPKanban,
}

export const pagesConfig = {
    mainPage: "AcessoInterno",
    Pages: PAGES,
    Layout: __Layout,
};