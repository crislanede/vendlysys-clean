import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useEmpresa } from "../hooks/useEmpresa";

type Usuario = {
  id: string;
  nome: string | null;
  email: string | null;
  ativo: boolean;
};

const perfis = [
  { value: "admin", label: "Admin" },
  { value: "recepcao", label: "Recepção" },
  { value: "consulta", label: "Consulta" },
  { value: "profissional", label: "Profissional" },
  { value: "financeiro", label: "Financeiro" },
];

export default function UsuariosEmpresa() {
  const { empresaId, empresaNome } = useEmpresa();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vinculos, setVinculos] = useState<any[]>([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);

  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("recepcao");

  useEffect(() => {
    if (empresaId) carregarDados();
  }, [empresaId]);

  async function carregarDados() {
    const { data: usuariosData } = await supabase.from("usuarios").select("*");

    const { data: vinculosData } = await supabase
      .from("usuarios_empresas")
      .select("*")
      .eq("empresa_id", empresaId);

    setUsuarios(usuariosData || []);
    setVinculos(vinculosData || []);
  }

  function getVinculo(userId: string) {
    return vinculos.find((v) => v.user_id === userId);
  }

  function abrirModalNovo() {
    setUsuarioSelecionado(null);
    setEmail("");
    setPerfil("recepcao");
    setModalAberto(true);
  }

  function abrirModalEditar(usuario: Usuario) {
    const vinculo = getVinculo(usuario.id);

    setUsuarioSelecionado(usuario);
    setEmail(usuario.email || "");
    setPerfil(vinculo?.perfil || "recepcao");
    setModalAberto(true);
  }

  async function salvar() {
    if (!email) return;

    const { data: user } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (!user) {
      alert("Usuário não encontrado");
      return;
    }

    await supabase.from("usuarios_empresas").upsert({
      user_id: user.id,
      empresa_id: empresaId,
      perfil,
      ativo: true,
    });

    setModalAberto(false);
    carregarDados();
  }

  async function alterarStatus(userId: string, ativo: boolean) {
    await supabase
      .from("usuarios_empresas")
      .update({ ativo })
      .eq("user_id", userId)
      .eq("empresa_id", empresaId);

    carregarDados();
  }

  async function remover(userId: string) {
    await supabase
      .from("usuarios_empresas")
      .delete()
      .eq("user_id", userId)
      .eq("empresa_id", empresaId);

    carregarDados();
  }

  async function resetarSenha(email: string | null) {
    if (!email) return;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/resetar-senha",
    });

    alert("E-mail enviado");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuários da empresa</h1>
          <p className="text-gray-500">Gerencie acessos</p>
        </div>

        <button
          onClick={abrirModalNovo}
          className="bg-indigo-700 text-white px-4 py-2 rounded-xl"
        >
          + Adicionar usuário
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Nome</th>
              <th className="p-4 text-left">E-mail</th>
              <th className="p-4 text-left">Perfil</th>
              <th className="p-4 text-left">Empresa</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map((u) => {
              const vinculo = getVinculo(u.id);
              if (!vinculo) return null;

              return (
                <tr key={u.id} className="border-t">
                  <td className="p-4">{u.nome}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{vinculo.perfil}</td>
                  <td className="p-4">{empresaNome}</td>

                  <td className="p-4">
                    {vinculo.ativo ? "Ativo" : "Inativo"}
                  </td>

                  <td className="p-4 text-right flex gap-2 justify-end">
                    <button
                      onClick={() => abrirModalEditar(u)}
                      className="border px-3 py-1 rounded-lg"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => resetarSenha(u.email)}
                      className="border px-3 py-1 rounded-lg"
                    >
                      Reset senha
                    </button>

                    <button
                      onClick={() =>
                        alterarStatus(u.id, !vinculo.ativo)
                      }
                      className="border px-3 py-1 rounded-lg"
                    >
                      {vinculo.ativo ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      onClick={() => remover(u.id)}
                      className="bg-red-100 text-red-600 px-3 py-1 rounded-lg"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[400px] space-y-4">
            <h2 className="text-lg font-bold">
              {usuarioSelecionado ? "Editar usuário" : "Novo usuário"}
            </h2>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full border rounded-xl px-4 py-2"
            />

            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className="w-full border rounded-xl px-4 py-2"
            >
              {perfis.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalAberto(false)}
                className="border px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>

              <button
                onClick={salvar}
                className="bg-indigo-700 text-white px-4 py-2 rounded-lg"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}