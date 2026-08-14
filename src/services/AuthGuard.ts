// Auth guard — protects employee-only pages
const EMPLOYEE_AUTH_KEY = 'employee_auth';

export function requireEmployeeAuth(): void {
  if (sessionStorage.getItem(EMPLOYEE_AUTH_KEY) !== 'true') {
    // Not authenticated — redirect immediately to company login
    window.location.replace('employee-login.html');
  }
}

/**
 * Guards the master-dashboard.html — ensures the logged-in staff
 * has deptKey === 'master' before allowing access.
 */
export function requireMasterAuth(): void {
  if (sessionStorage.getItem(EMPLOYEE_AUTH_KEY) !== 'true') {
    window.location.replace('employee-login.html');
    return;
  }
  const deptKey = sessionStorage.getItem('staff_dept_key');
  if (deptKey !== 'master') {
    // Not a master admin — send them to their department page instead
    window.location.replace('employee.html');
  }
}

export function signOut(): void {
  // Clear staff session data
  sessionStorage.removeItem('staff_name');
  sessionStorage.removeItem('staff_dept');
  sessionStorage.removeItem('staff_dept_key');
  sessionStorage.removeItem('staff_initials');
  
  // If master admin was signed in, go to employee.html; else same
  window.location.href = 'employee.html';
}

export function signOutCompany(): void {
  // Clear company access
  sessionStorage.removeItem(EMPLOYEE_AUTH_KEY);
  
  // Clear staff session as well just in case
  sessionStorage.removeItem('staff_name');
  sessionStorage.removeItem('staff_dept');
  sessionStorage.removeItem('staff_dept_key');
  sessionStorage.removeItem('staff_initials');
  
  // Redirect to company login
  window.location.href = 'employee-login.html';
}
