import { memo, forwardRef, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (file: File) => void;
  onDelete?: () => void;
  loading?: boolean;
  className?: string;
}

export const AvatarUpload = memo(
  forwardRef<HTMLDivElement, AvatarUploadProps>(
    ({ currentAvatar, onUpload, onDelete, loading = false, className }, ref) => {
      const inputRef = useRef<HTMLInputElement>(null);
      const [preview, setPreview] = useState<string | null>(null);

      const initials = 'MS';

      const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setPreview(reader.result as string);
          reader.readAsDataURL(file);
          onUpload(file);
        }
      }, [onUpload]);

      return (
        <div ref={ref} className={cn('flex items-center gap-6', className)}>
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-brand-500/20 flex items-center justify-center text-3xl font-bold text-brand-400 overflow-hidden border-2 border-white/10">
              {preview || currentAvatar ? (
                <img src={preview || currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {loading && (
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors shadow-lg"
              aria-label="Upload avatar"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} leftIcon={<Upload className="w-4 h-4" />}>
                Upload Photo
              </Button>
              {currentAvatar && onDelete && (
                <Button variant="ghost" size="sm" onClick={onDelete} leftIcon={<X className="w-4 h-4" />} className="text-red-400 hover:text-red-300">
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
      );
    }
  )
);

AvatarUpload.displayName = 'AvatarUpload';
