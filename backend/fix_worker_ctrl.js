import fs from 'fs';
import path from 'path';

const dir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers';

fs.readdirSync(dir).forEach(file => {
  if (!file.endsWith('.js')) return;
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, 'utf-8');

  // Fix all broken HomeServiceBooking name duplications
  c = c.replace(/HomeServiceHomeServiceHomeServiceBooking/g, 'HomeServiceBooking');
  c = c.replace(/HomeServiceHomeServiceBooking/g, 'HomeServiceBooking');

  // Fix path problems:
  // From workerControllers/, the backend root is ../../
  // ../../../models/ → ../../models/   (3 levels up from workerControllers is 2 wrong)
  // ../../models/ → ../../models/      (correct)
  // ./models/ → ../../models/
  c = c.replace(/from '\.\.\/\.\.\/\.\.\/models\//g, "from '../../models/");
  c = c.replace(/from '\.\/models\//g, "from '../../models/");
  c = c.replace(/from '\.\/services\//g, "from '../../services/");
  c = c.replace(/from '\.\/utils\//g, "from '../../utils/");
  c = c.replace(/from '\.\.\/\.\.\/\.\.\/services\//g, "from '../../services/");
  c = c.replace(/from '\.\.\/\.\.\/\.\.\/utils\//g, "from '../../utils/");
  c = c.replace(/from '\.\.\/\.\.\/\.\.\/sockets\.js'/g, "from '../../sockets.js'");
  
  // Remove Vendor/VendorBill imports
  c = c.replace(/^import Vendor from.*\n/gm, '');
  c = c.replace(/^import VendorBill from.*\n/gm, '');

  fs.writeFileSync(fp, c);
  console.log('Fixed:', file);
});

console.log('Done!');
