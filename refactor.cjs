const fs = require('fs');
const path = require('path');

const replacements = [
  // Protect button texts
  { from: /bg-blue-600 hover:bg-blue-700 text-white/g, to: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { from: /bg-blue-600 text-white/g, to: 'bg-amber-600 text-white' },
  { from: /bg-red-600 hover:bg-red-700 text-white/g, to: 'bg-red-600 hover:bg-red-700 text-white' },
  { from: /bg-green-600 hover:bg-green-700 text-white/g, to: 'bg-green-600 hover:bg-green-700 text-white' },
  { from: /bg-yellow-600 hover:bg-yellow-700 text-white/g, to: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
  
  // Backgrounds
  { from: /bg-slate-950/g, to: 'bg-stone-100 dark:bg-stone-950' },
  { from: /bg-slate-900/g, to: 'bg-stone-50 dark:bg-stone-900' },
  { from: /bg-slate-800/g, to: 'bg-white dark:bg-stone-800' },
  { from: /bg-slate-700/g, to: 'bg-stone-100 dark:bg-stone-700' },
  
  // Hover Backgrounds
  { from: /hover:bg-slate-800/g, to: 'hover:bg-stone-100 dark:hover:bg-stone-800' },
  { from: /hover:bg-slate-700/g, to: 'hover:bg-stone-200 dark:hover:bg-stone-700' },

  // Borders
  { from: /border-slate-800/g, to: 'border-stone-200 dark:border-stone-800' },
  { from: /border-slate-700/g, to: 'border-stone-200 dark:border-stone-700' },

  // Text
  { from: /text-slate-400/g, to: 'text-stone-500 dark:text-stone-400' },
  { from: /text-slate-300/g, to: 'text-stone-600 dark:text-stone-300' },
  { from: /hover:text-white/g, to: 'hover:text-stone-900 dark:hover:text-white' },
  { from: /text-white/g, to: 'text-stone-900 dark:text-white' },

  // Brand Colors (Any remaining)
  { from: /bg-blue-600/g, to: 'bg-amber-600' },
  { from: /hover:bg-blue-700/g, to: 'hover:bg-amber-700' },
  { from: /text-blue-500/g, to: 'text-amber-600 dark:text-amber-500' },
  { from: /border-blue-500/g, to: 'border-amber-500' }
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const r of replacements) {
        content = content.replace(r.from, r.to);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
