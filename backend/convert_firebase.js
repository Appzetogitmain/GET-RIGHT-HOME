import fs from 'fs';
import path from 'path';

const file = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\services\\firebaseAdmin.js';
let content = fs.readFileSync(file, 'utf-8');

// Convert CJS to ESM
content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\((['"])(.*?)\2\);?/g, "import { $1 } from '$3.js';");
content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");
content = content.replace(/let\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");

// Exports
content = content.replace(/module\.exports\s*=\s*\{([^}]+)\};?/g, 'export { $1 };');

// Also fix mongoose require if any
content = content.replace(/from 'mongoose\.js'/g, "from 'mongoose'");

fs.writeFileSync(file, content);
console.log('Converted firebaseAdmin.js');
