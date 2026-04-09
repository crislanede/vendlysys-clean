import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/dashboard";
import AgendaPage from "./pages/agenda";
import ClientesPage from "./pages/clientes";
import FinanceiroPage from "./pages/financeiro";

function LayoutRoute({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <LayoutRoute>
              <DashboardPage />
            </LayoutRoute>
          }
        />

        <Route
          path="/agenda"
          element={
            <LayoutRoute>
              <AgendaPage />
            </LayoutRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <LayoutRoute>
              <ClientesPage />
            </LayoutRoute>
          }
        />

        <Route
          path="/financeiro"
          element={
            <LayoutRoute>
              <FinanceiroPage />
            </LayoutRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}