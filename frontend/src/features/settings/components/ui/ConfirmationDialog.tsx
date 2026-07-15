import { memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export const ConfirmationDialog = memo(
  forwardRef<HTMLDivElement, ConfirmationDialogProps>(
    ({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', loading = false, onConfirm, onCancel, className }, ref) => {
      if (!open) return null;

      return (
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                ref={ref}
                className={cn(
                  'relative w-full max-w-md bg-surface-900 border border-white/10 rounded-2xl p-6 shadow-2xl',
                  className
                )}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    variant === 'danger' ? 'bg-red-500/10 text-red-400' :
                    variant === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-white/5 text-slate-400'
                  )}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <p className="text-sm text-slate-400 mb-6">{description}</p>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={onCancel} disabled={loading}>
                    {cancelLabel}
                  </Button>
                  <Button
                    variant={variant === 'danger' ? 'destructive' : 'brand'}
                    onClick={onConfirm}
                    loading={loading}
                    leftIcon={loading ? undefined : <AlertTriangle className="w-4 h-4" />}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      );
    }
  )
);

ConfirmationDialog.displayName = 'ConfirmationDialog';
