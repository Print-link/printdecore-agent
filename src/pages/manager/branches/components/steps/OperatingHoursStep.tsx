import { useTheme } from '../../../../../contexts/ThemeContext';
import type { OperatingHours } from '../../hooks/useBranchForm';

interface OperatingHoursStepProps {
  operatingHours: OperatingHours;
  errors: Record<string, string>;
  onOperatingHoursChange: (day: string, field: 'open' | 'close', value: string) => void;
  onToggleDayClosed?: (day: string) => void;
}

export function OperatingHoursStep({
  operatingHours,
  errors,
  onOperatingHoursChange,
  onToggleDayClosed,
}: OperatingHoursStepProps) {
  const { theme } = useTheme();

  return (
    <div className="space-y-4">
      {Object.entries(operatingHours).map(([day, hours]) => {
        const isClosed = !!hours.isClosed;

        return (
          <div key={day} className={`p-4 rounded-lg border ${
            isClosed
              ? theme === 'dark' ? 'bg-gray-800 border-gray-700 opacity-60' : 'bg-gray-100 border-gray-200 opacity-60'
              : theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`font-medium capitalize ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>
                {day}
              </label>
              {onToggleDayClosed && (
                <button
                  type="button"
                  onClick={() => onToggleDayClosed(day)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    isClosed
                      ? theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                      : 'bg-amber-400'
                  }`}
                  role="switch"
                  aria-checked={!isClosed}
                  aria-label={`${day} ${isClosed ? 'closed' : 'open'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      isClosed ? 'translate-x-0' : 'translate-x-5'
                    }`}
                  />
                </button>
              )}
            </div>

            {isClosed ? (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Closed
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Open Time
                  </label>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => onOperatingHoursChange(day, 'open', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-400`}
                  />
                  {errors[`hours_${day}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`hours_${day}`]}</p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Close Time
                  </label>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => onOperatingHoursChange(day, 'close', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-amber-400`}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

