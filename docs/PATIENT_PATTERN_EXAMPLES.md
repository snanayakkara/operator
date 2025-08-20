# Patient Pattern Examples - Updated Workflow

## Updated Pattern Recognition

The batch processing workflow now correctly follows the user-specified pattern: **"Name (ID)"**

### ✅ Supported Patterns

#### Primary Pattern: "Name (ID)"
- **Format**: `"Patient Name (ID_NUMBER)"`
- **Examples**:
  - `"Test Test (14524)"`
  - `"Testa Rossa (16238)"`
  - `"John Smith (98765)"`

#### Legacy Pattern (Backward Compatibility)
- **Format**: Name with DOB in aria-label
- **Examples**: 
  - Aria-label: `"Mrs Jessica (Jess) Demicoli (07/08/1985)"`
  - Display: `"Jessica Demicoli"`

## Workflow Steps

### 1. Patient Discovery
```javascript
// System searches appointment book table for patterns like:
// - Time: "11:40am", "12:10pm" 
// - Type: "CaNEW", "CaR20"
// - Patient: "Test Test (14524)"
```

### 2. Processing Steps
For each patient found with "Name (ID)" pattern:

1. **Double-click** patient name in appointment book
2. **Click** "Patient Record" button (top-left navigation)
3. **Extract** fields:
   - Background
   - Medications
   - Problem List
   - Investigation Summary
4. **Click** "Appointment Book" button to return
5. **Continue** to next patient

### 3. Field Extraction
```javascript
const extractedData = {
  patientName: "Test Test",
  patientId: "14524", // From (14524)
  background: extractField("Background"),
  medications: extractField("Medications"),
  problemList: extractField("Problem List"),
  investigationSummary: extractField("Investigation Summary")
};
```

## Implementation Details

### Pattern Validation
- **Primary**: Checks for numeric ID in parentheses
- **Fallback**: Supports legacy DOB patterns for compatibility
- **Logging**: Clear indication of which pattern was detected

### Error Handling
- Detailed error messages specify expected format
- Lists available patients when pattern match fails
- Includes both text content and aria-label in diagnostics

### Search Logic
- **Exact match**: Looks for complete "Name (ID)" pattern
- **Partial match**: Validates both name and ID components
- **Improved logging**: Shows search criteria and match results

## Testing Examples

The system is now configured to handle:
- ✅ `"Test Test (14524)"`
- ✅ `"Testa Rossa (16238)"`
- ✅ Legacy patterns for backward compatibility

## Migration Notes

- Existing legacy patterns continue to work
- New ID-based patterns take priority
- `fileNumber` field now represents the patient ID from parentheses
- Enhanced validation and error reporting for troubleshooting