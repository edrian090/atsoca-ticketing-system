import { TicketService } from '../services/TicketService';
import { RoutingService } from '../services/RoutingService';
import { AttachmentService } from '../services/AttachmentService';
import emailjs from '@emailjs/browser';
import '../styles/shared.css';

document.addEventListener('DOMContentLoaded', () => {
  const categoryLabels: Record<string, string> = {
    operations: "Operations / Delivery",
    sales: "Sales Inquiry",
    partnerships: "Partnerships / Collaborations",
    technical: "Technical Issues",
    bd: "Business Development",
    payment: "Payment and Receipts",
    employment: "Employment"
  };
  const deptMap: Record<string, string> = {
    operations: "Operations",
    sales: "Sales",
    partnerships: "Marketing",
    technical: "IT Support",
    bd: "Business Development",
    payment: "Finance",
    employment: "HR"
  };

  const categorySelect = document.getElementById('category') as HTMLSelectElement;
  const routeHint = document.getElementById('routeHint');
  const routeHintText = document.getElementById('routeHintText');
  const catItems = document.querySelectorAll('.cat-item');

  // Initialize all sub-dropdowns dynamically
  const categories = Object.keys(deptMap);
  const subGroups: Record<string, HTMLElement | null> = {};
  const subSelects: Record<string, HTMLSelectElement | null> = {};

  async function initRoutingDropdowns() {
    for (const cat of categories) {
      subGroups[cat] = document.getElementById(`${cat}SubGroup`);
      const select = document.getElementById(`${cat}Sub`) as HTMLSelectElement | null;
      subSelects[cat] = select;

      if (select) {
        const deptName = deptMap[cat];
        if (deptName) {
          const mappings = await RoutingService.getMappings(deptName);
          const concerns = Object.keys(mappings);
          if (concerns.length > 0) {
            concerns.forEach(concern => {
              const option = document.createElement('option');
              option.value = concern;
              option.textContent = concern;
              select.appendChild(option);
            });
          }
        }
      }
    }
  }

  initRoutingDropdowns();

  if(categorySelect && routeHint && routeHintText) {
    categorySelect.addEventListener('change', () => {
      const val = categorySelect.value;
      catItems.forEach(item => {
        if (item instanceof HTMLElement) {
          item.classList.toggle('active', item.dataset.cat === val);
        }
      });
      
      // Hide all sub-dropdowns and reset them
      categories.forEach(cat => {
        const group = subGroups[cat];
        const select = subSelects[cat];
        if (group && select) {
          if (cat === val) {
            if (select.options.length > 1) {
              group.style.display = 'block';
              select.required = true;
            } else {
              group.style.display = 'none';
              select.required = false;
            }
          } else {
            group.style.display = 'none';
            select.required = false;
            select.value = '';
          }
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
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if(e.dataTransfer) addFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => {
      if(fileInput.files) addFiles(fileInput.files);
    });

    function addFiles(newFiles: FileList) {
      Array.from(newFiles).forEach(f => {
        files.push(f);
        pendingReads++;
        const reader = new FileReader();
        reader.onload = (evt) => {
          fileDataUrls.push({ name: f.name, dataUrl: evt.target?.result as string });
          pendingReads--;
        };
        reader.readAsDataURL(f);
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
  const successCard = document.getElementById('successCard');
  const successId = document.getElementById('successId');

  if(ticketForm && successCard && successId) {

    async function doSubmit() {
      const formData = new FormData(ticketForm);
      const category = formData.get('category') as string;
      const dept = deptMap[category] || 'General';
      const select = subSelects[category];
      const subConcern = select ? select.value : '';
      let subjectLabel = categoryLabels[category] || category;
      if (subConcern) subjectLabel = subConcern;
      
      const autoAssignee = subConcern ? await RoutingService.getAssignee(dept, subConcern) : '';

      try {
        const desc = formData.get('description') as string;
        const batchNumber = formData.get('batchNumber') as string;

        const ticket = await TicketService.createTicket({
          subject: `Concern regarding ${subjectLabel}`,
          description: desc,
          department: dept,
          customerId: formData.get('fullname') as string,
          email: formData.get('email') as string,
          contact: formData.get('contact') as string,
          batchNumber: batchNumber,
          facebookLink: formData.get('facebookLink') as string,
          isInternal: false,
          assignedTo: autoAssignee,
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
            reply_to: ticket.email,
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
          console.error('Failed to send new ticket email:', emailErr);
        }

        successId!.textContent = '#' + ticket.id.substring(0, 8).toUpperCase();
        ticketForm.classList.add('hide');
        successCard!.classList.add('show');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('Submit error:', err);
        alert('Failed to submit ticket. Please try again.');
      }
    }

    ticketForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!ticketForm.checkValidity()) { ticketForm.reportValidity(); return; }

      if (pendingReads > 0) {
        // FileReader still running — wait then submit directly (no requestSubmit to avoid re-validation)
        const btn = document.getElementById('submitBtn') as HTMLButtonElement;
        if (btn) { btn.textContent = 'Processing...'; btn.disabled = true; }
        const iv = setInterval(() => {
          if (pendingReads === 0) {
            clearInterval(iv);
            if (btn) { btn.textContent = 'Submit ticket →'; btn.disabled = false; }
            doSubmit();
          }
        }, 50);
        return;
      }

      doSubmit();
    });
  }
});
