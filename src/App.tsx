import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import AdminSaasLayout from "./components/AdminSaasLayout";
import AdminRoute from "./components/AdminRoute";
import ThemeLoader from "./components/theme/ThemeLoader";
import Whatsapp from "./pages/whatsapp";
import WhatsappFila from "./pages/whatsapp-fila";

import Login from "./pages/login";
import ResetarSenha from "./pages/resetar-senha";
import CadastroEmpresa from "./pages/CadastroEmpresa";

import Licencas from "./pages/licencas";
import AdminEmpresas from "./pages/admin-empresas";
import AdminUsuarios from "./pages/admin-usuarios";
import NovaEmpresa from "./pages/NovaEmpresa";
import UsuariosEmpresa from "./pages/usuarios-empresa";

import Dashboard from "./pages/dashboard";
import Agenda from "./pages/agenda";
import ConsultaAgendamentos from "./pages/consulta-agendamentos";

import Clientes from "./pages/clientes";
import Profissionais from "./pages/profissionais";
import Servicos from "./pages/servicos";
import Produtos from "./pages/produtos";

import Financeiro from "./pages/financeiro";
import Caixa from "./pages/caixa";
import Comissoes from "./pages/comissoes";
import Pagamentos from "./pages/pagamentos";
import Despesas from "./pages/despesas";

import MeuEspaco from "./pages/meu-espaco";

import MarketingPacotes from "./pages/marketing-pacotes";
import PacotesClientesPage from "./pages/marketing-pacotes";

import Relatorios from "./pages/relatorios";
import RelatoriosRetorno from "./pages/relatorios-retorno";

import Campanhas from "./pages/whatsapp-campanha";
import Bloqueios from "./pages/bloqueios";

import AnamneseConfiguracao from "./pages/anamnese-configuracao";
import WhatsappMensagens from "./pages/whatsapp-mensagens";
import Configuracoes from "./pages/configuracoes";

import Manual from "./pages/manual";

function App() {
  return (
    <BrowserRouter>
      <ThemeLoader />

      <Routes>
        {/* ROTAS PÚBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />
        <Route path="/cadastro-empresa" element={<CadastroEmpresa />} />
        <Route path="/meu-espaco" element={<MeuEspaco />} />

        {/* ADMIN SAAS */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminSaasLayout />
            </AdminRoute>
          }
        >
          <Route path="empresas" element={<AdminEmpresas />} />
          <Route path="usuarios" element={<AdminUsuarios />} />
          <Route path="nova-empresa" element={<NovaEmpresa />} />
          <Route path="usuarios-empresa" element={<UsuariosEmpresa />} />
          <Route path="licencas" element={<Licencas />} />
        </Route>

        {/* SISTEMA INTERNO */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route
            path="consulta-agendamentos"
            element={<ConsultaAgendamentos />}
          />

          <Route path="clientes" element={<Clientes />} />
          <Route path="profissionais" element={<Profissionais />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="produtos" element={<Produtos />} />

          <Route path="marketing-pacotes" element={<MarketingPacotes />} />
          <Route path="pacotes-clientes" element={<PacotesClientesPage />} />

          <Route path="financeiro" element={<Financeiro />} />
          <Route path="caixa" element={<Caixa />} />
          <Route path="comissoes" element={<Comissoes />} />
          <Route path="minhas-comissoes" element={<Comissoes />} />
          <Route path="despesas" element={<Despesas />} />
          <Route path="pagamentos" element={<Pagamentos />} />

          <Route path="relatorios" element={<Relatorios />} />
          <Route path="relatorios-retorno" element={<RelatoriosRetorno />} />

          <Route
            path="anamnese-configuracao"
            element={<AnamneseConfiguracao />}
          />
          <Route path="whatsapp" element={<Whatsapp />} />
<Route path="whatsapp-fila" element={<WhatsappFila />} />
          <Route path="whatsapp-mensagens" element={<WhatsappMensagens />} />
          <Route path="campanhas" element={<Campanhas />} />
          <Route path="bloqueios" element={<Bloqueios />} />
          <Route path="configuracoes" element={<Configuracoes />} />

          <Route path="manual" element={<Manual tipo="admin" />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;