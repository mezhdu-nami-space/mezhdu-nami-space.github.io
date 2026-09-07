"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { preparePhoto } from "@/lib/photo-client";

export function WishPhotoPicker({ label = "Добавить фото", disabled = false, onSave, onPendingChange }: {
  label?: string;
  disabled?: boolean;
  onSave: (file: File) => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(.5);
  const [y, setY] = useState(.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; left: number; top: number; x: number; y: number } | null>(null);
  const objectUrl = useRef("");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; URL.revokeObjectURL(objectUrl.current); }; }, []);
  const side = source ? Math.min(source.naturalWidth, source.naturalHeight) / zoom : 1;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!source || !ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 800, 800);
    ctx.drawImage(source, (source.naturalWidth - side) * x, (source.naturalHeight - side) * y, side, side, 0, 0, 800, 800);
  }, [source, side, x, y]);
  const close = () => {
    setSource(null); URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; onPendingChange?.(false);
  };
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return <div className="wish-photo-picker">
    <label className="background-upload"><Camera />{busy ? "Подготавливаем…" : label}
      <input type="file" accept="image/*" disabled={disabled || busy} onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
        setBusy(true); setError(""); onPendingChange?.(true);
        try {
          const prepared = await preparePhoto(file, "wish");
          if (!mounted.current) return;
          const url = URL.createObjectURL(prepared);
          const img = new Image();
          await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Не удалось открыть фото")); img.src = url; });
          if (!mounted.current) { URL.revokeObjectURL(url); return; }
          URL.revokeObjectURL(objectUrl.current); objectUrl.current = url;
          setZoom(1); setX(.5); setY(.5); setSource(img);
        } catch (err) { setError(err instanceof Error ? err.message : "Не удалось открыть фото"); if (!source) onPendingChange?.(false); }
        finally { if (mounted.current) setBusy(false); }
      }} />
    </label>
    {source && <div className="wish-crop-editor" role="group" aria-label="Обрезка фотографии желания">
      <p>Выберите квадратный фрагмент: двигайте фото пальцем или используйте ползунки.</p>
      <canvas ref={canvas} width={800} height={800} aria-label="Предпросмотр квадратного фото" onPointerDown={e => {
        if (busy) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, left: e.clientX, top: e.clientY, x, y };
      }} onPointerMove={e => {
        const start = drag.current; if (!start || start.id !== e.pointerId || busy) return;
        const scale = side / e.currentTarget.getBoundingClientRect().width;
        const dx = source.naturalWidth - side, dy = source.naturalHeight - side;
        if (dx > 0) setX(clamp(start.x - (e.clientX - start.left) * scale / dx));
        if (dy > 0) setY(clamp(start.y - (e.clientY - start.top) * scale / dy));
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} />
      <label>Приближение<input type="range" min="1" max="3" step=".01" value={zoom} disabled={busy} onChange={e => setZoom(Number(e.target.value))} /></label>
      <label>По горизонтали<input type="range" min="0" max="1" step=".01" value={x} disabled={busy || source.naturalWidth <= side} onChange={e => setX(Number(e.target.value))} /></label>
      <label>По вертикали<input type="range" min="0" max="1" step=".01" value={y} disabled={busy || source.naturalHeight <= side} onChange={e => setY(Number(e.target.value))} /></label>
      <div className="crop-actions"><Button type="button" disabled={busy || disabled} onClick={async () => {
        if (!canvas.current || busy) return;
        setBusy(true); setError("");
        try {
          const blob = await new Promise<Blob | null>(resolve => canvas.current!.toBlob(resolve, "image/jpeg", .9));
          if (!blob) throw new Error("Не удалось обрезать фото. Попробуйте ещё раз.");
          await onSave(new File([blob], "wish-square.jpg", { type: "image/jpeg" }));
          close();
        } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить фото"); }
        finally { setBusy(false); }
      }}>{busy ? "Сохраняем…" : "Использовать фрагмент"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={close}>Отмена</Button></div>
    </div>}
    {error && <p className="upload-error" role="alert">{error}</p>}
  </div>;
}
