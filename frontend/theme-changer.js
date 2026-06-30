import fs from 'fs';
import path from 'path';

const file = path.resolve('src', 'pages', 'user', 'HandpickedDetailsPage.jsx');

if (!fs.existsSync(file)) {
  console.error("File not found at", file);
  process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');

// Replacements map (dark to light theme)
const replacements = [
  { regex: /bg-slate-950/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-900/g, replacement: 'bg-white' },
  { regex: /bg-slate-800/g, replacement: 'bg-slate-100' },
  { regex: /bg-slate-700/g, replacement: 'bg-slate-200' },
  { regex: /text-slate-100/g, replacement: 'text-slate-900' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /border-slate-800/g, replacement: 'border-slate-200' },
  { regex: /border-slate-700/g, replacement: 'border-slate-300' },
  { regex: /border-white\/10/g, replacement: 'border-black/5' },
  { regex: /border-white\/5/g, replacement: 'border-black/5' },
  { regex: /bg-white\/10/g, replacement: 'bg-black/5' },
  { regex: /bg-white\/20/g, replacement: 'bg-black/10' },
  { regex: /bg-white\/5/g, replacement: 'bg-black/5' },
  { regex: /hover:bg-white\/20/g, replacement: 'hover:bg-black/10' },
  { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-slate-50' },
  { regex: /from-slate-950/g, replacement: 'from-slate-50' },
  { regex: /via-slate-950\/20/g, replacement: 'via-slate-50/20' },
  { regex: /from-black\/80/g, replacement: 'from-black/60' },
  { regex: /text-white/g, replacement: 'text-slate-900' }
];

replacements.forEach(({regex, replacement}) => {
  content = content.replace(regex, replacement);
});

// Revert specific classes where we WANT text-white (buttons, badges, overlays)
content = content.replace(/bg-purple-600 text-slate-900/g, 'bg-purple-600 text-white');
content = content.replace(/bg-emerald-600 text-slate-900/g, 'bg-emerald-600 text-white');
content = content.replace(/bg-rose-600\/90 border-rose-500 text-slate-900/g, 'bg-rose-600/90 border-rose-500 text-white');
content = content.replace(/text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900/g, 'text-3xl md:text-5xl font-extrabold tracking-tight text-white');
content = content.replace(/<ArrowLeft className="w-6 h-6 text-slate-900" \/>/g, '<ArrowLeft className="w-6 h-6 text-white" />');
content = content.replace(/<Share2 className="w-6 h-6 text-slate-900" \/>/g, '<Share2 className="w-6 h-6 text-white" />');

// Remove dark specific shadows if they look bad on light mode
content = content.replace(/shadow-xl/g, 'shadow-sm');
content = content.replace(/shadow-2xl/g, 'shadow-md');

fs.writeFileSync(file, content);
console.log('✅ Theme successfully updated to light in HandpickedDetailsPage.jsx!');
