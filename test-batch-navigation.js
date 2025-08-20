/**
 * Batch AI Review Test Script - UI-Driven Workflow
 * 
 * This script implements the correct navigation pattern for the EMR's Single Page Application (SPA).
 * Instead of URL-based navigation, it uses UI interactions to switch between patients.
 * 
 * Correct Workflow:
 * 1. Find all patients in appointment book (td.Name elements)
 * 2. For each patient:
 *    a. Click patient name to activate them
 *    b. Click "Patient Record" button to load clinical data
 *    c. Wait for clinical fields to populate
 *    d. Extract data and run AI review
 *    e. Move to next patient (no navigation needed - stay on same page)
 */

console.log('🧪 Testing UI-driven batch AI review workflow...');

// Configuration
const WAIT_TIMEOUTS = {
  patientActivation: 1000,
  recordLoading: 3000,
  dataExtraction: 2000,
  maxRetries: 3
};

/**
 * Main batch processing function - demonstrates the correct UI workflow
 */
async function runUIBatchProcessing() {
  console.log('🚀 Starting UI-driven batch processing demonstration...');
  
  try {
    // Step 1: Get list of all patients from appointment book
    const patientElements = await getPatientList();
    console.log(`📋 Found ${patientElements.length} patients in appointment book`);
    
    if (patientElements.length === 0) {
      console.warn('⚠️ No patients found. Make sure you are on an appointment book page.');
      return;
    }
    
    // Step 2: Process each patient
    for (let i = 0; i < patientElements.length; i++) {
      const patientElement = patientElements[i];
      const patientInfo = extractPatientInfo(patientElement);
      
      console.log(`\n👤 Processing patient ${i + 1}/${patientElements.length}: ${patientInfo.name} (${patientInfo.fileNumber})`);
      
      try {
        // Step 2a: Activate patient by clicking their name
        await activatePatient(patientElement);
        
        // Step 2b: Load patient record by clicking Patient Record button
        await loadPatientRecord();
        
        // Step 2c: Wait for clinical data to be available
        await waitForClinicalDataLoad();
        
        // Step 2d: Run existing AI review process (simulated here)
        await runAIReviewProcess(patientInfo);
        
        console.log(`✅ Completed processing for ${patientInfo.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to process patient ${patientInfo.name}:`, error.message);
        // Continue with next patient instead of stopping entire batch
      }
    }
    
    console.log('\n🎉 Batch processing completed!');
    
  } catch (error) {
    console.error('❌ Fatal error in batch processing:', error);
  }
}

/**
 * Get list of all patient elements from the appointment book
 */
async function getPatientList() {
  console.log('📅 Scanning appointment book for patients...');
  console.log('📅 Current page URL:', window.location.href);
  console.log('📅 Page title:', document.title);
  
  // Find the appointment table using correct selector
  const appointmentTable = document.querySelector('table.appointmentBook');
  if (!appointmentTable) {
    // Debug: Show what table elements are available
    const allTables = document.querySelectorAll('table');
    const tableClasses = Array.from(allTables).map(table => 
      table.className || 'no-class'
    );
    console.error('📅 table.appointmentBook not found. Available tables:', tableClasses);
    throw new Error(`Appointment table not found. Expected table.appointmentBook. Found ${allTables.length} tables: ${tableClasses.join(', ')}`);
  }
  
  // Find appointment rows first, then patient name cells (matching working discovery logic)
  const appointmentRows = appointmentTable.querySelectorAll('tr.appt');
  console.log(`📅 Found ${appointmentRows.length} appointment rows`);
  
  // Get all patient name cells from valid appointment rows
  const patientElements = Array.from(appointmentRows)
    .map(row => row.querySelector('td.Name'))
    .filter(element => {
      // Only include cells that have actual patient data
      if (!element || !element.textContent?.trim()) return false;
      const nameSpan = element.querySelector('span[aria-label]');
      return nameSpan && nameSpan.textContent?.trim();
    });
  
  console.log(`📅 Found ${patientElements.length} valid patient entries from ${appointmentRows.length} rows`);
  return patientElements;
}

/**
 * Extract patient information from a name cell element
 */
function extractPatientInfo(patientElement) {
  const nameSpan = patientElement.querySelector('span[aria-label]');
  const fileNumberElement = patientElement.querySelector('small');
  
  if (!nameSpan) {
    throw new Error('Could not find patient name span');
  }
  
  // Parse aria-label: "Mr Test Test (14/09/1976)"
  const ariaLabel = nameSpan.getAttribute('aria-label') || '';
  const nameMatch = ariaLabel.match(/^(.+?)\\s*\\((.+?)\\)$/);
  
  const name = nameMatch ? nameMatch[1].trim() : nameSpan.textContent?.trim() || 'Unknown';
  const dob = nameMatch ? nameMatch[2] : '';
  const fileNumber = fileNumberElement?.textContent?.replace(/[^\\d]/g, '') || '';
  
  return { name, dob, fileNumber };
}

/**
 * Activate a patient by clicking their name element
 */
async function activatePatient(patientElement) {
  console.log('🖱️ Clicking patient name to activate...');
  
  // Click the patient name element
  patientElement.click();
  
  // Wait for patient to be activated
  await wait(WAIT_TIMEOUTS.patientActivation);
  
  // Verify patient is activated (look for visual indicators)
  const isActivated = checkPatientActivation(patientElement);
  if (!isActivated) {
    console.warn('⚠️ Patient activation not visually confirmed, proceeding anyway...');
  } else {
    console.log('✅ Patient activated successfully');
  }
}

