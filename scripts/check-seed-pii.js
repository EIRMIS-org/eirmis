import fs from 'fs';
import path from 'path';

const seedFile = path.resolve('supabase/seed.sql');

if (!fs.existsSync(seedFile)) {
  console.error(`Seed file not found: ${seedFile}`);
  process.exit(1);
}

const content = fs.readFileSync(seedFile, 'utf8');

// Allowed placeholder domains
const ALLOWED_DOMAINS = ['@example.com', '@test.com'];

// Allowed placeholder names/words in string literals
const ALLOWED_NAMES = [
  'Synthetic', 'Organizer', 'Admin', 'Guest', 'Staff', 'John', 'Jane', 'Doe', 'Test',
  'Annual', 'Gala', '2026', 'A', 'event', 'for', 'testing', 'synthetic'
];

let hasError = false;

// 1. Check Emails
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const emails = content.match(emailRegex) || [];

for (const email of emails) {
  const isAllowed = ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
  if (!isAllowed) {
    console.error(`❌ PII Violation: Found non-placeholder email: ${email}`);
    hasError = true;
  }
}

// 2. Lightweight Check for Real Names
// Look for string literals in SQL: 'Some Text'
const stringLiteralRegex = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
let match;
while ((match = stringLiteralRegex.exec(content)) !== null) {
  const text = match[1];
  
  // Ignore UUIDs, dates, empty strings, pure numbers, JSON strings, or hashes
  if (
    !text || 
    text.length < 3 ||
    /^[0-9a-fA-F-]+$/.test(text) || // UUIDs/Hashes
    /^[0-9:\-\+ TZ]+$/.test(text) || // Timestamps
    text.includes('{') || text.includes('[') || // JSON
    ALLOWED_DOMAINS.some(d => text.toLowerCase().endsWith(d)) // Allowed emails
  ) {
    continue;
  }

  // Split text into words and check if any look like unexpected names
  const words = text.split(/[\s,]+/);
  for (const word of words) {
    // Ignore small words or lowercase words (often not names)
    if (word.length < 3 || word.toLowerCase() === word) continue;
    
    // Strip punctuation
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanWord.length < 3) continue;

    // Check if the capitalized word is in the allowed list
    const isAllowed = ALLOWED_NAMES.some(allowed => allowed.toLowerCase() === cleanWord.toLowerCase());
    if (!isAllowed && /^[A-Z][a-z]+/.test(cleanWord)) {
      // It's capitalized but not in our allowed list, could be a real name
      console.warn(`⚠️ Potential PII / Non-placeholder token found: "${cleanWord}" in string '${text}'`);
      // We log a warning but don't strictly fail unless configured, to avoid false positives.
      // For strict compliance, let's fail.
      console.error(`❌ PII Violation: Found non-placeholder name/token: ${cleanWord}`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n🚨 PII Check FAILED. Please ensure only placeholder data is used in seed.sql.');
  process.exit(1);
} else {
  console.log('✅ PII Check PASSED. No real emails or names detected.');
}
