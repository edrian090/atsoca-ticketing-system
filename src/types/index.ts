export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'employee';
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  department: string;
  concernDepartment?: string;   // Original dept hint set by customer (for Master Admin triage)
  customerId: string;
  email?: string;
  contact?: string;
  batchNumber?: string;
  facebookLink?: string;
  employeeDept?: string;
  isInternal?: boolean;
  assignedTo?: string;
  resolutionNotes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}
