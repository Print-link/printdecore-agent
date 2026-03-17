import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';
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
  const { theme } = useTheme();
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col ${
        theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            {role ? 'Edit Role' : 'Create Role'}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-md ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Role Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Branch Supervisor"
              className={`w-full px-4 py-2 rounded-md border ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-amber-400`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What can users with this role do?"
              rows={2}
              className={`w-full px-4 py-2 rounded-md border ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-amber-400`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Permissions</label>
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
        </form>

        <div className={`flex gap-3 px-6 py-4 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm ${
              isSaving || !name.trim() ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
            }`}
          >
            {isSaving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
