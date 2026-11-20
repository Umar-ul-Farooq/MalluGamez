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

const CANVAS_BG = '#FAFAF8'; // warm white — like a whiteboard

const Canvas = forwardRef<CanvasHandle, {
  mode: 'draw' | 'view';
  color?: string;
  brushSize?: number;
}>(function Canvas({ mode, color = '#1a1a1a', brushSize = 6 }, ref) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const ctxRef     = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<StrokeRecord[]>([]);   // all finished strokes → for resize redraw
  const colorRef   = useRef(color);
  const sizeRef    = useRef(brushSize);
  const isDownRef  = useRef(false);
  const lastPtRef  = useRef<DrawPoint | null>(null);
  const lastEmitTs = useRef(0);

  // Keep refs in sync with props so event handlers always see current values
  useEffect(() => { colorRef.current = color; },     [color]);
  useEffect(() => { sizeRef.current  = brushSize; }, [brushSize]);

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  function resize() {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = wrap.offsetWidth;
    const h = wrap.offsetHeight;

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ctxRef.current = ctx;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    // Redraw all stored strokes after resize
    for (const s of historyRef.current) {
      drawFullStroke(ctx, s, w, h);
    }
  }

  useEffect(() => {
    resize();
    const obs = new ResizeObserver(resize);
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drawing primitives ─────────────────────────────────────────────────────
  function dim() {
    const wrap = wrapRef.current!;
    return { w: wrap.offsetWidth, h: wrap.offsetHeight };
  }

  /** Redraw a complete stored stroke with quadratic bezier smoothing */
  function drawFullStroke(
    ctx: CanvasRenderingContext2D,
    s: StrokeRecord,
    w: number, h: number,
  ) {
    if (s.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = s.size;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
    for (let i = 1; i < s.points.length - 1; i++) {
      const mx = ((s.points[i].x + s.points[i + 1].x) / 2) * w;
      const my = ((s.points[i].y + s.points[i + 1].y) / 2) * h;
      ctx.quadraticCurveTo(s.points[i].x * w, s.points[i].y * h, mx, my);
    }
    const last = s.points.at(-1)!;
    ctx.lineTo(last.x * w, last.y * h);
    ctx.stroke();
    ctx.restore();
  }

  /** Draw a single line segment — fast, used for incremental updates */
  function drawSegment(from: DrawPoint, to: DrawPoint, c: string, sz: number) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = dim();
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth   = sz;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x * w, from.y * h);
    ctx.lineTo(to.x   * w, to.y   * h);
    ctx.stroke();
    ctx.restore();
  }

  function clearAll() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = dim();
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    historyRef.current = [];
    lastPtRef.current  = null;
  }

  useImperativeHandle(ref, () => ({ clear: clearAll }));

  // ── View mode: receive strokes from socket ─────────────────────────────────
  useEffect(() => {
    if (mode !== 'view') return;
    const socket = getSocket();

    function onStroke(stroke: DrawStroke) {
      if (stroke.type === 'start') {
        historyRef.current.push({
          color: stroke.color,
          size:  stroke.size,
          points: [...stroke.points],
        });
      } else {
        // Append new point; points[0] = previous, points[1] = new
        if (stroke.points.length < 2) return;
        const current = historyRef.current.at(-1);
        if (current) {
          current.points.push(stroke.points[1]);
          drawSegment(stroke.points[0], stroke.points[1], stroke.color, stroke.size);
        }
      }
    }

    // Clear canvas between rounds (new round = new drawing)
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
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top)  / rect.height,
    };
  }

  function onDown(clientX: number, clientY: number) {
    if (mode !== 'draw') return;
    const p = toPt(clientX, clientY);
    isDownRef.current = true;
    lastPtRef.current = p;
    historyRef.current.push({ color: colorRef.current, size: sizeRef.current, points: [p] });
    getSocket().emit('draw:stroke', {
      points: [p],
      color: colorRef.current,
      size:  sizeRef.current,
      type:  'start',
    });
  }

  function onMove(clientX: number, clientY: number) {
    if (mode !== 'draw' || !isDownRef.current) return;
    const p    = toPt(clientX, clientY);
    const prev = lastPtRef.current!;
    lastPtRef.current = p;

    // Draw locally for immediate feedback
    drawSegment(prev, p, colorRef.current, sizeRef.current);
    historyRef.current.at(-1)?.points.push(p);

    // Throttle emits to ~30 per second
    const now = Date.now();
    if (now - lastEmitTs.current < 33) return;
    lastEmitTs.current = now;

    getSocket().emit('draw:stroke', {
      points: [prev, p],
      color: colorRef.current,
      size:  sizeRef.current,
      type:  'stroke',
    });
  }

  function onUp() { isDownRef.current = false; }

  return (
    <div ref={wrapRef} className="w-full h-full relative overflow-hidden rounded-2xl shadow-inner">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        onMouseDown={e  => onDown(e.clientX, e.clientY)}
        onMouseMove={e  => onMove(e.clientX, e.clientY)}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={e => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchMove={e  => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={e   => { e.preventDefault(); onUp(); }}
      />
    </div>
  );
});

export default Canvas;
