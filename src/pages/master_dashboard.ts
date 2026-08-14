import { TicketService } from '../services/TicketService';
import { Ticket } from '../types';
import { requireMasterAuth, signOut } from '../services/AuthGuard';
import { RoutingService } from '../services/RoutingService';
import { AttachmentService } from '../services/AttachmentService';
import emailjs from '@emailjs/browser';
import '../styles/shared.css';

// 🔒 Guard — runs before anything else
requireMasterAuth();

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
  const staffName     = sessionStorage.getItem('staff_name') ?? 'Master Admin';
  const staffInitials = sessionStorage.getItem('staff_initials') ?? 'MA';

  // Personalise avatar & name in topbar and sidebar
  const avatarEl   = document.getElementById('staffAvatar');
  const nameEl     = document.getElementById('staffName');
  const sidebarNameEl = document.getElementById('sidebarName');
  if (avatarEl)       avatarEl.textContent    = staffInitials;
  if (nameEl)         nameEl.textContent      = staffName;
  if (sidebarNameEl)  sidebarNameEl.textContent = staffName;

  let activeFilter = 'all';
  let activeSource = 'all'; // Default to "All Tickets" cross-department view
  let searchTerm = "";
  let activeTicketId: string | null = null;

  const queueBody = document.getElementById('queueBody');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const tabs = document.querySelectorAll('.tab');
  const sidebarSources = document.querySelectorAll('.sidebar-source');

  const dashTitle = document.getElementById('dashTitle');
  const dashSub = document.getElementById('dashSub');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = (tab as HTMLElement).dataset.filter || 'all';
      renderDashboard();
    });
  });

  sidebarSources.forEach(source => {
    source.addEventListener('click', () => {
      sidebarSources.forEach(s => s.classList.remove('active'));
      source.classList.add('active');
      activeSource = (source as HTMLElement).dataset.source || 'all';
      
      // Update UI title and description based on source
      if (dashTitle && dashSub) {
        if (activeSource === 'all') {
          dashTitle.textContent = "All Tickets";
          dashSub.textContent = "Cross-department view of all tickets in the system.";
        } else if (activeSource === 'customer') {
          dashTitle.textContent = "Customer Queue";
          dashSub.textContent = "New customer submissions routed to Master Admin for triage.";
        } else {
          dashTitle.textContent = "Internal Queue";
          dashSub.textContent = "Internal employee requests submitted for triage.";
        }
      }

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
    let tickets = [...cachedTickets];
    
    if (activeSource === 'customer') {
      // Customer triage queue: department === 'Master' and not internal
      tickets = tickets.filter(t => t.department === 'Master' && !t.isInternal);
    } else if (activeSource === 'employee') {
      // Internal triage queue: department === 'Master' and internal
      tickets = tickets.filter(t => t.department === 'Master' && t.isInternal);
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
    // Counts for sidebar badges
    const totalAll = cachedTickets.length;
    const totalCustomer = cachedTickets.filter(t => t.department === 'Master' && !t.isInternal).length;
    const totalEmployee = cachedTickets.filter(t => t.department === 'Master' && t.isInternal).length;

    const sAll = document.getElementById('sAll');
    const sCustomer = document.getElementById('sCustomer');
    const sEmployee = document.getElementById('sEmployee');
    if (sAll) sAll.textContent = totalAll.toString();
    if (sCustomer) sCustomer.textContent = totalCustomer.toString();
    if (sEmployee) sEmployee.textContent = totalEmployee.toString();

    // Determine current list context for stat cards
    let currentContextTickets = [...cachedTickets];
    if (activeSource === 'customer') {
      currentContextTickets = currentContextTickets.filter(t => t.department === 'Master' && !t.isInternal);
    } else if (activeSource === 'employee') {
      currentContextTickets = currentContextTickets.filter(t => t.department === 'Master' && t.isInternal);
    }

    // Update stats
    const openCount = currentContextTickets.filter(t => ['new', 'open'].includes(t.status)).length;
    const progressCount = currentContextTickets.filter(t => t.status === 'pending').length;
    const resolvedCount = currentContextTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;

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
    if(cAll) cAll.textContent = currentContextTickets.length.toString();
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

      // Priority and department badges shown inline on subject for cross-department clarity
      let badgesMarkup = '';
      if (ticket.priority) {
        let pColor = '#BE123C', pBg = '#FFE4E6', pBorder = '#FECDD3';
        if (ticket.priority === 'low') { pColor = '#0369A1'; pBg = '#E0F2FE'; pBorder = '#BAE6FD'; }
        else if (ticket.priority === 'medium') { pColor = '#B45309'; pBg = '#FEF3C7'; pBorder = '#FDE68A'; }
        badgesMarkup += `<span style="margin-left:8px;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:${pBg};color:${pColor};border:1px solid ${pBorder};">${ticket.priority.toUpperCase()}</span>`;
      }
      
      // Show department indicator
      badgesMarkup += `<span style="margin-left:6px;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:#F1F5F9;color:#334155;border:1px solid #E2E8F0;">${ticket.department.toUpperCase()}</span>`;

      const assignedLabel = ticket.assignedTo || '<span style="color:#9AAABB;font-style:italic;">Unassigned</span>';

      tr.innerHTML = `
        <td class="mono" style="color:var(--steel);">${ticket.id.substring(0, 8).toUpperCase()}</td>
        <td style="font-weight:500;">${ticket.subject}${badgesMarkup}</td>
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
  const escalateDeptSelect = document.getElementById('escalateDeptSelect') as HTMLSelectElement;
  const btnEscalate = document.getElementById('btnEscalate') as HTMLButtonElement;
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
      if (t.priority) prioritySelect.value = t.priority;
    }

    if (badges) {
      badges.innerHTML = '';

      if (t.priority) {
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
      
      // Also add current routed department
      const currentRouteBadge = document.createElement('span');
      currentRouteBadge.className = 'badge';
      currentRouteBadge.style.color = 'var(--signal)'; currentRouteBadge.style.backgroundColor = 'var(--sky-tint)'; currentRouteBadge.style.borderColor = 'var(--sky)';
      currentRouteBadge.textContent = 'ROUTED TO: ' + t.department.toUpperCase();
      badges.appendChild(currentRouteBadge);
    }

    if (escalateDeptSelect) {
      // Default selection to concern department hint if available and not already escalated
      if (t.concernDepartment && t.department === 'Master') {
        escalateDeptSelect.value = t.concernDepartment;
      } else {
        escalateDeptSelect.value = '';
      }
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

  // Escalate ticket action
  if (btnEscalate && escalateDeptSelect) {
    btnEscalate.addEventListener('click', async () => {
      if (!activeTicketId) return;
      const targetDept = escalateDeptSelect.value;
      if (!targetDept) {
        alert('Please select a department to escalate to.');
        return;
      }

      const t = cachedTickets.find(ticket => ticket.id === activeTicketId);
      if (!t) return;

      btnEscalate.textContent = 'Escalating...';
      btnEscalate.disabled = true;

      try {
        // Retrieve auto assignee for target department
        const concern = t.subject.replace('Concern regarding ', '');
        const autoAssignee = await RoutingService.getAssignee(targetDept, concern);

        // Update ticket department and assignee
        await TicketService.updateTicket(activeTicketId, {
          department: targetDept,
          assignedTo: autoAssignee || ''
        });

        // Send EmailJS notification to target department
        const templateParams = {
          ticket_id: t.id.substring(0, 8).toUpperCase(),
          customer_name: t.customerId,
          customer_email: t.email || '',
          department: targetDept,
          department_email: RoutingService.getDepartmentEmail(targetDept),
          reply_to: t.email || '',
          subject: t.subject,
          description: t.description
        };
        try {
          await emailjs.send(
            (import.meta as any).env.VITE_EMAILJS_SERVICE_ID,
            (import.meta as any).env.VITE_EMAILJS_TEMPLATE_NEW_TICKET,
            templateParams,
            { publicKey: (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY }
          );
        } catch (emailErr) {
          console.error('Failed to send escalated ticket email:', emailErr);
        }

        // Show toast
        if (toastText && toast) {
          toastText.textContent = `Ticket escalated to ${targetDept}`;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2600);
        }

        closePanel();
        loadTickets();
      } catch (err) {
        console.error('Escalation error:', err);
        alert('Failed to escalate ticket. Please try again.');
      } finally {
        btnEscalate.textContent = 'Escalate';
        btnEscalate.disabled = false;
      }
    });
  }

  // Save changes action (Status, Priority, Resolution Notes)
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
          toastText.textContent = `#${activeTicketId.substring(0, 8).toUpperCase()} updated`;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2600);
        }
        
        closePanel();
        loadTickets();
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
