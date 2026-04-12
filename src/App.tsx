import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ServicosPage from "./pages/servicos";
import { AuthProvider, useAuth } from "./context/AuthContext";


import DashboardPage from "./pages/dashboard";
import AgendaPage from "./pages/agenda";
import ClientesPage from "./pages/clientes";
import FinanceiroPage from "./pages/financeiro";
import UsuariosPage from "./pages/usuarios";
import LoginPage from "./pages/login";

function LayoutRoute({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

function ProtectedRoute({
  children,
  perfisPermitidos,
}: {
  children: React.ReactNode;
  perfisPermitidos: string[];
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !profile.ativo) {
    return <div className="p-6">Usuário sem acesso.</div>;
  }

  if (!perfisPermitidos.includes(profile.perfil)) {
    return <Navigate to="/agenda" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (user) {
    return <Navigate to="/agenda" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* LOGIN */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* ROOT */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute perfisPermitidos={["admin"]}>
                <LayoutRoute>
                  <DashboardPage />
                </LayoutRoute>
              </ProtectedRoute>
            }
          />

          {/* AGENDA */}
          <Route
  path="/servicos"
  element={
    <ProtectedRoute perfisPermitidos={["admin"]}>
      <LayoutRoute>
        <ServicosPage />
      </LayoutRoute>
    </ProtectedRoute>
  }
/>
          <Route
            path="/agenda"
            element={
              <ProtectedRoute perfisPermitidos={["admin", "agenda"]}>
                <LayoutRoute>
                  <AgendaPage />
                </LayoutRoute>
              </ProtectedRoute>
            }
          />

          {/* CLIENTES */}
          <Route
            path="/clientes"
            element={
              <ProtectedRoute perfisPermitidos={["admin", "agenda"]}>
                <LayoutRoute>
                  <ClientesPage />
                </LayoutRoute>
              </ProtectedRoute>
            }
          />

          {/* FINANCEIRO */}
          <Route
            path="/financeiro"
            element={
              <ProtectedRoute perfisPermitidos={["admin"]}>
                <LayoutRoute>
                  <FinanceiroPage />
                </LayoutRoute>
              </ProtectedRoute>
            }
          />

          {/* USUÁRIOS */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute perfisPermitidos={["admin"]}>
                <LayoutRoute>
                  <UsuariosPage />
                </LayoutRoute>
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}