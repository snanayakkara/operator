# Updated AI Review Testing Instructions

## Current Status Analysis:
From the logs, I can see:
1. ✅ Content script action handler is working (no more "Unknown action")
2. ⚠️ EXTRACT_EMR_DATA still failing with "Unknown message type"
3. 📍 Testing on Dashboard page instead of patient page

## CRITICAL: Test on Correct Page Type

### Issue: Dashboard vs Patient Page
The logs show you're testing on:
```
https://my.xestro.com/?Dashboard=
```

This is the **Dashboard page** which doesn't contain clinical data fields. AI Review needs to be tested on an actual **Patient page** that has Background, Investigations, and Medications fields.

### Step 1: Navigate to Patient Page
1. In Xestro, click on a patient from your patient list
2. Navigate to the patient's clinical record page
3. Look for sections like:
   - **Background** (patient history)
   - **Investigation Summary** (test results) 
   - **Medications** (current medications)
4. The URL should look like:
   ```
   https://my.xestro.com/[patient-specific-path]
   ```
   (NOT the dashboard URL)

### Step 2: Force Extension Cache Clear
Even though the extension was reloaded, the content script may still be cached:

1. **Clear Browser Cache**:
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "All time" and check "Cached images and files"
   - Click "Clear data"

2. **Disable/Enable Extension**:
   - Go to `chrome://extensions/`
   - Toggle the extension OFF, wait 3 seconds
   - Toggle the extension ON
   - Wait for it to initialize

3. **Restart Chrome** (if above doesn't work)

### Step 3: Verify Updated Content Script
Navigate to the patient page and check Console for these logs:
```
📝 Content Script Version: 2.6.0-ai-review-fix-3
🔧 EXTRACT_EMR_DATA handler: ENABLED
🔧 AI Review support: ENABLED
```

If you still see older version or missing logs, the cache clear didn't work.

### Step 4: Test EMR Field Detection
On the patient page, check Console for:
```
📋 Found XestroBox elements: [number > 0]
📋 Current page type: PATIENT_PAGE
```

If you see:
```
📋 Found XestroBox elements: 0
📋 Current page type: DASHBOARD
```
You're still on the wrong page type.

### Step 5: Test AI Review with Sample Data
Once on a patient page with XestroBox elements:

1. **Add sample data** to the clinical fields:

   **Background Field:**
   ```
   75-year-old male with ischaemic cardiomyopathy, LVEF 25%, on ACE inhibitor and beta-blocker. Previous MI 2019. Diabetes type 2.
   ```

   **Investigation Summary Field:**
   ```
   Echo: LVEF 25%, moderate LV dilatation. Bloods: HbA1c 7.8%, eGFR 55, Hb 105 g/L. Iron studies: Ferritin 45 ng/mL, TSAT 15%
   ```

   **Medications Field:**
   ```
   Metoprolol 50mg BD, Perindopril 8mg daily, Metformin 1g BD, Aspirin 100mg daily
   ```

2. **Click "AI Review" button**

3. **Check Console** for:
   ```
   📋 Received EXTRACT_EMR_DATA request - HANDLER FOUND!
   📋 EMR extraction completed successfully: {background: "...", investigations: "...", medications: "..."}
   🤖 Using model: unsloth/medgemma27b/medgemma-27b-it-q4_k_m.gguf for agent: aus-medical-review
   ```

## Expected Success Logs:
```
📝 Content Script Version: 2.6.0-ai-review-fix-3
📋 Found XestroBox elements: 15
📋 Current page type: PATIENT_PAGE
📋 Received EXTRACT_EMR_DATA request - HANDLER FOUND!
📋 EMR extraction completed successfully
🤖 Processing with Australian Medical Review Agent
⏱️ Agent processing took: [time]ms
```

## Troubleshooting:

### If still getting "Unknown message type":
1. The browser cache hasn't cleared properly
2. Try incognito mode to test
3. Check if multiple versions of the extension are installed

### If "Found XestroBox elements: 0":
1. You're on the dashboard or wrong page type
2. Navigate to an actual patient record page
3. Look for pages with clinical data entry fields

### If EMR fields are empty after extraction:
1. Make sure you've entered data in the correct fields
2. Fields may have different names in Xestro
3. Check the field detection logs for specific field names

The key is testing on the **correct page type** with actual clinical data fields!