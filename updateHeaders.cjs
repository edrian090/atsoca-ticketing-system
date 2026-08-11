const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const newHeader = `        <tr>
          <th style="width:110px;">Ticket</th>
          <th>Subject</th>
          <th style="width:120px;">Submitted</th>
          <th style="width:120px;">Status</th>
          <th style="width:140px;">Assigned</th>
          <th style="width:110px;">Created</th>
        </tr>`;

let changed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find everything between <thead> and </thead> and replace it
  const regex = /<thead>[\s\S]*?<\/thead>/;
  
  if (regex.test(content)) {
    const replacement = `<thead>\n${newHeader}\n      </thead>`;
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    changed++;
    console.log(`Updated ${file}`);
  }
}
console.log(`Finished. Updated ${changed} files.`);
