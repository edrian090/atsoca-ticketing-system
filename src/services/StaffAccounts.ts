export interface StaffAccount {
  email: string;
  password: string;
  name: string;
  department: string;
  deptKey: string;
  pageUrl: string;
}

// ─── STAFF ACCOUNTS (one per department) ────────────────────────────────────
export const STAFF_ACCOUNTS: StaffAccount[] = [
  {
    email: 'operations@atsoca.com',
    password: 'ops2024',
    name: 'Rico Domingo',
    department: 'Operations',
    deptKey: 'operations',
    pageUrl: 'dept-operations.html'
  },
  {
    email: 'sales@atsoca.com',
    password: 'sales2024',
    name: 'Nathan Reyes',
    department: 'Sales',
    deptKey: 'sales',
    pageUrl: 'dept-sales.html'
  },
  {
    email: 'marketing@atsoca.com',
    password: 'mkt2024',
    name: 'Kim Alonzo',
    department: 'Marketing',
    deptKey: 'marketing',
    pageUrl: 'dept-marketing.html'
  },
  {
    email: 'bd@atsoca.com',
    password: 'bd2024',
    name: 'Andrea Ramos',
    department: 'Business Development',
    deptKey: 'bd',
    pageUrl: 'dept-bd.html'
  },
  {
    email: 'tech@atsoca.com',
    password: 'tech2024',
    name: 'Mika Reyes',
    department: 'IT Support',
    deptKey: 'tech',
    pageUrl: 'dept-tech.html'
  },
  {
    email: 'finance@atsoca.com',
    password: 'fin2024',
    name: 'Grace Padilla',
    department: 'Finance',
    deptKey: 'finance',
    pageUrl: 'dept-finance.html'
  },
  {
    email: 'hr@atsoca.com',
    password: 'hr2024',
    name: 'Sam Villareal',
    department: 'HR',
    deptKey: 'hr',
    pageUrl: 'dept-hr.html'
  }
];

export function authenticateStaff(email: string, password: string): StaffAccount | null {
  const account = STAFF_ACCOUNTS.find(
    a => a.email.toLowerCase() === email.toLowerCase() && a.password === password
  );
  return account ?? null;
}
