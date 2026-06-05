import fs from 'fs';
import path from 'path';

const filesToConvert = [
  'models/Worker.js',
  'models/WorkerSubscriptionPlan.js',
  'models/Settlement.js',
  'models/HomeServiceBooking.js',
  'models/HomeServiceBookingRequest.js',
  'models/HomeServiceCart.js',
  'controllers/workerControllers/workerAuthController.js',
  'controllers/workerControllers/workerDashboardController.js',
  'controllers/workerControllers/workerProfileController.js',
  'controllers/workerControllers/workerWalletController.js',
  'routes/worker-routes/auth.routes.js',
  'routes/worker-routes/dashboard.routes.js',
  'routes/worker-routes/fcmToken.routes.js',
  'routes/worker-routes/job.routes.js',
  'routes/worker-routes/profile.routes.js',
  'routes/worker-routes/subscription.routes.js',
  'routes/worker-routes/wallet.routes.js',
];

const hoomzoDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend';

filesToConvert.forEach(file => {
  const filePath = path.join(hoomzoDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Convert const X = require('Y') to import X from 'Y'
    // Specifically handle destructuring: const { X } = require('Y') -> import { X } from 'Y'
    content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\((['"])(.*?)\2\);?/g, "import { $1 } from '$3.js';");
    content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");
    content = content.replace(/let\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");
    
    // Add .js to imports that don't have it and are local files
    content = content.replace(/from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g, "from '$1.js'");
    content = content.replace(/import\s+([a-zA-Z0-9_]+)\s+from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g, "import $1 from '$2.js'");
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g, "import {$1} from '$2.js'");
    
    // Fix specific paths
    content = content.replace(/\.\.\/models\//g, '../../models/'); // For controllers/routes if needed
    // Wait, regex above might be too greedy or cause issues, but it's a start.
    
    // Fix module.exports = X to export default X
    content = content.replace(/module\.exports\s*=\s*([a-zA-Z0-9_]+);?/g, 'export default $1;');
    
    // Fix exports.X = Y to export const X = Y
    content = content.replace(/exports\.([a-zA-Z0-9_]+)\s*=\s*/g, 'export const $1 = ');
    
    // We'll write it back
    fs.writeFileSync(filePath, content);
    console.log(`Converted ${file} to ESM`);
  }
});
console.log('ESM Conversion complete');
