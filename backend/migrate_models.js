import fs from 'fs';
import path from 'path';

const homsterModelsDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Homster\\Homster\\Backend\\models';
const hoomzoModelsDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\models';

const modelsToCopy = [
  'Worker.js',
  'WorkerSubscriptionPlan.js',
  'Settlement.js'
];

const modelsToRename = [
  { from: 'Booking.js', to: 'HomeServiceBooking.js' },
  { from: 'BookingRequest.js', to: 'HomeServiceBookingRequest.js' },
  { from: 'Cart.js', to: 'HomeServiceCart.js' }
];

console.log('Starting model migration for User -> Worker flow...');

// Copy direct models
modelsToCopy.forEach(model => {
  const src = path.join(homsterModelsDir, model);
  const dest = path.join(hoomzoModelsDir, model);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${model}`);
  } else {
    console.log(`Warning: ${model} not found in Homster`);
  }
});

// Copy and rename models
modelsToRename.forEach(item => {
  const src = path.join(homsterModelsDir, item.from);
  const dest = path.join(hoomzoModelsDir, item.to);
  if (fs.existsSync(src)) {
    let content = fs.readFileSync(src, 'utf-8');
    fs.writeFileSync(dest, content);
    console.log(`Copied and renamed ${item.from} -> ${item.to}`);
  } else {
    console.log(`Warning: ${item.from} not found in Homster`);
  }
});

console.log('Model migration completed successfully.');
