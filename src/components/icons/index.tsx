/**
 * Centralized icon system using Solar Icons (Bold Duotone) from Iconify.
 * Premium enterprise-grade icons via https://icones.netlify.app/collection/solar
 *
 * Usage:
 *   import { DashboardIcon, OrdersIcon } from '@/components/icons';
 *   <DashboardIcon size={20} className="text-amber-500" />
 *
 * All icons accept: size, className, color, style, onClick
 */
import { Icon as IconifyIcon } from '@iconify/react';
import type { CSSProperties, MouseEventHandler } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<SVGSVGElement>;
  /** When true, renders the bold-duotone (filled) variant; when false, renders the linear (outline) variant. Defaults to true. */
  active?: boolean;
}

/**
 * Factory: creates a named React icon component with active/inactive variants.
 * - active (default): bold-duotone filled style
 * - inactive: linear outline style
 */
function createIcon(activeName: string, displayName: string, inactiveName?: string) {
  const Component = ({ size = 24, className, color, style, onClick, active = true }: IconProps) => (
    <IconifyIcon
      icon={active || !inactiveName ? activeName : inactiveName}
      width={size}
      height={size}
      className={className}
      color={color}
      style={style}
      onClick={onClick}
    />
  );
  Component.displayName = displayName;
  return Component;
}

// ─── Navigation & Layout ─────────────────────────────────────────────
export const LayoutDashboard = createIcon('solar:widget-4-bold-duotone', 'LayoutDashboard', 'solar:widget-4-linear');
export const Home = createIcon('solar:home-2-bold-duotone', 'Home', 'solar:home-2-linear');
export const Menu = createIcon('solar:hamburger-menu-bold-duotone', 'Menu', 'solar:hamburger-menu-linear');
export const Settings = createIcon('solar:settings-bold-duotone', 'Settings', 'solar:settings-linear');
export const LogOut = createIcon('solar:logout-2-bold-duotone', 'LogOut', 'solar:logout-2-linear');

// ─── Arrows & Chevrons ──────────────────────────────────────────────
export const ArrowLeft = createIcon('solar:arrow-left-linear', 'ArrowLeft');
export const ArrowRight = createIcon('solar:arrow-right-linear', 'ArrowRight');
export const ChevronDown = createIcon('solar:alt-arrow-down-linear', 'ChevronDown');
export const ChevronUp = createIcon('solar:alt-arrow-up-linear', 'ChevronUp');
export const ChevronLeft = createIcon('solar:alt-arrow-left-linear', 'ChevronLeft');
export const ChevronRight = createIcon('solar:alt-arrow-right-linear', 'ChevronRight');

// ─── Actions ─────────────────────────────────────────────────────────
export const Search = createIcon('solar:magnifer-linear', 'Search');
export const Plus = createIcon('solar:add-circle-bold-duotone', 'Plus');
export const Edit = createIcon('solar:pen-bold-duotone', 'Edit');
export const Save = createIcon('solar:diskette-bold-duotone', 'Save');
export const Trash2 = createIcon('solar:trash-bin-trash-bold-duotone', 'Trash2');
export const Download = createIcon('solar:download-minimalistic-bold-duotone', 'Download');
export const Send = createIcon('solar:plain-bold-duotone', 'Send');
export const RefreshCw = createIcon('solar:refresh-bold-duotone', 'RefreshCw');
export const Play = createIcon('solar:play-bold-duotone', 'Play');
export const X = createIcon('solar:close-circle-linear', 'X');
export const Reply = createIcon('solar:reply-bold', 'Reply');
export const Pin = createIcon('solar:pin-bold-duotone', 'Pin');
export const PinSlash = createIcon('solar:pin-slash-linear', 'PinSlash');
export const Archive = createIcon('solar:archive-down-bold-duotone', 'Archive');
export const ArchiveRestore = createIcon('solar:archive-up-bold-duotone', 'ArchiveRestore');
export const BellOff = createIcon('solar:bell-off-bold-duotone', 'BellOff');

// ─── Status & Feedback ──────────────────────────────────────────────
export const Check = createIcon('solar:check-circle-bold-duotone', 'Check');
export const CheckCircle = createIcon('solar:check-circle-bold-duotone', 'CheckCircle');
export const CheckCircle2 = createIcon('solar:verified-check-bold-duotone', 'CheckCircle2');
export const XCircle = createIcon('solar:close-circle-bold-duotone', 'XCircle');
export const AlertCircle = createIcon('solar:danger-circle-bold-duotone', 'AlertCircle');
export const AlertTriangle = createIcon('solar:danger-triangle-bold-duotone', 'AlertTriangle');
export const Info = createIcon('solar:info-circle-bold-duotone', 'Info');
export const InfoIcon = Info;
export const HelpCircle = createIcon('solar:question-circle-bold-duotone', 'HelpCircle');
export const Circle = createIcon('solar:record-circle-linear', 'Circle');
export const Loader2 = createIcon('solar:refresh-circle-bold-duotone', 'Loader2');

