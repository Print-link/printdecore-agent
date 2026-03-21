import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappFeaturesApi, type QuickReply } from '../../services/api/whatsappFeatures';
import { Card, PageHeader, Button, Badge, EmptyState, Input, Select, Modal } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { Zap, Plus, Edit, Trash2, Check, Search } from '../../components/icons';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'greeting', label: 'Greeting' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'support', label: 'Support' },
  { value: 'hours', label: 'Business Hours' },
  { value: 'order', label: 'Order Updates' },
  { value: 'follow-up', label: 'Follow Up' },
  { value: 'other', label: 'Other' },
];

export default function QuickRepliesPage() {
  const t = useThemeClasses();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [category, setCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');

  const { data: replies = [], isLoading } = useQuery<QuickReply[]>({
    queryKey: ['whatsapp', 'quickReplies'],
    queryFn: () => whatsappFeaturesApi.getQuickReplies(),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: () => whatsappFeaturesApi.createQuickReply({ title, body, shortcut: shortcut || undefined, category: category || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'quickReplies'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => whatsappFeaturesApi.updateQuickReply(id, { title, body, shortcut: shortcut || undefined, category: category || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'quickReplies'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => whatsappFeaturesApi.deleteQuickReply(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp', 'quickReplies'] }),
  });

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setTitle('');
    setBody('');
    setShortcut('');
    setCategory('');
  }, []);

  const startEdit = useCallback((reply: QuickReply) => {
    setEditingId(reply.id);
    setTitle(reply.title);
    setBody(reply.body);
    setShortcut(reply.shortcut || '');
    setCategory(reply.category || '');
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!title.trim() || !body.trim()) return;
    if (editingId) {
      updateMutation.mutate(editingId);
    } else {
      createMutation.mutate();
    }
  }, [editingId, title, body, createMutation, updateMutation]);

  const filtered = replies.filter(r => {
    if (filterCategory && r.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q) || (r.shortcut || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Quick Replies"
        description="Create reusable message templates for faster responses"
        actions={
          <Button icon={Plus} onClick={() => { resetForm(); setShowForm(true); }}>
            New Template
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border', t.input)}>
          <Search size={16} className={t.textTertiary} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className={cn('flex-1 text-sm bg-transparent border-none focus:outline-none', t.text)}
          />
        </div>
        <Select
          options={CATEGORIES}
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="w-40"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={replies.length === 0 ? "No quick replies yet" : "No matches"}
          description={replies.length === 0 ? "Create templates for common responses to speed up your conversations" : "Try a different search term or category"}
          action={replies.length === 0 ? <Button icon={Plus} onClick={() => setShowForm(true)}>Create First Template</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(reply => (
            <Card key={reply.id} className="rounded-xl" padding="md">
              <div className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', t.isDark ? 'bg-amber-900/30' : 'bg-amber-50')}>
                  <Zap size={18} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn('font-semibold', t.text)}>{reply.title}</h4>
                    {reply.shortcut && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono', t.isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}>
                        {reply.shortcut}
                      </span>
                    )}
                    {reply.category && <Badge color="blue">{reply.category}</Badge>}
                  </div>
                  <p className={cn('text-sm whitespace-pre-wrap line-clamp-3', t.textSecondary)}>
                    {reply.body}
                  </p>
                  <p className={cn('text-xs mt-2', t.textTertiary)}>
                    Used {reply.useCount} time{reply.useCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(reply)}
                    className={cn('p-2 rounded-lg transition-colors', t.isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                  >
                    <Edit size={16} className={t.textSecondary} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(reply.id); }}
                    className={cn('p-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20')}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showForm} onClose={resetForm} title={editingId ? 'Edit Template' : 'New Template'} maxWidth="md">
        <div className="p-6 space-y-4">
          <Input
            label="Title"
            placeholder="e.g., Business Hours"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Input
            label="Shortcut (optional)"
            placeholder="e.g., /hours"
            value={shortcut}
            onChange={e => setShortcut(e.target.value)}
          />
          <Select
            label="Category (optional)"
            options={CATEGORIES.filter(c => c.value !== '')}
            placeholder="Select category"
            value={category}
            onChange={e => setCategory(e.target.value)}
          />
          <div>
            <label className={cn('block text-sm font-medium mb-1', t.textSecondary)}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type the message template..."
              rows={5}
              className={cn('w-full px-4 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400', t.input)}
            />
          </div>
          {body && (
            <div className={cn('p-3 rounded-lg border text-sm', t.isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200')}>
              <p className={cn('text-[10px] font-medium uppercase tracking-wider mb-1', t.textTertiary)}>Preview</p>
              <p className={cn('whitespace-pre-wrap', t.text)}>{body}</p>
            </div>
          )}
        </div>
        <div className={cn('flex justify-end gap-3 px-6 py-4 border-t', t.border)}>
          <Button variant="secondary" onClick={resetForm}>Cancel</Button>
          <Button
            icon={Check}
            onClick={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!title.trim() || !body.trim()}
          >
            {editingId ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
