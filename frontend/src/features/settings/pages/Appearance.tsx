import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Palette, Layout, Type, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { ThemeSelector } from '../components/ui/ThemeSelector';
import { Switch } from '../components/ui/Switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAppearanceSettings, useUpdateAppearance } from '../hooks';
import { useSettingsStore } from '../store';
import { useUIStore } from '@/store/uiStore';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import type { AppearanceSettings, AccentColor, LayoutDensity, FontSize } from '../types';

const ACCENT_COLORS: Array<{ value: AccentColor; label: string; color: string }> = [
  { value: 'brand', label: 'Brand', color: 'bg-brand-500' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
];

export const Appearance = memo(() => {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useAppearanceSettings();
  const updateAppearance = useUpdateAppearance();
  const { setAccentColor, setDensity, setFontSize } = useSettingsStore();
  const { setTheme: applyUITheme } = useUIStore();

  const [localSettings, setLocalSettings] = useState<AppearanceSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const current = localSettings || settings;

  const update = useCallback((partial: Partial<AppearanceSettings>) => {
    if (!current) return;
    const updated = { ...current, ...partial };
    setLocalSettings(updated);
    setHasChanges(true);

    if (partial.theme) applyUITheme(partial.theme);
    if (partial.accentColor) setAccentColor(partial.accentColor);
    if (partial.density) setDensity(partial.density);
    if (partial.fontSize) setFontSize(partial.fontSize);
  }, [current, applyUITheme, setAccentColor, setDensity, setFontSize]);

  const handleSave = async () => {
    if (!current) return;
    try {
      await updateAppearance.mutateAsync(current);
      toast.success('Appearance saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save appearance');
    }
  };

  if (isLoading || !current) {
    return <SkeletonLoader count={3} variant="card" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Appearance</h1>
          <p className="text-slate-400 mt-1">Customize the look and feel</p>
        </div>
        {hasChanges && (
          <Button variant="brand" onClick={handleSave} loading={updateAppearance.isPending} leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
        )}
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Theme" icon={<Palette className="w-5 h-5" />} />
        <CardContent>
          <ThemeSelector value={current.theme} onChange={(theme) => update({ theme })} />
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Accent Color" icon={<Sparkles className="w-5 h-5" />} />
        <CardContent>
          <div className="flex gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => update({ accentColor: color.value })}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                  current.accentColor === color.value
                    ? 'border-white/30 bg-white/5'
                    : 'border-transparent hover:bg-white/5'
                )}
              >
                <div className={cn('w-8 h-8 rounded-full', color.color)} />
                <span className="text-xs text-slate-400">{color.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Layout" icon={<Layout className="w-5 h-5" />} />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Compact Mode</p>
              <p className="text-xs text-slate-500">Reduce spacing for more content</p>
            </div>
            <Select value={current.density} onValueChange={(v) => update({ density: v as LayoutDensity })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Font Size</p>
              <p className="text-xs text-slate-500">Adjust text size</p>
            </div>
            <Select value={current.fontSize} onValueChange={(v) => update({ fontSize: v as FontSize })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Animations</p>
              <p className="text-xs text-slate-500">Enable smooth transitions</p>
            </div>
            <Switch checked={current.animations} onChange={() => update({ animations: !current.animations })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Reduced Motion</p>
              <p className="text-xs text-slate-500">Minimize animations for accessibility</p>
            </div>
            <Switch checked={current.reducedMotion} onChange={() => update({ reducedMotion: !current.reducedMotion })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

Appearance.displayName = 'Appearance';

export default Appearance;
