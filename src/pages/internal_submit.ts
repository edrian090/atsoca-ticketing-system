import { TicketService } from '../services/TicketService';
import { RoutingService } from '../services/RoutingService';
import { AttachmentService } from '../services/AttachmentService';
import emailjs from '@emailjs/browser';
import '../styles/shared.css';

function init() {
  const deptMap: Record<string, string> = {
    operations: "Operations",
    sales: "Sales",
    marketing: "Marketing",
    bd: "Business Development",
    tech: "IT Support",
    finance: "Finance",
    hr: "HR"
  };

  const categorySelect = document.getElementById('category') as HTMLSelectElement;
  const routeHint = document.getElementById('routeHint');
  const routeHintText = document.getElementById('routeHintText');
  const catItems = document.querySelectorAll('.cat-item');

  if(categorySelect && routeHint && routeHintText) {
    categorySelect.addEventListener('change', () => {
      const val = categorySelect.value;
      catItems.forEach(item => {
        if (item instanceof HTMLElement) {
          item.classList.toggle('active', item.dataset.cat === val);
        }
      });
      if (val && deptMap[val]) {
        routeHintText.textContent = `This will be routed to ${deptMap[val]}`;
        routeHint.classList.add('show');
      } else {
        routeHint.classList.remove('show');
      }
    });
  }

  const description = document.getElementById('description') as HTMLTextAreaElement;
  const charCount = document.getElementById('charCount');
  if(description && charCount) {
    description.addEventListener('input', () => {
      charCount.textContent = description.value.length.toString();
    });
  }

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const fileList = document.getElementById('fileList');
  let files: File[] = [];
  let fileDataUrls: { name: string; dataUrl: string }[] = [];
  let pendingReads = 0;

  if(dropzone && fileInput && fileList) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length) handleFiles(fileInput.files);
    });

    function handleFiles(newFiles: FileList) {
      Array.from(newFiles).forEach(file => {
        if (!files.some(f => f.name === file.name)) {
          files.push(file);
          pendingReads++;
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              fileDataUrls.push({ name: file.name, dataUrl: e.target.result.toString() });
            }
            pendingReads--;
          };
          reader.readAsDataURL(file);
        }
      });
      renderFiles();
    }

    function renderFiles() {
      if(!fileList) return;
      fileList.innerHTML = '';
      files.forEach((f, i) => {
        const ext = f.name.split('.').pop()?.toUpperCase().slice(0,4) || '';
        const chip = document.createElement('div');
        chip.className = 'file-chip';
        chip.innerHTML = `
          <div class="file-chip-name"><span class="fi">${ext}</span>${f.name}</div>
          <button type="button" class="file-remove" data-i="${i}">×</button>
        `;
        fileList.appendChild(chip);
      });
      fileList.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn instanceof HTMLElement && btn.dataset.i) {
            const idx = Number(btn.dataset.i);
            fileDataUrls = fileDataUrls.filter(d => d.name !== files[idx].name);
            files.splice(idx, 1);
            renderFiles();
          }
        });
      });
    }
  }

  const ticketForm = document.getElementById('ticketForm') as HTMLFormElement;

  // Pre-fill form if accessed from the dashboard
  const staffDept = sessionStorage.getItem('staff_dept');
  if (staffDept) {
    const deptField = document.getElementById('deptField') as HTMLSelectElement;
    if (deptField) deptField.value = staffDept;
  }

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('#submitBtn');
    
    if (btn && ticketForm) {
      e.preventDefault();

      const fullNameInput = document.getElementById('fullName') as HTMLInputElement;
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const descInput = document.getElementById('description') as HTMLTextAreaElement;
      const deptField = document.getElementById('deptField') as HTMLSelectElement;
      const contactInput = document.getElementById('contact') as HTMLInputElement;
      const facebookLinkInput = document.getElementById('facebookLink') as HTMLInputElement;
      const priorityInput = document.getElementById('priority') as HTMLSelectElement;
      const catSelect = document.getElementById('category') as HTMLSelectElement;

      // Manual validation - highlight missing fields
      let hasError = false;

      const setError = (el: HTMLElement | null, msg: string) => {
        if (!el) return;
        el.style.borderColor = '#C0453E';
        const existing = el.parentElement?.querySelector('.inline-err');
        if (!existing) {
          const err = document.createElement('span');
          err.className = 'inline-err';
          err.style.cssText = 'color:#C0453E;font-size:12px;margin-top:4px;display:block;';
          err.textContent = msg;
          el.parentElement?.appendChild(err);
        }
      };

      const clearError = (el: HTMLElement | null) => {
        if (!el) return;
        el.style.borderColor = '';
        const existing = el.parentElement?.querySelector('.inline-err');
        if (existing) existing.remove();
      };

      clearError(fullNameInput); clearError(emailInput); clearError(deptField); clearError(contactInput); clearError(facebookLinkInput); clearError(descInput); clearError(catSelect);

      if (!fullNameInput?.value.trim()) { setError(fullNameInput, 'Full name is required.'); hasError = true; }
      if (!emailInput?.value.trim()) { setError(emailInput, 'Work email is required.'); hasError = true; }
      if (!deptField?.value) { setError(deptField, 'Please select your department.'); hasError = true; }
      if (!contactInput?.value.trim()) { setError(contactInput, 'Contact number is required.'); hasError = true; }
      if (!facebookLinkInput?.value.trim()) { setError(facebookLinkInput, 'Facebook link is required.'); hasError = true; }
      if (!catSelect?.value) { setError(catSelect, 'Please select a department to send to.'); hasError = true; }
      if (!descInput?.value.trim()) { setError(descInput, 'Please describe your request.'); hasError = true; }

      if (hasError) {
        const firstError = document.querySelector('.inline-err');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const category = catSelect?.value || 'operations';
      const dept = deptMap[category] || 'Operations';

      async function doSubmit() {
        if (btn) { btn.textContent = 'Submitting...'; (btn as HTMLButtonElement).disabled = true; }
        
        try {
          const ticket = await TicketService.createTicket({
            subject: `Internal Request for ${dept}`,
            description: descInput.value,
            department: dept,
            customerId: fullNameInput.value,
            email: emailInput.value,
            contact: contactInput ? contactInput.value : '',
            facebookLink: facebookLinkInput ? facebookLinkInput.value : '',
            employeeDept: deptField ? deptField.value : '',
            isInternal: true,
            priority: priorityInput ? (priorityInput.value as 'low'|'medium'|'high'|'urgent') : 'medium',
            attachments: files.map(f => f.name)
          });

          if (fileDataUrls.length > 0) {
            await AttachmentService.save(ticket.id, fileDataUrls);
          }

          try {
            const templateParams = {
              ticket_id: ticket.id.substring(0, 8).toUpperCase(),
              customer_name: ticket.customerId,
              customer_email: ticket.email,
              department: ticket.department,
              department_email: RoutingService.getDepartmentEmail(ticket.department),
              subject: ticket.subject,
              description: ticket.description
            };
            await emailjs.send(
              (import.meta as any).env.VITE_EMAILJS_SERVICE_ID,
              (import.meta as any).env.VITE_EMAILJS_TEMPLATE_NEW_TICKET,
              templateParams,
              { publicKey: (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY }
            );
          } catch (emailErr) {
            console.error('Failed to send internal new ticket email:', emailErr);
          }

          const successCard = document.getElementById('successCard');
          const successId = document.getElementById('successId');

          if (successId) successId.textContent = '#' + ticket.id.substring(0, 8).toUpperCase();
          ticketForm.classList.add('hide');
          if (successCard) successCard.classList.add('show');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          console.error('Submit error:', err);
          if (btn) { btn.textContent = 'Submit'; (btn as HTMLButtonElement).disabled = false; }
          alert('Failed to submit ticket. Please try again.');
        }
      }

      if (pendingReads > 0) {
        if (btn) { btn.textContent = 'Processing...'; (btn as HTMLButtonElement).disabled = true; }
        const iv = setInterval(() => {
          if (pendingReads === 0) {
            clearInterval(iv);
            if (btn) { btn.textContent = 'Submit request'; (btn as HTMLButtonElement).disabled = false; }
            doSubmit();
          }
        }, 50);
      } else {
        doSubmit();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
