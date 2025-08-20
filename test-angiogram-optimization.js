/**
 * Simple test script to verify the optimized Angiogram Agent
 * Tests the new three-section format and missing information detection
 */

import { AngiogramAgent } from './src/agents/specialized/AngiogramAgent.ts';

// Test input from user's example
const testInput = `Left main mild. Severe proximal calcified LED stenosis 90%, 30% in the mid LED. Diffuse irregularities in the distal LED, 50% in the first diagonal. Mild proximal circumflex, 50% first marginal. 80% proximal RCA, 70% mid PDA. LVEDP8 normal left ventricular function.`;

async function testOptimizedAngiogramAgent() {
  console.log('🧪 Testing Optimized Angiogram Agent...');
  console.log('📝 Input:', testInput);
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const agent = new AngiogramAgent();
    
    const context = {
      sessionId: 'test-session',
      timestamp: Date.now()
    };

    console.log('⚙️ Processing with optimized agent...');
    const report = await agent.process(testInput, context);

    console.log('📊 REPORT GENERATED:');
    console.log('════════════════════');
    console.log(report.content);
    console.log('');

    console.log('📋 REPORT METADATA:');
    console.log('═══════════════════');
    console.log(`- Confidence: ${report.metadata.confidence}`);
    console.log(`- Processing Time: ${report.metadata.processingTime}ms`);
    console.log(`- Sections: ${report.sections.length}`);
    
    if (report.metadata.missingInformation) {
      console.log('');
      console.log('⚠️ MISSING INFORMATION DETECTED:');
      console.log('═══════════════════════════════════');
      console.log(JSON.stringify(report.metadata.missingInformation, null, 2));
    }

    console.log('');
    console.log('📑 REPORT SECTIONS:');
    console.log('═══════════════════');
    report.sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title} (${section.priority} priority)`);
      console.log(`   Type: ${section.type}`);
      console.log(`   Content length: ${section.content.length} chars`);
      console.log('');
    });

    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOptimizedAngiogramAgent();