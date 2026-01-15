import React, { useEffect, useState, useCallback } from 'react';
import { useWalkthroughStore } from '../../stores/walkthroughStore';
import type { WalkthroughStep } from '../../stores/walkthroughStore';
import { useTheme } from '../../contexts/ThemeContext';
import { X, ChevronRight, Check } from 'lucide-react';

interface WalkthroughTooltipProps {
  step: WalkthroughStep;
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const WalkthroughTooltip: React.FC<WalkthroughTooltipProps> = ({
  step,
  targetId,
  title,
  content,
  position = 'bottom',
}) => {
  const { currentStep, nextStep, skipWalkthrough, isActive } = useWalkthroughStore();
  const { theme } = useTheme();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    const element = document.getElementById(targetId);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [targetId]);

  useEffect(() => {
    if (isActive && currentStep === step) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      const interval = setInterval(updatePosition, 1000); // Poll as fallback

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        clearInterval(interval);
      };
    }
  }, [isActive, currentStep, step, updatePosition]);

  if (!isActive || currentStep !== step || !targetRect) return null;

  const getTooltipStyle = () => {
    const gap = 12;
    switch (position) {
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + gap,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + gap,
          transform: 'translateY(-50%)',
        };
      case 'bottom':
      default:
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
    }
  };

  const isLastStep = step === 'create-branch-form';

  return (
    <>
      {/* Backdrop with hole */}
      <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
        <div 
          className="absolute bg-black/50 transition-all duration-300 pointer-events-auto"
          style={{
            top: 0,
            left: 0,
            width: '100vw',
            height: targetRect.top,
          }}
        />
        <div 
          className="absolute bg-black/50 transition-all duration-300 pointer-events-auto"
          style={{
            top: targetRect.top,
            left: 0,
            width: targetRect.left,
            height: targetRect.height,
          }}
        />
        <div 
          className="absolute bg-black/50 transition-all duration-300 pointer-events-auto"
          style={{
            top: targetRect.top,
            left: targetRect.right,
            width: window.innerWidth - targetRect.right,
            height: targetRect.height,
          }}
        />
        <div 
          className="absolute bg-black/50 transition-all duration-300 pointer-events-auto"
          style={{
            top: targetRect.bottom,
            left: 0,
            width: '100vw',
            height: window.innerHeight - targetRect.bottom,
          }}
        />
      </div>

      {/* Tooltip */}
      <div 
        className={`fixed z-[9999] w-72 rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in duration-300 ${
          theme === 'dark' ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-100 text-gray-900'
        }`}
        style={getTooltipStyle() as React.CSSProperties}
      >
        <button 
          onClick={skipWalkthrough}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
        >
          <X size={16} />
        </button>
        
        <h3 className="text-base font-bold mb-2 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-bold">
            {step === 'welcome' ? 1 : step === 'sidebar-branches' ? 2 : step === 'branches-create' ? 3 : 4}
          </span>
          {title}
        </h3>
        
        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {content}
        </p>
        
        <div className="flex items-center justify-between">
          <button 
            onClick={skipWalkthrough}
            className="text-xs font-medium text-gray-400 hover:text-gray-500"
          >
            Skip Guide
          </button>
          <button 
            onClick={nextStep}
            className="flex items-center gap-1 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
          >
            {isLastStep ? 'Finish' : 'Next'}
            {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Arrow */}
        <div 
          className={`absolute w-3 h-3 rotate-45 ${
            theme === 'dark' ? 'bg-gray-800 border-l border-t border-gray-700' : 'bg-white border-l border-t border-gray-100 shadow-[-5px_-5px_5px_-2px_rgba(0,0,0,0.05)]'
          }`}
          style={{
            ...((position === 'bottom' ? { top: -6, left: '50%', marginLeft: -6 } : 
                position === 'top' ? { bottom: -6, left: '50%', marginLeft: -6 } :
                position === 'right' ? { left: -6, top: '50%', marginTop: -6 } :
                { right: -6, top: '50%', marginTop: -6 }))
          } as React.CSSProperties}
        />
      </div>
    </>
  );
};