// ─── Business & Commerce ────────────────────────────────────────────
export const ShoppingBag = createIcon('solar:bag-4-bold-duotone', 'ShoppingBag', 'solar:bag-4-linear');
export const Store = createIcon('solar:shop-bold-duotone', 'Store', 'solar:shop-linear');
export const Package = createIcon('solar:box-bold-duotone', 'Package', 'solar:box-linear');
export const Truck = createIcon('solar:delivery-bold-duotone', 'Truck', 'solar:delivery-linear');
export const DollarSign = createIcon('solar:dollar-bold-duotone', 'DollarSign', 'solar:dollar-linear');
export const Tag = createIcon('solar:tag-bold-duotone', 'Tag', 'solar:tag-linear');

// ─── Analytics & Charts ─────────────────────────────────────────────
export const BarChart3 = createIcon('solar:chart-2-bold-duotone', 'BarChart3', 'solar:chart-2-linear');
export const PieChart = createIcon('solar:pie-chart-2-bold-duotone', 'PieChart', 'solar:pie-chart-2-linear');
export const TrendingUp = createIcon('solar:graph-up-bold-duotone', 'TrendingUp', 'solar:graph-up-linear');

// ─── People & Auth ──────────────────────────────────────────────────
export const User = createIcon('solar:user-bold-duotone', 'User', 'solar:user-linear');
export const UserCircle = createIcon('solar:user-circle-bold-duotone', 'UserCircle', 'solar:user-circle-linear');
export const Users = createIcon('solar:users-group-rounded-bold-duotone', 'Users', 'solar:users-group-rounded-linear');
export const UserCheck = createIcon('solar:user-check-bold-duotone', 'UserCheck', 'solar:user-check-linear');
export const UserX = createIcon('solar:user-cross-bold-duotone', 'UserX', 'solar:user-cross-linear');
export const Shield = createIcon('solar:shield-bold-duotone', 'Shield', 'solar:shield-linear');
export const Lock = createIcon('solar:lock-bold-duotone', 'Lock');
export const Key = createIcon('solar:key-bold-duotone', 'Key');
export const Eye = createIcon('solar:eye-bold-duotone', 'Eye');
export const EyeOff = createIcon('solar:eye-closed-bold-duotone', 'EyeOff');

// ─── Communication ──────────────────────────────────────────────────
export const Bell = createIcon('solar:bell-bold-duotone', 'Bell', 'solar:bell-linear');
export const Mail = createIcon('solar:letter-bold-duotone', 'Mail', 'solar:letter-linear');
export const MessageCircle = createIcon('solar:chat-round-dots-bold-duotone', 'MessageCircle', 'solar:chat-round-dots-linear');
export const MessageSquare = createIcon('solar:chat-square-bold-duotone', 'MessageSquare', 'solar:chat-square-linear');
export const Phone = createIcon('solar:phone-bold-duotone', 'Phone', 'solar:phone-linear');

// ─── Media & Files ──────────────────────────────────────────────────
export const FileText = createIcon('solar:file-text-bold-duotone', 'FileText');
export const Camera = createIcon('solar:camera-bold-duotone', 'Camera');

// ─── Time & Calendar ────────────────────────────────────────────────
export const Clock = createIcon('solar:clock-circle-bold-duotone', 'Clock');
export const Calendar = createIcon('solar:calendar-bold-duotone', 'Calendar');

// ─── Location & Maps ────────────────────────────────────────────────
export const MapPin = createIcon('solar:map-point-bold-duotone', 'MapPin');
export const Navigation = createIcon('solar:routing-bold-duotone', 'Navigation');
export const Globe = createIcon('solar:global-bold-duotone', 'Globe');

// ─── Tools & Hardware ───────────────────────────────────────────────
export const Wrench = createIcon('solar:tuning-2-bold-duotone', 'Wrench', 'solar:tuning-2-linear');
export const Printer = createIcon('solar:printer-2-bold-duotone', 'Printer', 'solar:printer-2-linear');
export const Zap = createIcon('solar:bolt-bold-duotone', 'Zap', 'solar:bolt-linear');

// ─── UI Elements ────────────────────────────────────────────────────
export const Grid = createIcon('solar:widget-bold-duotone', 'Grid');
export const List = createIcon('solar:list-bold-duotone', 'List');
export const MoreVertical = createIcon('solar:menu-dots-bold', 'MoreVertical');
export const MoreHorizontal = createIcon('solar:menu-dots-bold', 'MoreHorizontal');
export const Star = createIcon('solar:star-bold-duotone', 'Star');
export const Building = createIcon('solar:buildings-bold-duotone', 'Building');
export const Palette = createIcon('solar:pallete-2-bold-duotone', 'Palette');
export const Volume2 = createIcon('solar:volume-loud-bold-duotone', 'Volume2');

