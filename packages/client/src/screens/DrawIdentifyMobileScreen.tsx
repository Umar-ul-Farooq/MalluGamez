import { useState, useRef, useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import Timer from '../components/Timer';

export default function DrawIdentifyMobileScreen() {
  const { room, myId, drawIdentifyState, drawIdentifySecretList, timerRemaining } = useGameStore();

  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [localDrawnCount, setLocalDrawnCount] = useState<number>(0);
  const [hasDrawnSomething, setHasDrawnSomething] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  if (!room || !drawIdentifyState) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-950 text-white text-center">
        <div className="text-4xl animate-bounce mb-3">✏️</div>
        <p className="font-bold text-lg">Waiting for Draw & Identify round to start…</p>
        <p className="text-white/40 text-sm mt-1">കളി ഉടൻ ആരംഭിക്കും</p>
      </div>
    );
  }

  const isDrawer = myId === drawIdentifyState.currentDrawerId;
  const isOpposingPlayer = !isDrawer;
  const { roundPhase, objectCount, currentDrawerName, roundId, identifiedCount, roundScore } = drawIdentifyState;

  // Reset local drawing counter when round changes
  useEffect(() => {
    setLocalDrawnCount(0);
    clearCanvas();
  }, [roundId]);

  // Sync canvas size to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, rect.width, rect.height);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [roundPhase, isDrawer]);

  // ─── Drawing Canvas Handlers ──────────────────────────────────────────────

  function getCanvasCoords(e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function handlePointerDown(e: React.TouchEvent | React.MouseEvent) {
    if (roundPhase !== 'drawing' || !isDrawer) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    isPaintingRef.current = true;
    lastPointRef.current = coords;
    setHasDrawnSomething(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : '#111827';
    ctx.lineWidth = activeTool === 'eraser' ? brushSize * 4 : brushSize;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  function handlePointerMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isPaintingRef.current || roundPhase !== 'drawing' || !isDrawer) return;
    const coords = getCanvasCoords(e);
    if (!coords || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : '#111827';
    ctx.lineWidth = activeTool === 'eraser' ? brushSize * 4 : brushSize;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
  }

  function handlePointerUp() {
    isPaintingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawnSomething(false);
  }

  function submitCurrentDrawing() {
    if (!isDrawer || roundPhase !== 'drawing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const currentIndex = localDrawnCount;

    getSocket().emit('draw-identify:submit-drawing', {
      roundId,
      drawingIndex: currentIndex,
      dataUrl,
    });

    setLocalDrawnCount(prev => prev + 1);
    clearCanvas();
  }

  function handleTickObject(objectIndex: number) {
    if (!isOpposingPlayer || roundPhase !== 'identification') return;
    getSocket().emit('draw-identify:tick-object', {
      roundId,
      objectIndex,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DRAWER MOBILE VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (isDrawer) {
    return (
      <div className="h-full flex flex-col bg-gray-950 text-white select-none overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-teal-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-teal-300">Your Role / നിങ്ങളുടെ റോൾ</p>
              <h2 className="text-base font-black text-white">You are the Drawer!</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-bold uppercase">Time:</span>
            <div className="bg-black/40 border border-white/15 px-3 py-1 rounded-xl font-mono font-bold text-teal-300 text-sm">
              {timerRemaining}s
            </div>
          </div>
        </div>

        {/* 1. DRAWER: DRAWING PHASE */}
        {roundPhase === 'drawing' && (
          <div className="flex-1 flex flex-col p-4 min-h-0 gap-3">
            {/* Drawing Progress & Instruction */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs">
              <span className="text-white/70">
                Drawing: <strong className="text-teal-300 text-sm">#{localDrawnCount + 1}</strong> of {objectCount}
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                Listen to players shouting! 🗣️
              </span>
            </div>

            {/* Drawing Canvas Area */}
            <div className="flex-1 w-full bg-white rounded-3xl shadow-2xl relative overflow-hidden touch-none border-4 border-teal-500/30">
              <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="w-full h-full block cursor-crosshair"
              />

              {localDrawnCount >= objectCount && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6">
                  <div className="text-5xl mb-2">🎉</div>
                  <h3 className="text-xl font-black text-white">All Drawings Submitted!</h3>
                  <p className="text-teal-300 text-xs mt-1">
                    Waiting for identification phase…
                  </p>
                </div>
              )}
            </div>

            {/* Canvas Toolbar & Next Button */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTool('pen')}
                  className={`p-2.5 rounded-xl text-base transition-all ${
                    activeTool === 'pen' ? 'bg-teal-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                  }`}
                  title="Pen"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('eraser')}
                  className={`p-2.5 rounded-xl text-base transition-all ${
                    activeTool === 'eraser' ? 'bg-teal-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                  }`}
                  title="Eraser"
                >
                  🧹
                </button>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="p-2.5 rounded-xl text-xs font-bold text-white/50 hover:text-red-400 transition-all"
                  title="Clear"
                >
                  Clear
                </button>
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={submitCurrentDrawing}
                disabled={localDrawnCount >= objectCount}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-95 disabled:opacity-40 text-white font-black text-base shadow-lg shadow-teal-900/60 flex items-center justify-center gap-2 transition-all"
              >
                <span>Next ({localDrawnCount + 1}/{objectCount})</span>
                <span className="text-xl">➡️</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. DRAWER: IDENTIFICATION PHASE */}
        {roundPhase === 'identification' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 animate-fade-in">
            <div className="text-6xl animate-pulse">👀📺</div>
            <div>
              <h3 className="text-2xl font-black text-white">Look at the TV!</h3>
              <p className="text-teal-300 font-bold text-sm mt-1">
                ടിവിയിലേക്ക് നോക്കൂ! നിങ്ങളുടെ ചിത്രങ്ങൾ കണ്ടെത്തൂ
              </p>
            </div>

            <div className="card bg-white/5 border border-white/10 p-5 rounded-3xl max-w-sm w-full space-y-3 text-left">
              <p className="text-xs text-white/70 leading-relaxed">
                • Opposing players will read out object names aloud in any order.
              </p>
              <p className="text-xs text-white/70 leading-relaxed">
                • Point out which TV drawing matches that object!
              </p>
              <p className="text-xs text-white/70 leading-relaxed">
                • They will tick them off on their phones to award your points!
              </p>
            </div>

            <div className="bg-teal-950/60 border border-teal-500/40 rounded-2xl p-4 w-full max-w-sm">
              <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Your Round Score</p>
              <p className="text-3xl font-black text-teal-300 mt-1">+{roundScore} Points</p>
              <p className="text-xs text-white/40 mt-0.5">{identifiedCount} of {objectCount} identified</p>
            </div>
          </div>
        )}

        {/* 3. DRAWER: ROUND-END PHASE */}
        {roundPhase === 'round-end' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
            <div className="text-6xl">🏁</div>
            <h3 className="text-2xl font-black text-white">Round Complete!</h3>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 w-full max-w-sm space-y-2">
              <p className="text-xs text-white/60">Points earned this round:</p>
              <p className="text-4xl font-black text-teal-300">+{roundScore}</p>
              <p className="text-xs text-white/50">{identifiedCount} objects identified</p>
            </div>
            <p className="text-xs text-white/40">Waiting for host to start next round…</p>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OPPOSING PLAYERS MOBILE VIEW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-950 text-white select-none overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-purple-950/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-[10px] uppercase font-bold text-purple-300">Opposing Team / എതിർ ടീം</p>
            <h2 className="text-base font-black text-white">
              {roundPhase === 'drawing' ? 'Shout Names Aloud!' : 'Tick Identified Items!'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 font-bold uppercase">Time:</span>
          <div className="bg-black/40 border border-white/15 px-3 py-1 rounded-xl font-mono font-bold text-purple-300 text-sm">
            {timerRemaining}s
          </div>
        </div>
      </div>

      {/* Sub-banner instructions */}
      <div className={`px-5 py-2.5 border-b text-xs flex items-center justify-between ${
        roundPhase === 'drawing'
          ? 'bg-amber-950/30 border-amber-500/20 text-amber-200'
          : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200'
      }`}>
        <p className="font-semibold">
          {roundPhase === 'drawing'
            ? `🗣️ Read these objects to ${currentDrawerName} in order!`
            : `🔍 Tap "Tick" when ${currentDrawerName} identifies the drawing!`}
        </p>
        <span className="font-mono font-bold text-xs">
          {identifiedCount}/{objectCount}
        </span>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {drawIdentifySecretList.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-sm">
            Loading secret object list…
          </div>
        ) : (
          drawIdentifySecretList.map(item => {
            const isTicked = item.isIdentified;

            return (
              <div
                key={item.index}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isTicked
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    isTicked ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    #{item.index + 1}
                  </span>
                  <div className="truncate">
                    <p className={`font-bold text-base truncate ${isTicked ? 'line-through text-emerald-300' : 'text-white'}`}>
                      {item.name}
                    </p>
                    {isTicked && item.identifiedByPlayerName && (
                      <p className="text-[10px] text-emerald-400/80">
                        ✓ Ticked by {item.identifiedByPlayerName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Interactive Tick Button (active in Identification Phase) */}
                {roundPhase === 'identification' && (
                  <button
                    type="button"
                    onClick={() => handleTickObject(item.index)}
                    disabled={isTicked}
                    className={`px-3 py-2 rounded-xl font-bold text-xs shrink-0 transition-all ${
                      isTicked
                        ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-md shadow-emerald-950/50'
                    }`}
                  >
                    {isTicked ? '✓ Found' : '✓ Tick'}
                  </button>
                )}

                {roundPhase === 'drawing' && (
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider shrink-0">
                    #{item.index + 1}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="p-3 border-t border-white/10 bg-gray-900/60 text-center text-xs text-white/40">
        {roundPhase === 'drawing'
          ? `Drawing in progress (${timerRemaining}s left)`
          : roundPhase === 'identification'
          ? `Identification phase in progress (${timerRemaining}s left)`
          : 'Round complete'}
      </div>
    </div>
  );
}
