import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);
const present = (key) => Boolean(process.env[key]?.trim());
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let validUrl = false;
try { validUrl = ['https:', 'http:'].includes(new URL(url).protocol); } catch {}
const checks = {
  'Local .env': existsSync(envPath),
  'Supabase URL format': validUrl,
  'Supabase browser key': present('VITE_SUPABASE_PUBLISHABLE_KEY') || present('VITE_SUPABASE_ANON_KEY'),
  'Supabase server key (optional for demo)': present('SUPABASE_SECRET_KEY') || present('SUPABASE_SERVICE_ROLE_KEY'),
  'Ollama key': present('OLLAMA_API_KEY'),
  'Ollama model selected': present('OLLAMA_MODEL'),
};
for (const [name, ready] of Object.entries(checks)) console.log(`${ready ? 'SET' : 'MISSING'}  ${name}`);
console.log('Presence check only: values were not printed or sent, and connections were not tested.');
