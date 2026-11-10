import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from '../icons';
import { useTheme } from '../../contexts/ThemeContext';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  label?: string;
}

const GAP = 8; // between the icon and the bubble
const EDGE = 8; // kept clear of the screen's edges

/**
 * Opens on hover, tap or keyboard focus, so it works on phones too. The bubble
 * is rendered on <body> and kept inside the screen, so a scrolling panel or
 * drawer never clips it.
 */
export function Tooltip({ content, children, label = 'More info' }: TooltipProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number; arrow: number; below: boolean } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const id = useId();
  const dark = theme === 'dark';

  const measure = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect();
    const b = bubble.current?.getBoundingClientRect();
    if (!a || !b) return;
    const centre = a.left + a.width / 2;
    const left = Math.min(Math.max(centre - b.width / 2, EDGE), window.innerWidth - b.width - EDGE);
    const below = a.top - GAP - b.height < EDGE;
    setPlace({
      left,
      top: below ? a.bottom + GAP : a.top - GAP - b.height,
      arrow: Math.min(Math.max(centre - left, 12), b.width - 12),
      below,
    });
  }, []);

  useLayoutEffect(() => {
    if (isVisible) measure();
    else setPlace(null);
  }, [isVisible, measure]);

  useEffect(() => {
    if (!isVisible) return;
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [isVisible, measure]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={label}
        aria-describedby={isVisible ? id : undefined}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isVisible) {
            e.stopPropagation(); // close the tip, not the drawer around it
            setIsVisible(false);
          }
        }}
        className="inline-flex align-middle cursor-help rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {children || <HelpCircle size={14} className={dark ? 'text-gray-400' : 'text-gray-500'} />}
      </button>

      {isVisible &&
        createPortal(
          <span
            ref={bubble}
            id={id}
            role="tooltip"
            style={{ top: place?.top ?? 0, left: place?.left ?? 0, visibility: place ? 'visible' : 'hidden' }}
            className={`fixed z-[1100] w-60 max-w-[calc(100vw-16px)] p-2.5 rounded-lg shadow-xl border text-xs font-normal leading-relaxed text-left pointer-events-none ${
              dark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {content}
            {place && (
              <span
                style={{ left: place.arrow }}
                className={`absolute -translate-x-1/2 border-8 border-transparent ${
                  place.below
                    ? `bottom-full ${dark ? 'border-b-gray-800' : 'border-b-white'}`
                    : `top-full ${dark ? 'border-t-gray-800' : 'border-t-white'}`
                }`}
              />
            )}
          </span>,
          document.body,
        )}
    </>
  );
}
