import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getSocket } from '../lib/socket';
import type { DrawStroke, DrawPoint } from '@chitram/shared';

export interface CanvasHandle {
  clear: () => void;
}

interface StrokeRecord {
  color: string;
  size: number;
  points: DrawPoint[];
}

const CANVAS_BG = '#FAFAF8'; // warm whiteboard background

const Canvas = forwardRef<CanvasHandle, {
  mode: 'draw' | 'view';
  color?: string;
  brushSize?: number;
}>(function Canvas({ mode, color = '#1a1a1a', brushSize = 6 }, ref) {
  const wrapRef       = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const ctxRef        = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef    = useRef<StrokeRecord[]>([]);   // all completed strokes for redraws
  const colorRef      = useRef(color);
  const sizeRef       = useRef(brushSize);
  const isDownRef     = useRef(false);
  const lastLocalPt   = useRef<DrawPoint | null>(null);
  const strokeBuffer  = useRef<DrawPoint[]>([]);      // points buffered since last network emit
  const lastEmitTs    = useRef(0);

  // Keep refs in sync with props
  useEffect(() => { colorRef.current = color; },     [color]);
  useEffect(() => { sizeRef.current  = brushSize; }, [brushSize]);

  // Proportional brush scaling: 6px on a 360px mobile canvas scales gracefully on a large TV
  function getScaledLineWidth(baseSize: number, w: number): number {
    const scale = Math.max(1, w / 450);
    return Math.round(baseSize * scale);
  }

  // ── Canvas setup & resize ──────────────────────────────────────────────────
  function resize() {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = wrap.offsetWidth;
    const h = wrap.offsetHeight;

    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ctxRef.current = ctx;

    // Fill background
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    // Redraw all stored strokes with high fidelity
    for (const s of historyRef.current) {
      drawPolyline(ctx, s.points, s.color, s.size, w, h);
    }
  }

  useEffect(() => {
    resize();
    const obs = new ResizeObserver(resize);
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dim() {
    const wrap = wrapRef.current!;
    return { w: wrap.offsetWidth, h: wrap.offsetHeight };
  }

  /**
   * Draws a continuous polyline or a dot with round ends.
   */
  function drawPolyline(
    ctx: CanvasRenderingContext2D,
    points: DrawPoint[],
    c: string,
    sz: number,
    w: number,
    h: number
  ) {
    if (points.length === 0) return;

    const lineWidth = getScaledLineWidth(sz, w);

    if (points.length === 1) {
      // Single tap / dot
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(points[0].x * w, points[0].y * h, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.strokeStyle = c;
    ctx.lineWidth   = lineWidth;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h);
    }
    ctx.stroke();
  }

  function clearAll() {
    const ctx = ctxRef.current;
    if (!ctx || !wrapRef.current) return;
    const { w, h } = dim();
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    historyRef.current = [];
    lastLocalPt.current = null;
    strokeBuffer.current = [];
  }

  useImperativeHandle(ref, () => ({ clear: clearAll }));

  // ── View mode: receive strokes from socket ─────────────────────────────────
  useEffect(() => {
    if (mode !== 'view') return;
    const socket = getSocket();

    function onStroke(stroke: DrawStroke) {
      const ctx = ctxRef.current;
      if (!ctx || !wrapRef.current) return;
      const { w, h } = dim();

      if (stroke.type === 'start') {
        historyRef.current.push({
          color: stroke.color,
          size:  stroke.size,
          points: [...stroke.points],
        });
        drawPolyline(ctx, stroke.points, stroke.color, stroke.size, w, h);
      } else {
        // Continuous polyline segment
        if (stroke.points.length === 0) return;
        const current = historyRef.current.at(-1);
        if (current) {
          current.points.push(...stroke.points.slice(1));
        }
        drawPolyline(ctx, stroke.points, stroke.color, stroke.size, w, h);
      }
    }

    function onGameStarted() { clearAll(); }
    function onCleared()     { clearAll(); }

    socket.on('draw:stroke',  onStroke);
    socket.on('draw:cleared', onCleared);
    socket.on('game:started', onGameStarted);

    return () => {
      socket.off('draw:stroke',  onStroke);
      socket.off('draw:cleared', onCleared);
      socket.off('game:started', onGameStarted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Draw mode: pointer / touch event handlers ──────────────────────────────
  function toPt(clientX: number, clientY: number): DrawPoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  function emitBuffer(isEnd = false) {
    if (strokeBuffer.current.length < 2) return;
    getSocket().emit('draw:stroke', {
      points: [...strokeBuffer.current],
      color: colorRef.current,
      size:  sizeRef.current,
      type:  'stroke',
    });
    // Keep the very last point so the next emitted segment seamlessly attaches to it
    const lastPoint = strokeBuffer.current[strokeBuffer.current.length - 1];
    strokeBuffer.current = isEnd ? [] : [lastPoint];
  }

  function onDown(clientX: number, clientY: number) {
    if (mode !== 'draw') return;
    const p = toPt(clientX, clientY);
    isDownRef.current = true;
    lastLocalPt.current = p;
    strokeBuffer.current = [p];

    // Local draw
    const ctx = ctxRef.current;
    if (ctx && wrapRef.current) {
      const { w, h } = dim();
      drawPolyline(ctx, [p], colorRef.current, sizeRef.current, w, h);
    }

    historyRef.current.push({
      color: colorRef.current,
      size:  sizeRef.current,
      points: [p],
    });

    getSocket().emit('draw:stroke', {
      points: [p],
      color: colorRef.current,
      size:  sizeRef.current,
      type:  'start',
    });

    lastEmitTs.current = Date.now();
  }

  function onMove(clientX: number, clientY: number) {
    if (mode !== 'draw' || !isDownRef.current) return;
    const p = toPt(clientX, clientY);
    const prev = lastLocalPt.current;
    if (!prev) return;

    // Local immediate feedback: draw segment between prev and current point
    const ctx = ctxRef.current;
    if (ctx && wrapRef.current) {
      const { w, h } = dim();
      drawPolyline(ctx, [prev, p], colorRef.current, sizeRef.current, w, h);
    }

    lastLocalPt.current = p;
    strokeBuffer.current.push(p);
    historyRef.current.at(-1)?.points.push(p);

    // Throttle network emissions to ~30-40 per second, but NEVER drop points in between!
    const now = Date.now();
    if (now - lastEmitTs.current >= 25) {
      lastEmitTs.current = now;
      emitBuffer(false);
    }
  }

  function onUp() {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    // Flush any remaining un-emitted points in the stroke
    emitBuffer(true);
    lastLocalPt.current = null;
  }

  return (
    <div ref={wrapRef} className="w-full h-full relative overflow-hidden rounded-2xl shadow-inner bg-[#FAFAF8]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none block"
        style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        onMouseDown={e  => onDown(e.clientX, e.clientY)}
        onMouseMove={e  => onMove(e.clientX, e.clientY)}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={e => {
          e.preventDefault();
          const t = e.touches[0];
          onDown(t.clientX, t.clientY);
        }}
        onTouchMove={e => {
          e.preventDefault();
          const t = e.touches[0];
          onMove(t.clientX, t.clientY);
        }}
        onTouchEnd={e => {
          e.preventDefault();
          onUp();
        }}
        onTouchCancel={e => {
          e.preventDefault();
          onUp();
        }}
      />
    </div>
  );
});

export default Canvas;
