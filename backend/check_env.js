import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- ENV CHECK ---');
console.log('MONGODB_URL:', process.env.MONGODB_URL ? 'FOUND' : 'MISSING');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'FOUND' : 'MISSING');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'FOUND' : 'MISSING');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'FOUND' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'FOUND' : 'MISSING');
console.log('-----------------');
