import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search, Store, X, Spinner } from '../icons';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { apiService } from '../../services/api';
import { BranchTransitionOverlay } from './BranchTransitionOverlay';
import type { Branch } from '../../types';

interface BranchSelectorProps {
  isSidebarCollapsed: boolean;
}

export function BranchSelector({ isSidebarCollapsed }: BranchSelectorProps) {
  const t = useThemeClasses();
  const { user } = useAuthStore();
  const { selectedBranch, selectBranch, clearBranch, setLoading, setError } = useBranchStore();
  const { disconnect: disconnectWhatsApp, isConnected: whatsAppConnected } = useWhatsAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);
  const [transitionBranch, setTransitionBranch] = useState<Branch | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Fetch all branches when dropdown opens
  useEffect(() => {
    if (isOpen && allBranches.length === 0 && user?.id) {
      setIsLoadingBranches(true);
      apiService.getAllBranches(user.id)
        .then((branches) => {
          setAllBranches(branches);
        })
        .catch((error) => {
          setError(error instanceof Error ? error.message : 'Failed to load branches');
        })
        .finally(() => {
          setIsLoadingBranches(false);
        });
    }
  }, [isOpen, allBranches.length, setError, user?.id]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't render if no branch is selected or sidebar is collapsed
  if (!selectedBranch || isSidebarCollapsed) {
    return null;
  }

  const handleBranchSelect = async (branch: Branch) => {
    if (branch.id === selectedBranch.id) {
      setIsOpen(false);
      return;
    }

    // Prevent multiple clicks
    if (isSwitching) return;

    try {
      setIsSwitching(true);
      setSelectedBranchId(branch.id);

      // Disconnect WhatsApp entirely when switching branches
      // Manager will need to scan QR code again for the new branch
      if (whatsAppConnected) {
        await disconnectWhatsApp();
      }

      // Show immediate visual feedback
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Show transition overlay
      setTransitionBranch(branch);
      setShowTransition(true);
      setLoading(true);
      setError(null);

      // Keep dropdown open briefly to show selection
      await new Promise((resolve) => setTimeout(resolve, 200));
      setIsOpen(false);

      // Fetch branch details
      const branchDetails = await apiService.getBranchById(branch.id);
      selectBranch(branchDetails);

      // Wait for transition animation
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Navigate to dashboard
      navigate('/app/home');

      // Hide overlay after navigation
      setTimeout(() => {
        setShowTransition(false);
        setTransitionBranch(null);
        setLoading(false);
        setSelectedBranchId(null);
        setIsSwitching(false);
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch branch';
      setError(errorMessage);
      setShowTransition(false);
      setTransitionBranch(null);
      setLoading(false);
      setSelectedBranchId(null);
      setIsSwitching(false);
    }
  };

  const handleDeselectBranch = async () => {
    // Prevent multiple clicks
    if (isSwitching) return;

    try {
      setIsSwitching(true);
      setLoading(true);
      setError(null);
      setIsOpen(false);

      // Disconnect WhatsApp entirely when leaving a branch
      // Manager will need to scan QR code again when re-entering
      if (whatsAppConnected) {
        await disconnectWhatsApp();
      }

      // Clear the selected branch
      clearBranch();

      // Navigate to overview page (where managers see when no branch is selected)
      navigate('/app/home');

      // Reset state
      setTimeout(() => {
        setLoading(false);
        setIsSwitching(false);
      }, 300);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deselect branch';
      setError(errorMessage);
      setLoading(false);
      setIsSwitching(false);
    }
  };

  const formatAddress = (location?: Branch['location']) => {
    if (!location?.address) return 'No address';
    if (location.address.length > 35) {
      return location.address.substring(0, 32) + '...';
    }
    return location.address;
  };

  const filteredBranches = allBranches.filter((branch) => {
    if (branch.id === selectedBranch.id) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      branch.name.toLowerCase().includes(query) ||
      branch.location?.address?.toLowerCase().includes(query)
    );
  });

  const visibleBranches = filteredBranches.slice(0, visibleCount);
  const hasMore = filteredBranches.length > visibleCount;

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <BranchTransitionOverlay
        branch={transitionBranch}
        isVisible={showTransition}
      />
      <div
        ref={dropdownRef}
        className={cn('relative border-b p-3', t.border)}
      >
        {/* Current Branch Display */}
        <button
          onClick={() => {
            if (!isSwitching) {
              setIsOpen(!isOpen);
              if (!isOpen) {
                setSearchQuery('');
                setVisibleCount(5);
              }
            }
          }}
          disabled={isSwitching}
          className={cn(
            'w-full p-2 border-none bg-transparent cursor-pointer text-left flex items-center gap-2 rounded-lg transition-all',
            isSwitching
              ? 'opacity-60 cursor-not-allowed'
              : t.isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'
          )}
        >
          {/* Branch Image Thumbnail */}
          {selectedBranch.branchCoverImage ? (
            <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border">
              <img
                src={selectedBranch.branchCoverImage}
                alt={selectedBranch.name}
                className="w-full h-full object-cover block"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className={cn(
              'w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center',
              t.isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
            )}>
              <Store size={16} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={cn('text-sm font-semibold truncate mb-0.5', t.text)}>
              {selectedBranch.name}
            </div>
            <div className={cn('text-xs truncate', t.textSecondary)}>
              {formatAddress(selectedBranch.location)}
            </div>
          </div>
          <div className={cn('text-xs flex-shrink-0', t.textSecondary)}>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute top-full left-0 right-0 rounded-lg shadow-xl z-[1000] max-h-[500px] overflow-hidden mt-1 flex flex-col transition-all duration-200',
              t.surface
            )}
            style={{
              animation: 'fadeInDown 0.2s ease-out',
            }}
          >
            {/* Search Input */}
            <div className={cn('p-3 border-b', t.border)}>
              <div className="relative flex items-center">
                <Search
                  className={cn('absolute left-2.5', t.textSecondary)}
                  size={14}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search branches..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(5);
                  }}
                  className={cn('w-full pl-8 pr-2 py-2 rounded-md border text-xs outline-none', t.input)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                />
              </div>
            </div>

            {/* Deselect Branch Option */}
            <div className={cn('border-b', t.border)}>
              <button
                onClick={handleDeselectBranch}
                disabled={isSwitching}
                className={cn(
                  'w-full p-3 border-none bg-transparent cursor-pointer text-left flex items-center gap-3 transition-all',
                  isSwitching
                    ? 'opacity-50 cursor-not-allowed'
                    : t.isDark
                    ? 'hover:bg-red-900/20 active:bg-red-900/30 text-red-400'
                    : 'hover:bg-red-50 active:bg-red-100 text-red-600'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  t.isDark ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <X size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm font-semibold',
                    t.isDark ? 'text-red-400' : 'text-red-600'
                  )}>
                    Deselect Branch
                  </div>
                  <div className="text-xs text-gray-500">
                    Return to overview
                  </div>
                </div>
              </button>
            </div>

            {/* Branches List */}
            <div className="overflow-y-auto max-h-[400px]">
              {isLoadingBranches ? (
                <div className={cn('p-6 text-center', t.textSecondary)}>
                  Loading branches...
                </div>
              ) : visibleBranches.length === 0 ? (
                <div className={cn('p-6 text-center', t.textSecondary)}>
                  {searchQuery ? 'No branches found' : 'No other branches available'}
                </div>
              ) : (
                <>
                  {visibleBranches.map((branch) => {
                    const isSelected = selectedBranchId === branch.id;
                    const isActive = isSelected && isSwitching;

                    return (
                      <button
                        key={branch.id}
                        onClick={() => handleBranchSelect(branch)}
                        disabled={isSwitching}
                        className={cn(
                          'w-full p-3 border-none bg-transparent cursor-pointer text-left flex items-center gap-3 border-b transition-all relative group',
                          isActive
                            ? t.isDark
                              ? 'bg-amber-500/20 border-amber-500/30 shadow-inner'
                              : 'bg-amber-100 border-amber-200 shadow-inner'
                            : t.isDark
                            ? 'border-gray-700 hover:bg-gray-700/50 active:bg-gray-700/70'
                            : 'border-gray-200 hover:bg-gray-50 active:bg-gray-100',
                          isSwitching && !isActive && 'opacity-50 cursor-not-allowed'
                        )}
                        style={{
                          transform: isActive ? 'scale(0.98)' : 'scale(1)',
                        }}
                      >
                        {isActive && (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded">
                              <Spinner size="sm" />
                            </div>
                            <div className={cn(
                              'absolute left-0 top-0 bottom-0 w-1',
                              t.isDark ? 'bg-amber-400' : 'bg-amber-500'
                            )} />
                          </>
                        )}
                        {/* Branch Image Thumbnail */}
                        <div className={cn(
                          'w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border transition-all',
                          isActive ? 'ring-2 ring-amber-400 scale-105 shadow-lg' : 'group-hover:scale-105'
                        )}>
                          {branch.branchCoverImage ? (
                            <img
                              src={branch.branchCoverImage}
                              alt={branch.name}
                              className="w-full h-full object-cover block"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={cn(
                              'w-full h-full flex items-center justify-center',
                              t.isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                            )}>
                              <Store size={18} />
                            </div>
                          )}
                        </div>
                        <div className={cn('flex-1 min-w-0 transition-all', isActive && 'translate-x-1')}>
                          <div className={cn(
                            'text-sm font-semibold truncate mb-0.5 transition-colors',
                            isActive
                              ? 'text-amber-600 dark:text-amber-400'
                              : t.text
                          )}>
                            {branch.name}
                          </div>
                          <div className={cn('text-xs truncate', t.textSecondary)}>
                            {formatAddress(branch.location)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {/* Show More Button */}
                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className={cn(
                        'w-full p-3 border-none bg-transparent cursor-pointer text-center border-t transition-all',
                        t.isDark
                          ? 'text-amber-400 border-gray-700 hover:bg-gray-700/50'
                          : 'text-amber-600 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      Show {Math.min(10, filteredBranches.length - visibleCount)} more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
