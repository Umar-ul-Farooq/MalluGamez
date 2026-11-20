interface TimerProps {
  remaining: number;
  total: number;
  large?: boolean;
}

export default function Timer({ remaining, total, large = false }: TimerProps) {
  const pct = total > 0 ? remaining / total : 1;
  const color =
    pct > 0.5  ? 'text-green-400' :
    pct > 0.2  ? 'text-yellow-400' :
    'text-red-400';

  const pulse = remaining <= 10 && remaining > 0;
  const size  = large ? 'text-6xl' : 'text-2xl';

  return (
    <div className={`font-extrabold tabular-nums leading-none ${size} ${color} ${pulse ? 'animate-pulse' : ''}`}>
      {remaining}
      <span className={large ? 'text-3xl' : 'text-base'}>s</span>
    </div>
  );
}
