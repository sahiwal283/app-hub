#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src'];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md']);
const EMOJI_PATTERN = /(\p{Extended_Pictographic}|\uFE0F|\u200D)/u;

function walk(directory, collector) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }

    const ext = path.extname(entry.name);
    if (ALLOWED_EXTENSIONS.has(ext)) {
      collector.push(fullPath);
    }
  }
}

const files = [];
for (const dir of TARGET_DIRS) {
  walk(path.join(ROOT_DIR, dir), files);
}

const violations = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (EMOJI_PATTERN.test(content)) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    violations.push(relativePath);
  }
}

if (violations.length > 0) {
  console.error('Emoji characters are not allowed in UI source files.');
  for (const file of violations) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('No emoji characters found in checked frontend files.');
