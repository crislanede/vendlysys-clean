export default function FinanceiroPage() {
  const lancamentos = [
    { descricao: "Corte + Escova", valor: "R$ 120,00", tipo: "Entrada" },
    { descricao: "Compra de produtos", valor: "R$ 240,00", tipo: "Saída" },
    { descricao: "Manicure", valor: "R$ 70,00", tipo: "Entrada" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Financeiro</h1>
        <p className="text-slate-500 mt-1">Controle de entradas e saídas</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="space-y-3">
          {lancamentos.map((item, index) => (
            <div
              key={`${item.descricao}-${index}`}
              className="flex items-center justify-between border border-slate-200 rounded-xl p-4"
            >
              <div>
                <p className="font-medium text-slate-800">{item.descricao}</p>
                <p className="text-sm text-slate-500">{item.tipo}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {item.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}