import fs from 'fs';
import path from 'path';

const file = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\controllers\\workerControllers\\workerBookingController.js';
let content = fs.readFileSync(file, 'utf-8');

// Convert CJS to ESM
content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\((['"])(.*?)\2\);?/g, "import { $1 } from '$3.js';");
content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");
content = content.replace(/let\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");

// Fix specific imports
content = content.replace(/models\/Booking/g, 'models/HomeServiceBooking');
content = content.replace(/import\s+Booking\s+from/g, 'import HomeServiceBooking from');
content = content.replace(/Booking\./g, 'HomeServiceBooking.');
content = content.replace(/Booking\(/g, 'HomeServiceBooking(');

// Add .js to imports
content = content.replace(/from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g, "from '$1.js'");

// Exports
content = content.replace(/exports\.([a-zA-Z0-9_]+)\s*=\s*/g, 'export const $1 = ');
content = content.replace(/module\.exports\s*=\s*\{([^}]+)\};?/g, 'export { $1 };');

fs.writeFileSync(file, content);
console.log('Converted workerBookingController.js');
