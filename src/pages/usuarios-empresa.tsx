import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type UsuarioEmpresa = {
  id: string;
  user_id: string | null;
  empresa_id: string;
  perfil: string | null;
  ativo: boolean | null;
  convite_email: string | null;
  criado_em: string | null;
};

const perfis = [
  { value: "admin_empresa", label: "Admin da empresa" },
  { value: "profissional", label: "Profissional" },
  { value: "atendente", label: "Atendente" },
  { value: "financeiro", label: "Financeiro" },
];

export default function UsuariosEmpresa() {
  const { empresaId, carregandoEmpresa } = useEmpresa();

  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("atendente");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (empresaId) carregarUsuarios();
  }, [empresaId]);

  async function carregarUsuarios() {
    if (!empresaId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("usuarios_empresas")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("criado_em", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Erro ao carregar usuários: " + error.message);
      return;
    }

    setUsuarios(data || []);
  }

  async function adicionarUsuario() {
    if (!empresaId) {
      alert("Empresa não encontrada.");
      return;
    }

    if (!email.trim()) {
      alert("Informe o e-mail.");
      return;
    }

    setSalvando(true);

    const emailLimpo = email.trim().toLowerCase();

    const { data: existente } = await supabase
      .from("usuarios_empresas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("convite_email", emailLimpo)
      .maybeSingle();

    if (existente) {
      setSalvando(false);
      alert("Usuário já vinculado ou convidado.");
      return;
    }

    const { error } = await supabase.from("usuarios_empresas").insert({
      empresa_id: empresaId,
      user_id: null,
      convite_email: emailLimpo,
      perfil,
      ativo: true,
    });

    setSalvando(false);

    if (error) {
      alert(error.message);
      return;
    }

    setEmail("");
    setPerfil("atendente");
    carregarUsuarios();
  }

  async function alterarPerfil(id: string, novoPerfil: string) {
    const { error } = await supabase
      .from("usuarios_empresas")
      .update({ perfil: novoPerfil })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregarUsuarios();
  }

  async function alterarStatus(id: string, ativo: boolean) {
    const { error } = await supabase
      .from("usuarios_empresas")
      .update({ ativo })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregarUsuarios();
  }

  async function remover(id: string) {
    if (!confirm("Remover usuário?")) return;

    const { error } = await supabase
      .from("usuarios_empresas")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(error.message);
      return;
    }

    carregarUsuarios();
  }

  function nomePerfil(valor: string | null) {
    return (
      perfis.find((p) => p.value === valor)?.label ||
      valor ||
      "-"
    );
  }

  if (carregandoEmpresa) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!empresaId) {
    return <div className="p-6">Empresa não encontrada</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-sm font-bold text-pink-600 uppercase">
          Sistema
        </p>
        <h1 className="text-3xl font-bold">
          Usuários da empresa
        </h1>
        <p className="text-gray-500">
          Gerencie acessos ao sistema.
        </p>
      </div>

      {/* ADD */}
      <div className="bg-white p-5 rounded-2xl shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-xl px-4 py-3 md:col-span-2"
          />

          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            {perfis.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            onClick={adicionarUsuario}
            disabled={salvando}
            className="bg-pink-600 text-white rounded-xl font-bold"
          >
            {salvando ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6">Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4 text-left">E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {u.convite_email || u.user_id}
                  </td>

                  <td>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">
                        {nomePerfil(u.perfil)}
                      </span>

                      <select
                        value={u.perfil || "atendente"}
                        onChange={(e) =>
                          alterarPerfil(u.id, e.target.value)
                        }
                        className="border rounded-xl px-2 py-1"
                      >
                        {perfis.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        u.ativo
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td>
                    {u.criado_em
                      ? new Date(u.criado_em).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    <div className="flex gap-2 justify-end pr-4">
                      <button
                        onClick={() =>
                          alterarStatus(u.id, !u.ativo)
                        }
                        className="text-xs border px-2 py-1 rounded"
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        onClick={() => remover(u.id)}
                        className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}