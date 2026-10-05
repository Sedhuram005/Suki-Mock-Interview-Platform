/* eslint-disable @typescript-eslint/no-require-imports -- This standalone script runs as CommonJS. */
const fs = require('fs');

const files = [
  'app/register/page.tsx',
  'app/page.tsx',
  'components/DataDetective.tsx',
  'components/UserDetailsModal.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove Sparkles from lucide-react import
    content = content.replace(/\bSparkles,\s*/g, '');
    // Specifically for import { ..., Sparkles, ... } from 'lucide-react'
    content = content.replace(/Sparkles,\s*/g, '');

    // Remove <Sparkles ... /> component usages
    content = content.replace(/<Sparkles[^>]*\/>/g, '');

    fs.writeFileSync(file, content);
    console.log('Removed Sparkles from ' + file);
  }
});
