const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend', 'src', 'homster', 'modules', 'worker');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace orange colors with light blue colors
  content = content.replace(/#EF6B11/gi, '#3B82F6'); 
  content = content.replace(/#FF8C00/gi, '#60A5FA'); 
  content = content.replace(/border-orange-100/g, 'border-blue-100');
  content = content.replace(/bg-orange-50/g, 'bg-blue-50');
  content = content.replace(/hover:bg-orange-100/g, 'hover:bg-blue-100');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated colors in ${filePath}`);
  }
};

const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      replaceInFile(filePath);
    }
  }
};

walkSync(directoryPath);
console.log('Color replacement complete!');
