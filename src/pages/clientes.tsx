export default function ClientesPage() {
  const clientes = [
    { nome: "Maria Oliveira", telefone: "(11) 99999-1111", status: "Ativa" },
    { nome: "Juliana Costa", telefone: "(11) 99999-2222", status: "Ativa" },
    { nome: "Fernanda Souza", telefone: "(11) 99999-3333", status: "Inativa" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Clientes</h1>
        <p className="text-slate-500 mt-1">Lista de clientes cadastrados</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 text-sm text-slate-500 font-medium">Nome</th>
              <th className="py-3 text-sm text-slate-500 font-medium">Telefone</th>
              <th className="py-3 text-sm text-slate-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.nome} className="border-b border-slate-100">
                <td className="py-4 text-slate-800">{cliente.nome}</td>
                <td className="py-4 text-slate-600">{cliente.telefone}</td>
                <td className="py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700">
                    {cliente.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}