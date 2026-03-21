import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappFeaturesApi, type CrmContact } from '../../services/api/whatsappFeatures';
import { Card, PageHeader, Button, Badge, EmptyState, Input, Modal } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import {
  Phone, Mail, Building, Users, Search, DollarSign, ShoppingBag,
  Edit, Save, X, TrendingUp, User,
} from '../../components/icons';

export default function ContactsPage() {
  const t = useThemeClasses();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [editContact, setEditContact] = useState<CrmContact | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', company: '', notes: '', tags: '' });

  const { data: contacts = [], isLoading } = useQuery<CrmContact[]>({
    queryKey: ['whatsapp', 'contacts', search],
    queryFn: () => whatsappFeaturesApi.getContacts({ search: search || undefined, limit: 100 }),
    staleTime: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['whatsapp', 'contactStats'],
    queryFn: () => whatsappFeaturesApi.getContactStats(),
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: () => whatsappFeaturesApi.updateContact(editContact!.id, {
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      company: editForm.company || undefined,
      notes: editForm.notes || undefined,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'contacts'] });
      setEditContact(null);
    },
  });

  const startEdit = (c: CrmContact) => {
    setEditContact(c);
    setEditForm({
      name: c.name || '',
      email: c.email || '',
      company: c.company || '',
      notes: c.notes || '',
      tags: c.tags?.join(', ') || '',
    });
  };

  const totalValue = contacts.reduce((s, c) => s + c.lifetimeValue, 0);
  const totalOrders = contacts.reduce((s, c) => s + c.totalOrders, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="CRM Contacts"
        description="Manage your WhatsApp customer relationships"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn('text-sm', t.textSecondary)}>Total Contacts</p>
              <p className={cn('text-2xl font-bold', t.text)}>{stats?.total || contacts.length}</p>
            </div>
            <Users size={24} className="text-blue-500" />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn('text-sm', t.textSecondary)}>With Email</p>
              <p className={cn('text-2xl font-bold', t.text)}>{stats?.withEmail || 0}</p>
            </div>
            <Mail size={24} className="text-purple-500" />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn('text-sm', t.textSecondary)}>Total Orders</p>
              <p className={cn('text-2xl font-bold', t.text)}>{totalOrders}</p>
            </div>
            <ShoppingBag size={24} className="text-amber-500" />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn('text-sm', t.textSecondary)}>Lifetime Value</p>
              <p className={cn('text-2xl font-bold text-green-500')}>GH₵{totalValue.toFixed(2)}</p>
            </div>
            <DollarSign size={24} className="text-green-500" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border', t.input)}>
        <Search size={18} className={t.textTertiary} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or company..."
          className={cn('flex-1 text-sm bg-transparent border-none focus:outline-none', t.text)}
        />
        {search && (
          <button onClick={() => setSearch('')}>
            <X size={16} className={t.textTertiary} />
          </button>
        )}
      </div>

      {/* Contacts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          title={search ? "No contacts match your search" : "No contacts yet"}
          description={search ? "Try a different search term" : "Contacts are automatically created when you save contact details in WhatsApp conversations"}
        />
      ) : (
        <div className="space-y-2">
          {contacts.map(contact => (
            <Card key={contact.id} className="rounded-xl" padding="sm">
              <div className="flex items-center gap-4 p-2">
                {/* Avatar */}
                <div className={cn('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm', 'bg-gradient-to-br from-amber-400 to-amber-600')}>
                  {(contact.name || contact.phone).substring(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn('font-semibold truncate', t.text)}>
                      {contact.name || contact.phone}
                    </h4>
                    {contact.tags?.map(tag => (
                      <Badge key={tag} color="gray" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                  <div className={cn('flex items-center gap-3 mt-0.5 text-xs', t.textSecondary)}>
                    <span className="flex items-center gap-1">
                      <Phone size={10} />{contact.phone}
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={10} />{contact.email}
                      </span>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building size={10} />{contact.company}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {contact.totalOrders > 0 && (
                    <div className="text-center">
                      <p className={cn('text-sm font-bold', t.text)}>{contact.totalOrders}</p>
                      <p className={cn('text-[10px]', t.textTertiary)}>orders</p>
                    </div>
                  )}
                  {contact.lifetimeValue > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-500">GH₵{contact.lifetimeValue.toFixed(0)}</p>
                      <p className={cn('text-[10px]', t.textTertiary)}>value</p>
                    </div>
                  )}
                  <button
                    onClick={() => startEdit(contact)}
                    className={cn('p-2 rounded-lg transition-colors', t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                  >
                    <Edit size={16} className={t.textSecondary} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editContact} onClose={() => setEditContact(null)} title="Edit Contact" maxWidth="md">
        {editContact && (
          <>
            <div className="p-6 space-y-4">
              <Input label="Name" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
              <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
              <Input label="Company" value={editForm.company} onChange={e => setEditForm(prev => ({ ...prev, company: e.target.value }))} />
              <div>
                <label className={cn('block text-sm font-medium mb-1', t.textSecondary)}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className={cn('w-full px-4 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400', t.input)}
                />
              </div>
              <Input label="Tags (comma-separated)" placeholder="e.g., vip, repeat, wholesale" value={editForm.tags} onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))} />
            </div>
            <div className={cn('flex justify-end gap-3 px-6 py-4 border-t', t.border)}>
              <Button variant="secondary" onClick={() => setEditContact(null)}>Cancel</Button>
              <Button icon={Save} onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>Save</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
