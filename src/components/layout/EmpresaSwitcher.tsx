import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEmpresa } from "../../hooks/useEmpresa";

export default function EmpresaSwitcher() {
  const { empresas, empresaNome, trocarEmpresa } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  if (!empresas || empresas.length === 0) return null;

  function irParaNovaEmpresa() {
    setAberto(false);
    navigate("/nova-empresa");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-xl font-semibold backdrop-blur"
      >
        {empresaNome || "Meus estabelecimentos"}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                Meus estabelecimentos
              </h2>

              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {empresas.map((empresa) => (
                <button
                  key={empresa.id}
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    trocarEmpresa(empresa.id);
                  }}
                  className="w-full text-left px-4 py-3 border rounded-xl hover:bg-gray-100 flex justify-between items-center"
                >
                  <span>{empresa.nome}</span>
                  <span className="text-gray-400">›</span>
                </button>
              ))}
            </div>

            <div className="my-4 border-t" />

            <button
              type="button"
              onClick={irParaNovaEmpresa}
              style={{ backgroundColor: "var(--cor-primaria, #4b2f3f)" }}
              className="w-full text-white rounded-xl py-3 font-bold hover:opacity-90 transition"
            >
              + Nova empresa
            </button>
          </div>
        </div>
      )}
    </>
  );
}