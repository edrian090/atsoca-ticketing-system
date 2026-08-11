import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        employee: resolve(__dirname, 'employee.html'),
        'employee-login': resolve(__dirname, 'employee-login.html'),
        'customer_submit-ticket': resolve(__dirname, 'customer_submit-ticket.html'),
        'submit-ticket-internal': resolve(__dirname, 'submit-ticket-internal.html'),
        'submit-ticket-staff': resolve(__dirname, 'submit-ticket-staff.html'),
        'dept-operations': resolve(__dirname, 'dept-operations.html'),
        'dept-sales': resolve(__dirname, 'dept-sales.html'),
        'dept-marketing': resolve(__dirname, 'dept-marketing.html'),
        'dept-bd': resolve(__dirname, 'dept-bd.html'),
        'dept-tech': resolve(__dirname, 'dept-tech.html'),
        'dept-finance': resolve(__dirname, 'dept-finance.html'),
        'dept-hr': resolve(__dirname, 'dept-hr.html')
      }
    }
  }
});
