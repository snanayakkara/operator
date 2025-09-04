# System Notifications Testing Guide

## 🔔 **Notification Implementation Complete**

Operator now shows native macOS system notifications when any medical agent completes processing, especially useful for the long-running AI Review (3+ minutes).

## 🎯 **Notification Scenarios**

### **1. Recording Agents (TAVI, PCI, Quick Letter, etc.)**
- **Trigger**: After voice recording + AI processing completes
- **Example**: "🫀 TAVI Report Complete • Generated in 8.3s • Hemodynamics & valve assessment complete"

### **2. AI Medical Review** 
- **Trigger**: After 3-minute clinical analysis completes
- **Example**: "🔍 AI Medical Review Complete • Generated in 3m 12s • 4 findings identified"

### **3. Batch AI Review**
- **Trigger**: After processing multiple patients
- **Example**: "📋 Batch AI Review Complete • Generated in 12m 45s • 8/10 patients processed"

### **4. Reprocessing**
- **Trigger**: When manually reprocessing transcription with different agent
- **Example**: "💌 Medical Letter Complete • Generated in 4.1s • Reprocessed successfully"

### **5. Error Notifications**
- **Trigger**: When any processing fails
- **Example**: "❌ AI Medical Review Failed • Processing failed after 2m 15s. Please try again."

## 🧪 **Testing Instructions**

### **Quick Test (Any Agent):**
1. **Record a short medical dictation** (TAVI, PCI, etc.)
2. **Switch to another app** (Finder, Terminal, etc.) while processing
3. **Wait for completion** (5-15 seconds for most agents)
4. **✅ Expected**: Native macOS notification appears with agent-specific message

### **Long Process Test (AI Review):**
1. **Add clinical data** to EMR fields (Background, Investigations, Medications)
2. **Click "AI Review"** button 
3. **Switch to another app** during 3-minute processing
4. **✅ Expected**: Notification appears after ~3 minutes with findings count

### **Notification Behavior:**

**🟢 Shows notifications when:**
- Processing takes >30 seconds (always)
- Any agent completes and Chrome is not focused
- Any processing fails

**🔕 Suppresses notifications when:**
- Chrome browser is currently focused (user is actively watching)
- Processing takes <30 seconds AND Chrome is focused

## 🔧 **Notification Settings**

The notification behavior is controlled by `NotificationService.ts`:

```typescript
// Current configuration (can be modified):
enabledForAllAgents: true,        // Show for all agents
alwaysEnabledForLongProcesses: true,  // Always show for >30s processes
onlyWhenUnfocused: true          // Only when Chrome isn't focused
```

## 📱 **macOS System Requirements**

- **Chrome Extension Notifications**: Enabled by default
- **System Preferences**: Notifications for Chrome should be allowed
- **Do Not Disturb**: May suppress notifications depending on settings

## 🎨 **Notification Examples**

```
🫀 TAVI Report Complete
Generated in 12.4s • Hemodynamics & valve assessment complete

🔍 AI Medical Review Complete  
Generated in 3m 7s • 5 findings identified

📊 Investigation Summary Complete
Generated in 5.2s • Summary formatted for EMR

💌 Medical Letter Complete
Generated in 4.1s • Ready to copy or insert

❌ AI Medical Review Failed
Processing failed after 45.2s. Please try again.
```

## 🧪 **Validation Checklist**

- [ ] **Short processes** (5-15s): Notification when Chrome unfocused
- [ ] **AI Review** (3+ min): Always shows notification with findings count
- [ ] **Batch Review**: Shows notification with patient count
- [ ] **Error scenarios**: Shows error notification with details
- [ ] **Native macOS appearance**: Uses system notification style
- [ ] **Click behavior**: Focuses back to Chrome (if implemented)

The notification system enhances the user experience by allowing multitasking during long AI processes while maintaining awareness of completion status.