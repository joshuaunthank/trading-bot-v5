#!/usr/bin/env node

console.log('=== DEBUG INFO ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('process.argv:', process.argv);
console.log('NODE_ENV:', process.env.NODE_ENV);

const fs = require('fs');
const path = require('path');

console.log('\n=== FILE SYSTEM CHECK ===');
console.log('Contents of current directory:');
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const stats = fs.statSync(file);
    console.log(`${stats.isDirectory() ? 'd' : 'f'} ${file}`);
  });
} catch (error) {
  console.log('Error reading current directory:', error.message);
}

console.log('\n=== LOOKING FOR SERVER.JS ===');
const possiblePaths = [
  './dist/server.js',
  'dist/server.js',
  './server.js',
  'server.js',
  '../dist/server.js',
  '../../dist/server.js'
];

possiblePaths.forEach(p => {
  try {
    const fullPath = path.resolve(p);
    const exists = fs.existsSync(p);
    console.log(`${exists ? '✅' : '❌'} ${p} -> ${fullPath}`);
  } catch (error) {
    console.log(`❌ ${p} -> Error: ${error.message}`);
  }
});

// Now try to start the actual server
console.log('\n=== STARTING SERVER ===');
try {
  require('./dist/server.js');
} catch (error) {
  console.log('Error starting server:', error.message);
  console.log('Error stack:', error.stack);
}
