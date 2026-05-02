import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetarSenha() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  async function alterarSenha() {
    if (!senha || senha !== confirmar) {
      alert("Senhas não conferem");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: senha,
    });

    if (error) {
      alert("Erro ao alterar senha");
    } else {
      alert("Senha alterada com sucesso!");
      window.location.href = "/login";
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Definir nova senha</h2>

      <input
        type="password"
        placeholder="Nova senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirmar senha"
        value={confirmar}
        onChange={(e) => setConfirmar(e.target.value)}
      />

      <button onClick={alterarSenha}>
        Salvar nova senha
      </button>
    </div>
  );
}