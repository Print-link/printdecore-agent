import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, MoreVertical } from '../../../../components/icons';
import { Badge, Button } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import { BranchImage } from './BranchImage';
import { BranchDetails } from './BranchDetails';
import type { Branch } from '../../../../types';

interface BranchCardProps {
  branch: Branch;
  viewMode: 'grid' | 'list';
  onClick?: (branch: Branch) => void;
  onEdit?: (branch: Branch) => void;
  onDelete?: (branch: Branch) => void;
}

export function BranchCard({
  branch,
  viewMode,
  onClick,
  onEdit,
  onDelete,
}: BranchCardProps) {
  const t = useThemeClasses();
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on action buttons
    if ((e.target as HTMLElement).closest('.branch-actions')) {
      return;
    }
    onClick?.(branch);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(branch);
    setShowActions(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(branch);
    setShowActions(false);
  };

  const statusColor = branch.status === 'active'
    ? 'green'
    : branch.status === 'temporarily_closed'
      ? 'amber'
      : 'red';

  const statusDotClass = branch.status === 'active'
    ? 'bg-emerald-500'
    : branch.status === 'temporarily_closed'
      ? 'bg-amber-500'
      : 'bg-red-500';

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex flex-col md:flex-row items-center px-6 py-4 border-b transition-all relative group',
          t.isDark
            ? 'bg-gray-800/40 border-gray-700 hover:bg-gray-700/60'
            : 'bg-white border-gray-100 hover:bg-gray-50'
        )}
        style={{ zIndex: showActions ? 1000 : 'auto' }}
        onClick={handleClick}
      >
        {/* Branch Info: Image + Name + Metrics */}
        <div className="flex-[2.5] min-w-[280px] flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <BranchImage branch={branch} viewMode={viewMode} />
            {branch.isMainBranch && (
              <div className="absolute -top-2 -left-2 bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm z-10 border border-white dark:border-gray-800 uppercase tracking-tighter">
                Main
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className={cn('text-sm font-semibold truncate', t.text)}>
              {branch.name}
            </h3>
            <div className="flex items-center gap-2">
              <Badge color="gray" className="text-[11px] rounded-md">
                0 Orders
              </Badge>
              <span className={cn('text-[11px]', t.textTertiary)}>
                • {branch.phoneNumber || 'No phone'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Column */}
        <div className="flex-1 min-w-[140px] flex items-center justify-start md:justify-center">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
            statusColor === 'green' && 'bg-emerald-500/10 text-emerald-500',
            statusColor === 'amber' && 'bg-amber-500/10 text-amber-500',
            statusColor === 'red' && 'bg-red-500/10 text-red-500',
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', statusDotClass)} />
            {branch.status.replace('_', ' ')}
          </div>
        </div>

        {/* Date Column */}
        <div className={cn('flex-1 min-w-[160px] text-[13px] flex items-center justify-start md:justify-center', t.textSecondary)}>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-0.5">Created</span>
            <span className="font-medium">
              {new Date(branch.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex-[1.5] min-w-[180px] flex items-center justify-end gap-3 lg:gap-6">
          <button
            onClick={(e) => { e.stopPropagation(); onClick?.(branch); }}
            className={cn(
              'text-[13px] font-bold border-none bg-transparent cursor-pointer flex items-center gap-1.5 transition-all py-1 px-3 rounded-md branch-actions',
              t.isDark
                ? 'text-amber-400 hover:bg-amber-400/10'
                : 'text-amber-600 hover:bg-amber-50'
            )}
          >
            View branch <span className="text-base leading-none translate-y-[1px]">&rarr;</span>
          </button>

          {(onEdit || onDelete) && (
            <div
              ref={actionsRef}
              className="branch-actions relative"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                className={cn(
                  'p-1.5 rounded-lg border-none cursor-pointer transition-all',
                  t.isDark
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                )}
              >
                <MoreVertical size={18} />
              </button>
              {showActions && (
                <div className={cn(
                  'absolute top-full right-0 mt-2 rounded-xl shadow-2xl z-[1001] min-w-[160px] overflow-hidden',
                  t.isDark
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-100'
                )}>
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className={cn(
                        'w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-[13px] font-medium text-left transition-all',
                        t.isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Edit size={16} className="text-amber-400" />
                      Edit Branch
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className={cn(
                        'w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-[13px] font-medium text-left transition-all border-t',
                        t.isDark
                          ? 'text-red-400 hover:bg-red-400/10 border-gray-700'
                          : 'text-red-600 hover:bg-red-50 border-gray-100'
                      )}
                    >
                      <Trash2 size={16} />
                      Delete Branch
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        'rounded-xl border transition-all cursor-pointer relative overflow-hidden group',
        t.isDark
          ? 'bg-gray-800 border-gray-700 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]'
          : 'bg-white border-gray-100 hover:border-amber-400/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)]'
      )}
      style={{
        zIndex: showActions ? 1000 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        alignItems: 'stretch',
      }}
      onClick={handleClick}
    >
      <div className="relative">
        <BranchImage branch={branch} viewMode={viewMode} />
        {branch.isMainBranch && (
          <div className="absolute top-3 left-3 bg-amber-400 text-black text-[10px] px-2 py-1 rounded-md font-bold shadow-sm uppercase tracking-wider">
            Main Branch
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className={cn('text-lg font-bold', t.text)}>
              {branch.name}
            </h3>
            <div className={cn(
              'flex items-center gap-2 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex',
              branch.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            )}>
              <span className={cn('w-1 h-1 rounded-full', branch.status === 'active' ? 'bg-emerald-500' : 'bg-red-500')} />
              {branch.status}
            </div>
          </div>

          {(onEdit || onDelete) && (
            <div
              ref={actionsRef}
              className="branch-actions relative"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                className={cn(
                  'p-2 rounded-lg transition-all border-none cursor-pointer',
                  t.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'
                )}
              >
                <MoreVertical size={18} />
              </button>
              {showActions && (
                <div className={cn(
                  'absolute top-full right-0 mt-2 rounded-xl shadow-2xl z-[1001] min-w-[160px] overflow-hidden',
                  t.isDark
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-100'
                )}>
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className={cn(
                        'w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-sm text-left transition-all',
                        t.isDark ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Edit size={16} className="text-amber-400" />
                      Edit Branch
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className={cn(
                        'w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-sm text-left transition-all border-t',
                        t.isDark
                          ? 'text-red-400 hover:bg-red-400/10 border-gray-700'
                          : 'text-red-600 hover:bg-red-50 border-gray-100'
                      )}
                    >
                      <Trash2 size={16} />
                      Delete Branch
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <BranchDetails branch={branch} viewMode={viewMode} />

        <Button
          variant="primary"
          className={cn(
            'w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm',
            !t.isDark && 'shadow-lg shadow-amber-400/20'
          )}
          onClick={(e) => { e.stopPropagation(); onClick?.(branch); }}
        >
          View branch Details
        </Button>
      </div>
    </div>
  );
}
