import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: "admin" | "agenda";
  ativo: boolean;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarUsuarios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, perfil, ativo")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar usuários:", error);
      setUsuarios([]);
      setLoading(false);
      return;
    }

    setUsuarios((data || []) as Usuario[]);
    setLoading(false);
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function alterarPerfil(id: string, novoPerfil: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ perfil: novoPerfil })
      .eq("id", id);

    if (error) {
      console.error("Erro ao alterar perfil:", error);
      alert("Erro ao alterar perfil.");
      return;
    }

    carregarUsuarios();
  }

  async function toggleAtivo(id: string, ativoAtual: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ ativo: !ativoAtual })
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar usuário:", error);
      alert("Erro ao atualizar usuário.");
      return;
    }

    carregarUsuarios();
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-slate-500">Gerencie perfis e acessos</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p>Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p>Nenhum usuário encontrado.</p>
        ) : (
          usuarios.map((u) => (
            <div
              key={u.id}
              className="bg-white border rounded-lg p-4 flex justify-between items-center gap-4"
            >
              <div>
                <p className="font-semibold">{u.nome || "Sem nome"}</p>
                <p className="text-sm text-slate-500">{u.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={u.perfil}
                  onChange={(e) => alterarPerfil(u.id, e.target.value)}
                  className="border p-2 rounded"
                >
                  <option value="agenda">agenda</option>
                  <option value="admin">admin</option>
                </select>

                <button
                  type="button"
                  onClick={() => toggleAtivo(u.id, u.ativo)}
                  className={`px-4 py-2 rounded text-white ${
                    u.ativo ? "bg-green-600" : "bg-gray-500"
                  }`}
                >
                  {u.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}