import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { Card, PageHeader, Button, Section } from '../../components/ui';
import { useSettings } from '../../contexts/SettingsContext';
import { Printer, Palette, Volume2, Play, MessageCircle, Store, Spinner } from '../../components/icons';
import StatusPage from './StatusPage';
import { useWhatsAppStore } from '../../stores/whatsappStore';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import BranchInfoSettings from './settings/BranchInfoSettings';
import QRCode from 'qrcode';

type SettingsTab = 'printers' | 'ui' | 'sounds' | 'whatsapp' | 'branch';

/* ── reusable toggle ─────────────────────────────────────────────── */
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  const t = useThemeClasses();
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-none cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        on ? 'bg-amber-400' : t.isDark ? 'bg-gray-600' : 'bg-gray-300',
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

/* ── option button row (font size / ui scale) ────────────────────── */
function OptionRow<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  const t = useThemeClasses();
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'flex-1 px-4 py-2 rounded-md border transition-all cursor-pointer',
            value === opt
              ? 'bg-amber-400 text-gray-900 border-amber-400 font-bold'
              : t.isDark
              ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400',
          )}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { toggleTheme } = useTheme();
  const t = useThemeClasses();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const {
    settings, setFontSize, setUIScale, resetSettings,
    setSoundEnabled, setSoundVolume,
    setJobNotificationEnabled, setPaymentNotificationEnabled, playSound,
  } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('printers');

  const { isConnected, isConnecting, qrCode, error, connect, disconnect } = useWhatsAppStore();
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (qrCode) {
      QRCode.toDataURL(qrCode, { width: 300, margin: 2 })
        .then((url) => setQrImageUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    } else {
      setQrImageUrl(null);
    }
  }, [qrCode]);

  const settingsTabs: { id: SettingsTab; label: string; icon: typeof Printer }[] = [
    { id: 'printers', label: 'Printer Status', icon: Printer },
    { id: 'ui', label: 'UI Preferences', icon: Palette },
    { id: 'sounds', label: 'Sounds', icon: Volume2 },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  ];

  if (user?.role === 'manager' && selectedBranch) {
    settingsTabs.push({ id: 'branch', label: 'Branch Info', icon: Store });
  }

  return (
    <div className={cn('flex h-full overflow-hidden', t.isDark ? 'bg-gray-900' : 'bg-gray-50')}>
      {/* Sidebar */}
      <div className={cn('w-48 min-w-[200px] border-r flex flex-col', t.isDark ? 'bg-gray-800' : 'bg-white', t.border)}>
        <div className={cn('p-4 border-b', t.border)}>
          <h1 className={cn('text-sm font-semibold uppercase tracking-wide', t.text)}>Settings</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-all text-left border-none cursor-pointer',
                  isActive
                    ? t.isDark ? 'bg-amber-400/15 text-amber-400 font-medium' : 'bg-amber-400/10 text-amber-600 font-medium'
                    : t.isDark ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <Icon size={16} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'printers' && (
          <Section>
            <PageHeader title="Printer Status" description="View and manage available printers" />
            <div className="mt-6"><StatusPage /></div>
          </Section>
        )}

        {activeTab === 'ui' && (
          <Section>
            <PageHeader title="UI Preferences" description="Customize the appearance and layout of the application" />
            <div className="space-y-6 max-w-2xl mt-6">
              <Card>
                <label className={cn('block text-sm font-medium mb-3', t.textSecondary)}>Theme</label>
                <Button variant="secondary" onClick={toggleTheme}>
                  Switch to {t.isDark ? 'Light' : 'Dark'} Mode
                </Button>
              </Card>

              <Card>
                <label className={cn('block text-sm font-medium mb-3', t.textSecondary)}>Font Size</label>
                <div className="mb-3">
                  <OptionRow options={['small', 'medium', 'large']} value={settings.fontSize} onChange={setFontSize} />
                </div>
                <div className={cn('p-3 rounded-md text-sm', t.isDark ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200', t.textSecondary)}>
                  Preview: The quick brown fox jumps over the lazy dog
                </div>
              </Card>

              <Card>
                <label className={cn('block text-sm font-medium mb-3', t.textSecondary)}>UI Scale</label>
                <div className="mb-2">
                  <OptionRow options={['compact', 'comfortable', 'spacious']} value={settings.uiScale} onChange={setUIScale} />
                </div>
                <p className={cn('text-xs', t.textTertiary)}>Adjusts spacing and padding throughout the app</p>
              </Card>

              <Card>
                <Button variant="danger" className="w-full" onClick={resetSettings}>Reset to Defaults</Button>
              </Card>
            </div>
          </Section>
        )}

        {activeTab === 'sounds' && (
          <Section>
            <PageHeader title="Sound Settings" description="Configure notification sounds and volume" />
            <div className="space-y-6 max-w-2xl mt-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <label className={cn('block text-sm font-medium', t.textSecondary)}>Enable Sounds</label>
                    <p className={cn('text-xs mt-1', t.textTertiary)}>Turn on or off all notification sounds</p>
                  </div>
                  <Toggle on={settings.sounds.enabled} onChange={() => setSoundEnabled(!settings.sounds.enabled)} />
                </div>
              </Card>

              <Card>
                <label className={cn('block text-sm font-medium mb-3', t.textSecondary)}>
                  Volume: {Math.round(settings.sounds.volume * 100)}%
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={settings.sounds.volume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  disabled={!settings.sounds.enabled}
                  className={cn(
                    'w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-400',
                    !settings.sounds.enabled && 'opacity-50 cursor-not-allowed',
                    t.isDark ? 'bg-gray-700' : 'bg-gray-200',
                  )}
                />
                <div className="flex justify-between mt-1">
                  <span className={cn('text-xs', t.textTertiary)}>Mute</span>
                  <span className={cn('text-xs', t.textTertiary)}>Max</span>
                </div>
              </Card>

              {/* Job Notification Sound */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <label className={cn('block text-sm font-medium', t.textSecondary)}>Job Notification Sound</label>
                    <p className={cn('text-xs mt-1', t.textTertiary)}>Play sound when a new job is received</p>
                  </div>
                  <Toggle on={settings.sounds.jobNotificationEnabled} onChange={() => setJobNotificationEnabled(!settings.sounds.jobNotificationEnabled)} disabled={!settings.sounds.enabled} />
                </div>
                <Button
                  variant="secondary" size="sm" icon={Play}
                  onClick={() => playSound('job')}
                  disabled={!settings.sounds.enabled || !settings.sounds.jobNotificationEnabled}
                >
                  Test Sound
                </Button>
              </Card>

              {/* Payment Notification Sound */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <label className={cn('block text-sm font-medium', t.textSecondary)}>Payment Notification Sound</label>
                    <p className={cn('text-xs mt-1', t.textTertiary)}>Play sound when a payment is received</p>
                  </div>
                  <Toggle on={settings.sounds.paymentNotificationEnabled} onChange={() => setPaymentNotificationEnabled(!settings.sounds.paymentNotificationEnabled)} disabled={!settings.sounds.enabled} />
                </div>
                <Button
                  variant="secondary" size="sm" icon={Play}
                  onClick={() => playSound('payment')}
                  disabled={!settings.sounds.enabled || !settings.sounds.paymentNotificationEnabled}
                >
                  Test Sound
                </Button>
              </Card>
            </div>
          </Section>
        )}

        {activeTab === 'whatsapp' && (
          <Section>
            <PageHeader title="WhatsApp Integration" description="Connect your WhatsApp account to send and receive messages" />
            <div className="space-y-6 max-w-2xl mt-6">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className={cn('block text-sm font-medium', t.textSecondary)}>Connection Status</label>
                    <p className={cn('text-xs mt-1', t.textTertiary)}>
                      {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                    </p>
                  </div>
                  <div className={cn('w-3 h-3 rounded-full', isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400')} />
                </div>

                {error && (
                  <div className={cn('mb-4 p-3 rounded-md text-sm', t.isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200')}>
                    {error}
                  </div>
                )}

                {!isConnected && !isConnecting && (
                  <Button className="w-full" onClick={connect}>Connect WhatsApp</Button>
                )}

                {isConnecting && qrImageUrl && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className={cn('text-sm mb-2 font-medium', t.textSecondary)}>Scan QR Code with WhatsApp</p>
                      <p className={cn('text-xs mb-4', t.textTertiary)}>
                        1. Open WhatsApp on your phone<br />
                        2. Tap Menu or Settings and select Linked Devices<br />
                        3. Tap Link a Device<br />
                        4. Point your phone at this screen to capture the code
                      </p>
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <img src={qrImageUrl} alt="QR Code" className="w-64 h-64 border-2 border-gray-200 rounded-lg" />
                      </div>
                      <p className={cn('text-xs mt-2', t.textTertiary)}>QR code will refresh automatically if it expires</p>
                    </div>
                    <Button variant="secondary" className="w-full" onClick={disconnect}>Cancel Connection</Button>
                  </div>
                )}

                {isConnecting && !qrImageUrl && (
                  <div className="text-center py-8">
                    <Spinner size="md" />
                    <p className={cn('text-sm mt-4', t.textTertiary)}>Initializing WhatsApp connection...</p>
                  </div>
                )}

                {isConnected && (
                  <Button variant="danger" className="w-full" onClick={disconnect}>Disconnect WhatsApp</Button>
                )}
              </Card>

              {isConnected && (
                <div className={cn('p-4 rounded-lg border', t.isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('flex-shrink-0 w-2 h-2 rounded-full mt-1.5 animate-pulse', t.isDark ? 'bg-green-400' : 'bg-green-500')} />
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium mb-1', t.isDark ? 'text-green-300' : 'text-green-700')}>WhatsApp Connected</p>
                      <p className={cn('text-xs', t.isDark ? 'text-green-400' : 'text-green-600')}>
                        Your WhatsApp is connected. You can now send and receive messages from the Messages tab.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {activeTab === 'branch' && <BranchInfoSettings />}
      </div>
    </div>
  );
}
