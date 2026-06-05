import fs from 'fs';
import path from 'path';

const controllersDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers';
const routesDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\routes\\worker-routes';

const fixFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix Booking -> HomeServiceBooking
  content = content.replace(/models\/Booking\.js/g, 'models/HomeServiceBooking.js');
  content = content.replace(/import\s+Booking\s+from/g, 'import HomeServiceBooking from');
  // Handle instances where Booking was used in code
  content = content.replace(/Booking\./g, 'HomeServiceBooking.');
  content = content.replace(/Booking\(/g, 'HomeServiceBooking(');

  // Fix module.exports = { ... }
  content = content.replace(/module\.exports\s*=\s*\{([^}]+)\};?/g, 'export { $1 };');

  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${path.basename(filePath)}`);
};

fs.readdirSync(controllersDir).forEach(file => fixFile(path.join(controllersDir, file)));
fs.readdirSync(routesDir).forEach(file => fixFile(path.join(routesDir, file)));

console.log('Fixes applied.');
