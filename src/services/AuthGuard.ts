// Auth guard — protects employee-only pages
const EMPLOYEE_AUTH_KEY = 'employee_auth';

export function requireEmployeeAuth(): void {
  if (sessionStorage.getItem(EMPLOYEE_AUTH_KEY) !== 'true') {
    // Not authenticated — redirect immediately to company login
    window.location.replace('employee-login.html');
  }
}

export function signOut(): void {
  // Clear staff session data
  sessionStorage.removeItem('staff_name');
  sessionStorage.removeItem('staff_dept');
  sessionStorage.removeItem('staff_dept_key');
  sessionStorage.removeItem('staff_initials');
  
  // Redirect back to employee page
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
