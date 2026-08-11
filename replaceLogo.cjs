const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  if (c.includes('ATSOCA LEARNING')) return;
  
  const searchStr = '<img src="./Logos/Atsoca logo_blue.png" alt="Atsoca Logo" style="height: 40px; width: auto; transform: scale(1.8) translateX(-15px); transform-origin: left center;">';
  const replaceStr = searchStr + '<div style="display: flex; flex-direction: column; margin-left: 12px; line-height: 1.2;"><span style="font-family: \'Space Grotesk\', sans-serif; font-size: 14px; font-weight: 700; color: var(--navy); letter-spacing: 0.02em;">ATSOCA LEARNING &amp; CONSULTANCY OPC</span><span style="font-family: \'Inter\', sans-serif; font-size: 11.5px; font-weight: 500; color: var(--steel);">Integrated Ticketing System</span></div>';
  
  // Escape regex
  const escapedSearch = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  c = c.replace(new RegExp(escapedSearch, 'g'), replaceStr);
  
  fs.writeFileSync(f, c);
});
console.log('Done inserting text!');
