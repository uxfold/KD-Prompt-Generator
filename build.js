const fs = require('fs');
const esbuild = require('esbuild');

// Create dist folder
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

// Build the plugin code (runs in Figma)
esbuild.buildSync({
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  format: 'iife',
  target: 'es2020'
});
console.log('Code built');

// Copy HTML (self-contained with JS inside)
fs.copyFileSync('src/ui.html', 'dist/ui.html');
console.log('UI copied');