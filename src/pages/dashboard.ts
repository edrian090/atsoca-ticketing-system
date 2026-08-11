import { TicketService } from '../services/TicketService';
import { Ticket } from '../types';
import { requireEmployeeAuth, signOut } from '../services/AuthGuard';
import { RoutingService } from '../services/RoutingService';
import { AttachmentService } from '../services/AttachmentService';
import emailjs from '@emailjs/browser';
import '../styles/shared.css';

// 🔒 Guard — runs before anything else
requireEmployeeAuth();

document.addEventListener('DOMContentLoaded', () => {

  // ── Inject Lightbox ─────────────────────────────────────────────────────
  const lbHtml = `
    <div id="lightbox" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;" onclick="if(event.target===this)this.style.display='none'">
      <button id="lbClose" style="position:absolute;top:20px;right:28px;background:none;border:none;color:#fff;font-size:32px;cursor:pointer;line-height:1;">×</button>
      <img id="lbImg" src="" alt="Attachment Preview" style="max-width:90vw;max-height:80vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,0.6);object-fit:contain;">
      <div style="display:flex;gap:12px;">
        <a id="lbDownload" href="" download="" style="background:#0050AD;color:#fff;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">↓ Download</a>
        <button id="lbCloseBtn" style="background:rgba(255,255,255,0.12);color:#fff;border:none;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Close</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', lbHtml);
  const lightbox    = document.getElementById('lightbox') as HTMLElement;
  const lbImg       = document.getElementById('lbImg') as HTMLImageElement;
  const lbDownload  = document.getElementById('lbDownload') as HTMLAnchorElement;
  const lbClose     = document.getElementById('lbClose') as HTMLButtonElement;
  const lbCloseBtn  = document.getElementById('lbCloseBtn') as HTMLButtonElement;

  function openLightbox(dataUrl: string, name: string) {
    if (lbImg) lbImg.src = dataUrl;
    if (lbDownload) {
      lbDownload.href = dataUrl;
      lbDownload.download = name;
    }
    if (lightbox) lightbox.style.display = 'flex';
  }

  function closeLightbox() { if(lightbox) lightbox.style.display = 'none'; }
  if (lbClose)    lbClose.addEventListener('click', closeLightbox);
  if (lbCloseBtn) lbCloseBtn.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // ── Read staff session ──────────────────────────────────────────────────
  const staffName     = sessionStorage.getItem('staff_name');
  const staffDept     = sessionStorage.getItem('staff_dept');
  const staffDeptKey  = sessionStorage.getItem('staff_dept_key');
  const staffInitials = sessionStorage.getItem('staff_initials') ?? 'EM';

  // If no staff session, send to staff login first
  if (!staffName || !staffDept) {
    window.location.replace('employee-login.html');
    return;
  }

  // Personalise avatar & dept in the topbar and sidebar
  const avatarEl   = document.getElementById('staffAvatar');
  const nameEl     = document.getElementById('staffName');
  const sidebarNameEl = document.getElementById('sidebarName');
  if (avatarEl)       avatarEl.textContent    = staffInitials;
  if (nameEl)         nameEl.textContent      = staffDept + ' Dept';
  if (sidebarNameEl)  sidebarNameEl.textContent = staffDept + ' Department';

  let currentDept = staffDept;
  let activeFilter = 'all';
  let activeSource = 'customer';
  let searchTerm = "";
  let activeTicketId: string | null = null;

  const queueBody = document.getElementById('queueBody');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const deptSelect = document.getElementById('deptSelect') as HTMLSelectElement;
  const deptSwitchWrap = document.querySelector('.dept-switch') as HTMLElement;
  const tabs = document.querySelectorAll('.tab');

  const deptBadge = document.getElementById('deptBadge');
  const deptEyebrow = document.getElementById('deptEyebrow');
  const dashSub = document.getElementById('dashSub');

  // Lock to their department — hide the switcher so they can't change to another dept
  if (deptSelect && staffDeptKey) {
    deptSelect.value = staffDeptKey;
  }
  if (deptSwitchWrap) deptSwitchWrap.style.display = 'none';
  if (deptBadge) deptBadge.textContent = currentDept;
  if (deptEyebrow) deptEyebrow.textContent = currentDept.toUpperCase();
  if (dashSub) dashSub.textContent = `Everything routed to ${currentDept}, newest first.`;

  if(deptSelect) {
    deptSelect.addEventListener('change', () => {
      currentDept = deptSelect.options[deptSelect.selectedIndex].text;
      if (deptBadge) deptBadge.textContent = currentDept;
      if (deptEyebrow) deptEyebrow.textContent = currentDept;
      if (dashSub) dashSub.textContent = `Everything routed to ${currentDept}, newest first.`;
      renderDashboard();
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = (tab as HTMLElement).dataset.filter || 'all';
      renderDashboard();
    });
  });

  const sidebarSources = document.querySelectorAll('.sidebar-source');
  sidebarSources.forEach(source => {
    source.addEventListener('click', () => {
      sidebarSources.forEach(s => s.classList.remove('active'));
      source.classList.add('active');
      activeSource = (source as HTMLElement).dataset.source || 'customer';
      renderDashboard();
    });
  });

  if(searchInput) {
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value.toLowerCase();
      renderDashboard();
    });
  }

  let cachedTickets: Ticket[] = [];

  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  async function loadTickets() {
    cachedTickets = await TicketService.getTickets();
    renderDashboard();
  }

  function getFilteredTickets(): Ticket[] {
    let tickets = cachedTickets.filter(t => t.department === currentDept);
    
    if (activeSource === 'customer') {
      tickets = tickets.filter(t => !t.isInternal);
    } else if (activeSource === 'employee') {
      tickets = tickets.filter(t => t.isInternal);
    }
    
    if (activeFilter === 'open') tickets = tickets.filter(t => ['new', 'open'].includes(t.status));
    else if (activeFilter === 'progress') tickets = tickets.filter(t => t.status === 'pending');
    else if (activeFilter === 'resolved') tickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status));

    if (searchTerm) {
      tickets = tickets.filter(t => 
        t.id.toLowerCase().includes(searchTerm) || 
        t.subject.toLowerCase().includes(searchTerm)
      );
    }
    return tickets;
  }

  function renderDashboard() {
    let allDeptTickets = cachedTickets.filter(t => t.department === currentDept);
    
    const sCustomer = document.getElementById('sCustomer');
    const sEmployee = document.getElementById('sEmployee');
    if (sCustomer) sCustomer.textContent = allDeptTickets.filter(t => !t.isInternal).length.toString();
    if (sEmployee) sEmployee.textContent = allDeptTickets.filter(t => t.isInternal).length.toString();

    if (activeSource === 'customer') {
      allDeptTickets = allDeptTickets.filter(t => !t.isInternal);
    } else if (activeSource === 'employee') {
      allDeptTickets = allDeptTickets.filter(t => t.isInternal);
    }
    
    // Update stats
    const openCount = allDeptTickets.filter(t => ['new', 'open'].includes(t.status)).length;
    const progressCount = allDeptTickets.filter(t => t.status === 'pending').length;
    const resolvedCount = allDeptTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

    const statOpen = document.getElementById('statOpen');
    const statProgress = document.getElementById('statProgress');
    const statResolved = document.getElementById('statResolved');
    if(statOpen) statOpen.textContent = openCount.toString();
    if(statProgress) statProgress.textContent = progressCount.toString();
    if(statResolved) statResolved.textContent = resolvedCount.toString();

    const cAll = document.getElementById('cAll');
    const cOpen = document.getElementById('cOpen');
    const cProgress = document.getElementById('cProgress');
    const cResolved = document.getElementById('cResolved');
    if(cAll) cAll.textContent = allDeptTickets.length.toString();
    if(cOpen) cOpen.textContent = openCount.toString();
    if(cProgress) cProgress.textContent = progressCount.toString();
    if(cResolved) cResolved.textContent = resolvedCount.toString();

    const tickets = getFilteredTickets();
    if (!queueBody) return;
    queueBody.innerHTML = '';
    
    if (tickets.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    tickets.forEach(ticket => {
      const tr = document.createElement('tr');
      let statusClass = 'pill-open';
      let statusLabel = 'Open';
      
      if (ticket.status === 'new' || ticket.status === 'open') {
        statusClass = 'pill-open'; statusLabel = 'Open';
      } else if (ticket.status === 'pending') {
        statusClass = 'pill-warn'; statusLabel = 'In progress';
      } else {
        statusClass = 'pill-closed'; statusLabel = 'Resolved';
      }

      // Priority badge shown inline on subject for internal tickets
      let priorityTag = '';
      if (ticket.isInternal && ticket.priority) {
        let pColor = '#BE123C', pBg = '#FFE4E6', pBorder = '#FECDD3';
        if (ticket.priority === 'low') { pColor = '#0369A1'; pBg = '#E0F2FE'; pBorder = '#BAE6FD'; }
        else if (ticket.priority === 'medium') { pColor = '#B45309'; pBg = '#FEF3C7'; pBorder = '#FDE68A'; }
        priorityTag = `<span style="margin-left:8px;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:${pBg};color:${pColor};border:1px solid ${pBorder};">${ticket.priority.toUpperCase()}</span>`;
      }

      const assignedLabel = ticket.assignedTo || '<span style="color:#9AAABB;font-style:italic;">Unassigned</span>';

      tr.innerHTML = `
        <td class="mono" style="color:var(--steel);">${ticket.id}</td>
        <td style="font-weight:500;">${ticket.subject}${priorityTag}</td>
        <td style="color:#6B8299;font-size:13px;">${new Date(ticket.createdAt).toLocaleDateString()}</td>
        <td><span class="pill ${statusClass}">${statusLabel}</span></td>
        <td style="font-size:13px;">${assignedLabel}</td>
        <td style="color:#6B8299;font-size:13px;font-weight:500;white-space:nowrap;">${timeAgo(ticket.createdAt)}</td>
      `;
      tr.style.cursor = 'pointer';
      tr.dataset.id = ticket.id;
      tr.addEventListener('click', () => openTicketPanel(ticket.id));
      queueBody.appendChild(tr);
    });
  }

  // Panel logic
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  const panelClose = document.getElementById('panelClose');
  const panelCancel = document.getElementById('panelCancel');
  const panelSave = document.getElementById('panelSave');
  const statusSelect = document.getElementById('statusSelect') as HTMLSelectElement;
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');

  function openTicketPanel(id: string) {
    activeTicketId = id;
    const t = cachedTickets.find(ticket => ticket.id === id);
    if (!t || !panel || !overlay) return;
    
    const elId = document.getElementById('panelId');
    const elSub = document.getElementById('panelSubject');
    const elName = document.getElementById('panelName');
    const elEmail = document.getElementById('panelEmail');
    const elDept = document.getElementById('panelDept');
    const elDate = document.getElementById('panelDate');
    const elUpdated = document.getElementById('panelUpdated');
    const elContact = document.getElementById('panelContact');
    const elFacebook = document.getElementById('panelFacebook');
    const elDesc = document.getElementById('panelDesc');
    const panelBatchNumber = document.getElementById('panelBatchNumber');
    const panelAttachSection = document.getElementById('panelAttachSection');
    const panelAttachments = document.getElementById('panelAttachments');
    const badges = document.getElementById('panelBadges');
    const prioritySelect = document.getElementById('prioritySelect') as HTMLSelectElement;
    const assignDisplay = document.getElementById('assignDisplay');
    const resolutionNotes = document.getElementById('resolutionNotes') as HTMLTextAreaElement;
    
    if(elId) elId.textContent = t.id;
    if(elSub) elSub.textContent = t.subject;
    if(elName) elName.textContent = t.customerId;
    if(elEmail) elEmail.textContent = t.email || '—';
    if(elDept) {
      if (!t.isInternal) {
        (elDept.parentElement as HTMLElement).style.display = 'none';
      } else {
        (elDept.parentElement as HTMLElement).style.display = 'block';
        elDept.textContent = t.employeeDept || '—';
      }
    }
    if(elContact) elContact.textContent = t.contact || '—';
    if(elFacebook) {
      if (t.facebookLink) {
        elFacebook.innerHTML = `<a href="${t.facebookLink}" target="_blank" style="color:var(--primary);text-decoration:none;">${t.facebookLink}</a>`;
      } else {
        elFacebook.textContent = '—';
      }
    }
    if(elDate) elDate.textContent = new Date(t.createdAt).toLocaleString();
    if(elUpdated) elUpdated.textContent = new Date(t.updatedAt).toLocaleString();
    if(panelBatchNumber) panelBatchNumber.textContent = t.batchNumber || '—';
    if(elDesc) elDesc.textContent = t.description;
    
    if (panelAttachSection && panelAttachments) {
      panelAttachSection.style.display = 'block';
      panelAttachments.innerHTML = '';

      if (t.attachments && t.attachments.length > 0) {
        const IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','bmp','svg'];

        const renderChips = (storedFiles: { name: string; dataUrl: string }[]) => {
          panelAttachments!.innerHTML = '';
          t.attachments!.forEach(filename => {
            const extRaw = filename.split('.').pop()?.toLowerCase() || '';
            const extLabel = extRaw.toUpperCase().slice(0, 4);
            const fileData = storedFiles.find(d => d.name === filename);
            const isImage = IMAGE_EXTS.includes(extRaw);

            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.style.cssText = 'margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'file-chip-name';
            nameDiv.style.flex = '1';
            nameDiv.style.overflow = 'hidden';
            nameDiv.style.textOverflow = 'ellipsis';
            nameDiv.style.whiteSpace = 'nowrap';
            nameDiv.innerHTML = `<span class="fi">${extLabel}</span>${filename}`;
            chip.appendChild(nameDiv);

            if (fileData) {
              const actions = document.createElement('div');
              actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

              if (isImage) {
                const previewBtn = document.createElement('button');
                previewBtn.type = 'button';
                previewBtn.textContent = '👁 Preview';
                previewBtn.style.cssText = 'font-size:11px;font-weight:600;padding:3px 10px;border-radius:5px;border:1px solid var(--signal);background:var(--sky-tint);color:var(--signal);cursor:pointer;white-space:nowrap;';
                previewBtn.addEventListener('click', () => {
                  openLightbox(fileData.dataUrl, filename);
                });
                actions.appendChild(previewBtn);
              }

              const dlBtn = document.createElement('a');
              dlBtn.href = fileData.dataUrl;
              dlBtn.download = filename;
              dlBtn.textContent = '↓ Download';
              dlBtn.style.cssText = 'font-size:11px;font-weight:600;padding:3px 10px;border-radius:5px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;display:flex;align-items:center;white-space:nowrap;cursor:pointer;';
              actions.appendChild(dlBtn);

              chip.appendChild(actions);
            }

            panelAttachments!.appendChild(chip);
          });
        };

        // Load from IndexedDB and render with action buttons
        AttachmentService.load(t.id).then(storedFiles => renderChips(storedFiles)).catch(() => renderChips([]));
      } else {
        panelAttachments.innerHTML = '<span style="color:#9AAABB;font-size:13px;font-style:italic;">No attachments</span>';
      }
    }
    
    if (statusSelect) {
      if (t.status === 'new') statusSelect.value = 'open';
      else if (t.status === 'pending') statusSelect.value = 'progress';
      else statusSelect.value = t.status;
    }
    
    if (assignDisplay) assignDisplay.innerHTML = t.assignedTo ? `<span style="font-weight:600;">${t.assignedTo}</span>` : '<span style="color:#9AAABB;font-style:italic;">Unassigned</span>';
    if (resolutionNotes) resolutionNotes.value = t.resolutionNotes || '';
    
    if (prioritySelect) {
      if (!t.isInternal) {
        (prioritySelect.parentElement as HTMLElement).style.display = 'none';
      } else {
        (prioritySelect.parentElement as HTMLElement).style.display = 'block';
        if (t.priority) prioritySelect.value = t.priority;
      }
    }

    if (badges) {
      badges.innerHTML = '';

      if (t.isInternal && t.priority) {
        let pColor = '#BE123C', pBg = '#FFE4E6', pBorder = '#FECDD3';
        if (t.priority === 'low') { pColor = '#0369A1'; pBg = '#E0F2FE'; pBorder = '#BAE6FD'; }
        else if (t.priority === 'medium') { pColor = '#B45309'; pBg = '#FEF3C7'; pBorder = '#FDE68A'; }
        const pr = document.createElement('span');
        pr.className = 'badge';
        pr.style.color = pColor; pr.style.backgroundColor = pBg; pr.style.borderColor = pBorder;
        pr.textContent = t.priority.toUpperCase();
        badges.appendChild(pr);
      }

      if (t.isInternal) {
        const int = document.createElement('span');
        int.className = 'badge';
        int.style.color = '#6D28D9'; int.style.backgroundColor = '#EDE9FE'; int.style.borderColor = '#DDD6FE';
        int.textContent = 'INTERNAL';
        badges.appendChild(int);
      }

      const dpt = document.createElement('span');
      dpt.className = 'badge';
      dpt.style.color = '#334155'; dpt.style.backgroundColor = '#F1F5F9'; dpt.style.borderColor = '#E2E8F0';
      const senderText = t.isInternal ? (t.employeeDept || 'UNKNOWN DEPT') : 'CUSTOMER';
      dpt.textContent = senderText.toUpperCase();
      badges.appendChild(dpt);
    }

    document.querySelectorAll('#queueBody tr').forEach(r => {
      r.classList.toggle('selected', (r as HTMLElement).dataset.id === id);
    });
    
    overlay.classList.add('show');
    panel.classList.add('show');
  }

  function closePanel() {
    if(!panel || !overlay) return;
    overlay.classList.remove('show');
    panel.classList.remove('show');
    document.querySelectorAll('#queueBody tr').forEach(r => r.classList.remove('selected'));
    activeTicketId = null;
  }

  if(panelClose) panelClose.addEventListener('click', closePanel);
  if(panelCancel) panelCancel.addEventListener('click', closePanel);
  if(overlay) overlay.addEventListener('click', closePanel);

  if(panelSave) {
    panelSave.addEventListener('click', async () => {
      if (!activeTicketId) return;
      let newStatus: any = 'open';
      if(statusSelect.value === 'progress') newStatus = 'pending';
      if(statusSelect.value === 'resolved' || statusSelect.value === 'closed') newStatus = statusSelect.value;
      
      const prioritySelect = document.getElementById('prioritySelect') as HTMLSelectElement;
      const resolutionNotes = document.getElementById('resolutionNotes') as HTMLTextAreaElement;
      
      const newPriority = prioritySelect ? prioritySelect.value : 'medium';
      const newNotes = resolutionNotes ? resolutionNotes.value : '';

      if ((newStatus === 'resolved' || newStatus === 'closed') && !newNotes.trim()) {
        alert("Resolution Notes are required to resolve or close a ticket.");
        return;
      }
      
      const t = cachedTickets.find(ticket => ticket.id === activeTicketId);
      
      const btn = panelSave as HTMLButtonElement;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        await TicketService.updateTicket(activeTicketId, { 
          status: newStatus,
          priority: newPriority as any,
          assignedTo: t ? t.assignedTo : '',
          resolutionNotes: newNotes
        });

        if (t && (newStatus === 'resolved' || newStatus === 'closed') && t.status !== newStatus) {
          const templateParams = {
            ticket_id: t.id.substring(0, 8).toUpperCase(),
            customer_email: t.email,
            department_email: RoutingService.getDepartmentEmail(t.department),
            reply_to: RoutingService.getDepartmentEmail(t.department),
            department: t.department,
            resolution_notes: newNotes
          };
          try {
            await emailjs.send(
              (import.meta as any).env.VITE_EMAILJS_SERVICE_ID,
              (import.meta as any).env.VITE_EMAILJS_TEMPLATE_RESOLVED,
              templateParams,
              { publicKey: (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY }
            );
          } catch (emailErr) {
            console.error('Failed to send resolution email:', emailErr);
          }
        }
      
        if(toastText && toast) {
          toastText.textContent = `#${activeTicketId} updated`;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2600);
        }
        
        closePanel();
      } catch (err) {
        console.error('Error saving ticket:', err);
        alert('Failed to save ticket changes.');
      } finally {
        btn.textContent = 'Save changes';
        btn.disabled = false;
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // Routing Settings Modal Logic
  const navRoutingSettings = document.getElementById('navRoutingSettings');
  const routingModal = document.getElementById('routingModal');
  const routingOverlay = document.getElementById('routingOverlay');
  const routingClose = document.getElementById('routingClose');
  const routingCancel = document.getElementById('routingCancel');
  const routingSave = document.getElementById('routingSave');
  const routingBody = document.getElementById('routingBody');

  if (navRoutingSettings && routingModal) {
    navRoutingSettings.addEventListener('click', async () => {
      if (routingOverlay) routingOverlay.classList.add('show');
      routingModal.classList.add('show');
      await renderRoutingForm();
    });

    const closeRouting = () => {
      if (routingOverlay) routingOverlay.classList.remove('show');
      routingModal.classList.remove('show');
    };

    if (routingClose) routingClose.addEventListener('click', closeRouting);
    if (routingCancel) routingCancel.addEventListener('click', closeRouting);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeRouting();
    });

    if (routingSave) {
      routingSave.addEventListener('click', async () => {
        const rows = routingBody?.querySelectorAll('.routing-row');
        const newMappings: Record<string, string> = {};
        if (rows) {
          rows.forEach(row => {
            const concern = (row.querySelector('.routing-concern') as HTMLInputElement).value.trim();
            const assignee = (row.querySelector('.routing-assignee') as HTMLInputElement).value.trim();
            if (concern) {
              newMappings[concern] = assignee;
            }
          });
        }
        
        const btn = routingSave as HTMLButtonElement;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
          await RoutingService.updateMappings(currentDept, newMappings);
          closeRouting();
          
          if (toastText && toast) {
            toastText.textContent = 'Routing settings saved';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2600);
          }
        } catch (err) {
          console.error('Failed to save routing:', err);
          alert('Failed to save routing settings.');
        } finally {
          btn.textContent = 'Save changes';
          btn.disabled = false;
        }
      });
    }

    async function renderRoutingForm() {
      if (!routingBody) return;
      
      routingBody.innerHTML = '<div style="padding:20px;text-align:center;color:#64748B;">Loading routing settings...</div>';
      
      const mappings = await RoutingService.getMappings(currentDept);
      
      let html = '';
      const concerns = Object.keys(mappings);
      
      const createRow = (concern: string, assignee: string) => `
        <div class="routing-row" style="display:flex;gap:16px;margin-bottom:12px;align-items:center;background:#f8fafc;padding:16px;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
          <div style="flex:1;">
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;letter-spacing:0.05em;">Concern Category</label>
            <input type="text" class="routing-concern" value="${concern}" placeholder="e.g. Broken Item" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;background:#fff;transition:border-color 0.2s;outline:none;" onfocus="this.style.borderColor='#0050AD'" onblur="this.style.borderColor='#cbd5e1'">
          </div>
          <div style="flex:1;">
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:6px;letter-spacing:0.05em;">Assigned To</label>
            <input type="text" class="routing-assignee" value="${assignee}" placeholder="e.g. John Doe" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;background:#fff;transition:border-color 0.2s;outline:none;" onfocus="this.style.borderColor='#0050AD'" onblur="this.style.borderColor='#cbd5e1'">
          </div>
          <button type="button" class="routing-del-btn" title="Delete Concern" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:8px;margin-top:20px;border-radius:8px;transition:all 0.2s;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#fee2e2';this.style.color='#ef4444'" onmouseout="this.style.background='none';this.style.color='#94a3b8'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      `;

      if (concerns.length > 0) {
        concerns.forEach(concern => {
          html += createRow(concern, mappings[concern] || '');
        });
      }
      
      html += `
        <button type="button" id="routingAddBtn" style="margin-top:16px;background:#fff;border:1px dashed #94a3b8;color:#475569;width:100%;padding:14px;border-radius:12px;cursor:pointer;font-weight:600;font-size:14px;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#64748b';this.style.color='#0f172a'" onmouseout="this.style.background='#fff';this.style.borderColor='#94a3b8';this.style.color='#475569'">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Another Concern
        </button>
      `;
      
      routingBody.innerHTML = html;

      // Attach event listeners for delete and add
      routingBody.querySelectorAll('.routing-del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (window.confirm("Are you sure you want to delete this concern category?")) {
            const target = e.target as HTMLElement;
            target.closest('.routing-row')?.remove();
          }
        });
      });

      const addBtn = routingBody.querySelector('#routingAddBtn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const div = document.createElement('div');
          div.innerHTML = createRow('', '');
          const newRow = div.firstElementChild as HTMLElement;
          
          newRow.querySelector('.routing-del-btn')?.addEventListener('click', (e) => {
            if (window.confirm("Are you sure you want to delete this concern category?")) {
              const target = e.target as HTMLElement;
              target.closest('.routing-row')?.remove();
            }
          });
          
          routingBody.insertBefore(newRow, addBtn);
        });
      }
    }
  }

  // Sign out
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });
  }

  window.addEventListener('tickets_updated', loadTickets);
  loadTickets();
});
