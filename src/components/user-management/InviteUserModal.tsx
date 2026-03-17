import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';
import { X, Send } from '../icons';
import type { Branch } from '../../types';

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: (data: { email: string; roleId?: string; branchId?: string; }) => void;
  isInviting?: boolean;
  preselectedBranchId?: string;
}

export default function InviteUserModal({ onClose, onInvite, isInviting, preselectedBranchId }: InviteUserModalProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchId, setBranchId] = useState(preselectedBranchId || '');

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiService.getRoles(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['managerBranches', user?.id],
    queryFn: () => apiService.getAllBranches(user!.id),
    enabled: !!user?.id,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !branchId) return;
    onInvite({
      email: email.trim(),
      roleId: roleId || undefined,
      branchId,
    });
  };

  const inputClass = `w-full px-4 py-2 rounded-md border ${
    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
  } focus:outline-none focus:ring-2 focus:ring-amber-400`;

  const labelClass = `block text-sm font-medium mb-1 ${
    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl p-6 max-w-md w-full ${
        theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            Invite User
          </h3>
          <button onClick={onClose} className={`p-2 rounded-md ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Assign to Branch *</label>
            <select
              value={branchId}
              onChange={e => setBranchId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select a branch</option>
              {(branches as Branch[]).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Role (Optional)</label>
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              className={inputClass}
            >
              <option value="">No specific role</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name} ({r.permissions?.length || 0} permissions)</option>
              ))}
            </select>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              Roles define what the invited user can access
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isInviting || !email.trim() || !branchId}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-semibold text-sm ${
                isInviting || !email.trim() || !branchId
                  ? 'bg-amber-300 cursor-not-allowed'
                  : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
              }`}
            >
              <Send size={16} />
              {isInviting ? 'Sending...' : 'Send Invitation'}
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
        </form>
      </div>
    </div>
  );
}
