import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-background, #f8fafc)" }}
    >
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1800px] px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
