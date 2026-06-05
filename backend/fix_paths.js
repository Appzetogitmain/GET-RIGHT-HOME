import fs from 'fs';

// Create constants.js if missing
const constantsPath = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\utils\\constants.js';
if (!fs.existsSync(constantsPath)) {
  const constants = `
export const BOOKING_STATUS = {
  PENDING: 'pending',
  SEARCHING: 'searching',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_VENDORS: 'no_vendors',
  NO_WORKERS: 'no_workers',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  PLAN_COVERED: 'plan_covered',
  FAILED: 'failed',
};
`;
  fs.writeFileSync(constantsPath, constants);
  console.log('Created constants.js');
}

// Fix import paths in hsBookingController.js
const files = [
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\hsBookingController.js',
  'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers\\workerBookingController.js'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf-8');
  
  // For hsBookingController.js (in controllers/)
  if (f.includes('hsBookingController')) {
    c = c.replace(/from '\.\.\/utils\//g, "from './utils/");
    c = c.replace(/from '\.\.\/services\//g, "from './services/");
    c = c.replace(/from '\.\.\/models\//g, "from './models/");
    c = c.replace(/from '\.\.\/sockets\.js'/g, "from './sockets.js'");
    c = c.replace(/from '\.\.\/notificationControllers\//g, "from './notificationControllers/");
    
    // controllers/ folder is one level deep from backend
    // So ../utils = utils, ../models = models, ../services = services
    c = c.replace(/from '\.\/utils\//g, "from './utils/");
    c = c.replace(/from '\.\/services\//g, "from './services/");
    c = c.replace(/from '\.\/models\//g, "from './models/");
  }
  
  // For workerBookingController.js (in controllers/workerControllers/)
  if (f.includes('workerBookingController')) {
    // From workerControllers, go up 2 levels to backend root
    c = c.replace(/from '\.\.\/\.\.\/utils\//g, "from '../../utils/");
    c = c.replace(/from '\.\.\/\.\.\/services\//g, "from '../../services/");
    c = c.replace(/from '\.\.\/\.\.\/models\//g, "from '../../models/");
    c = c.replace(/from '\.\.\/\.\.\/sockets\.js'/g, "from '../../sockets.js'");
  }
  
  fs.writeFileSync(f, c);
  console.log('Fixed paths in', f.split('\\').pop());
});

console.log('Done!');
