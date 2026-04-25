import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout"; // ✅ correto

// Páginas
import Dashboard from "./pages/dashboard";
import Agenda from "./pages/agenda";
import Clientes from "./pages/clientes";
import Whatsapp from "./pages/whatsapp";
import WhatsappCampanha from "./pages/whatsapp-campanha";
import WhatsappMensagens from "./pages/whatsapp-mensagens";
import MeuEspaco from "./pages/meu-espaco";
import Login from "./pages/login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Área do cliente */}
        <Route path="/meu-espaco" element={<MeuEspaco />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Sistema */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clientes" element={<Clientes />} />

          {/* WhatsApp */}
          <Route path="whatsapp" element={<Whatsapp />} />
          <Route path="whatsapp-campanha" element={<WhatsappCampanha />} />
          <Route path="whatsapp-mensagens" element={<WhatsappMensagens />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
} 