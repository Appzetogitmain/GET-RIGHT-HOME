import fs from 'fs';
import path from 'path';

const homsterDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Homster\\Homster\\Backend';
const hoomzoDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend';

const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} to ${dest}`);
  }
};

console.log('Starting controller and route migration...');

// Copy workerControllers
const srcControllers = path.join(homsterDir, 'controllers', 'workerControllers');
const destControllers = path.join(hoomzoDir, 'controllers', 'workerControllers');
copyRecursiveSync(srcControllers, destControllers);

// Copy worker-routes
const srcRoutes = path.join(homsterDir, 'routes', 'worker-routes');
const destRoutes = path.join(hoomzoDir, 'routes', 'worker-routes');
copyRecursiveSync(srcRoutes, destRoutes);

console.log('Migration completed successfully.');
