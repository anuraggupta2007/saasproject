import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Theme } from '../../types';

interface ThemeSelectorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  className?: string;
}

const themes: Array<{ value: Theme; label: string; icon: React.ReactNode; description: string }> = [
  { value: 'light', label: 'Light', icon: <Sun className="w-6 h-6" />, description: 'Bright and clean interface' },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-6 h-6" />, description: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: <Monitor className="w-6 h-6" />, description: 'Match your OS setting' },
];

export const ThemeSelector = memo(
  forwardRef<HTMLDivElement, ThemeSelectorProps>(
    ({ value, onChange, className }, ref) => (
      <div ref={ref} className={cn('grid grid-cols-3 gap-3', className)}>
        {themes.map((theme) => (
          <motion.button
            key={theme.value}
            onClick={() => onChange(theme.value)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
              value === theme.value
                ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {theme.icon}
            <span className="text-sm font-medium">{theme.label}</span>
            <span className="text-xs text-slate-500">{theme.description}</span>
          </motion.button>
        ))}
      </div>
    )
  )
);

ThemeSelector.displayName = 'ThemeSelector';
