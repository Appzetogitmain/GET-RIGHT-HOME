// This file MUST be the first import in server.js
// In ESM, all imports are hoisted — dotenv must be loaded here
// so env vars are available before any other module initializes.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env'), quiet: true });
