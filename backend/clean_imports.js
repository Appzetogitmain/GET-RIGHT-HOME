import fs from 'fs';
import path from 'path';

const dirs = [
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\models',
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers',
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\routes\\worker-routes',
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers'
];

const fixImports = (dir) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) return;
    if (!filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Node modules don't have .js in their import paths
    const nodeModules = ['express', 'express-validator', 'mongoose', 'bcryptjs', 'jsonwebtoken', 'crypto', 'cloudinary', 'multer', 'socket.io', 'dotenv'];
    
    nodeModules.forEach(mod => {
      // replace from 'module.js' to from 'module'
      content = content.replace(new RegExp(`from\\s+['"]${mod}\\.js['"]`, 'g'), `from '${mod}'`);
    });

    fs.writeFileSync(filePath, content);
  });
};

dirs.forEach(fixImports);
console.log('Fixed node module imports');
