import Sidebar from "./Sidebar";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Painel administrativo</p>
            <h2 className="text-xl font-semibold text-slate-800">VendlySys</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition">
              Notificações
            </button>

            <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
              C
            </div>
          </div>
        </header>

        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}