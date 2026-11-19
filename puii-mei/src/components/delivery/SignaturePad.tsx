"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export interface SignatureHandle {
  toBlob: () => Promise<Blob | null>;
  isEmpty: () => boolean;
}

/** Semnătura clientului, cu degetul, pe ecranul telefonului curierului. */
export function SignaturePad({ ref, error }: { ref: Ref<SignatureHandle>; error?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#12251a";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    toBlob: () => new Promise((resolve) => (empty ? resolve(null) : canvas.current!.toBlob(resolve, "image/png"))),
  }));

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvas}
          aria-label="Semnătura clientului"
          className={`h-40 w-full touch-none rounded-2xl bg-white ring-2 ${error && empty ? "ring-red-400" : "ring-forest-900/15"}`}
          onPointerDown={(e) => {
            drawing.current = true;
            canvas.current!.setPointerCapture(e.pointerId);
            const ctx = canvas.current!.getContext("2d")!;
            const p = point(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = canvas.current!.getContext("2d")!;
            const p = point(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            setEmpty(false);
          }}
          onPointerUp={() => (drawing.current = false)}
        />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">Semnătura clientului aici</span>}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {error && empty ? <p className="text-xs font-medium text-red-700">{error}</p> : <span />}
        <button
          type="button"
          onClick={() => {
            const c = canvas.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setEmpty(true);
          }}
          className="text-xs font-semibold text-forest-700 underline"
        >
          Șterge semnătura
        </button>
      </div>
    </div>
  );
}
