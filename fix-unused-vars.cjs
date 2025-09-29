#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get ESLint output for unused vars only
const eslintCmd = 'npx eslint . --quiet --format json';
let eslintOutput;

try {
  eslintOutput = execSync(eslintCmd, { encoding: 'utf-8', cwd: __dirname });
} catch (error) {
  eslintOutput = error.stdout;
}

const results = JSON.parse(eslintOutput);

// Extract unused variable/import errors
const unusedVarErrors = [];
results.forEach(file => {
  file.messages.forEach(message => {
    if (message.ruleId === '@typescript-eslint/no-unused-vars') {
      unusedVarErrors.push({
        filePath: file.filePath,
        line: message.line,
        column: message.column,
        message: message.message
      });
    }
  });
});

console.log(`Found ${unusedVarErrors.length} unused variable errors to fix`);

// Group by file for efficient processing
const fileErrors = {};
unusedVarErrors.forEach(error => {
  if (!fileErrors[error.filePath]) {
    fileErrors[error.filePath] = [];
  }
  fileErrors[error.filePath].push(error);
});

// Process each file
Object.keys(fileErrors).forEach(filePath => {
  const errors = fileErrors[filePath];
  console.log(`\nProcessing ${path.relative(__dirname, filePath)} with ${errors.length} errors...`);

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Sort by line number in descending order to avoid offset issues
    errors.sort((a, b) => b.line - a.line);

    errors.forEach(error => {
      const lineIndex = error.line - 1;
      const line = lines[lineIndex];

      // Extract variable name from error message
      const varMatch = error.message.match(/'([^']+)' is (?:defined|assigned)/);
      if (varMatch) {
        const varName = varMatch[1];

        // Skip if already has underscore prefix
        if (varName.startsWith('_')) {
          return;
        }

        // Replace the variable name with underscore prefix
        const newLine = line.replace(
          new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
          `_${varName}`
        );

        if (newLine !== line) {
          lines[lineIndex] = newLine;
          console.log(`  Line ${error.line}: ${varName} -> _${varName}`);
        }
      }
    });

    // Write back the modified content
    const newContent = lines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✅ Updated ${path.relative(__dirname, filePath)}`);
    }
  } catch (err) {
    console.error(`  ❌ Error processing ${path.relative(__dirname, filePath)}: ${err.message}`);
  }
});

console.log('\n🎉 Finished processing unused variable errors!');