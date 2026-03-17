import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useThemeClasses } from '../../lib/theme';
import { apiService } from '../../services/api';
import { Modal, Input, Button } from '../ui';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), permissionIds: selectedPermissionIds });
  };

  return (
    <Modal open={true} onClose={onClose} title={role ? 'Edit Role' : 'Create Role'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Role Name *"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Branch Supervisor"
          required
        />
        <div>
          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What can users with this role do?"
            rows={2}
            className={`w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${t.input}`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Permissions</label>
          {permData?.permissions ? (
            <PermissionPicker
              permissions={permData.permissions}
              selectedIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
            />
          ) : (
            <div className="animate-pulse h-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
          )}
        </div>

        <div className={`flex gap-3 pt-4 border-t ${t.border}`}>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            loading={isSaving}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
