#!/usr/bin/env node

import { TestOrchestrator } from './tests/helpers/TestOrchestrator.ts';
import path from 'path';

async function main() {
  console.log('🏥 Reflow Medical Assistant - Autonomous E2E Testing Suite');
  console.log('================================================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || './test-results';
  const verbose = args.includes('--verbose');
  
  if (verbose) {
    console.log(`Output directory: ${path.resolve(outputDir)}`);
    console.log(`Verbose mode: enabled`);
  }
  
  try {
    const orchestrator = new TestOrchestrator(outputDir);
    const report = await orchestrator.runAllTests();
    
    // Exit with appropriate code
    const exitCode = report.summary.totalFailed > 0 ? 1 : 0;
    
    if (exitCode === 0) {
      console.log('\n🎉 All tests passed! Extension is ready for production.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the report and fix issues before production deployment.');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Fatal error during test execution:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

main();