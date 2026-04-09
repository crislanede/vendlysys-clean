import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar />

      <main className="flex-1">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div>
            <p className="text-sm text-slate-500">Bem-vinda de volta</p>
            <h2 className="text-lg font-semibold text-slate-800">VendlySys</h2>
          </div>

          <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
            C
          </div>
        </header>

        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}