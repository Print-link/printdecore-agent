export interface PrintJob {
  id: string;
  customerId: string;
  customerName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  submittedAt: string;
  processedAt?: string;
  completedAt?: string;
  agentId?: string;
  printerId?: string;
  pages?: number;
  cost?: number;
}

export interface PrinterAgent {
  id: string;
  name: string;
  computerId: string;
  printerId: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  currentJob?: string;
  totalJobs: number;
  totalPages: number;
}

export interface PrinterLog {
  id: string;
  printerId: string;
  agentId?: string;
  jobId?: string;
  action: 'print' | 'error' | 'maintenance' | 'anonymous_print';
  fileName?: string;
  pages?: number;
  timestamp: string;
  details?: string;
}

export interface AnalyticsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalPages: number;
  totalRevenue: number;
  averageJobTime: number;
  jobsByStatus: Record<string, number>;
  jobsByDay: Array<{
    date: string;
    jobs: number;
    pages: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    jobs: number;
    pages: number;
  }>;
}
