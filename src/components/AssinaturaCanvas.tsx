import { useEffect, useRef, useState } from "react";

type Props = {
  onChange: (base64: string) => void;
  initialValue?: string;
};

export default function AssinaturaCanvas({
  onChange,
  initialValue = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [desenhando, setDesenhando] = useState(false);

  useEffect(() => {
    if (!initialValue) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = initialValue;
  }, [initialValue]);

  function getPosicao(
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in event) {
      const touch = event.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function iniciarDesenho(
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPosicao(event);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    setDesenhando(true);
  }

  function desenhar(
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!desenhando) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPosicao(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function pararDesenho() {
    if (!desenhando) return;
    setDesenhando(false);
    salvarAssinatura();
  }

  function salvarAssinatura() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const base64 = canvas.toDataURL("image/png");
    onChange(base64);
  }

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full rounded-xl border bg-white touch-none"
        onMouseDown={iniciarDesenho}
        onMouseMove={desenhar}
        onMouseUp={pararDesenho}
        onMouseLeave={pararDesenho}
        onTouchStart={iniciarDesenho}
        onTouchMove={desenhar}
        onTouchEnd={pararDesenho}
      />

      <button
        type="button"
        onClick={limpar}
        className="text-sm font-medium text-red-600"
      >
        Limpar assinatura
      </button>
    </div>
  );
}