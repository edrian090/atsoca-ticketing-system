const fs = require('fs');
const path = require('path');

const targetStr = `    <div class="panel-section panel-grid" style="row-gap: 24px;">
      <div><div class="panel-label">Submitted by</div><div class="panel-value" id="panelName">—</div></div>
      <div><div class="panel-label">Email</div><div class="panel-value" id="panelEmail" style="word-break:break-all;">—</div></div>
      
      <div><div class="panel-label">Contact</div><div class="panel-value" id="panelContact">—</div></div>
      <div><div class="panel-label">Facebook</div><div class="panel-value" id="panelFacebook" style="word-break:break-all;">—</div></div>
      
      <div><div class="panel-label">Submitted</div><div class="panel-value" id="panelDate">—</div></div>
      <div><div class="panel-label">Last Updated</div><div class="panel-value" id="panelUpdated">—</div></div>
      
      <div><div class="panel-label">Employee Dept</div><div class="panel-value" id="panelDept">—</div></div>
    </div>`;

const replaceStr = `    <div class="panel-section panel-grid" style="row-gap: 24px;">
      <div><div class="panel-label">Submitted by</div><div class="panel-value" id="panelName">—</div></div>
      <div><div class="panel-label">Email</div><div class="panel-value" id="panelEmail" style="word-break:break-all;">—</div></div>
      
      <div><div class="panel-label">Contact</div><div class="panel-value" id="panelContact">—</div></div>
      <div><div class="panel-label">Facebook</div><div class="panel-value" id="panelFacebook" style="word-break:break-all;">—</div></div>
      
      <div><div class="panel-label">Submitted</div><div class="panel-value" id="panelDate">—</div></div>
      <div><div class="panel-label">Last Updated</div><div class="panel-value" id="panelUpdated">—</div></div>
      
      <div><div class="panel-label">Employee Dept</div><div class="panel-value" id="panelDept">—</div></div>
      <div><div class="panel-label">Batch Number</div><div class="panel-value" id="panelBatchNumber">—</div></div>
    </div>`;

const files = [
  'dashboard.html',
  'dept-bd.html',
  'dept-finance.html',
  'dept-hr.html',
  'dept-marketing.html',
  'dept-operations.html',
  'dept-sales.html',
  'dept-tech.html',
  'dept-tech-backup.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Basic replace
    if (content.includes(targetStr)) {
      content = content.replace(targetStr, replaceStr);
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + file);
    } else {
      console.log('Target string not found in ' + file);
    }
  }
});