// ─── Theme ──────────────────────────────────────────────────────────
export const Moon = createIcon('solar:moon-bold-duotone', 'Moon');
export const Sun = createIcon('solar:sun-bold-duotone', 'Sun');

// ─── Connectivity ───────────────────────────────────────────────────
export const Wifi = createIcon('solar:wi-fi-router-bold-duotone', 'Wifi');
export const WifiOff = createIcon('solar:wi-fi-router-minimalistic-bold-duotone', 'WifiOff');
export const CloudOff = createIcon('solar:cloud-cross-bold-duotone', 'CloudOff');

// ─── Finance & Data ─────────────────────────────────────────────────
export const Banknote = createIcon('solar:banknote-2-bold-duotone', 'Banknote', 'solar:banknote-2-linear');
export const BadgeDollarSign = createIcon('solar:tag-price-bold-duotone', 'BadgeDollarSign', 'solar:tag-price-linear');
export const CalendarDays = createIcon('solar:calendar-mark-bold-duotone', 'CalendarDays', 'solar:calendar-mark-linear');
export const Layers = createIcon('solar:layers-bold-duotone', 'Layers', 'solar:layers-linear');
export const CreditCard = createIcon('solar:card-bold-duotone', 'CreditCard', 'solar:card-linear');
export const Receipt = createIcon('solar:bill-list-bold-duotone', 'Receipt', 'solar:bill-list-linear');
export const Crown = createIcon('solar:crown-bold-duotone', 'Crown', 'solar:crown-linear');
export const Rocket = createIcon('solar:rocket-bold-duotone', 'Rocket', 'solar:rocket-linear');
export const Diamond = createIcon('solar:diamond-bold-duotone', 'Diamond', 'solar:diamond-linear');

// ─── Upload & Misc ──────────────────────────────────────────────────
export const Upload = createIcon('solar:upload-bold-duotone', 'Upload');
export const File = createIcon('solar:file-bold-duotone', 'File');
export const Minus = createIcon('solar:minus-circle-bold-duotone', 'Minus');

// ─── SVG Spinners (animated loading indicators) ─────────────────────
// From https://icones.netlify.app/collection/svg-spinners
export const SpinnerRing = createIcon('svg-spinners:90-ring-with-bg', 'SpinnerRing');
export const SpinnerDots = createIcon('svg-spinners:3-dots-fade', 'SpinnerDots');
export const SpinnerPulse = createIcon('svg-spinners:pulse-rings-multiple', 'SpinnerPulse');
export const SpinnerBars = createIcon('svg-spinners:bars-scale-fade', 'SpinnerBars');
export const SpinnerBlock = createIcon('svg-spinners:blocks-shuffle-3', 'SpinnerBlock');
export const SpinnerEclipse = createIcon('svg-spinners:eclipse-half', 'SpinnerEclipse');

/**
 * Reusable Spinner component with preset sizes.
 *
 * Usage:
 *   <Spinner />                    — default page spinner (40px, amber)
 *   <Spinner size="sm" />          — small inline spinner (16px)
 *   <Spinner size="lg" />          — large section spinner (48px)
 *   <Spinner variant="dots" />     — dots style
 *   <Spinner className="text-white" size="sm" />  — button spinner
 */
const SPINNER_SIZES = { xs: 14, sm: 18, md: 32, lg: 48, xl: 64 } as const;
type SpinnerSize = keyof typeof SPINNER_SIZES | number;

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: 'ring' | 'dots' | 'pulse' | 'bars' | 'blocks' | 'eclipse';
  className?: string;
}

const SPINNER_ICONS = {
  ring: 'svg-spinners:90-ring-with-bg',
  dots: 'svg-spinners:3-dots-fade',
  pulse: 'svg-spinners:pulse-rings-multiple',
  bars: 'svg-spinners:bars-scale-fade',
  blocks: 'svg-spinners:blocks-shuffle-3',
  eclipse: 'svg-spinners:eclipse-half',
} as const;

export function Spinner({ size = 'md', variant = 'ring', className = 'text-amber-400' }: SpinnerProps) {
  const px = typeof size === 'number' ? size : SPINNER_SIZES[size];
  return (
    <IconifyIcon
      icon={SPINNER_ICONS[variant]}
      width={px}
      height={px}
      className={className}
    />
  );
}
Spinner.displayName = 'Spinner';

// ─── Message Status Ticks (WhatsApp-style) ──────────────────────────
interface TickProps {
  className?: string;
  size?: number;
}

/** Single check — message sent to server */
export function TickSent({ className = 'text-current', size = 16 }: TickProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Double check — message delivered to recipient */
export function TickDelivered({ className = 'text-current', size = 16 }: TickProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 8.5L5 12l7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 8.5L9 12l5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Double check blue — message read by recipient */
export function TickRead({ className = 'text-blue-500', size = 16 }: TickProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 8.5L5 12l7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 8.5L9 12l5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Type export for components that accept icon as prop ─────────────
export type IconComponent = typeof LayoutDashboard;
