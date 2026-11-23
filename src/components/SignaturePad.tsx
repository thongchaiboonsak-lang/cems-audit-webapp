import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eraser, PenTool } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  dataUrl: string;
  onChange: (dataUrl: string) => void;
}

export function SignaturePad({ label, dataUrl, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = dataUrl;
    }
  }, [dataUrl]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getPoint(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 inline-flex items-center justify-center border border-blue-100">
            <PenTool className="w-3.5 h-3.5" />
          </span>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {dataUrl && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3" />
              ลงนามแล้ว
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            ล้าง
          </button>
        </div>
      </div>

      <div
        className={`relative rounded-2xl border-2 border-dashed bg-white overflow-hidden transition-all duration-150 ${
          drawing
            ? 'border-blue-500 ring-4 ring-blue-500/15 shadow-sm'
            : dataUrl
              ? 'border-emerald-300/90'
              : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {/* Subtle signature baseline */}
        <div className="pointer-events-none absolute left-5 right-5 bottom-6 border-b border-slate-200/90 flex items-end justify-between">
          <span className="text-[11px] font-bold text-slate-300 -mb-0.5 select-none">✕</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-300 pb-0.5 select-none">
            Signature Line
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative z-10 w-full h-36 touch-none cursor-crosshair block"
        />

        {!dataUrl && !drawing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-slate-100/90 text-xs font-medium text-slate-400">
              ใช้นิ้วหรือเมาส์เซ็นชื่อในกรอบนี้
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
