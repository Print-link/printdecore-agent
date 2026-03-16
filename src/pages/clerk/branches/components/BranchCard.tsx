import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
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
  const { theme } = useTheme();
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

  if (viewMode === 'list') {
    return (
      <div
        className={`flex flex-col md:flex-row items-center px-6 py-4 border-b transition-all relative group ${theme === 'dark'
          ? 'bg-gray-800/40 border-gray-700 hover:bg-gray-700/60'
          : 'bg-white border-gray-100 hover:bg-gray-50'
          }`}
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
            <h3 className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>
              {branch.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                0 Orders
              </span>
              <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                • {branch.phoneNumber || 'No phone'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Column */}
        <div className="flex-1 min-w-[140px] flex items-center justify-start md:justify-center">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${branch.status === 'active'
            ? 'bg-emerald-500/10 text-emerald-500'
            : branch.status === 'temporarily_closed'
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-red-500/10 text-red-500'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${branch.status === 'active' ? 'bg-emerald-500' : branch.status === 'temporarily_closed' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
            {branch.status.replace('_', ' ')}
          </div>
        </div>

        {/* Date Column */}
        <div className={`flex-1 min-w-[160px] text-[13px] flex items-center justify-start md:justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
            className={`text-[13px] font-bold border-none bg-transparent cursor-pointer flex items-center gap-1.5 transition-all py-1 px-3 rounded-md ${theme === 'dark'
              ? 'text-amber-400 hover:bg-amber-400/10'
              : 'text-amber-600 hover:bg-amber-50'
              } branch-actions`}
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
                className={`p-1.5 rounded-lg border-none cursor-pointer transition-all ${theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }`}
              >
                <MoreVertical size={18} />
              </button>
              {showActions && (
                <div
                  className={`absolute top-full right-0 mt-2 rounded-xl shadow-2xl z-[1001] min-w-[160px] overflow-hidden ${theme === 'dark'
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-100'
                    }`}
                >
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className={`w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-[13px] font-medium text-left transition-all ${theme === 'dark'
                        ? 'text-gray-100 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Edit size={16} className="text-amber-400" />
                      Edit Branch
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className={`w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-[13px] font-medium text-left transition-all border-t ${theme === 'dark'
                        ? 'text-red-400 hover:bg-red-400/10 border-gray-700'
                        : 'text-red-600 hover:bg-red-50 border-gray-100'
                        }`}
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

  // Grid view (unchanged but ensured P-0 for consistency)
  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${theme === 'dark'
        ? 'bg-gray-800 border-gray-700 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]'
        : 'bg-white border-gray-100 hover:border-amber-400/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)]'
        }`}
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
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>
              {branch.name}
            </h3>
            <div className={`flex items-center gap-2 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex ${branch.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
              <span className={`w-1 h-1 rounded-full ${branch.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
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
                className={`p-2 rounded-lg transition-all border-none cursor-pointer ${theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700'
                  : 'text-gray-400 hover:bg-gray-100'
                  }`}
              >
                <MoreVertical size={18} />
              </button>
              {showActions && (
                <div
                  className={`absolute top-full right-0 mt-2 rounded-xl shadow-2xl z-[1001] min-w-[160px] overflow-hidden ${theme === 'dark'
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-100'
                    }`}
                >
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className={`w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-sm text-left transition-all ${theme === 'dark'
                        ? 'text-gray-100 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <Edit size={16} className="text-amber-400" />
                      Edit Branch
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className={`w-full px-4 py-3 border-none bg-transparent cursor-pointer flex items-center gap-3 text-sm text-left transition-all border-t ${theme === 'dark'
                        ? 'text-red-400 hover:bg-red-400/10 border-gray-700'
                        : 'text-red-600 hover:bg-red-50 border-gray-100'
                        }`}
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

        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(branch); }}
          className={`w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm transition-all border-none cursor-pointer ${theme === 'dark'
            ? 'bg-amber-400 text-black hover:bg-amber-500'
            : 'bg-amber-400 text-black hover:bg-amber-500 shadow-lg shadow-amber-400/20'
            }`}
        >
          View branch Details
        </button>
      </div>
    </div>
  );
}

