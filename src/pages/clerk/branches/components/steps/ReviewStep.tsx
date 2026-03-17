import { useThemeClasses } from '../../../../../lib/theme';
import { cn } from '../../../../../lib/utils';
import type { BranchFormData, LocationFormData, OperatingHours } from '../../hooks/useBranchForm';

interface ReviewStepProps {
  formData: BranchFormData;
  locationData: LocationFormData;
  operatingHours: OperatingHours;
}

function ReviewField({ label, value }: { label: string; value: string }) {
  const t = useThemeClasses();
  return (
    <p>
      <span className={t.textSecondary}>{label}:</span>{' '}
      <span className={t.text}>{value}</span>
    </p>
  );
}

export function ReviewStep({
  formData,
  locationData,
  operatingHours,
}: ReviewStepProps) {
  const t = useThemeClasses();

  const sectionClasses = cn('p-4 rounded-lg', t.isDark ? 'bg-gray-700' : 'bg-gray-50');
  const headingClasses = cn('font-semibold mb-3', t.text);

  return (
    <div className="space-y-6">
      <div className={sectionClasses}>
        <h3 className={headingClasses}>
          Basic Information
        </h3>
        <div className="space-y-2 text-sm">
          <ReviewField label="Name" value={formData.name} />
          {formData.phoneNumber && (
            <ReviewField label="Phone" value={formData.phoneNumber} />
          )}
          {formData.branchEmailAddress && (
            <ReviewField label="Email" value={formData.branchEmailAddress} />
          )}
          <p>
            <span className={t.textSecondary}>Status:</span>{' '}
            <span className={cn('capitalize', t.text)}>
              {formData.status.replace('_', ' ')}
            </span>
          </p>
          <ReviewField label="Main Branch" value={formData.isMainBranch ? 'Yes' : 'No'} />
        </div>
      </div>

      <div className={sectionClasses}>
        <h3 className={headingClasses}>
          Location
        </h3>
        <div className="space-y-2 text-sm">
          <ReviewField label="Address" value={locationData.address} />
          {locationData.city && (
            <ReviewField label="City" value={locationData.city} />
          )}
          {locationData.state && (
            <ReviewField label="State" value={locationData.state} />
          )}
          {locationData.country && (
            <ReviewField label="Country" value={locationData.country} />
          )}
          <ReviewField
            label="Coordinates"
            value={`${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`}
          />
        </div>
      </div>

      <div className={sectionClasses}>
        <h3 className={headingClasses}>
          Operating Hours
        </h3>
        <div className="space-y-1 text-sm">
          {Object.entries(operatingHours).map(([day, hours]) => (
            <p key={day} className={t.isDark ? 'text-gray-300' : 'text-gray-700'}>
              <span className="capitalize font-medium">{day}:</span>{' '}
              {hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Not set'}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
