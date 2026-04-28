import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import ThemeLoader from "./components/theme/ThemeLoader";
import BloqueioTrial from "./components/BloqueioTrial";



import Login from "./pages/login";
import CadastroEmpresa from "./pages/CadastroEmpresa";
import Licencas from "./pages/licencas";
import AdminEmpresas from "./pages/admin-empresas";
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
import Pagamentos from "./pages/pagamentos";
import Despesas from "./pages/despesas";
import Caixa from "./pages/caixa";
import Comissoes from "./pages/comissoes";
import MarketingPacotes from "./pages/marketing-pacotes";
import Relatorios from "./pages/relatorios";
import RelatoriosRetorno from "./pages/relatorios-retorno";
import Bloqueios from "./pages/bloqueios";
import Configuracoes from "./pages/configuracoes";
import AnamneseConfiguracao from "./pages/anamnese-configuracao";

import Whatsapp from "./pages/whatsapp";
import WhatsappFila from "./pages/whatsapp-fila";
import WhatsappCampanha from "./pages/whatsapp-campanha";
import WhatsappMensagens from "./pages/whatsapp-mensagens";

import MeuEspaco from "./pages/meu-espaco";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeLoader />
      <BloqueioTrial />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro-empresa" element={<CadastroEmpresa />} />
        <Route path="/meu-espaco" element={<MeuEspaco />} />
        <Route path="/" element={<AppLayout />}></Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/licencas" replace />} />
          <Route path="licencas" element={<Licencas />} />
          <Route path="empresas" element={<AdminEmpresas />} />
        </Route>
        <Route path="nova-empresa" element={<NovaEmpresa />} />

        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/:slug" element={<MeuEspaco />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="consulta-agendamentos" element={<ConsultaAgendamentos />} />

          <Route path="clientes" element={<Clientes />} />
          <Route path="profissionais" element={<Profissionais />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="usuarios" element={<UsuariosEmpresa />} />

          <Route path="financeiro" element={<Financeiro />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="despesas" element={<Despesas />} />
          <Route path="caixa" element={<Caixa />} />
          <Route path="comissoes" element={<Comissoes />} />

          <Route path="marketing-pacotes" element={<MarketingPacotes />} />

          <Route path="whatsapp" element={<Whatsapp />} />
          <Route path="whatsapp-fila" element={<WhatsappFila />} />
          <Route path="whatsapp-campanha" element={<WhatsappCampanha />} />
          <Route path="whatsapp-mensagens" element={<WhatsappMensagens />} />

          <Route path="anamnese-configuracao" element={<AnamneseConfiguracao />} />
          <Route path="bloqueios" element={<Bloqueios />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="relatorios-retorno" element={<RelatoriosRetorno />} />
          <Route path="configuracoes" element={<Configuracoes />} />

          <Route path="nova-empresa" element={<NovaEmpresa />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}