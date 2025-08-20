/**
 * Test script to verify Australian Medical Review Agent prompts work with sample data
 * Run this with: node test-aus-medical-review.js
 */

// Sample clinical data that should trigger Australian guideline recommendations
const sampleClinicalData = `BACKGROUND: 
75-year-old male with ischaemic cardiomyopathy, LVEF 25%, on ACE inhibitor and beta-blocker. 
Previous MI 2019. Diabetes type 2. No current heart failure symptoms.

INVESTIGATIONS: 
Echo: LVEF 25%, moderate LV dilatation
Bloods: HbA1c 7.8%, eGFR 55, Hb 105 g/L
Iron studies: Ferritin 45 ng/mL, TSAT 15%

MEDICATIONS: 
Metoprolol 50mg BD
Perindopril 8mg daily  
Metformin 1g BD
Aspirin 100mg daily`;

console.log('🔬 Testing Australian Medical Review Agent with sample data...');
console.log('\n📋 Sample Clinical Data:');
console.log(sampleClinicalData);

console.log('\n🎯 Expected Clinical Oversights to Identify:');
console.log('1. Missing SGLT2 inhibitor (dapagliflozin/empagliflozin) for HFrEF');
console.log('2. Missing MRA (spironolactone/eplerenone) for LVEF ≤35%');
console.log('3. Iron deficiency requiring ferric carboxymaltose');
console.log('4. Missing statin for post-MI patient');
console.log('5. Suboptimal diabetes control (HbA1c 7.8%)');

console.log('\n💡 Instructions for Testing:');
console.log('1. Reload the Chrome extension in chrome://extensions');
console.log('2. Navigate to a Xestro EMR page');
console.log('3. Add the sample data above to the Background, Investigations, and Medications fields');
console.log('4. Click the "AI Review" button');
console.log('5. Verify that the agent identifies the expected clinical oversights');

console.log('\n📊 Success Criteria:');
console.log('- Should identify 3-5 clinical oversights');
console.log('- Each finding should reference Australian guidelines (NHFA/CSANZ, RACGP)');
console.log('- Should recommend specific medications/actions');
console.log('- Should assign appropriate urgency levels');

console.log('\n🔧 Troubleshooting:');
console.log('- If EMR extraction fails: Reload Chrome extension');
console.log('- If LLM gives generic response: Check if medgemma model is loaded');
console.log('- If no findings: Verify system prompts are being used correctly');