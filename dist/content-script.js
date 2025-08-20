var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const CONTENT_SCRIPT_VERSION = "2.6.0-ai-review-fix-5";
console.log("🏥 Reflow Medical Assistant Content Script Loading...", window.location.href);
console.log("📝 Content Script Version:", CONTENT_SCRIPT_VERSION);
console.log("⏰ Load Time:", (/* @__PURE__ */ new Date()).toISOString());
console.log("🔧 EXTRACT_EMR_DATA handler: ENABLED");
console.log("🔧 AI Review support: ENABLED");
if (window.reflowContentScriptLoaded) {
  console.log("🏥 Content script already loaded, skipping...");
  console.log("📝 Previously loaded version:", window.reflowContentScriptVersion || "unknown");
} else {
  window.reflowContentScriptLoaded = true;
  window.reflowContentScriptVersion = CONTENT_SCRIPT_VERSION;
  class ContentScriptHandler {
    constructor() {
      __publicField(this, "isInitialized", false);
      __publicField(this, "emrSystem", null);
      __publicField(this, "currentTabId", null);
      this.initialize();
    }
    async initialize() {
      if (this.isInitialized) return;
      try {
        this.emrSystem = this.detectEMRSystem();
        if (this.emrSystem) {
          console.log(`🏥 Reflow Medical Assistant: Detected ${this.emrSystem.name}`);
          this.setupEventListeners();
          this.isInitialized = true;
          console.log("🏥 Content script initialized successfully");
        } else {
          console.log("🏥 EMR system not detected on this page:", window.location.href);
        }
      } catch (error) {
        console.error("Content script initialization failed:", error);
      }
    }
    detectEMRSystem() {
      const hostname = window.location.hostname;
      if (hostname.includes("my.xestro.com")) {
        return {
          name: "Xestro",
          baseUrl: "https://my.xestro.com",
          fields: {
            investigationSummary: {
              selector: 'textarea[data-field="investigation-summary"], #investigation-summary, .investigation-summary textarea',
              type: "textarea",
              label: "Investigation Summary",
              waitFor: '.XestroBoxTitle:contains("Investigation Summary")'
            },
            background: {
              selector: 'textarea[data-field="background"], #background, .background textarea',
              type: "textarea",
              label: "Background",
              waitFor: '.XestroBoxTitle:contains("Background")'
            },
            medications: {
              selector: 'textarea[data-field="medications"], #medications, .medications textarea',
              type: "textarea",
              label: "Medications"
            },
            notes: {
              selector: 'textarea[data-field="notes"], #notes, .notes textarea, #AddNoteArea',
              type: "textarea",
              label: "Notes"
            }
          },
          selectors: {
            patientRecord: ".patient-record, .record-view, #patient-view",
            noteArea: '#AddNoteArea, .note-area, textarea[placeholder*="note"]',
            quickLetter: '.quick-letter, [data-action="quick-letter"]',
            taskButton: '.task-button, [data-action="create-task"]'
          }
        };
      }
      return null;
    }
    setupEventListeners() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true;
      });
      document.addEventListener("keydown", (event) => {
        this.handleKeyboardShortcut(event);
      });
      const observer = new MutationObserver((mutations) => {
        this.handleDOMChanges(mutations);
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "id"]
      });
    }
    async handleMessage(message, sender, sendResponse) {
      console.log("🏥 Content script received message:", message);
      console.log("📝 Content script version:", CONTENT_SCRIPT_VERSION, "at", (/* @__PURE__ */ new Date()).toISOString());
      console.log("🔧 Available message types: EXTRACT_EMR_DATA, EXECUTE_ACTION, SHOW_SCREENSHOT_INSTRUCTIONS, START_CLIPBOARD_MONITORING");
      try {
        const { type, action, data } = message;
        console.log("📨 Processing message type:", type, "action:", action);
        if (type === "PING") {
          sendResponse({ success: true, ready: true, version: CONTENT_SCRIPT_VERSION });
          return;
        }
        if (type === "PAGE_STATUS_CHECK") {
          try {
            const pageStatus = this.getPageStatus();
            sendResponse({ success: true, status: pageStatus });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : "Page status check failed" });
          }
          return;
        }
        if (type === "CHECK_XESTRO_BOXES") {
          try {
            const xestroBoxCount = document.querySelectorAll(".XestroBox").length;
            const hasPatientData = xestroBoxCount > 0;
            console.log(`📋 XestroBox check: found ${xestroBoxCount} boxes, hasPatientData: ${hasPatientData}`);
            sendResponse({
              success: true,
              found: hasPatientData,
              count: xestroBoxCount,
              url: window.location.href
            });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : "XestroBox check failed" });
          }
          return;
        }
        if (type === "SHOW_SCREENSHOT_INSTRUCTIONS") {
          await this.showScreenshotInstructions(data);
          sendResponse({ success: true });
          return;
        }
        if (type === "CLOSE_SCREENSHOT_INSTRUCTIONS") {
          this.closeScreenshotModal();
          sendResponse({ success: true });
          return;
        }
        if (type === "START_CLIPBOARD_MONITORING") {
          console.log("📸 Content script received START_CLIPBOARD_MONITORING request");
          this.startClipboardMonitoring(data.timeoutMs || 3e4);
          sendResponse({ success: true });
          return;
        }
        if (type === "EXTRACT_EMR_DATA") {
          console.log("📋 Received EXTRACT_EMR_DATA request - HANDLER FOUND!");
          console.log("📋 Request data:", data);
          console.log("📋 Extracting fields:", data?.fields || ["background", "investigations", "medications"]);
          try {
            const extractedData = await this.extractEMRData(data?.fields || ["background", "investigations", "medications"]);
            console.log("📋 EMR extraction completed successfully:", extractedData);
            sendResponse({ success: true, data: extractedData });
          } catch (error) {
            console.error("📋 EMR extraction failed:", error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : "EMR extraction failed" });
          }
          return;
        }
        if (type === "EXTRACT_PATIENT_DATA") {
          console.log("👤 Received EXTRACT_PATIENT_DATA request");
          try {
            const patientData = this.extractPatientData();
            console.log("👤 Patient data extraction completed:", patientData);
            sendResponse({ success: true, data: patientData });
          } catch (error) {
            console.error("👤 Patient data extraction failed:", error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : "Patient data extraction failed" });
          }
          return;
        }
        if (type !== "EXECUTE_ACTION") {
          console.log("❌ Unknown message type:", type);
          sendResponse({ error: "Unknown message type" });
          return;
        }
        console.log(`🏥 Executing action: ${action}`);
        switch (action) {
          case "insertText":
            await this.insertText(data.text, data.fieldType);
            sendResponse({ success: true });
            break;
          case "openField":
            await this.openFieldByType(data.fieldType);
            sendResponse({ success: true });
            break;
          case "investigation-summary":
            if (data?.extractOnly) {
              const content = await this.extractFieldContent("Investigation Summary");
              sendResponse({ success: true, data: content });
            } else {
              await this.openInvestigationSummary();
              if (data?.content) {
                await this.wait(500);
                await this.insertFormattedSummary(data.content);
              }
              sendResponse({ success: true });
            }
            break;
          case "background":
            if (data?.extractOnly) {
              const content = await this.extractFieldContent("Background");
              sendResponse({ success: true, data: content });
            } else {
              await this.openBackground();
              sendResponse({ success: true });
            }
            break;
          case "medications":
            if (data?.extractOnly) {
              const content = await this.extractFieldContent("Medications (Problem List for Phil)") || await this.extractFieldContent("Medications");
              sendResponse({ success: true, data: content });
            } else {
              await this.openMedications();
              sendResponse({ success: true });
            }
            break;
          case "social-history":
            await this.openSocialHistory();
            sendResponse({ success: true });
            break;
          case "extract-patient-data":
            const patientData = this.extractPatientData();
            if (patientData) {
              sendResponse({ success: true, data: patientData });
            } else {
              sendResponse({ success: false, error: "No patient data found" });
            }
            break;
          case "quick-letter":
            await this.openQuickLetter();
            sendResponse({ success: true });
            break;
          case "create-task":
            await this.createTask();
            sendResponse({ success: true });
            break;
          case "appointment-wrap-up":
            await this.appointmentWrapUp(data);
            sendResponse({ success: true });
            break;
          case "profile-photo":
            await this.handleProfilePhoto(data);
            sendResponse({ success: true });
            break;
          case "save":
            await this.saveNote();
            sendResponse({ success: true });
            break;
          case "ai-medical-review":
            console.warn("⚠️ AI medical review should be processed entirely in side panel");
            sendResponse({ success: true, message: "AI medical review should use side panel processing only" });
            break;
          case "extract-calendar-patients":
            console.log("📅 Received extract-calendar-patients request");
            try {
              const patientData2 = await this.extractCalendarPatients();
              console.log("📅 Calendar patient extraction completed:", patientData2);
              sendResponse({ success: true, data: patientData2 });
            } catch (error) {
              console.error("📅 Calendar patient extraction failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Calendar extraction failed" });
            }
            break;
          case "navigate-to-patient":
            console.log("🧭 Received navigate-to-patient request");
            try {
              await this.navigateToPatient(data.fileNumber, data.patientName);
              sendResponse({ success: true });
            } catch (error) {
              console.error("🧭 Patient navigation failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Navigation failed" });
            }
            break;
          case "activate-patient-by-element":
            console.log("🖱️ Received activate-patient-by-element request");
            try {
              await this.activatePatientByElement(data.patientSelector || data.patientIndex);
              sendResponse({ success: true });
            } catch (error) {
              console.error("🖱️ Patient activation failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Patient activation failed" });
            }
            break;
          case "double-click-patient":
            console.log("👆 SWITCH CASE HIT: double-click-patient");
            console.log("👆 Received double-click-patient request with data:", data);
            console.log("👆 About to call this.doubleClickPatient method...");
            try {
              await this.doubleClickPatient(data.patientName, data.patientId);
              console.log("👆 doubleClickPatient method completed successfully");
              sendResponse({ success: true });
            } catch (error) {
              console.error("👆 Double-click patient failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Double-click patient failed" });
            }
            break;
          case "navigate-to-patient-record":
            console.log("🏥 SWITCH CASE HIT: navigate-to-patient-record");
            console.log("🏥 Received navigate-to-patient-record request");
            console.log("🏥 About to call this.navigateToPatientRecord method...");
            try {
              await this.navigateToPatientRecord();
              console.log("🏥 navigateToPatientRecord method completed successfully");
              sendResponse({ success: true });
            } catch (error) {
              console.error("🏥 Navigate to patient record failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Navigate to patient record failed" });
            }
            break;
          case "navigate-to-appointment-book":
            console.log("📅 Received navigate-to-appointment-book request");
            try {
              await this.navigateToAppointmentBook();
              sendResponse({ success: true });
            } catch (error) {
              console.error("📅 Navigate to appointment book failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Navigate to appointment book failed" });
            }
            break;
          case "extract-patient-fields":
            console.log("📋 SWITCH CASE HIT: extract-patient-fields");
            console.log("📋 Received extract-patient-fields request");
            console.log("📋 About to call extractPatientFields method...");
            try {
              const fieldsData = await this.extractPatientFields();
              console.log("📋 extractPatientFields completed, sending response:", fieldsData);
              sendResponse({ success: true, data: fieldsData });
            } catch (error) {
              console.error("📋 Extract patient fields failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : "Extract patient fields failed" });
            }
            break;
          default:
            console.log(`❌ DEFAULT CASE HIT: Unknown action "${action}"`);
            console.log(`❌ Available SPA actions: double-click-patient, navigate-to-patient-record, extract-patient-fields`);
            sendResponse({ error: "Unknown action" });
        }
      } catch (error) {
        console.error("Content script message handling error:", error);
        sendResponse({ error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
    handleKeyboardShortcut(event) {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      if (!isCtrlOrCmd || !event.shiftKey) return;
      switch (event.key.toLowerCase()) {
        case "i":
          event.preventDefault();
          this.openInvestigationSummary();
          break;
        case "b":
          event.preventDefault();
          this.openBackground();
          break;
        case "m":
          event.preventDefault();
          this.openMedications();
          break;
        case "s":
          event.preventDefault();
          this.openSocialHistory();
          break;
        case "l":
          event.preventDefault();
          this.openQuickLetter();
          break;
        case "t":
          event.preventDefault();
          this.createTask();
          break;
      }
    }
    handleDOMChanges(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.matches?.(".note-area, textarea, .field-container")) {
                this.updateFieldMappings();
              }
            }
          });
        }
      }
    }
    async insertText(text, fieldType) {
      let targetElement = null;
      if (fieldType && this.emrSystem?.fields[fieldType]) {
        targetElement = await this.findElement(this.emrSystem.fields[fieldType].selector);
      } else {
        targetElement = document.activeElement;
        if (!this.isTextInputElement(targetElement)) {
          targetElement = await this.findActiveNoteArea();
        }
      }
      if (!targetElement) {
        throw new Error("No suitable text input found");
      }
      await this.insertTextIntoElement(targetElement, text);
    }
    async openFieldByType(fieldType) {
      if (!this.emrSystem?.fields[fieldType]) {
        throw new Error(`Unknown field type: ${fieldType}`);
      }
      const field = this.emrSystem.fields[fieldType];
      const element = await this.findElement(field.selector, 5e3);
      if (element) {
        this.focusElement(element);
      } else {
        throw new Error(`Field ${fieldType} not found`);
      }
    }
    async insertTextIntoElement(element, text) {
      if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        const input = element;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentValue = input.value;
        const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
        input.value = newValue;
        const newCursorPos = start + text.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (element.contentEditable === "true") {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          element.textContent += text;
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
      element.focus();
    }
    async insertFormattedSummary(formattedContent) {
      console.log("📝 Inserting formatted investigation summary:", formattedContent);
      try {
        const noteArea = await this.findInvestigationSummaryTextarea();
        if (!noteArea) {
          console.error("❌ No Investigation Summary textarea (AddNoteArea) found");
          return;
        }
        await this.insertTextAtEndOfField(noteArea, formattedContent);
        console.log("✅ Successfully inserted formatted investigation summary");
      } catch (error) {
        console.error("❌ Error inserting formatted summary:", error);
      }
    }
    async findInvestigationSummaryTextarea() {
      console.log("🔍 Looking for Investigation Summary textarea...");
      const selectors = [
        "textarea#AddNoteArea",
        "textarea.AddNoteArea",
        'textarea[placeholder*="Add a note"]',
        "textarea.form-control.AddNoteArea"
      ];
      for (const selector of selectors) {
        console.log(`🔍 Trying selector: ${selector}`);
        const element = await this.findElement(selector, 2e3);
        if (element && element.tagName === "TEXTAREA") {
          console.log(`✅ Found Investigation Summary textarea with selector: ${selector}`);
          return element;
        }
      }
      console.warn("⚠️ Could not find Investigation Summary textarea with any selector");
      return null;
    }
    async insertTextAtEndOfField(element, text) {
      if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        const input = element;
        const currentValue = input.value;
        let textToInsert = text;
        if (currentValue.trim().length > 0) {
          textToInsert = "\n" + text;
        }
        const endPosition = currentValue.length;
        input.setSelectionRange(endPosition, endPosition);
        const newValue = currentValue + textToInsert;
        input.value = newValue;
        const newCursorPos = newValue.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
        if (element.tagName === "TEXTAREA") {
          input.scrollTop = input.scrollHeight;
        }
        console.log(`📝 Inserted text at end of field. Field now has ${newValue.length} characters.`);
      } else if (element.contentEditable === "true") {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        const currentContent = element.textContent || "";
        let textToInsert = text;
        if (currentContent.trim().length > 0) {
          textToInsert = "\n" + text;
        }
        range.insertNode(document.createTextNode(textToInsert));
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.focus();
      }
      console.log("✅ Text inserted at end of field and field kept focused for review");
    }
    async openInvestigationSummary() {
      console.log("📝 Opening Investigation Summary section in Xestro");
      await this.openCustomField("Investigation Summary");
    }
    async openCustomFieldWithTemplate(fieldName, templateFn) {
      console.log(`📝 Opening ${fieldName} with template in note area`);
      const noteArea = await this.findNoteArea();
      if (!noteArea) {
        console.error("❌ No suitable note area found on page");
        throw new Error("Note area not found");
      }
      noteArea.focus();
      const templateContent = templateFn();
      const isContentEditable = noteArea.contentEditable === "true";
      const currentValue = isContentEditable ? noteArea.innerText || "" : noteArea.value || "";
      const firstLine = templateContent.split("\n")[0];
      if (!currentValue.includes(firstLine)) {
        const newValue = `${templateContent}
${currentValue}`;
        if (isContentEditable) {
          noteArea.innerText = newValue;
          noteArea.dispatchEvent(new Event("input", { bubbles: true }));
          noteArea.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          const textarea = noteArea;
          textarea.value = newValue;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      noteArea.style.boxShadow = "0 0 5px 2px rgba(33, 150, 243, 0.5)";
      setTimeout(() => {
        noteArea.style.boxShadow = "";
      }, 1e3);
      noteArea.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const saveButton = document.querySelector("#patientNotesSave");
        if (saveButton && confirm("Save the updated notes?")) {
          saveButton.click();
          console.log("💾 Auto-saved via Xestro save button");
        }
      }, 1e3);
      console.log("✅ Note area ready for input with template (Xestro method)");
    }
    async findNoteArea() {
      console.log("🔍 Looking for Xestro note input areas...");
      const xestroSelectors = [
        "#patientNotesInput",
        // Primary Xestro notes area
        "#patientNoteInput",
        // Alternative spelling
        ".patient-notes-input",
        // Class-based
        '[contenteditable="true"]'
        // Any contenteditable element
      ];
      for (const selector of xestroSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          console.log(`✅ Found Xestro note area with selector: ${selector}`);
          return element;
        }
      }
      const allContentEditable = document.querySelectorAll('[contenteditable="true"], [contenteditable]');
      console.log(`🔍 Found ${allContentEditable.length} contenteditable elements:`);
      allContentEditable.forEach((elem, index) => {
        console.log(`  ${index + 1}. ID: "${elem.id}" Class: "${elem.className}" Size: ${elem.offsetWidth}x${elem.offsetHeight}`);
      });
      const allTextareas = document.querySelectorAll("textarea");
      console.log(`🔍 Found ${allTextareas.length} textareas:`);
      allTextareas.forEach((textarea, index) => {
        console.log(`  ${index + 1}. ID: "${textarea.id}" Class: "${textarea.className}" Placeholder: "${textarea.placeholder}"`);
      });
      for (let i = 0; i < allContentEditable.length; i++) {
        const element = allContentEditable[i];
        if (element.offsetParent !== null && element.offsetWidth > 50 && element.offsetHeight > 30) {
          console.log(`✅ Found usable contenteditable at index ${i + 1}`);
          return element;
        }
      }
      for (let i = 0; i < allTextareas.length; i++) {
        const textarea = allTextareas[i];
        if (textarea.offsetParent !== null && !textarea.readOnly && !textarea.disabled && textarea.offsetWidth > 50 && textarea.offsetHeight > 30) {
          console.log(`✅ Found usable textarea at index ${i + 1}`);
          return textarea;
        }
      }
      console.log("⏳ No textarea found immediately, waiting for dynamic content...");
      return new Promise((resolve) => {
        let timeoutId;
        let observer;
        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (observer) observer.disconnect();
        };
        const checkForTextarea = () => {
          for (const selector of xestroSelectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              console.log(`✅ Found note area dynamically with selector: ${selector}`);
              cleanup();
              resolve(element);
              return;
            }
          }
          const allTextareas2 = document.querySelectorAll("textarea");
          for (let i = 0; i < allTextareas2.length; i++) {
            const textarea = allTextareas2[i];
            if (textarea.offsetParent !== null && !textarea.readOnly && !textarea.disabled && textarea.offsetWidth > 50 && textarea.offsetHeight > 30) {
              console.log(`✅ Found usable textarea dynamically at index ${i + 1}`);
              cleanup();
              resolve(textarea);
              return;
            }
          }
        };
        observer = new MutationObserver((mutations) => {
          let hasNewTextarea = false;
          mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node;
                  if (element.tagName === "TEXTAREA" || element.querySelector("textarea")) {
                    hasNewTextarea = true;
                  }
                }
              });
            }
          });
          if (hasNewTextarea) {
            checkForTextarea();
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        const intervalId = setInterval(checkForTextarea, 500);
        timeoutId = setTimeout(() => {
          cleanup();
          clearInterval(intervalId);
          console.log("❌ Timeout waiting for textarea");
          resolve(null);
        }, 1e4);
        checkForTextarea();
      });
    }
    async openCustomField(fieldName) {
      console.log(`📝 Opening ${fieldName} section in Xestro`);
      const xestroBox = await this.findAndClickXestroBox(fieldName);
      if (!xestroBox) {
        console.error(`❌ Could not find XestroBox for ${fieldName}`);
        throw new Error(`XestroBox for ${fieldName} not found`);
      }
      console.log("⏳ Waiting for AddNoteArea textarea to appear...");
      const noteArea = await this.waitForAddNoteArea();
      if (!noteArea) {
        console.error("❌ AddNoteArea textarea did not appear after clicking XestroBox");
        throw new Error("AddNoteArea textarea not found");
      }
      noteArea.focus();
      console.log(`✅ Found AddNoteArea textarea for ${fieldName}`);
      const currentValue = noteArea.value || "";
      const cursorPos = currentValue.length;
      noteArea.setSelectionRange(cursorPos, cursorPos);
      noteArea.dispatchEvent(new Event("focus", { bubbles: true }));
      noteArea.style.boxShadow = "0 0 5px 2px rgba(33, 150, 243, 0.5)";
      setTimeout(() => {
        noteArea.style.boxShadow = "";
      }, 1e3);
      noteArea.scrollIntoView({ behavior: "smooth", block: "center" });
      console.log(`✅ ${fieldName} section opened and ready for input`);
    }
    async openBackground() {
      console.log("📝 Opening Background in note area");
      await this.openCustomField("Background");
    }
    async openMedications() {
      console.log("📝 Opening Medications section in Xestro");
      await this.openCustomField("Medications (Problem List for Phil)");
    }
    async openSocialHistory() {
      console.log("📝 Opening Social & Family History section in Xestro");
      await this.openCustomField("Social & Family History");
    }
    async openQuickLetter() {
      const quickLetterButton = await this.findElement(
        'button:contains("Quick Letter"), [data-action="quick-letter"], .quick-letter-btn'
      );
      if (quickLetterButton) {
        quickLetterButton.click();
      } else {
        const notesArea = await this.findActiveNoteArea();
        if (notesArea) {
          this.focusElement(notesArea);
        }
      }
    }
    async createTask() {
      const taskButton = await this.findElement(
        'button:contains("Task"), [data-action="create-task"], .task-btn, .create-task'
      );
      if (taskButton) {
        taskButton.click();
      } else {
        console.warn("Task creation button not found");
      }
    }
    async appointmentWrapUp(data) {
      if (this.emrSystem?.name === "Xestro") {
        await this.xestroAppointmentWrapUp(data);
      } else {
        console.warn("Appointment wrap-up not implemented for this EMR system");
      }
    }
    async xestroAppointmentWrapUp(data) {
      const wrapUpButton = await this.findElement(
        'button.btn.btn-primary.appt-wrap-up-btn, [data-action="appt-wrap-up"]'
      );
      if (wrapUpButton) {
        wrapUpButton.click();
        await this.wait(1500);
        if (data.preset) {
          await this.populateAppointmentPreset(data.preset);
        }
      }
    }
    // Extract patient data from Xestro EMR XestroBoxContent element
    extractPatientData() {
      console.log("👤 Extracting patient data from XestroBoxContent");
      try {
        const xestroBox = document.querySelector(".XestroBoxContent");
        if (!xestroBox) {
          console.log("❌ XestroBoxContent not found");
          return null;
        }
        console.log("✅ Found XestroBoxContent:", xestroBox);
        const patientData = {
          extractedAt: Date.now()
        };
        const contentDiv = xestroBox.querySelector("div");
        if (!contentDiv) {
          console.log("❌ No content div found in XestroBoxContent");
          return null;
        }
        const nameNode = contentDiv.firstChild;
        if (nameNode && nameNode.nodeType === Node.TEXT_NODE) {
          patientData.name = nameNode.textContent?.trim() || "";
          console.log("📝 Extracted name:", patientData.name);
        }
        const pullRightDiv = contentDiv.querySelector(".pull-right");
        if (pullRightDiv) {
          const boldElement = pullRightDiv.querySelector("b");
          if (boldElement && boldElement.textContent) {
            const idMatch = boldElement.textContent.match(/ID:\s*(\d+)/);
            if (idMatch) {
              patientData.id = idMatch[1];
              console.log("📝 Extracted ID:", patientData.id);
            }
          }
          const textContent = pullRightDiv.textContent || "";
          const dobMatch = textContent.match(/(\d{2}\/\d{2}\/\d{4})\s*\((\d+)\)/);
          if (dobMatch) {
            patientData.dob = dobMatch[1];
            patientData.age = dobMatch[2];
            console.log("📝 Extracted DOB:", patientData.dob, "Age:", patientData.age);
          }
        }
        const dataAllowDivs = contentDiv.querySelectorAll('div[data-allow="1"]');
        dataAllowDivs.forEach((div, index) => {
          const text = div.textContent?.trim() || "";
          if (text) {
            if (index === 0 && /^\d{4}\s\d{3}\s\d{3}$/.test(text)) {
              patientData.phone = text;
              console.log("📝 Extracted phone:", patientData.phone);
            } else if (index === 1 && text.includes("@")) {
              patientData.email = text;
              console.log("📝 Extracted email:", patientData.email);
            } else if (text.includes("VIC") || text.includes("NSW") || text.includes("QLD") || text.includes("SA") || text.includes("WA") || text.includes("TAS") || text.includes("ACT") || text.includes("NT")) {
              patientData.address = text;
              console.log("📝 Extracted address:", patientData.address);
            }
          }
        });
        const spans = contentDiv.querySelectorAll("span");
        spans.forEach((span) => {
          const text = span.textContent?.trim() || "";
          if (text.includes("Medicare:")) {
            patientData.medicare = text.replace("Medicare:", "").trim();
            console.log("📝 Extracted Medicare:", patientData.medicare);
          } else if (text.includes("Private") && text.includes("Limited:")) {
            patientData.insurance = text;
            console.log("📝 Extracted insurance:", patientData.insurance);
          }
        });
        console.log("✅ Successfully extracted patient data:", patientData);
        return patientData;
      } catch (error) {
        console.error("❌ Error extracting patient data:", error);
        return null;
      }
    }
    async populateAppointmentPreset(preset) {
      try {
        await this.wait(500);
        if (preset.itemCode) {
          const itemCodesInput = await this.findElement(
            "input.item-codes-autocomplete, input.ui-autocomplete-input"
          );
          if (itemCodesInput) {
            itemCodesInput.value = "";
            itemCodesInput.value = preset.itemCode;
            itemCodesInput.dispatchEvent(new Event("input", { bubbles: true }));
            itemCodesInput.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`✅ Populated Item Code: ${preset.itemCode}`);
          } else {
            console.warn("⚠️ Item codes input field not found");
          }
        }
        if (preset.notes) {
          const notesTextarea = await this.findElement("textarea.Notes, textarea.form-control");
          if (notesTextarea) {
            notesTextarea.value = "";
            notesTextarea.value = preset.notes;
            notesTextarea.dispatchEvent(new Event("input", { bubbles: true }));
            notesTextarea.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`✅ Populated Appointment Notes: ${preset.notes}`);
          } else {
            console.warn("⚠️ Appointment notes textarea not found");
          }
        }
        console.log(`✅ Successfully applied preset: ${preset.displayName}`);
      } catch (error) {
        console.error("❌ Error populating appointment preset:", error);
      }
    }
    async ensurePatientRecordView() {
      if (!this.emrSystem) return;
      const patientRecord = await this.findElement(this.emrSystem.selectors.patientRecord, 1e3);
      if (!patientRecord) {
        const recordButton = await this.findElement(
          'button:contains("Record"), [data-view="record"], .record-view-btn'
        );
        if (recordButton) {
          recordButton.click();
          await this.wait(2e3);
        }
      }
    }
    /**
     * Ensure patient record is opened for Batch AI Review data extraction
     * Specifically looks for and clicks the "Patient Record" button
     */
    async ensurePatientRecordOpened() {
      console.log("🔍 Ensuring patient record is opened...");
      const initialXestroBoxes = document.querySelectorAll(".XestroBox");
      console.log(`🔍 Initial XestroBox count: ${initialXestroBoxes.length}`);
      let recordButton = await this.findElement("button.PatientDetailsButton");
      if (!recordButton) {
        recordButton = await this.findButtonByText("Patient Record");
      }
      if (!recordButton) {
        recordButton = await this.findButtonByText("Patient");
      }
      if (!recordButton) {
        const defaultButtons = document.querySelectorAll("button.btn-default");
        for (const button of defaultButtons) {
          if (button.textContent?.includes("Patient")) {
            recordButton = button;
            break;
          }
        }
      }
      if (recordButton) {
        console.log("🔍 Found Patient Record button, clicking...");
        recordButton.click();
        await this.wait(3e3);
        const finalXestroBoxes = document.querySelectorAll(".XestroBox");
        console.log(`🔍 Final XestroBox count: ${finalXestroBoxes.length}`);
        if (finalXestroBoxes.length === 0) {
          console.warn("⚠️ Patient record button clicked but no clinical content found");
        } else if (finalXestroBoxes.length > initialXestroBoxes.length) {
          console.log("✅ Patient record opened successfully - clinical content detected");
        } else {
          console.log("ℹ️ Patient record may have already been open");
        }
      } else {
        console.warn("⚠️ Patient Record button not found - proceeding with extraction");
        console.log("💡 Available buttons:", Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()).filter(Boolean));
      }
    }
    async findActiveNoteArea() {
      if (!this.emrSystem) return null;
      return await this.findElement(this.emrSystem.selectors.noteArea);
    }
    async findElement(selector, timeout = 5e3) {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (selector.includes(":contains(")) {
          const match = selector.match(/(.+):contains\("(.+)"\)/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = document.querySelectorAll(baseSelector);
            for (const element of elements) {
              if (element.textContent?.includes(text)) {
                return element;
              }
            }
          }
        } else {
          const element = document.querySelector(selector);
          if (element) {
            return element;
          }
        }
        await this.wait(100);
      }
      return null;
    }
    focusElement(element) {
      element.focus();
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const originalStyle = element.style.cssText;
      element.style.cssText += "border: 2px solid #3b82f6 !important; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5) !important;";
      setTimeout(() => {
        element.style.cssText = originalStyle;
      }, 2e3);
    }
    isTextInputElement(element) {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      return tagName === "textarea" || tagName === "input" && ["text", "email", "search", "url"].includes(element.type) || element.contentEditable === "true";
    }
    updateFieldMappings() {
    }
    async findAndClickXestroBox(fieldName) {
      console.log(`🔍 Looking for XestroBox with title "${fieldName}"`);
      const xestroBoxes = document.querySelectorAll(".XestroBox");
      console.log(`Found ${xestroBoxes.length} XestroBox elements`);
      for (let i = 0; i < xestroBoxes.length; i++) {
        const box = xestroBoxes[i];
        const titleElement = box.querySelector(".XestroBoxTitle");
        if (titleElement && titleElement.textContent?.includes(fieldName)) {
          console.log(`✅ Found XestroBox for "${fieldName}" at index ${i}`);
          console.log(`🖱️ Clicking XestroBox title: "${titleElement.textContent}"`);
          titleElement.click();
          await this.wait(500);
          return box;
        }
      }
      console.log(`❌ No XestroBox found with title containing "${fieldName}"`);
      xestroBoxes.forEach((box, index) => {
        const titleElement = box.querySelector(".XestroBoxTitle");
        console.log(`  ${index + 1}. XestroBoxTitle: "${titleElement?.textContent || "No title"}"`);
      });
      return null;
    }
    async waitForAddNoteArea() {
      const maxWaitTime = 5e3;
      const checkInterval = 100;
      const maxAttempts = maxWaitTime / checkInterval;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const addNoteArea = document.getElementById("AddNoteArea");
        if (addNoteArea && addNoteArea.offsetParent !== null) {
          console.log(`✅ AddNoteArea found after ${attempt * checkInterval}ms`);
          return addNoteArea;
        }
        if (attempt % 10 === 0) {
          console.log(`⏳ Still waiting for AddNoteArea... (${attempt * checkInterval}ms)`);
        }
        await this.wait(checkInterval);
      }
      console.log(`❌ AddNoteArea not found after ${maxWaitTime}ms`);
      return null;
    }
    async wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get current page status for batch AI review readiness
     */
    getPageStatus() {
      const url = window.location.href;
      const title = document.title;
      const readyState = document.readyState;
      const hasXestroBoxes = document.querySelectorAll(".XestroBox").length > 0;
      const hasPatientNotes = document.querySelector("#patientNotesInput, #AddNoteArea") !== null;
      const hasCalendarElements = document.querySelectorAll(".appointmentBook, .one-appt-book").length > 0;
      const hasDateInput = document.querySelector("input.date.form-control") !== null;
      let pageType = "unknown";
      if (hasCalendarElements && hasDateInput) {
        pageType = "calendar";
      } else if (hasXestroBoxes && hasPatientNotes) {
        pageType = "patient";
      } else if (url.includes("Dashboard")) {
        pageType = "dashboard";
      }
      const isReady = readyState === "complete" && (pageType === "calendar" || pageType === "patient" && hasXestroBoxes);
      return {
        url,
        title,
        readyState,
        pageType,
        isReady,
        elements: {
          xestroBoxCount: document.querySelectorAll(".XestroBox").length,
          hasPatientNotes,
          hasCalendarElements,
          hasDateInput
        },
        timestamp: Date.now()
      };
    }
    async handleProfilePhoto(data) {
      console.log("📸 Handling profile photo capture:", data);
      if (data?.imageData) {
        console.log("📸 Opening photo upload interface...");
        await this.openPhotoUploadInterface();
        await this.insertImageIntoDropZone(data.imageData, data.method || "tab-capture");
      } else {
        console.log("📸 No image data provided, showing capture instructions");
        throw new Error("Profile photo capture requires image data");
      }
    }
    async insertImageIntoDropZone(imageData, method) {
      console.log(`📸 Inserting image into DropZone using method: ${method}`);
      try {
        const dropZone = await this.findDropZone();
        if (!dropZone) {
          console.error("❌ DropZone not found on page");
          throw new Error("DropZone field not found");
        }
        const file = await this.base64ToFile(imageData, "profile-photo.png");
        await this.simulateFileDrop(dropZone, file);
        console.log("✅ Profile photo inserted successfully");
        this.showSuccessMessage("Profile photo added successfully!");
      } catch (error) {
        console.error("❌ Error inserting image into DropZone:", error);
        throw error;
      }
    }
    async openPhotoUploadInterface() {
      console.log("🔄 Starting photo upload interface navigation...");
      try {
        console.log("🔄 Step 1: Clicking sidebar patient photo...");
        const patientPhoto = await this.findElement("#SidebarPatientPhoto", 3e3);
        if (!patientPhoto) {
          throw new Error("Could not find sidebar patient photo (#SidebarPatientPhoto)");
        }
        patientPhoto.click();
        await this.wait(500);
        console.log("🔄 Step 2: Clicking Profile Picture description...");
        const profileDescriptions = document.querySelectorAll(".description");
        let profilePictureDescription = null;
        for (const desc of profileDescriptions) {
          if (desc.textContent?.includes("Profile Picture")) {
            profilePictureDescription = desc;
            break;
          }
        }
        if (!profilePictureDescription) {
          throw new Error("Could not find Profile Picture description element");
        }
        profilePictureDescription.click();
        await this.wait(500);
        console.log("🔄 Step 3: Clicking Upload New button...");
        const uploadButton = await this.findElement("#UploadPhotoButton", 3e3);
        if (!uploadButton) {
          throw new Error("Could not find Upload New button (#UploadPhotoButton)");
        }
        uploadButton.click();
        await this.wait(1e3);
        console.log("✅ Photo upload interface navigation completed");
      } catch (error) {
        console.error("❌ Failed to open photo upload interface:", error);
        throw new Error(`Navigation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    async findDropZone() {
      console.log("🔍 Looking for DropZone element...");
      const dropZone = await this.waitForDropZone();
      if (dropZone) {
        console.log("✅ Found DropZone after navigation");
        return dropZone;
      }
      console.warn("⚠️ Could not find DropZone even after navigation");
      return null;
    }
    async waitForDropZone(timeout = 5e3) {
      console.log("⏳ Waiting for DropZone to appear...");
      const startTime = Date.now();
      const checkInterval = 200;
      while (Date.now() - startTime < timeout) {
        const dropZone = document.querySelector("#DropZone");
        if (dropZone && dropZone.offsetParent !== null) {
          console.log("✅ DropZone appeared and is visible");
          return dropZone;
        }
        await this.wait(checkInterval);
      }
      console.log("❌ Timeout waiting for DropZone to appear");
      return null;
    }
    async base64ToFile(base64Data, filename) {
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      return new File([blob], filename, { type: "image/png" });
    }
    async simulateFileDrop(dropZone, file) {
      console.log("📁 Simulating file drop into DropZone");
      const fileList = {
        0: file,
        length: 1,
        item: (index) => index === 0 ? file : null
      };
      const dragEnterEvent = new DragEvent("dragenter", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      dropEvent.dataTransfer?.items.add(file);
      dropZone.dispatchEvent(dragEnterEvent);
      await this.wait(50);
      dropZone.dispatchEvent(dragOverEvent);
      await this.wait(50);
      dropZone.dispatchEvent(dropEvent);
      const fileInput = dropZone.querySelector('input[type="file"]');
      if (fileInput) {
        console.log("📁 Found file input, setting files directly");
        Object.defineProperty(fileInput, "files", {
          value: fileList,
          writable: false
        });
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      console.log("📁 File drop simulation completed");
    }
    showSuccessMessage(message) {
      const messageDiv = document.createElement("div");
      messageDiv.textContent = message;
      messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;
      document.body.appendChild(messageDiv);
      setTimeout(() => {
        messageDiv.style.animation = "slideOutRight 0.3s ease-out";
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
          }
        }, 300);
      }, 3e3);
    }
    async showScreenshotInstructions(data) {
      console.log("📸 Showing screenshot instructions:", data);
      try {
        console.log("📸 Opening photo upload interface for clipboard workflow...");
        await this.openPhotoUploadInterface();
      } catch (error) {
        console.error("❌ Failed to open photo upload interface for clipboard workflow:", error);
      }
      const modal = document.createElement("div");
      modal.id = "screenshot-instructions-modal";
      modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;
      const modalContent = document.createElement("div");
      modalContent.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      font-family: system-ui, sans-serif;
      animation: scaleIn 0.3s ease-out;
    `;
      const title = document.createElement("h2");
      title.textContent = "📸 Take Screenshot";
      title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      text-align: center;
    `;
      const subtitle = document.createElement("p");
      subtitle.textContent = data.tabCaptureError ? `No doxy.me tabs found. ${data.tabCaptureError}` : "No doxy.me tabs found. Please take a manual screenshot.";
      subtitle.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
    `;
      const instructionsList = document.createElement("div");
      instructionsList.style.cssText = `
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin: 20px 0;
    `;
      const instructions = data.instructions || [
        "Press cmd+shift+4 to take a screenshot",
        "Select the area you want to capture",
        "The image will automatically be inserted when ready"
      ];
      instructions.forEach((instruction, index) => {
        const step = document.createElement("div");
        step.style.cssText = `
        display: flex;
        align-items: flex-start;
        margin: ${index > 0 ? "12px" : "0"} 0 0 0;
        font-size: 14px;
        color: #374151;
        line-height: 1.5;
      `;
        const stepNumber = document.createElement("span");
        stepNumber.textContent = `${index + 1}.`;
        stepNumber.style.cssText = `
        display: inline-block;
        width: 20px;
        font-weight: 600;
        color: #3b82f6;
        flex-shrink: 0;
      `;
        const stepText = document.createElement("span");
        stepText.textContent = instruction;
        step.appendChild(stepNumber);
        step.appendChild(stepText);
        instructionsList.appendChild(step);
      });
      const statusDiv = document.createElement("div");
      statusDiv.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      margin: 20px 0;
    `;
      const statusText = document.createElement("span");
      statusText.textContent = "⏳ Waiting for screenshot...";
      statusText.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #92400e;
    `;
      statusDiv.appendChild(statusText);
      const pasteButton = document.createElement("button");
      pasteButton.textContent = "📋 Manual Paste";
      pasteButton.style.cssText = `
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 12px;
    `;
      pasteButton.addEventListener("mouseenter", () => {
        pasteButton.style.backgroundColor = "#2563eb";
      });
      pasteButton.addEventListener("mouseleave", () => {
        pasteButton.style.backgroundColor = "#3b82f6";
      });
      pasteButton.addEventListener("click", async () => {
        try {
          console.log("📋 Manual paste button clicked, attempting clipboard read...");
          const clipboardItems = await navigator.clipboard.read();
          if (clipboardItems.length === 0) {
            alert("No items found in clipboard. Please copy an image first.");
            return;
          }
          let imageFound = false;
          for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            const imageTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/bmp"];
            const foundImageType = item.types.find(
              (type) => imageTypes.includes(type) || type.startsWith("image/")
            );
            if (foundImageType) {
              console.log(`📋 Found image in clipboard: ${foundImageType}`);
              const blob = await item.getType(foundImageType);
              const base64Data = await this.blobToBase64(blob);
              this.closeScreenshotModal();
              await this.insertImageIntoDropZone(base64Data, "manual-paste");
              try {
                await chrome.runtime.sendMessage({
                  type: "CLIPBOARD_MONITORING_RESULT",
                  data: {
                    success: true,
                    imageData: base64Data,
                    method: "manual-paste"
                  }
                });
              } catch (error) {
                console.error("Failed to notify service worker:", error);
              }
              imageFound = true;
              break;
            }
          }
          if (!imageFound) {
            alert("No image found in clipboard. Please copy an image and try again.");
          }
        } catch (error) {
          console.error("Manual paste failed:", error);
          alert("Failed to access clipboard. Please ensure you have copied an image and try again.");
        }
      });
      const cancelButton = document.createElement("button");
      cancelButton.textContent = "Cancel";
      cancelButton.style.cssText = `
      width: 100%;
      padding: 12px;
      background: #f3f4f6;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
      cancelButton.addEventListener("mouseenter", () => {
        cancelButton.style.backgroundColor = "#e5e7eb";
      });
      cancelButton.addEventListener("mouseleave", () => {
        cancelButton.style.backgroundColor = "#f3f4f6";
      });
      cancelButton.addEventListener("click", () => {
        this.closeScreenshotModal();
      });
      modalContent.appendChild(title);
      modalContent.appendChild(subtitle);
      modalContent.appendChild(instructionsList);
      modalContent.appendChild(statusDiv);
      modalContent.appendChild(pasteButton);
      modalContent.appendChild(cancelButton);
      modal.appendChild(modalContent);
      const style = document.createElement("style");
      style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes scaleOut {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0.9); opacity: 0; }
      }
    `;
      document.head.appendChild(style);
      document.body.appendChild(modal);
      console.log("📸 Screenshot instructions modal shown");
    }
    closeScreenshotModal() {
      const modal = document.getElementById("screenshot-instructions-modal");
      if (modal) {
        modal.style.animation = "fadeOut 0.3s ease-out";
        const content = modal.querySelector("div");
        if (content) {
          content.style.animation = "scaleOut 0.3s ease-out";
        }
        setTimeout(() => {
          if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
        }, 300);
        console.log("📸 Screenshot instructions modal closed");
      }
    }
    async startClipboardMonitoring(timeoutMs) {
      console.log(`📸 Starting enhanced clipboard monitoring for ${timeoutMs / 1e3} seconds...`);
      const startTime = Date.now();
      const checkInterval = 500;
      let lastClipboardChecksum = null;
      let checkCount = 0;
      const monitorLoop = async () => {
        const elapsedTime = Date.now() - startTime;
        checkCount++;
        if (elapsedTime >= timeoutMs) {
          console.log(`❌ Clipboard monitoring timeout after ${checkCount} checks over ${elapsedTime / 1e3} seconds`);
          try {
            await chrome.runtime.sendMessage({
              type: "CLIPBOARD_MONITORING_RESULT",
              data: {
                success: false,
                error: `Timeout waiting for screenshot in clipboard (${checkCount} checks)`
              }
            });
          } catch (error) {
            console.error("❌ Failed to notify service worker of timeout:", error);
          }
          return;
        }
        if (checkCount % 10 === 0) {
          console.log(`📸 Clipboard monitoring: check ${checkCount}, ${Math.round((timeoutMs - elapsedTime) / 1e3)}s remaining`);
        }
        try {
          if (document.hasFocus && !document.hasFocus()) {
            console.log("📸 Page not focused, attempting to focus...");
            window.focus();
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const permissionStatus = await navigator.permissions.query({ name: "clipboard-read" });
          if (permissionStatus.state === "denied") {
            console.error("❌ Clipboard read permission denied");
            throw new Error("Clipboard read permission denied");
          }
          const clipboardItems = await navigator.clipboard.read();
          const clipboardChecksum = clipboardItems.map((item) => item.types.join(",")).join("|");
          const clipboardChanged = lastClipboardChecksum !== clipboardChecksum;
          if (clipboardChanged) {
            console.log(`📸 Clipboard content changed! Found ${clipboardItems.length} items (check ${checkCount})`);
            lastClipboardChecksum = clipboardChecksum;
          } else if (checkCount % 20 === 0) {
            console.log(`📸 No clipboard change detected (check ${checkCount})`);
          }
          for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (clipboardChanged) {
              console.log(`📸 Clipboard item ${i + 1} types:`, item.types);
            }
            const imageTypes = [
              "image/png",
              "image/jpeg",
              "image/jpg",
              "image/gif",
              "image/webp",
              "image/bmp",
              "image/svg+xml",
              "image/tiff",
              "image/ico",
              "image/avif"
            ];
            const foundImageType = item.types.find(
              (type) => imageTypes.includes(type) || type.startsWith("image/")
            );
            if (foundImageType) {
              console.log(`📸 ✅ IMAGE DETECTED in clipboard! Type: ${foundImageType}, Size check starting...`);
              try {
                const blob = await Promise.race([
                  item.getType(foundImageType),
                  new Promise(
                    (_, reject) => setTimeout(() => reject(new Error("Blob retrieval timeout")), 5e3)
                  )
                ]);
                console.log(`📸 ✅ Successfully retrieved blob: ${blob.size} bytes, type: ${blob.type}`);
                if (blob.size === 0) {
                  console.warn("⚠️ Blob is empty, skipping...");
                  continue;
                }
                if (blob.size > 10 * 1024 * 1024) {
                  console.warn(`⚠️ Blob too large: ${blob.size} bytes, skipping...`);
                  continue;
                }
                console.log(`📸 Converting ${blob.size} byte blob to base64...`);
                const base64Data = await this.blobToBase64(blob);
                console.log(`📸 ✅ Successfully converted to base64: ${base64Data.length} characters`);
                if (!base64Data.startsWith("data:image/")) {
                  console.warn("⚠️ Invalid base64 image data format, skipping...");
                  continue;
                }
                console.log("🎉 CLIPBOARD IMAGE PROCESSING SUCCESSFUL! Closing modal and inserting image...");
                this.closeScreenshotModal();
                await this.insertImageIntoDropZone(base64Data, "clipboard");
                try {
                  await chrome.runtime.sendMessage({
                    type: "CLIPBOARD_MONITORING_RESULT",
                    data: {
                      success: true,
                      imageData: base64Data,
                      method: "clipboard",
                      imageType: foundImageType,
                      imageSize: blob.size,
                      checksCount: checkCount
                    }
                  });
                  console.log("✅ Successfully notified service worker of clipboard success");
                } catch (notificationError) {
                  console.error("❌ Failed to notify service worker of success:", notificationError);
                }
                return;
              } catch (blobError) {
                console.error(`❌ Failed to process clipboard image blob (${foundImageType}):`, blobError);
                if (i < clipboardItems.length - 1) {
                  console.log("🔄 Trying next clipboard item...");
                  continue;
                }
              }
            }
          }
          setTimeout(monitorLoop, checkInterval);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Clipboard access failed (check ${checkCount}):`, errorMessage);
          if (errorMessage.includes("permission") || errorMessage.includes("denied")) {
            console.error("🚫 Clipboard permission issue - stopping monitoring");
            try {
              await chrome.runtime.sendMessage({
                type: "CLIPBOARD_MONITORING_RESULT",
                data: {
                  success: false,
                  error: `Clipboard permission denied: ${errorMessage}`
                }
              });
            } catch (notificationError) {
              console.error("❌ Failed to notify service worker of permission error:", notificationError);
            }
            return;
          }
          console.log(`🔄 Continuing monitoring with longer interval due to error...`);
          setTimeout(monitorLoop, checkInterval * 2);
        }
      };
      try {
        const initialItems = await navigator.clipboard.read();
        lastClipboardChecksum = initialItems.map((item) => item.types.join(",")).join("|");
        console.log(`📸 Initial clipboard state: ${initialItems.length} items`);
      } catch (error) {
        console.log("📸 Could not read initial clipboard state:", error);
      }
      console.log("📸 🚀 Starting clipboard monitoring loop...");
      monitorLoop();
    }
    async blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    async extractEMRData(fields) {
      console.log("📋 Extracting EMR data for fields:", fields);
      console.log("📋 Current page URL:", window.location.href);
      console.log("📋 Current page type:", window.location.href.includes("Dashboard") ? "DASHBOARD" : "PATIENT_PAGE");
      const xestroBoxes = document.querySelectorAll(".XestroBox");
      let patientRecordButton = document.querySelector("button.PatientDetailsButton");
      if (!patientRecordButton) {
        patientRecordButton = await this.findButtonByText("Patient Record");
      }
      console.log("📋 Found XestroBox elements:", xestroBoxes.length);
      console.log("📋 Patient Record button present:", !!patientRecordButton);
      if (xestroBoxes.length === 0) {
        console.warn("⚠️ No XestroBox elements found - patient record may not be opened");
        if (patientRecordButton) {
          console.warn("💡 Patient Record button is available - attempting to open record");
          try {
            await this.ensurePatientRecordOpened();
            const newXestroBoxes = document.querySelectorAll(".XestroBox");
            if (newXestroBoxes.length === 0) {
              console.warn("⚠️ Still no XestroBox elements after clicking Patient Record button");
              console.warn("💡 Proceeding with extraction but results may be limited");
            } else {
              console.log(`✅ Found ${newXestroBoxes.length} XestroBox elements after opening record`);
            }
          } catch (error) {
            console.warn("⚠️ Failed to open patient record:", error);
          }
        } else {
          console.warn("💡 EMR data extraction requires patient page with clinical fields");
          console.warn("💡 Make sure you are on the correct patient page");
        }
      }
      const extractedData = {};
      for (const fieldName of fields) {
        try {
          let fieldValue = "";
          const normalizedFieldName = this.normalizeFieldName(fieldName);
          switch (normalizedFieldName) {
            case "background":
              fieldValue = await this.extractFieldContent("Background");
              break;
            case "investigations":
            case "investigation-summary":
              fieldValue = await this.extractFieldContent("Investigation Summary");
              break;
            case "medications":
              fieldValue = await this.extractFieldContent("Medications (Problem List for Phil)") || await this.extractFieldContent("Medications");
              break;
            default:
              fieldValue = await this.extractFieldContent(fieldName);
          }
          extractedData[fieldName] = fieldValue;
          console.log(`📋 Extracted ${fieldName}: ${fieldValue ? fieldValue.length + " chars" : "empty"}`);
        } catch (error) {
          console.warn(`⚠️ Failed to extract field "${fieldName}":`, error);
          extractedData[fieldName] = "";
        }
      }
      console.log("📋 EMR data extraction completed:", Object.keys(extractedData));
      return extractedData;
    }
    normalizeFieldName(fieldName) {
      return fieldName.toLowerCase().replace(/[_\s-]+/g, "-");
    }
    async extractCustomNoteContent(fieldDisplayName) {
      console.log(`📋 Looking for customNote content in field: "${fieldDisplayName}"`);
      try {
        const xestroBox = await this.findXestroBoxByTitle(fieldDisplayName);
        if (!xestroBox) {
          console.log(`⚠️ No XestroBox found for "${fieldDisplayName}"`);
          return "";
        }
        const customNotes = xestroBox.querySelectorAll(".customNote");
        console.log(`📋 Found ${customNotes.length} customNote elements in "${fieldDisplayName}" XestroBox`);
        if (customNotes.length === 0) {
          console.log(`⚠️ No .customNote elements found in "${fieldDisplayName}" XestroBox`);
          return "";
        }
        let combinedContent = "";
        for (let i = 0; i < customNotes.length; i++) {
          const note = customNotes[i];
          if (note.offsetParent !== null) {
            const content = (note.textContent || note.innerText || "").trim();
            if (content) {
              if (combinedContent) {
                combinedContent += "\n\n" + content;
              } else {
                combinedContent = content;
              }
              console.log(`📋 Extracted customNote ${i + 1} content: ${content.length} chars`);
            }
          }
        }
        if (combinedContent) {
          console.log(`✅ Total customNote content for "${fieldDisplayName}": ${combinedContent.length} chars`);
          return combinedContent;
        } else {
          console.log(`⚠️ No visible content found in customNote elements for "${fieldDisplayName}"`);
          return "";
        }
      } catch (error) {
        console.error(`❌ Error extracting customNote content for "${fieldDisplayName}":`, error);
        return "";
      }
    }
    async extractFieldContent(fieldDisplayName) {
      console.log(`📋 Extracting content for field: "${fieldDisplayName}"`);
      try {
        const customNoteContent = await this.extractCustomNoteContent(fieldDisplayName);
        if (customNoteContent) {
          console.log(`📋 Found customNote content for "${fieldDisplayName}": ${customNoteContent.length} chars`);
          return customNoteContent;
        }
        const xestroBox = await this.findXestroBoxByTitle(fieldDisplayName);
        if (xestroBox) {
          console.log(`✅ Found XestroBox for "${fieldDisplayName}"`);
          const titleElement = xestroBox.querySelector(".XestroBoxTitle");
          if (titleElement) {
            titleElement.click();
            await this.wait(300);
          }
          const textArea = xestroBox.querySelector("textarea");
          if (textArea && textArea.offsetParent !== null) {
            const content = textArea.value.trim();
            console.log(`📋 Found textarea content for "${fieldDisplayName}": ${content.length} chars`);
            return content;
          }
          const contentEditables = xestroBox.querySelectorAll('[contenteditable="true"]');
          for (const element of contentEditables) {
            const htmlElement = element;
            if (htmlElement.offsetParent !== null) {
              const content = (htmlElement.textContent || htmlElement.innerText || "").trim();
              if (content) {
                console.log(`📋 Found contenteditable content for "${fieldDisplayName}": ${content.length} chars`);
                return content;
              }
            }
          }
        }
        const fallbackSelectors = [
          `textarea[data-field="${fieldDisplayName.toLowerCase()}"]`,
          `textarea[placeholder*="${fieldDisplayName}"]`,
          `textarea[aria-label*="${fieldDisplayName}"]`,
          `#${fieldDisplayName.replace(/\s+/g, "").toLowerCase()}`,
          `.${fieldDisplayName.replace(/\s+/g, "-").toLowerCase()}`
        ];
        for (const selector of fallbackSelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            const content = element.value.trim();
            console.log(`📋 Found fallback content for "${fieldDisplayName}" via ${selector}: ${content.length} chars`);
            return content;
          }
        }
        console.log(`⚠️ No content found for field "${fieldDisplayName}"`);
        return "";
      } catch (error) {
        console.error(`❌ Error extracting field "${fieldDisplayName}":`, error);
        return "";
      }
    }
    async findXestroBoxByTitle(title) {
      console.log(`🔍 Looking for XestroBox with title: "${title}"`);
      const xestroBoxes = document.querySelectorAll(".XestroBox");
      console.log(`🔍 Found ${xestroBoxes.length} XestroBox elements`);
      xestroBoxes.forEach((box, index) => {
        const titleElement = box.querySelector(".XestroBoxTitle");
        const titleText = titleElement?.textContent || "No title";
        console.log(`🔍 XestroBox ${index}: "${titleText}"`);
      });
      for (const box of xestroBoxes) {
        const titleElement = box.querySelector(".XestroBoxTitle");
        if (titleElement && titleElement.textContent?.includes(title)) {
          console.log(`✅ Found XestroBox with matching title: "${titleElement.textContent}"`);
          return box;
        }
      }
      const partialMatches = [
        title.split(" ")[0],
        // First word
        title.replace(/\s+/g, ""),
        // No spaces
        title.toLowerCase()
      ];
      for (const partialTitle of partialMatches) {
        for (const box of xestroBoxes) {
          const titleElement = box.querySelector(".XestroBoxTitle");
          const titleText = titleElement?.textContent?.toLowerCase() || "";
          if (titleText.includes(partialTitle.toLowerCase())) {
            console.log(`✅ Found XestroBox with partial match: "${titleElement?.textContent}" for "${title}"`);
            return box;
          }
        }
      }
      console.log(`❌ No XestroBox found for title: "${title}"`);
      return null;
    }
    async saveNote() {
      console.log("💾 Attempting to save note...");
      const saveButton = document.getElementById("patientNotesSave") || document.querySelector('button[title*="Save"]') || document.querySelector('button:contains("Save")');
      if (saveButton) {
        saveButton.click();
        console.log("💾 Note saved via button");
        return;
      }
      const noteArea = document.getElementById("AddNoteArea");
      if (noteArea) {
        const event = new KeyboardEvent("keydown", {
          key: "Enter",
          shiftKey: true,
          bubbles: true
        });
        noteArea.dispatchEvent(event);
        console.log("💾 Note saved via Shift+Enter");
        return;
      }
      console.log("❌ No save method available");
    }
    // Calendar/Appointment Book Patient Extraction
    async extractCalendarPatients() {
      console.log("📅 Starting calendar patient extraction...");
      console.log("📅 Current page URL:", window.location.href);
      if (!this.isCalendarPage()) {
        throw new Error("Not on a calendar/appointment book page");
      }
      const appointmentDate = this.extractAppointmentDate();
      console.log("📅 Appointment date:", appointmentDate);
      const appointmentTable = document.querySelector("table.appointmentBook");
      if (!appointmentTable) {
        throw new Error("Appointment book table not found");
      }
      const patients = this.extractPatientsFromTable(appointmentTable);
      console.log("📅 Extracted patients:", patients);
      return {
        appointmentDate,
        calendarUrl: window.location.href,
        patients,
        totalCount: patients.length
      };
    }
    isCalendarPage() {
      const appointmentBook = document.querySelector(".one-appt-book, table.appointmentBook");
      const dateInput = document.querySelector("input.date.form-control");
      return !!(appointmentBook && dateInput);
    }
    extractAppointmentDate() {
      const dateInput = document.querySelector("input.date.form-control");
      if (dateInput) {
        return dateInput.value || dateInput.getAttribute("data-value") || "";
      }
      const dateElements = document.querySelectorAll("[data-date]");
      for (const element of dateElements) {
        const dataDate = element.getAttribute("data-date");
        if (dataDate) {
          return dataDate;
        }
      }
      return (/* @__PURE__ */ new Date()).toDateString();
    }
    extractPatientsFromTable(table) {
      console.log("📅 Extracting patients from appointment table...");
      const patients = [];
      const appointmentRows = table.querySelectorAll("tr.appt");
      console.log(`📅 Found ${appointmentRows.length} appointment rows`);
      appointmentRows.forEach((row, index) => {
        try {
          const nameCell = row.querySelector("td.Name");
          if (!nameCell || !nameCell.textContent?.trim()) {
            return;
          }
          const patient = this.extractPatientFromRow(row);
          if (patient) {
            const isValidPattern = this.validatePatientPattern(patient);
            if (isValidPattern.isValid) {
              patients.push(patient);
              console.log(`📅 ✅ Extracted patient ${index + 1} (${isValidPattern.patternType}):`, patient);
            } else {
              console.warn(`📅 ⚠️ Patient ${index + 1} has invalid pattern:`, { patient, reason: isValidPattern.reason });
              patients.push({ ...patient, _patternType: "legacy" });
            }
          }
        } catch (error) {
          console.warn(`📅 Failed to extract patient from row ${index}:`, error);
        }
      });
      console.log(`📅 Successfully extracted ${patients.length} patients from appointment table`);
      return patients;
    }
    extractPatientFromRow(row) {
      const timeCell = row.querySelector("td.Time");
      const appointmentTime = timeCell?.textContent?.trim() || "";
      const typeCell = row.querySelector("td.Type");
      const appointmentType = typeCell?.textContent?.trim() || "";
      const nameCell = row.querySelector("td.Name");
      if (!nameCell) return null;
      const patientInfo = this.parsePatientNameCell(nameCell);
      if (!patientInfo) return null;
      const confirmCell = row.querySelector("td.Confirm");
      const confirmed = this.isAppointmentConfirmed(confirmCell);
      const isFirstAppointment = nameCell.querySelector(".fa-star") !== null;
      const notesCell = row.querySelector("td.Notes");
      const notes = notesCell?.textContent?.trim() || "";
      return {
        name: patientInfo.name,
        dob: patientInfo.dob,
        fileNumber: patientInfo.fileNumber,
        appointmentTime,
        appointmentType,
        confirmed,
        isFirstAppointment,
        notes: notes || void 0
      };
    }
    parsePatientNameCell(nameCell) {
      const nameSpan = nameCell.querySelector("span[aria-label]");
      if (!nameSpan) return null;
      const ariaLabel = nameSpan.getAttribute("aria-label") || "";
      const displayName = nameSpan.textContent?.trim() || "";
      console.log("📅 Parsing patient name cell:", { ariaLabel, displayName });
      const nameIdMatch = displayName.match(/^(.+?)\s*\((\d+)\)$/);
      if (nameIdMatch) {
        const fullName = nameIdMatch[1].trim();
        const patientId = nameIdMatch[2];
        console.log("📅 Found Name (ID) pattern:", { fullName, patientId });
        const dobMatch = ariaLabel.match(/\((\d{2}\/\d{2}\/\d{4})\)/);
        const dob = dobMatch ? dobMatch[1] : "";
        return {
          name: fullName,
          dob,
          fileNumber: patientId
          // Use patient ID as file number
        };
      }
      const legacyNameMatch = ariaLabel.match(/^(.+?)\s*\((\d{2}\/\d{2}\/\d{4})\)$/);
      if (legacyNameMatch) {
        console.log("📅 Using legacy DOB pattern as fallback");
        const fullName = legacyNameMatch[1].trim();
        const dob = legacyNameMatch[2];
        const fileNumberElement = nameCell.querySelector("small");
        const fileNumberText = fileNumberElement?.textContent?.trim() || "";
        const fileNumber = fileNumberText.replace(/[^\d]/g, "");
        return {
          name: fullName,
          dob,
          fileNumber
        };
      }
      console.warn("📅 Could not parse patient name from either pattern:", { ariaLabel, displayName });
      return null;
    }
    /**
     * Validate patient pattern to ensure it follows the expected "Name (ID)" format
     */
    validatePatientPattern(patient) {
      if (!patient || !patient.name || !patient.fileNumber) {
        return { isValid: false, patternType: "invalid", reason: "Missing name or fileNumber" };
      }
      const isNumericId = /^\d+$/.test(patient.fileNumber);
      if (isNumericId) {
        const containsDOB = /\d{2}\/\d{2}\/\d{4}/.test(patient.name);
        if (!containsDOB) {
          return { isValid: true, patternType: "name-id" };
        }
      }
      if (patient.dob && /\d{2}\/\d{2}\/\d{4}/.test(patient.dob)) {
        return { isValid: true, patternType: "legacy-dob" };
      }
      return {
        isValid: false,
        patternType: "unknown",
        reason: `Unrecognized pattern: name="${patient.name}", fileNumber="${patient.fileNumber}", dob="${patient.dob}"`
      };
    }
    isAppointmentConfirmed(confirmCell) {
      if (!confirmCell) return false;
      const confirmIcon = confirmCell.querySelector(".fa-calendar-check.text-success");
      return !!confirmIcon;
    }
    async navigateToPatient(fileNumber, patientName) {
      console.log(`🧭 Navigating to patient: ${patientName} (${fileNumber})`);
      const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="patient"]');
      if (searchInput) {
        searchInput.value = fileNumber;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        await this.wait(1e3);
        const searchResults = document.querySelectorAll("[data-patient-id], .patient-result");
        for (const result of searchResults) {
          if (result.textContent?.includes(fileNumber) || result.textContent?.includes(patientName)) {
            result.click();
            console.log(`🧭 Clicked patient in search results`);
            await this.wait(2e3);
            await this.ensurePatientRecordOpened();
            return;
          }
        }
      }
      const currentUrl = window.location.href;
      const baseUrl = currentUrl.split("?")[0].split("#")[0];
      const possibleUrls = [
        `${baseUrl}?patient=${fileNumber}`,
        `${baseUrl}#patient/${fileNumber}`,
        `${baseUrl}/patient/${fileNumber}`
      ];
      for (const url of possibleUrls) {
        try {
          console.log(`🧭 Trying navigation to: ${url}`);
          window.location.href = url;
          await this.wait(2e3);
          if (document.querySelector(".patient-record, #patient-view, .XestroBox")) {
            console.log(`✅ Successfully navigated to patient page`);
            await this.ensurePatientRecordOpened();
            return;
          }
        } catch (error) {
          console.warn(`🧭 Navigation attempt failed for ${url}:`, error);
        }
      }
      throw new Error(`Unable to navigate to patient ${patientName} (${fileNumber})`);
    }
    /**
     * Activate a patient using UI-driven approach (for SPA navigation)
     * @param patientSelector - Either a CSS selector or patient index number
     */
    async activatePatientByElement(patientSelector) {
      console.log(`🖱️ Activating patient by element: ${patientSelector}`);
      console.log(`🖱️ Current page URL: ${window.location.href}`);
      console.log(`🖱️ Page title: ${document.title}`);
      let patientElement = null;
      if (typeof patientSelector === "number") {
        const appointmentTable = document.querySelector("table.appointmentBook");
        if (!appointmentTable) {
          const allTables = document.querySelectorAll("table");
          const tableClasses = Array.from(allTables).map(
            (table) => table.className || "no-class"
          );
          console.error(`🖱️ table.appointmentBook not found. Available tables:`, tableClasses);
          throw new Error(`Appointment table not found. Expected table.appointmentBook. Found ${allTables.length} tables: ${tableClasses.join(", ")}`);
        }
        const appointmentRows = appointmentTable.querySelectorAll("tr.appt");
        console.log(`🖱️ Found ${appointmentRows.length} appointment rows`);
        const patientElements = Array.from(appointmentRows).map((row) => row.querySelector("td.Name")).filter((cell) => cell && cell.textContent?.trim());
        console.log(`🖱️ Found ${patientElements.length} valid patient elements`);
        if (patientSelector >= patientElements.length) {
          throw new Error(`Patient index ${patientSelector} out of range. Found ${patientElements.length} patients from ${appointmentRows.length} rows.`);
        }
        patientElement = patientElements[patientSelector];
        console.log(`🖱️ Found patient element by index ${patientSelector}`);
      } else {
        patientElement = document.querySelector(patientSelector);
        if (!patientElement) {
          throw new Error(`Patient element not found using selector: ${patientSelector}`);
        }
        console.log(`🖱️ Found patient element by selector: ${patientSelector}`);
      }
      const patientInfo = this.extractPatientInfoFromElement(patientElement);
      console.log(`🖱️ Activating patient: ${patientInfo.name} (${patientInfo.fileNumber})`);
      patientElement.click();
      console.log("🖱️ Patient name clicked");
      await this.wait(1e3);
      const isActivated = this.checkPatientActivation(patientElement);
      if (isActivated) {
        console.log("✅ Patient activation confirmed visually");
      } else {
        console.warn("⚠️ Patient activation not visually confirmed, proceeding anyway");
      }
      await this.ensurePatientRecordOpened();
      console.log(`✅ Successfully activated patient: ${patientInfo.name}`);
    }
    /**
     * Extract patient information from a patient name element
     */
    extractPatientInfoFromElement(patientElement) {
      const nameSpan = patientElement.querySelector("span[aria-label]");
      const fileNumberElement = patientElement.querySelector("small");
      if (!nameSpan) {
        return { name: "Unknown", dob: "", fileNumber: "" };
      }
      const ariaLabel = nameSpan.getAttribute("aria-label") || "";
      const nameMatch = ariaLabel.match(/^(.+?)\s*\((.+?)\)$/);
      const name = nameMatch ? nameMatch[1].trim() : nameSpan.textContent?.trim() || "Unknown";
      const dob = nameMatch ? nameMatch[2] : "";
      const fileNumber = fileNumberElement?.textContent?.replace(/[^\d]/g, "") || "";
      return { name, dob, fileNumber };
    }
    /**
     * Check if patient is visually activated (has selected styling)
     */
    checkPatientActivation(patientElement) {
      const row = patientElement.closest("tr");
      if (!row) return false;
      return row.classList.contains("selected") || row.classList.contains("active") || row.style.backgroundColor !== "" || row.querySelector(".fa-check") !== null || window.getComputedStyle(row).backgroundColor !== "rgba(0, 0, 0, 0)";
    }
    /**
     * SPA Workflow: Double-click patient name to activate
     */
    async doubleClickPatient(patientName, patientId) {
      console.log(`👆 Double-clicking patient: ${patientName} (ID: ${patientId})`);
      console.log(`👆 Current URL: ${window.location.href}`);
      console.log(`👆 Page title: ${document.title}`);
      const allPatientElements = document.querySelectorAll("span[aria-label]");
      console.log(`👆 All patient elements found (${allPatientElements.length}):`, Array.from(allPatientElements).map((el, index) => ({
        index,
        ariaLabel: el.getAttribute("aria-label"),
        textContent: el.textContent?.trim(),
        className: el.className,
        id: el.id,
        visible: el.offsetParent !== null
      })));
      const searchPattern = `${patientName} (${patientId})`;
      console.log(`👆 Searching for patient with pattern: "${searchPattern}"`);
      const patientElements = Array.from(document.querySelectorAll("span[aria-label]")).filter((el) => {
        const textContent = el.textContent?.trim() || "";
        const ariaLabel = el.getAttribute("aria-label") || "";
        const exactPatternMatch = textContent === searchPattern;
        const nameMatch = textContent.includes(patientName) || ariaLabel.includes(patientName);
        const idMatch = textContent.includes(`(${patientId})`);
        return exactPatternMatch || nameMatch && idMatch;
      });
      console.log(`👆 Filtered patient elements (${patientElements.length}):`, patientElements.map((el, index) => {
        const textContent = el.textContent?.trim() || "";
        const ariaLabel = el.getAttribute("aria-label") || "";
        return {
          index,
          ariaLabel,
          textContent,
          matches: {
            exactPattern: textContent === searchPattern,
            nameMatch: textContent.includes(patientName) || ariaLabel.includes(patientName),
            idMatch: textContent.includes(`(${patientId})`),
            searchPattern
          }
        };
      }));
      if (patientElements.length === 0) {
        console.error(`👆 ERROR: No patient elements found matching pattern "${searchPattern}"`);
        console.error(`👆 Search criteria: Name="${patientName}", ID="${patientId}"`);
        console.error(`👆 Available patients:`, Array.from(allPatientElements).map((el) => ({
          textContent: el.textContent?.trim(),
          ariaLabel: el.getAttribute("aria-label")
        })));
        throw new Error(`Patient not found in appointment book: ${searchPattern}. Expected format: "Name (ID)"`);
      }
      if (patientElements.length > 1) {
        console.warn(`👆 WARNING: Multiple patient elements found (${patientElements.length}), using the first one`);
      }
      const patientElement = patientElements[0];
      console.log(`👆 Selected patient element:`, {
        ariaLabel: patientElement.getAttribute("aria-label"),
        textContent: patientElement.textContent?.trim(),
        className: patientElement.className,
        id: patientElement.id,
        tagName: patientElement.tagName,
        parentElement: patientElement.parentElement?.tagName,
        boundingRect: patientElement.getBoundingClientRect()
      });
      console.log(`👆 Performing double-click on patient element...`);
      const dblClickEvent = new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        view: window
      });
      patientElement.dispatchEvent(dblClickEvent);
      console.log(`👆 Double-click event dispatched`);
      console.log(`👆 Waiting 1 second for navigation...`);
      await this.wait(1e3);
      console.log(`👆 Double-click completed for patient: ${patientName}`);
      console.log(`👆 Post-click URL: ${window.location.href}`);
      console.log(`👆 Post-click title: ${document.title}`);
    }
    /**
     * SPA Workflow: Navigate to Patient Record view
     */
    async navigateToPatientRecord() {
      console.log(`🏥 Navigating to Patient Record view`);
      const patientRecordButton = this.findButtonByText("Patient Record") || this.findButtonByText("Patient") || document.querySelector('button[title*="Patient Record"]') || document.querySelector('a[href*="patient"]');
      if (!patientRecordButton) {
        throw new Error("Patient Record button not found in navigation");
      }
      console.log(`🏥 Found Patient Record button, clicking...`);
      if (patientRecordButton instanceof HTMLElement) {
        patientRecordButton.click();
      } else {
        throw new Error("Patient Record button is not a clickable element");
      }
      await this.wait(2e3);
      const xestroBoxCount = document.querySelectorAll(".XestroBox").length;
      if (xestroBoxCount === 0) {
        console.warn(`🏥 Patient Record view may not have loaded (no XestroBoxes found)`);
      }
      console.log(`🏥 Navigation to Patient Record completed (${xestroBoxCount} XestroBoxes found)`);
    }
    /**
     * SPA Workflow: Navigate back to Appointment Book view
     */
    async navigateToAppointmentBook() {
      console.log(`📅 Navigating back to Appointment Book view`);
      console.log(`📅 Current URL: ${window.location.href}`);
      console.log(`📅 Page title: ${document.title}`);
      console.log(`📅 Inspecting available navigation elements...`);
      const allButtons = document.querySelectorAll("button");
      console.log(`📅 All buttons found (${allButtons.length}):`, Array.from(allButtons).map((btn, index) => ({
        index,
        textContent: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id,
        title: btn.title,
        onclick: btn.onclick ? "has onclick" : "no onclick",
        visible: btn.offsetParent !== null
      })));
      const allLinks = document.querySelectorAll("a");
      console.log(`📅 All links found (${allLinks.length}):`, Array.from(allLinks).map((link, index) => ({
        index,
        textContent: link.textContent?.trim(),
        href: link.href,
        className: link.className,
        id: link.id,
        title: link.title,
        visible: link.offsetParent !== null
      })));
      console.log(`📅 Searching for navigation buttons...`);
      const searchPatterns = [
        "Appointment Book",
        "Appointments",
        "Calendar",
        "Dashboard",
        "Home",
        "Back",
        "Close",
        "Return"
      ];
      let appointmentBookButton = null;
      let foundPattern = "";
      for (const pattern of searchPatterns) {
        console.log(`📅 Searching for pattern: "${pattern}"`);
        const button = this.findButtonByText(pattern);
        if (button) {
          appointmentBookButton = button;
          foundPattern = pattern;
          console.log(`📅 Found button with pattern "${pattern}":`, {
            textContent: button.textContent?.trim(),
            className: button.className,
            id: button.id,
            tagName: button.tagName
          });
          break;
        }
      }
      if (!appointmentBookButton) {
        console.log(`📅 Trying specific selectors...`);
        const selectors = [
          'button[title*="Appointment"]',
          'a[href*="appointment"]',
          'button[title*="Dashboard"]',
          'a[href*="Dashboard"]',
          'button.btn-default:contains("Back")',
          'button.btn-default:contains("Close")',
          ".navbar-nav a",
          ".nav-tabs a",
          ".breadcrumb a"
        ];
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              console.log(`📅 Found element with selector "${selector}":`, {
                textContent: element.textContent?.trim(),
                className: element.className,
                id: element.id,
                tagName: element.tagName,
                href: element.href
              });
              if (!appointmentBookButton) {
                appointmentBookButton = element;
                foundPattern = `selector: ${selector}`;
              }
            }
          } catch (e) {
          }
        }
      }
      if (!appointmentBookButton) {
        console.error(`📅 ERROR: No navigation button found`);
        console.error(`📅 DOM inspection complete - no suitable navigation element located`);
        throw new Error("Appointment Book button not found in navigation");
      }
      console.log(`📅 Found navigation button with pattern "${foundPattern}", clicking...`);
      if (appointmentBookButton instanceof HTMLElement) {
        appointmentBookButton.click();
        console.log(`📅 Clicked navigation button successfully`);
      } else {
        console.error(`📅 ERROR: Found element is not clickable HTMLElement`);
        throw new Error("Appointment Book button is not a clickable element");
      }
      console.log(`📅 Waiting 2 seconds for page transition...`);
      await this.wait(2e3);
      console.log(`📅 Verifying navigation result...`);
      console.log(`📅 New URL: ${window.location.href}`);
      console.log(`📅 New title: ${document.title}`);
      const calendarElements = document.querySelectorAll(".appointmentBook, .one-appt-book, input.date.form-control");
      console.log(`📅 Calendar elements found: ${calendarElements.length}`);
      if (calendarElements.length === 0) {
        console.warn(`📅 WARNING: Appointment Book view may not have loaded (no calendar elements found)`);
        console.warn(`📅 Current page elements:`, {
          xestroBoxes: document.querySelectorAll(".XestroBox").length,
          buttons: document.querySelectorAll("button").length,
          links: document.querySelectorAll("a").length,
          forms: document.querySelectorAll("form").length
        });
      }
      console.log(`📅 Navigation to Appointment Book completed (${calendarElements.length} calendar elements found)`);
    }
    /**
     * SPA Workflow: Extract patient fields from Patient Record view
     */
    async extractPatientFields() {
      console.log(`📋 Extracting patient fields from Patient Record view`);
      console.log(`📋 Current URL: ${window.location.href}`);
      console.log(`📋 Page title: ${document.title}`);
      const xestroBoxCount = document.querySelectorAll(".XestroBox").length;
      console.log(`📋 XestroBox count: ${xestroBoxCount}`);
      if (xestroBoxCount === 0) {
        console.error(`📋 ERROR: No XestroBoxes found - not in Patient Record view`);
        throw new Error("Not in Patient Record view - no XestroBoxes found");
      }
      const xestroBoxes = document.querySelectorAll(".XestroBox");
      console.log(`📋 XestroBox details:`, Array.from(xestroBoxes).map((box, index) => ({
        index,
        id: box.id,
        className: box.className,
        textContent: box.textContent?.substring(0, 100) + "..."
      })));
      console.log(`📋 Performing smart empty field detection...`);
      const fieldStatus = this.detectEmptyFieldsVisually();
      console.log(`📋 Visual field detection results:`, fieldStatus);
      console.log(`📋 Starting optimized field extraction...`);
      const extractedData = await this.extractEMRDataOptimized(["background", "investigations", "medications", "problemList"], fieldStatus);
      console.log(`📋 Raw extracted data:`, {
        background: {
          length: extractedData.background?.length || 0,
          preview: extractedData.background?.substring(0, 100) || "EMPTY",
          hasContent: !!extractedData.background?.trim()
        },
        investigations: {
          length: extractedData.investigations?.length || 0,
          preview: extractedData.investigations?.substring(0, 100) || "EMPTY",
          hasContent: !!extractedData.investigations?.trim()
        },
        medications: {
          length: extractedData.medications?.length || 0,
          preview: extractedData.medications?.substring(0, 100) || "EMPTY",
          hasContent: !!extractedData.medications?.trim()
        },
        problemList: {
          length: extractedData.problemList?.length || 0,
          preview: extractedData.problemList?.substring(0, 100) || "EMPTY",
          hasContent: !!extractedData.problemList?.trim()
        }
      });
      const hasAnyData = [
        extractedData.background,
        extractedData.investigations,
        extractedData.medications,
        extractedData.problemList
      ].some((field) => field && field.trim().length > 0);
      console.log(`📋 Data validation: hasAnyData = ${hasAnyData}`);
      if (!hasAnyData) {
        console.warn(`📋 WARNING: No meaningful data extracted from any field`);
      }
      const result = {
        background: extractedData.background || "",
        investigations: extractedData.investigations || "",
        medications: extractedData.medications || "",
        problemList: extractedData.problemList || "",
        extractionTimestamp: Date.now(),
        xestroBoxCount,
        hasAnyData
      };
      console.log(`📋 Final extraction result:`, result);
      return result;
    }
    /**
     * Smart visual detection of empty fields to avoid unnecessary clicking
     */
    detectEmptyFieldsVisually() {
      console.log(`🔍 Scanning page for empty field visual indicators...`);
      const fieldStatus = {
        background: false,
        investigations: false,
        medications: false,
        problemList: false
      };
      const emptyIndicators = document.querySelectorAll('div[style*="color:#ccc"], div[style*="color: #ccc"], .empty-field, .no-content');
      console.log(`🔍 Found ${emptyIndicators.length} potential empty field indicators`);
      emptyIndicators.forEach((indicator, index) => {
        const text = indicator.textContent?.toLowerCase() || "";
        console.log(`🔍 Indicator ${index}: "${text.substring(0, 50)}..."`);
        if (text.includes("no background") || text.includes("no history") || text.includes("background summary")) {
          fieldStatus.background = true;
          console.log(`🔍 ✅ Background field detected as empty`);
        }
        if (text.includes("no investigation") || text.includes("no results") || text.includes("investigation summary")) {
          fieldStatus.investigations = true;
          console.log(`🔍 ✅ Investigations field detected as empty`);
        }
        if (text.includes("no medication") || text.includes("no drugs") || text.includes("medications")) {
          fieldStatus.medications = true;
          console.log(`🔍 ✅ Medications field detected as empty`);
        }
        if (text.includes("no problems") || text.includes("no conditions") || text.includes("problem list")) {
          fieldStatus.problemList = true;
          console.log(`🔍 ✅ Problem list field detected as empty`);
        }
      });
      return fieldStatus;
    }
    /**
     * Optimized EMR data extraction that skips empty fields
     */
    async extractEMRDataOptimized(fields, emptyFieldStatus) {
      console.log(`📋 Starting optimized extraction for fields:`, fields);
      console.log(`📋 Empty field status:`, emptyFieldStatus);
      const extractedData = {};
      for (const fieldName of fields) {
        const normalizedFieldName = fieldName.toLowerCase();
        if (emptyFieldStatus[normalizedFieldName]) {
          console.log(`⚡ OPTIMIZATION: Skipping empty field "${fieldName}" - detected visually as empty`);
          extractedData[fieldName] = "";
          continue;
        }
        console.log(`📋 Extracting content for field: "${fieldName}" (not empty)`);
        let fieldValue = "";
        try {
          switch (normalizedFieldName) {
            case "background":
              fieldValue = await this.extractFieldContent("Background");
              break;
            case "investigations":
            case "investigation-summary":
              fieldValue = await this.extractFieldContent("Investigation Summary");
              break;
            case "medications":
              fieldValue = await this.extractFieldContent("Medications (Problem List for Phil)") || await this.extractFieldContent("Medications");
              break;
            case "problemlist":
              fieldValue = await this.extractFieldContent("Problem List");
              break;
            default:
              fieldValue = await this.extractFieldContent(fieldName);
          }
          extractedData[fieldName] = fieldValue;
          console.log(`✅ Extracted ${fieldValue.length} characters from ${fieldName}`);
        } catch (error) {
          console.warn(`⚠️ Failed to extract ${fieldName}:`, error);
          extractedData[fieldName] = "";
        }
      }
      return extractedData;
    }
    /**
     * Helper method to find button by text content
     */
    findButtonByText(buttonText) {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const found = buttons.find(
        (button) => button.textContent?.trim().toLowerCase().includes(buttonText.toLowerCase()) || button.title?.toLowerCase().includes(buttonText.toLowerCase())
      );
      return found instanceof HTMLElement ? found : null;
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new ContentScriptHandler();
    });
  } else {
    new ContentScriptHandler();
  }
}
