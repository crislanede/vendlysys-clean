export default function Manual({ tipo = "admin" }: { tipo?: "admin" | "cliente" }) {
  const isAdmin = tipo === "admin";

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>
        {isAdmin ? "Manual do Sistema" : "Manual do Cliente"}
      </h1>

      <p style={{ color: "#64748b", marginBottom: 28 }}>
        Guia de uso do VendlySys / Espaço Áurea.
      </p>

      {isAdmin ? <ManualAdmin /> : <ManualCliente />}
    </div>
  );
}

function Card({ titulo, children }: any) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 24,
        marginBottom: 18,
        boxShadow: "0 10px 25px rgba(15,23,42,.06)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{titulo}</h2>
      <div style={{ lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

function ManualAdmin() {
  return (
    <>
      <Card titulo="📅 Agenda Inteligente">
        <p>A agenda controla os atendimentos da empresa.</p>
        <ul>
          <li>Criar agendamentos com cliente, serviço, profissional, data e horário.</li>
          <li>Confirmar, reagendar, cancelar e finalizar atendimentos.</li>
          <li>Bloqueia conflitos de horário para o mesmo profissional.</li>
          <li>Mostra alertas importantes vindos da anamnese.</li>
        </ul>
        <strong>Regra importante:</strong>
        <p>Somente atendimentos finalizados devem virar receita real.</p>
      </Card>

      <Card titulo="💰 Financeiro">
        <ul>
          <li><strong>Pendente:</strong> valor a receber. Não entra como receita.</li>
          <li><strong>Pago:</strong> entra em receita, comissão e lucro.</li>
          <li><strong>Cancelado:</strong> não soma nos resultados.</li>
        </ul>
        <p>
          Quando o cliente agenda pelo Meu Espaço, o sistema pode criar um lançamento pendente.
          Ao finalizar ou marcar como pago, o valor passa a compor o financeiro real.
        </p>
      </Card>

      <Card titulo="💸 Comissões">
        <p>
          A comissão é calculada quando o atendimento está pago/finalizado e quando existe
          vínculo entre profissional e serviço.
        </p>
        <ul>
          <li>Cadastre a comissão em Profissionais/Serviços.</li>
          <li>Exemplo: serviço R$ 35,00 com comissão de 25% gera R$ 8,75.</li>
          <li>Receita líquida = valor bruto - comissão.</li>
        </ul>
      </Card>

      <Card titulo="📋 Anamnese">
        <p>A anamnese é a ficha obrigatória do cliente.</p>
        <ul>
          <li>Campos obrigatórios bloqueiam o acesso até serem preenchidos.</li>
          <li>Novas perguntas obrigatórias forçam atualização automática.</li>
          <li>Assinatura digital é exigida para validar a ficha.</li>
          <li>PDF fica disponível com respostas, assinatura, IP e hash.</li>
        </ul>
      </Card>

      <Card titulo="⚠️ Alertas na Agenda">
        <p>
          Respostas críticas como diabetes, micose, fungos ou unha encravada podem aparecer
          como alertas para o profissional antes do atendimento.
        </p>
        <p>
          O sistema não faz diagnóstico. Ele apenas destaca informações informadas pelo cliente.
        </p>
      </Card>

      <Card titulo="📊 Dashboard">
        <ul>
          <li><strong>Receita:</strong> somente valores pagos.</li>
          <li><strong>A receber:</strong> valores pendentes.</li>
          <li><strong>Resultado:</strong> receita paga menos despesas.</li>
          <li><strong>Ticket médio:</strong> calculado com atendimentos pagos.</li>
        </ul>
      </Card>

      <Card titulo="👤 Clientes">
        <p>
          Área para cadastrar, consultar e editar clientes. O telefone é usado como login no
          Meu Espaço.
        </p>
      </Card>

      <Card titulo="📸 Fotos do Atendimento">
        <ul>
          <li>Registrar fotos gerais.</li>
          <li>Separar fotos de antes e depois.</li>
          <li>Usar a galeria para acompanhar evolução do atendimento.</li>
        </ul>
      </Card>
    </>
  );
}

function ManualCliente() {
  return (
    <>
      <Card titulo="🔐 Acesso ao Meu Espaço">
        <p>O cliente acessa usando o número de celular cadastrado.</p>
      </Card>

      <Card titulo="📋 Anamnese">
        <p>
          A ficha de anamnese deve ser preenchida antes de usar todos os recursos.
        </p>
        <ul>
          <li>Responda todas as perguntas obrigatórias.</li>
          <li>Assine ao final da ficha.</li>
          <li>Atualize a ficha se alguma informação mudar.</li>
        </ul>
      </Card>

      <Card titulo="✍️ Assinatura Digital">
        <p>
          A assinatura confirma que as informações foram fornecidas pelo cliente.
          Ela fica registrada junto com data, IP e hash de auditoria.
        </p>
      </Card>

      <Card titulo="📄 PDF da Anamnese">
        <p>
          O cliente pode baixar sua ficha assinada na aba Anamnese.
        </p>
      </Card>

      <Card titulo="📅 Agendamentos">
        <ul>
          <li>Visualizar próximos agendamentos.</li>
          <li>Confirmar atendimento.</li>
          <li>Cancelar ou reagendar quando disponível.</li>
        </ul>
      </Card>

      <Card titulo="🕘 Histórico">
        <p>
          Mostra atendimentos finalizados e registros anteriores do cliente.
        </p>
      </Card>
    </>
  );
}