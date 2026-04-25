import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PrimaryButton from "../components/ui/PrimaryButton";
import EmptyState from "../components/ui/EmptyState";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  created_at?: string;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("agenda");
  const [ativo, setAtivo] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
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

  function limparFormulario() {
    setNome("");
    setEmail("");
    setPerfil("agenda");
    setAtivo(true);
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  async function salvarUsuario(e: React.FormEvent) {
    e.preventDefault();

    if (!nome || !email) {
      alert("Preencha nome e email.");
      return;
    }

    const payload = {
      nome,
      email,
      perfil,
      ativo,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("usuarios")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error("Erro ao atualizar usuário:", error);
        alert("Erro ao atualizar usuário.");
        return;
      }

      limparFormulario();
      await carregarUsuarios();
      return;
    }

    const { error } = await supabase.from("usuarios").insert([payload]);

    if (error) {
      console.error("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário.");
      return;
    }

    limparFormulario();
    await carregarUsuarios();
  }

  function editarUsuario(item: Usuario) {
    setNome(item.nome || "");
    setEmail(item.email || "");
    setPerfil(item.perfil || "agenda");
    setAtivo(item.ativo);
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  async function toggleAtivo(id: string, ativoAtual: boolean) {
    const { error } = await supabase
      .from("usuarios")
      .update({ ativo: !ativoAtual })
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar status do usuário:", error);
      alert("Erro ao atualizar usuário.");
      return;
    }

    await carregarUsuarios();
  }

  function formatarData(data?: string) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acesso"
        title="Usuários"
        description="Gerencie perfis e permissões de acesso ao sistema."
        action={
          <PrimaryButton
            type="button"
            onClick={() => {
              if (mostrarFormulario) limparFormulario();
              else setMostrarFormulario(true);
            }}
          >
            {mostrarFormulario ? "Fechar" : "Novo usuário"}
          </PrimaryButton>
        }
      />

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Editar usuário" : "Novo usuário"}
          description="Defina nome, email, perfil e status"
        >
          <form onSubmit={salvarUsuario} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            />

            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className="rounded-2xl border border-slate-200 p-3"
            >
              <option value="admin">admin</option>
              <option value="agenda">agenda</option>
            </select>

            <div className="flex items-center">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                />
                Usuário ativo
              </label>
            </div>

            <div className="md:col-span-2">
              <PrimaryButton type="submit">
                {editandoId ? "Atualizar" : "Salvar"}
              </PrimaryButton>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <SectionCard>
          <p>Carregando...</p>
        </SectionCard>
      ) : usuarios.length === 0 ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Cadastre o primeiro usuário para começar a controlar os acessos."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {usuarios.map((item) => (
            <SectionCard key={item.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{item.nome}</p>
                  <p className="text-sm text-slate-500">{item.email}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Perfil: <span className="font-medium text-slate-700">{item.perfil}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Cadastro: {formatarData(item.created_at)}
                  </p>

                  <div className="mt-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.ativo
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => editarUsuario(item)}
                    className="text-sm font-medium text-blue-600"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAtivo(item.id, item.ativo)}
                    className="text-sm font-medium text-orange-600"
                  >
                    {item.ativo ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}