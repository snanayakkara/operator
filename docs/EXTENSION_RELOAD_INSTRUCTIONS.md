# Extension Reload Instructions for AI Review Fix

## Current Issues Fixed:
1. ✅ Added missing `ai-medical-review` action handler to content script
2. ✅ Fixed LMStudioService.processWithAgent() parameter format
3. ✅ Added version logging to verify content script updates
4. ✅ Added better error handling for empty EMR data

## CRITICAL: Extension Reload Required

The content script changes will NOT take effect until the extension is properly reloaded.

### Step 1: Reload Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Find "Operator Chrome Extension" extension
3. Click the **"Reload"** button (refresh icon) for this extension
4. **Wait 3-5 seconds** for the reload to complete

### Step 2: Verify Content Script Version
1. Navigate to any Xestro EMR page (`https://my.xestro.com/`)
2. Open Chrome DevTools (F12)
3. Check the Console tab for these log messages:
   ```
   📝 Content Script Version: 2.6.0-ai-review-fix-2
   ⏰ Load Time: [timestamp]
   ```
4. **If you see an older version or no version logs**: Repeat Step 1

### Step 3: Test AI Review with Sample Data
1. Navigate to a Xestro patient page
2. Add this sample data to the EMR fields:

   **Background:**
   ```
   75-year-old male with ischaemic cardiomyopathy, LVEF 25%, on ACE inhibitor and beta-blocker. 
   Previous MI 2019. Diabetes type 2. No current heart failure symptoms.
   ```

   **Investigation Summary:**
   ```
   Echo: LVEF 25%, moderate LV dilatation
   Bloods: HbA1c 7.8%, eGFR 55, Hb 105 g/L
   Iron studies: Ferritin 45 ng/mL, TSAT 15%
   ```

   **Medications:**
   ```
   Metoprolol 50mg BD
   Perindopril 8mg daily  
   Metformin 1g BD
   Aspirin 100mg daily
   ```

3. Click the **"AI Review"** button in Quick Actions
4. Check Console for debugging logs:
   ```
   📝 Content script version: 2.6.0-ai-review-fix-2
   📋 Extracting EMR data from Xestro fields...
   🤖 Using model: unsloth/medgemma27b/medgemma-27b-it-q4_k_m.gguf for agent: aus-medical-review
   ```

### Expected Results:
- ✅ EMR data extraction should work (no "Unknown message type" errors)
- ✅ AI Review should identify 3-5 clinical oversights
- ✅ Should reference Australian guidelines (NHFA/CSANZ, RACGP)
- ✅ Should provide specific medication recommendations

### Troubleshooting:

#### If still getting "Unknown message type":
1. Clear browser cache and cookies for `my.xestro.com`
2. Close all Xestro tabs and reopen
3. Disable and re-enable the extension
4. Restart Chrome browser

#### If getting "Unknown action":
1. Check Console for content script version logs
2. If version is still old, repeat reload process
3. Try disabling/enabling extension instead of just reloading

#### If LLM gives generic response:
1. Verify medgemma-27b model is loaded in LMStudio
2. Check that clinical data is not empty
3. Restart LMStudio if needed

## Debug Information:
When testing, the Console should show:
```
📝 Content Script Version: 2.6.0-ai-review-fix-2
📋 Extracting EMR data from Xestro fields...
✅ Found XestroBox for "Background"
✅ Found textarea content for "Background": 123 chars
🤖 Using model: unsloth/medgemma27b/medgemma-27b-it-q4_k_m.gguf for agent: aus-medical-review
⏱️ Agent processing took: [time]ms
```

If you see this debug output, the AI Review should be working correctly!