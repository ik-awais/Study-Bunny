import { useToastStore } from '../../store/useToastStore';
import { motion, AnimatePresence } from 'framer-motion';

export const ToastProvider = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto px-6 py-3 rounded-2xl shadow-lg border font-medium text-sm flex items-center gap-3 ${
              toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 
              toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 
              'bg-bunny-card border-bunny-border text-bunny-text'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};