import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';
import { Send } from '../icons';
import type { Branch } from '../../types';
import { Modal, Input, Select, Button } from '../ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: (data: { email: string; roleId?: string; branchId?: string; }) => void;
  isInviting?: boolean;
  preselectedBranchId?: string;
}

export default function InviteUserModal({ onClose, onInvite, isInviting, preselectedBranchId }: InviteUserModalProps) {
  const t = useThemeClasses();
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

  const branchOptions = (branches as Branch[]).map(b => ({
    value: b.id,
    label: b.name,
  }));

  const roleOptions = roles.map((r: any) => ({
    value: r.id,
    label: `${r.name} (${r.permissions?.length || 0} permissions)`,
  }));

  return (
    <Modal open={true} onClose={onClose} title="Invite User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address *"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          required
        />

        <Select
          label="Assign to Branch *"
          value={branchId}
          onChange={e => setBranchId(e.target.value)}
          options={branchOptions}
          placeholder="Select a branch"
          required
        />

        <div>
          <Select
            label="Role (Optional)"
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            options={roleOptions}
            placeholder="No specific role"
          />
          <p className={cn('text-xs mt-1', t.textTertiary)}>
            Roles define what the invited user can access
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isInviting || !email.trim() || !branchId}
            loading={isInviting}
            icon={Send}
            className="flex-1"
          >
            {isInviting ? 'Sending...' : 'Send Invitation'}
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
