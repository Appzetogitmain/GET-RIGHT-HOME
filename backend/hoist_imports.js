import fs from 'fs';
import path from 'path';

const dirs = [
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers',
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers'
];

const processFile = (filePath) => {
  if (!filePath.endsWith('.js')) return;
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  
  let imports = [];
  let newLines = [];
  
  // A regex to match an import line
  const importRegex = /^\s*import\s+.*?\s+from\s+['"].*?['"];?\s*$/;
  // A regex to match multi-line imports (simple case for now, assuming they are single line mostly, but wait!)
  // In `workerBookingController.js:159`, we see `import { createNotification } from '../notificationControllers/notificationController.js';`
  // That's a single line. We only hoist those that match the inline import exactly.

  let inMultiLineImport = false;
  let currentImport = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (importRegex.test(line)) {
      imports.push(line.trim());
    } else {
      newLines.push(line);
    }
  }
  
  if (imports.length > 0) {
    // deduplicate imports
    const uniqueImports = [...new Set(imports)];
    
    // Separate existing top-level imports and the rest of the code
    let finalCodeLines = [];
    let existingTopImports = [];
    let isTop = true;
    
    for (let line of newLines) {
      if (isTop && (line.trim().startsWith('import ') || line.trim() === '')) {
        if (line.trim().startsWith('import ')) {
          existingTopImports.push(line.trim());
        }
      } else {
        if (line.trim() !== '' || !isTop) {
           isTop = false;
           finalCodeLines.push(line);
        }
      }
    }
    
    const allImports = [...new Set([...existingTopImports, ...uniqueImports])];
    
    const finalContent = allImports.join('\n') + '\n\n' + finalCodeLines.join('\n');
    fs.writeFileSync(filePath, finalContent);
    console.log(`Hoisted imports in ${filePath}`);
  }
};

const run = () => {
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isFile()) {
        processFile(fullPath);
      }
    });
  });
};

run();
