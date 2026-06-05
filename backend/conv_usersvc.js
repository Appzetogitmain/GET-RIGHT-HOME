import fs from 'fs';

const file = 'c:\\Users\\Hp\\OneDrive\\Desktop\\Company Projects\\Hoomzo\\backend\\models\\UserService.js';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/const\s+\{([^}]+)\}\s*=\s*require\((['"])(.*?)\2\);?/g, "import { $1 } from '$3.js';");
content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, "import $1 from '$3.js';");
content = content.replace(/module\.exports\s*=\s*([^\n;]+);?/g, 'export default $1;');
content = content.replace(/from 'mongoose\.js'/g, "from 'mongoose'");

fs.writeFileSync(file, content);
console.log('done');
