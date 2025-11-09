#!/usr/bin/env node

/**
 * Environment Checker
 * Verifies environment variables at startup and provides actionable hints
 */

const REQUIRED_VARS = [
  { name: 'DATABASE_URL', hint: 'PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db?sslmode=require for Neon)' },
  { name: 'REDIS_URL', hint: 'Redis connection string (e.g., redis://localhost:6379 or rediss://... for Upstash)' },
  { name: 'PORT', hint: 'Server port (default: 3000)', optional: true },
  { name: 'NODE_ENV', hint: 'Environment (development, production)', optional: true },
];

const OPTIONAL_VARS = [
  { name: 'OPENSEARCH_NODE', hint: 'OpenSearch endpoint for full-text search (e.g., http://localhost:9200). If not set, search will be disabled.' },
  { name: 'OPENSEARCH_USER', hint: 'OpenSearch username (required if OPENSEARCH_NODE is set)' },
  { name: 'OPENSEARCH_PASS', hint: 'OpenSearch password (required if OPENSEARCH_NODE is set)' },
  { name: 'S3_BUCKET', hint: 'AWS S3 bucket name for attachments. If not set, attachments will be disabled.' },
  { name: 'AWS_REGION', hint: 'AWS region (required if S3_BUCKET is set)' },
];

console.log('\n🔍 Environment Configuration Check\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('Required Variables:');
REQUIRED_VARS.forEach(({ name, hint, optional }) => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    if (optional) {
      console.log(`  ℹ ${name}: Not set (using default)`);
      console.log(`    Hint: ${hint}`);
    } else {
      console.log(`  ✗ ${name}: Missing`);
      console.log(`    Hint: ${hint}`);
      hasErrors = true;
    }
  } else {
    // Mask sensitive values
    let displayValue = value;
    if (name.includes('URL') || name.includes('PASS')) {
      displayValue = value.substring(0, 10) + '...';
    }
    console.log(`  ✓ ${name}: Set (${displayValue})`);
  }
});

// Check optional variables
console.log('\nOptional Variables (for enhanced features):');
OPTIONAL_VARS.forEach(({ name, hint }) => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.log(`  - ${name}: Not set`);
    console.log(`    Hint: ${hint}`);
    hasWarnings = true;
  } else {
    let displayValue = value;
    if (name.includes('PASS') || name.includes('USER')) {
      displayValue = '***';
    } else if (name.includes('NODE') || name.includes('BUCKET')) {
      displayValue = value;
    }
    console.log(`  ✓ ${name}: Set (${displayValue})`);
  }
});

// Special checks
console.log('\nConfiguration Analysis:');

// Check if DATABASE_URL has sslmode for Neon
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl.includes('neon.tech') || dbUrl.includes('neon.aws')) {
    if (!dbUrl.includes('sslmode=require')) {
      console.log('  ⚠ DATABASE_URL appears to be Neon but missing sslmode=require');
      console.log('    Hint: Add ?sslmode=require to your Neon connection string');
      hasWarnings = true;
    } else {
      console.log('  ✓ Neon SSL mode configured correctly');
    }
  }
}

// Check Redis URL protocol
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  if (redisUrl.startsWith('rediss://')) {
    console.log('  ✓ Redis TLS enabled (rediss://)');
  } else if (redisUrl.startsWith('redis://')) {
    console.log('  ℹ Redis TLS not enabled (using redis://)');
  }
}

// Check feature availability
const searchEnabled = !!(process.env.OPENSEARCH_NODE && process.env.OPENSEARCH_NODE.trim() !== '');
const attachmentsEnabled = !!(
  process.env.S3_BUCKET && 
  process.env.S3_BUCKET.trim() !== '' &&
  process.env.AWS_REGION && 
  process.env.AWS_REGION.trim() !== ''
);

console.log('\nFeature Availability:');
console.log(searchEnabled 
  ? '  ✓ Search: Enabled' 
  : '  - Search: Disabled (set OPENSEARCH_NODE to enable)'
);
console.log(attachmentsEnabled 
  ? '  ✓ Attachments: Enabled' 
  : '  - Attachments: Disabled (set S3_BUCKET and AWS_REGION to enable)'
);

// Summary
console.log('\n📋 Summary:');
if (hasErrors) {
  console.log('  ✗ Configuration has errors. Please fix the missing required variables.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('  ⚠ Configuration is valid but some optional features are disabled.');
  console.log('  The application will run with limited functionality.');
} else {
  console.log('  ✓ All configuration checks passed!');
}

console.log('');
