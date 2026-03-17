import { useThemeClasses } from '../../../../../lib/theme';
import type { LocationFormData } from '../../hooks/useBranchForm';
import { LeafletMapPicker } from './LeafletMapPicker';

interface LocationStepProps {
  locationData: LocationFormData;
  errors: Record<string, string>;
  onLocationChange: (updates: Partial<LocationFormData>) => void;
}

export function LocationStep({
  locationData,
  errors,
  onLocationChange,
}: LocationStepProps) {
  const t = useThemeClasses();

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-xl border flex items-center gap-3 ${
        t.isDark ? 'bg-amber-400/10 border-amber-400/20' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className={`p-2 rounded-full ${t.isDark ? 'bg-amber-400/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <p className={`text-sm ${t.isDark ? 'text-amber-200' : 'text-amber-800 font-medium'}`}>
          Search for your branch address or click on the map to pinpoint its exact location.
        </p>
      </div>

      <LeafletMapPicker
        initialPosition={
          locationData.latitude && locationData.longitude
            ? { lat: locationData.latitude, lng: locationData.longitude }
            : undefined
        }
        onLocationSelect={(data) => {
          onLocationChange({
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city || '',
            state: data.state || '',
            country: data.country || '',
            postalCode: data.postalCode || '',
          });
        }}
      />

      <div className={`p-6 rounded-xl border ${
        t.isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${t.textTertiary}`}>
              Confirmed Address
            </label>
            <input
              type="text"
              value={locationData.address}
              onChange={(e) => onLocationChange({ address: e.target.value })}
              placeholder="Address will be populated from map..."
              className={`w-full px-4 py-3 rounded-lg border text-sm transition-all shadow-sm ${
                t.isDark
                  ? 'bg-gray-900 border-gray-600 text-gray-100 focus:bg-gray-800'
                  : 'bg-white border-gray-300 text-gray-900 focus:bg-white'
              } focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400`}
              required
            />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.address}</p>
            )}
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${t.textTertiary}`}>
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={locationData.latitude || ''}
              readOnly
              className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                t.isDark
                  ? 'bg-gray-900/50 border-gray-700 text-gray-500'
                  : 'bg-gray-100/50 border-gray-200 text-gray-400'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${t.textTertiary}`}>
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={locationData.longitude || ''}
              readOnly
              className={`w-full px-4 py-3 rounded-lg border text-sm shadow-sm ${
                t.isDark
                  ? 'bg-gray-900/50 border-gray-700 text-gray-500'
                  : 'bg-gray-100/50 border-gray-200 text-gray-400'
              }`}
            />
          </div>
        </div>

        {(locationData.city || locationData.state || locationData.country) && (
          <div className={`mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4 ${t.border}`}>
            {locationData.city && (
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${t.isDark ? 'text-gray-600' : 'text-gray-500'}`}>City</label>
                <p className={`text-sm font-medium ${t.isDark ? 'text-gray-300' : 'text-gray-700'}`}>{locationData.city}</p>
              </div>
            )}
            {locationData.state && (
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${t.isDark ? 'text-gray-600' : 'text-gray-500'}`}>State</label>
                <p className={`text-sm font-medium ${t.isDark ? 'text-gray-300' : 'text-gray-700'}`}>{locationData.state}</p>
              </div>
            )}
            {locationData.country && (
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${t.isDark ? 'text-gray-600' : 'text-gray-500'}`}>Country</label>
                <p className={`text-sm font-medium ${t.isDark ? 'text-gray-300' : 'text-gray-700'}`}>{locationData.country}</p>
              </div>
            )}
            {locationData.postalCode && (
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${t.isDark ? 'text-gray-600' : 'text-gray-500'}`}>Postcode</label>
                <p className={`text-sm font-medium ${t.isDark ? 'text-gray-300' : 'text-gray-700'}`}>{locationData.postalCode}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {errors.location && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-red-500 text-sm font-medium">{errors.location}</p>
        </div>
      )}
    </div>
  );
}