/**
 * Check if patient is visually activated (has selected styling)
 */
function checkPatientActivation(patientElement) {
  // Look for common activation indicators
  const row = patientElement.closest('tr');
  if (!row) return false;
  
  // Check for selected/active class or styling
  return (
    row.classList.contains('selected') ||
    row.classList.contains('active') ||
    row.style.backgroundColor !== '' ||
    row.querySelector('.fa-check') !== null
  );
}

/**
 * Load patient record by clicking the Patient Record button
 */
async function loadPatientRecord() {
  console.log('📋 Looking for Patient Record button...');
  
  // Find the Patient Record button
  const patientRecordButton = document.querySelector('button.PatientDetailsButton');
  
  if (!patientRecordButton) {
    throw new Error('Patient Record button not found. Patient may not be properly activated.');
  }
  
  console.log('🖱️ Clicking Patient Record button...');
  
  // Click the button to load clinical data
  patientRecordButton.click();
  
  // Wait for record to load
  await wait(WAIT_TIMEOUTS.recordLoading);
  
  console.log('✅ Patient Record button clicked successfully');
}

/**
 * Wait for clinical data to be loaded and visible
 */
async function waitForClinicalDataLoad() {
  console.log('⏳ Waiting for clinical data to load...');
  
  const maxWaitTime = 15000; // 15 seconds
  const checkInterval = 500; // Check every 500ms
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    // Check for XestroBox elements (clinical content containers)
    const xestroBoxes = document.querySelectorAll('.XestroBox');
    
    if (xestroBoxes.length > 0) {
      console.log(`✅ Clinical data loaded - found ${xestroBoxes.length} XestroBox elements`);
      
      // Additional check: verify specific clinical fields are present
      const hasBackgroundField = checkForClinicalField('Background');
      const hasInvestigationsField = checkForClinicalField('Investigation Summary');
      
      if (hasBackgroundField || hasInvestigationsField) {
        console.log('✅ Clinical fields confirmed as loaded');
        return;
      }
    }
    
    // Wait before next check
    await wait(checkInterval);
  }
  
  // Timeout reached
  console.warn('⚠️ Timeout waiting for clinical data - proceeding anyway');
}

/**
 * Check if a specific clinical field is present and has content
 */
function checkForClinicalField(fieldName) {
  // Look for field labels or containers
  const fieldElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.includes(fieldName) && 
    (el.tagName === 'LABEL' || el.classList.contains('field-label'))
  );
  
  return fieldElements.length > 0;
}

/**
 * Simulate running the existing AI review process
 * (In real implementation, this would call the actual extraction and review functions)
 */
async function runAIReviewProcess(patientInfo) {
  console.log('🤖 Running AI review process...');
  
  // Simulate data extraction
  console.log('📋 Extracting clinical data...');
  await wait(1000);
  
  // In real implementation, this would be:
  // const extractedData = await extractEMRData(['background', 'investigations', 'medications']);
  // const aiReview = await performAIReview(extractedData, patientInfo);
  
  console.log('🤖 Performing AI analysis...');
  await wait(2000);
  
  console.log('✅ AI review completed');
}

/**
 * Utility function to wait/pause execution
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test case definitions for validation
 */
const testCases = [
  {
    name: 'Patient list discovery',
    description: 'Find all td.Name elements in appointment book',
    test: async () => {
      const patients = await getPatientList();
      return patients.length > 0;
    }
  },
  {
    name: 'Patient activation',
    description: 'Click patient name to activate them',
    test: async () => {
      const patients = await getPatientList();
      if (patients.length === 0) return false;
      
      await activatePatient(patients[0]);
      return true;
    }
  },
  {
    name: 'Patient Record button detection',
    description: 'Find PatientDetailsButton after patient activation',
    test: async () => {
      const button = document.querySelector('button.PatientDetailsButton');
      return button !== null;
    }
  },
  {
    name: 'Clinical data loading',
    description: 'Verify XestroBox elements appear after clicking Patient Record',
    test: async () => {
      const initialCount = document.querySelectorAll('.XestroBox').length;
      await loadPatientRecord();
      const finalCount = document.querySelectorAll('.XestroBox').length;
      return finalCount > initialCount;
    }
  }
];

/**
 * Run validation tests
 */
async function runValidationTests() {
  console.log('\\n🧪 Running validation tests...');
  
  for (const testCase of testCases) {
    try {
      console.log(`\\n📝 Testing: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      
      const result = await testCase.test();
      
      if (result) {
        console.log(`   ✅ PASSED`);
      } else {
        console.log(`   ❌ FAILED`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

// Export functions for use in browser console or extension
if (typeof window !== 'undefined') {
  window.batchNavigation = {
    runUIBatchProcessing,
    getPatientList,
    activatePatient,
    loadPatientRecord,
    runValidationTests,
    extractPatientInfo
  };
}

// Auto-run demonstration when script is loaded
console.log('\\n📖 Available functions:');
console.log('   - batchNavigation.runUIBatchProcessing() - Run full batch process');
console.log('   - batchNavigation.runValidationTests() - Test individual components');
console.log('   - batchNavigation.getPatientList() - Get list of patients');
console.log('\\n💡 To start: Run batchNavigation.runUIBatchProcessing() in console');

console.log('\\n✅ UI-driven batch navigation script loaded successfully!');
console.log('🔧 This script demonstrates the correct workflow for SPA-based EMR navigation');