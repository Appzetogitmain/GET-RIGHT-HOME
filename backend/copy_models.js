import fs from 'fs';
import path from 'path';

const srcDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Homster\\Homster\\Backend\\models';
const dstDir = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\models';

// Models to copy from Homster (that don't exist in Hoomzo yet)
const toCopy = ['Category.js', 'Cart.js', 'Plan.js', 'Settings.js', 'VendorBill.js'];

const convertCjsToEsm = (content) => {
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\((['"])(.*?)\2\);?/g, "import { $1 } from '$3.js';");
  content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");
  content = content.replace(/module\.exports\s*=\s*([^\n;]+);?/g, 'export default $1;');
  content = content.replace(/from 'mongoose\.js'/g, "from 'mongoose'");
  content = content.replace(/from "mongoose\.js"/g, 'from "mongoose"');
  return content;
};

toCopy.forEach(file => {
  const src = path.join(srcDir, file);
  const dst = path.join(dstDir, file);
  if (!fs.existsSync(dst) && fs.existsSync(src)) {
    let content = fs.readFileSync(src, 'utf-8');
    content = convertCjsToEsm(content);
    fs.writeFileSync(dst, content);
    console.log(`Copied & converted: ${file}`);
  } else {
    console.log(`Skipped (already exists or not found): ${file}`);
  }
});

// Also create stub stubs for emailService and locationService
const emailServiceStub = `// Email service stub - configure SMTP later
export const sendBookingEmails = async (...args) => {
  console.log('[Email Stub] sendBookingEmails - not configured yet');
};
export default { sendBookingEmails };
`;

const locationServiceStub = `// Location service stub
export const findNearbyWorkers = async (location, radius, filters) => {
  console.log('[Location Stub] findNearbyWorkers called');
  return []; // Return empty - no workers nearby in stub mode
};
export const findNearbyVendors = async (location, radius, filters) => {
  return [];
};
export const geocodeAddress = async (address) => {
  return { lat: 0, lng: 0 };
};
export default { findNearbyWorkers, findNearbyVendors, geocodeAddress };
`;

const emailPath = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\services\\emailService.js';
const locationPath = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\services\\locationService.js';

if (!fs.existsSync(emailPath)) {
  fs.writeFileSync(emailPath, emailServiceStub);
  console.log('Created emailService stub');
}
if (!fs.existsSync(locationPath)) {
  fs.writeFileSync(locationPath, locationServiceStub);
  console.log('Created locationService stub');
}

// Stub for sockets.js if missing
const socketsPath = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\sockets.js';
if (!fs.existsSync(socketsPath)) {
  const socketsStub = `export const getIO = () => null;\nexport const initIO = (server) => null;\n`;
  fs.writeFileSync(socketsPath, socketsStub);
  console.log('Created sockets stub');
}

// BookingRequest model
const brSrc = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Homster\\Homster\\Backend\\models\\BookingRequest.js';
const brDst = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\models\\HomeServiceBookingRequest.js';
if (!fs.existsSync(brDst) && fs.existsSync(brSrc)) {
  let content = fs.readFileSync(brSrc, 'utf-8');
  content = convertCjsToEsm(content);
  // Rename model name in the file
  content = content.replace(/mongoose\.model\('BookingRequest'/g, "mongoose.model('HomeServiceBookingRequest'");
  fs.writeFileSync(brDst, content);
  console.log('Copied BookingRequest as HomeServiceBookingRequest');
}

console.log('All done!');
