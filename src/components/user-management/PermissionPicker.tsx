import { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Permission } from '../../types';

interface PermissionPickerProps {
  permissions: Permission[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders & Jobs',
  services: 'Services & Pricing',
  users: 'User Management',
  branch: 'Branch Management',
  messages: 'Messages',
  reports: 'Reports & Analytics',
  settings: 'Settings',
  activity: 'Activity & Audit',
};

export default function PermissionPicker({ permissions, selectedIds, onChange, disabled }: PermissionPickerProps) {
  const { theme } = useTheme();

  const grouped = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [permissions]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(s => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleCategory = (category: string) => {
    if (disabled) return;
    const catIds = grouped[category].map(p => p.id);
    const allSelected = catIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter(id => !catIds.includes(id)));
    } else {
      const newIds = new Set([...selectedIds, ...catIds]);
      onChange(Array.from(newIds));
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, perms]) => {
        const catIds = perms.map(p => p.id);
        const allSelected = catIds.every(id => selectedIds.includes(id));
        const someSelected = catIds.some(id => selectedIds.includes(id));

        return (
          <div key={category} className={`rounded-lg border p-4 ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
          }`}>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={() => toggleCategory(category)}
                disabled={disabled}
                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
              />
              <span className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {CATEGORY_LABELS[category] || category}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
              {perms.map(perm => (
                <label key={perm.id} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(perm.id)}
                    onChange={() => toggle(perm.id)}
                    disabled={disabled}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {perm.name}
                    </span>
                    {perm.description && (
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {perm.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
