#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('🧪 Running full test suite...\n');
  const output = execSync('npm test -- --runInBand --json 2>&1', {
    cwd: 'c:\\Users\\thiag\\Desktop\\MVP\\backend',
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(output);
  process.exit(0);
} catch (error) {
  console.error('Test execution error:', error.message);
  if (error.stdout) console.log(error.stdout);
  if (error.stderr) console.log(error.stderr);
  process.exit(1);
}
