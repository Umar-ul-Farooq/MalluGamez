import { useGameStore } from '../store/gameStore';
import type { Toast } from '../store/gameStore';

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useGameStore(s => s.removeToast);
  const bg =
    toast.type === 'success' ? 'bg-green-500' :
    toast.type === 'error'   ? 'bg-red-500'   : 'bg-brand-600';

  return (
    <div
      className={`${bg} text-white px-5 py-3 rounded-2xl shadow-xl
                  font-semibold text-sm animate-bounce-in flex items-center gap-2`}
      onClick={() => remove(toast.id)}
    >
      {toast.message}
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useGameStore(s => s.toasts);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
