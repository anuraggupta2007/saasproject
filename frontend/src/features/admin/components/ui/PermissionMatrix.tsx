import { memo } from 'react';
import { cn } from '@/utils/cn';
import { Check, X } from 'lucide-react';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface PermissionMatrixProps {
  permissions: Permission[];
  rolePermissions: string[];
  onChange?: (permissionIds: string[]) => void;
  readonly?: boolean;
  className?: string;
}

export const PermissionMatrix = memo(({ permissions, rolePermissions, onChange, readonly = false, className }: PermissionMatrixProps) => {
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  const toggle = (id: string) => {
    if (readonly) return;
    const next = rolePermissions.includes(id)
      ? rolePermissions.filter((p) => p !== id)
      : [...rolePermissions, id];
    onChange?.(next);
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Resource</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-slate-400 uppercase w-20">Granted</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([resource, perms]) =>
            perms.map((perm, i) => (
              <tr key={perm.id} className="border-b border-white/5 hover:bg-white/5">
                {i === 0 && (
                  <td rowSpan={perms.length} className="px-4 py-2 text-white font-medium align-top">
                    {resource}
                  </td>
                )}
                <td className="px-4 py-2 text-slate-300">{perm.action}</td>
                <td className="px-4 py-2 text-slate-500">{perm.description}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggle(perm.id)}
                    disabled={readonly}
                    className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                      rolePermissions.includes(perm.id)
                        ? 'bg-brand-500 text-white'
                        : 'bg-white/10 text-slate-500 hover:bg-white/20',
                      readonly && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {rolePermissions.includes(perm.id) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

PermissionMatrix.displayName = 'PermissionMatrix';
