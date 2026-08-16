import fs from 'node:fs';
const p='loterias-ai/hoy/index.html';
let s=fs.readFileSync(p,'utf8');
const legacy='<script src="./budget15-ui.js?v=1"></script>';
const current='<script src="./budget15-ui.js?v=2"></script>';
// The current Today renderer already includes Quiniela through today-manifest.
// Never re-inject the legacy renderer: it hard-coded dated artifacts and could
// repaint duplicate/stale Bonoloto cards after the strict-Today UI loaded.
s=s.split(legacy).join('');
if(!s.includes(current)){
  if(!s.includes('</body>')) throw new Error('Missing </body>');
  s=s.replace('</body>',current+'</body>');
}
fs.writeFileSync(p,s);
console.log(JSON.stringify({status:'OK',legacyPresent:s.includes(legacy),currentPresent:s.includes(current)}));