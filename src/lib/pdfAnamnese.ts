import jsPDF from "jspdf";

type Props = {
  empresaNome: string;
  clienteNome: string;
  respostas: Record<string, string | undefined | null>;
  assinatura: string;
  hash: string;
  ip: string;
  data: string;
};

function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

function adicionarTextoQuebrado(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  largura: number
): number {
  const linhas = doc.splitTextToSize(textoSeguro(texto), largura);
  doc.text(linhas, x, y);
  return linhas.length * 6;
}

export function gerarPdfBlob({
  empresaNome,
  clienteNome,
  respostas,
  assinatura,
  hash,
  ip,
  data,
}: Props): Blob {
  const doc = new jsPDF();

  let y = 15;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(textoSeguro(empresaNome || "Seu estabelecimento"), 14, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Ficha de Anamnese do Cliente", 14, 18);

  doc.setTextColor(15, 23, 42);
  y = 34;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do cliente", 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${textoSeguro(clienteNome)}`, 14, y);
  y += 6;

  const dataFormatada = data
    ? new Date(data).toLocaleString("pt-BR")
    : "Não informada";

  doc.text(`Data/Hora do preenchimento: ${dataFormatada}`, 14, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Respostas da Anamnese", 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const entradas = Object.entries(respostas || {});

  if (entradas.length === 0) {
    doc.text("Nenhuma resposta registrada.", 14, y);
    y += 8;
  } else {
    for (const [campo, valor] of entradas) {
      const titulo = `${textoSeguro(campo)}:`;
      const conteudo = textoSeguro(valor) || "-";

      doc.setFont("helvetica", "bold");
      doc.text(titulo, 14, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      const altura = adicionarTextoQuebrado(doc, conteudo, 14, y, 180);
      y += altura + 4;

      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    }
  }

  y += 4;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Assinatura do Cliente", 14, y);
  y += 6;

  if (assinatura) {
    try {
      doc.addImage(assinatura, "PNG", 14, y, 80, 30);
      y += 35;
    } catch {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Erro ao renderizar assinatura.", 14, y);
      y += 8;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sem assinatura registrada.", 14, y);
    y += 8;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Dados de Auditoria", 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  y += adicionarTextoQuebrado(doc, `Hash: ${textoSeguro(hash)}`, 14, y, 180);
  y += 2;
  y += adicionarTextoQuebrado(doc, `IP: ${textoSeguro(ip)}`, 14, y, 180);
  y += 2;
  y += adicionarTextoQuebrado(
    doc,
    "Documento gerado digitalmente e assinado eletronicamente pelo cliente.",
    14,
    y,
    180
  );

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${totalPages}`, 105, 290, {
      align: "center",
    });
  }

  return doc.output("blob");
}
