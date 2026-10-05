/* eslint-disable @typescript-eslint/no-require-imports -- This standalone script runs as CommonJS. */
const fs = require('fs');
const path = './app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Grainient background section and set white bg
const bgRegex = /<div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-900">[\s\S]*?<div className="absolute inset-0 bg-black\/10 backdrop-blur-\[2px\]" \/>\s*<\/div>/;
content = content.replace(bgRegex, '{/* Background removed */}');

// 2. Change root text color
content = content.replace(/text-white selection:bg-blue-500/g, 'bg-slate-50 text-slate-900 selection:bg-blue-500');

// 3. Convert dark mode text to light mode text
content = content.replace(/text-white\/80/g, 'text-slate-700');
content = content.replace(/text-white\/70/g, 'text-slate-600');
content = content.replace(/text-white\/60/g, 'text-slate-500');
content = content.replace(/text-white\/50/g, 'text-slate-400');
content = content.replace(/text-white\/40/g, 'text-slate-400');
content = content.replace(/text-white(?!\/)/g, 'text-slate-900');

// 4. Convert backgrounds
content = content.replace(/bg-black\/20/g, 'bg-white shadow-sm');
content = content.replace(/bg-black\/40/g, 'bg-slate-50');
content = content.replace(/bg-white\/10/g, 'bg-white shadow-md');
content = content.replace(/bg-white\/20/g, 'bg-blue-50');
content = content.replace(/bg-white\/30/g, 'bg-blue-100');
content = content.replace(/bg-white\/90/g, 'bg-white');

// 5. Convert borders
content = content.replace(/border-white\/10/g, 'border-slate-200');
content = content.replace(/border-white\/20/g, 'border-slate-200');
content = content.replace(/border-white\/30/g, 'border-slate-300');

// 6. Sign In Box specific updates (Make it white and blue)
content = content.replace(/text-sky-300/g, 'text-blue-600');
content = content.replace(/from-sky-200 via-blue-200 to-white/g, 'from-blue-600 via-blue-700 to-indigo-800');
content = content.replace(/bg-white hover:bg-slate-100 py-3\.5 text-sm font-bold text-blue-900/g, 'bg-blue-600 hover:bg-blue-700 py-3.5 text-sm font-bold text-white');

fs.writeFileSync(path, content);
console.log('Successfully updated page.tsx to light mode');
