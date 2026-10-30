import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['src', 'supabase/functions'];
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(absolute);
  }
}

for (const relative of sourceRoots) walk(path.join(root, relative));

const violations = [];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const source = fs.readFileSync(file, 'utf8');
  const checks = [
    [/\bconsole\.log\s*\(/, 'console.log tidak boleh masuk source produksi'],
    [/\b(?:mock|fake)\s*(?:data|api|repository|response)\b/i, 'mock/fake domain data dilarang'],
    [/SUPABASE_SERVICE_ROLE_KEY/, 'service-role key tidak boleh berada di frontend'],
  ];
  for (const [pattern, message] of checks) {
    if (pattern.test(source) && !(pattern.source === 'SUPABASE_SERVICE_ROLE_KEY' && relative.startsWith('supabase/functions/'))) {
      violations.push(`${relative}: ${message}`);
    }
  }
  if (source.includes('localStorage') && relative !== 'src/components/UIPreferences.tsx') {
    violations.push(`${relative}: localStorage hanya boleh dipakai untuk preferensi UI`);
  }
}

if (violations.length) {
  console.error('Contract lint gagal:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Contract lint lulus untuk ${files.length} file source.`);
}
