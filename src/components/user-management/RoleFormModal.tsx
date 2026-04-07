import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { apiService } from '../../services/api';
import { Input, Button } from '../ui';
import { X } from '../icons';
import PermissionPicker from './PermissionPicker';
import type { Role } from '../../types';

interface RoleFormModalProps {
  role?: Role | null;
  onClose: () => void;
  onSave: (data: { name: string; description: string; permissionIds: string[] }) => void;
  isSaving?: boolean;
}

export default function RoleFormModal({ role, onClose, onSave, isSaving }: RoleFormModalProps) {
  const t = useThemeClasses();
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    role?.permissions?.map(p => p.id) || []
  );
  const [isOpen, setIsOpen] = useState(false);

  const { data: permData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => apiService.getPermissions(),
  });

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setSelectedPermissionIds(role.permissions?.map(p => p.id) || []);
    }
  }, [role]);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), permissionIds: selectedPermissionIds });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isOpen ? "bg-black/40" : "bg-black/0"
        )}
        onClick={handleClose}
      />

      {/* Drawer panel — full screen on mobile, half on md+ */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full flex flex-col transition-transform duration-300 ease-out",
          "w-full sm:w-[480px] lg:w-[540px]",
          isOpen ? "translate-x-0" : "translate-x-full",
          t.isDark ? "bg-gray-900" : "bg-white",
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-5 py-4 border-b shrink-0",
          t.border,
        )}>
          <div>
            <h2 className={cn("text-lg font-bold", t.text)}>
              {role ? 'Edit Role' : 'Create Role'}
            </h2>
            <p className={cn("text-xs mt-0.5", t.textTertiary)}>
              {role ? 'Update role details and permissions' : 'Define a new role with specific permissions'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-lg transition-colors",
              t.isDark
                ? "hover:bg-gray-800 text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Role Name */}
            <Input
              label="Role Name *"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Branch Supervisor"
              required
            />

            {/* Description */}
            <div>
              <label className={cn("block text-sm font-medium mb-1", t.textSecondary)}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What can users with this role do?"
                rows={3}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none",
                  t.input,
                )}
              />
            </div>

            {/* Permissions */}
            <div>
              <label className={cn("block text-sm font-semibold mb-2", t.textSecondary)}>
                Permissions
              </label>
              <p className={cn("text-xs mb-3", t.textTertiary)}>
                Select what users with this role can access and manage.
              </p>
              {permData?.permissions ? (
                <PermissionPicker
                  permissions={permData.permissions}
                  selectedIds={selectedPermissionIds}
                  onChange={setSelectedPermissionIds}
                />
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse h-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "flex gap-3 px-5 py-4 border-t shrink-0",
          t.border,
        )}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            loading={isSaving}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </div>
    </div>
  );
}
