export interface WorkingHour {
  day: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface Branch {
  id: string;
  name: string;
  phoneNumber?: string;
  manager_id: string; // Manager who owns this branch
  status: 'active' | 'inactive' | 'temporarily_closed';
  branchEmailAddress?: string; // Branch-specific email
  branchCoverImage?: string; // Branch cover image
  email?: string; // Legacy/API compatibility
  coverImage?: string; // Legacy/API compatibility
  isMainBranch: boolean;
  payStackSubAccountId?: string;
  location_id?: string; // Reference to location table
  operatingHours: {
    [key: string]: { // day of week (e.g., "monday", "tuesday")
      open: string;  // e.g., "09:00"
      close: string; // e.g., "17:00"
    };
  };
  location?: { // Populated from JOIN query
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt?: Date;
    updatedAt?: Date;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}
