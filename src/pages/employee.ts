import { requireEmployeeAuth, signOutCompany } from '../services/AuthGuard';
import { authenticateStaff } from '../services/StaffAccounts';
import '../styles/shared.css';

// 🔒 Guard — company access required first
requireEmployeeAuth();

document.addEventListener('DOMContentLoaded', () => {
  // Wire up sign-out button
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      signOutCompany();
    });
  }

  // Handle staff login form
  const staffLoginForm = document.getElementById('staffLoginForm') as HTMLFormElement;
  if (staffLoginForm) {
    const emailInput = document.getElementById('staffEmail') as HTMLInputElement;
    const passInput = document.getElementById('staffPass') as HTMLInputElement;

    staffLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!email || !password) return;

      const account = authenticateStaff(email, password);

      if (account) {
        // Store staff session
        const initials = account.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        sessionStorage.setItem('staff_name', account.name);
        sessionStorage.setItem('staff_dept', account.department);
        sessionStorage.setItem('staff_dept_key', account.deptKey);
        sessionStorage.setItem('staff_initials', initials);

        // Redirect to department page
        window.location.href = account.pageUrl;
      } else {
        // Show error
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
          errorEl.style.display = 'block';
          setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
        }
        passInput.value = '';
        passInput.focus();
      }
    });
  }
});
