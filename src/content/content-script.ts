// Content script for Operator Chrome Extension
// Handles EMR interaction and field manipulation
/* global HTMLVideoElement, HTMLSelectElement, HTMLStyleElement, Document */

const CONTENT_SCRIPT_VERSION = '2.7.0-xestro-dark-mode';
console.log('🏥 Operator Chrome Extension Content Script Loading...', window.location.href);
console.log('📝 Content Script Version:', CONTENT_SCRIPT_VERSION);
console.log('⏰ Load Time:', new Date().toISOString());
console.log('🔧 EXTRACT_EMR_DATA handler: ENABLED');
console.log('🔧 AI Review support: ENABLED');

// Prevent duplicate injection
if ((window as any).operatorContentScriptLoaded) {
  console.log('🏥 Content script already loaded, skipping...');
  console.log('📝 Previously loaded version:', (window as any).operatorContentScriptVersion || 'unknown');
} else {
  (window as any).operatorContentScriptLoaded = true;
  (window as any).operatorContentScriptVersion = CONTENT_SCRIPT_VERSION;

interface EMRField {
  selector: string;
  type: 'textarea' | 'input' | 'contenteditable';
  label: string;
  waitFor?: string;
}

interface EMRSystem {
  name: string;
  baseUrl: string;
  fields: Record<string, EMRField>;
  selectors: Record<string, string>;
}

class ContentScriptHandler {
  private isInitialized = false;
  private emrSystem: EMRSystem | null = null;
  private currentTabId: number | null = null;
  private blockGlobalFileDrop = false;
  private pathologyOverlayObserver: MutationObserver | null = null;
  private saveAndSendRunning = false;
  private darkModeStyleElement: HTMLStyleElement | null = null;
  private darkModeEnabled = false;
  private pendingIframeDarkModeRefresh: number | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Detect EMR system
      this.emrSystem = this.detectEMRSystem();
      
      if (this.emrSystem) {
        console.log(`🏥 Operator Chrome Extension: Detected ${this.emrSystem.name}`);
        this.setupEventListeners();
        this.setupPathologyOverlayWatcher();
        this.applyPersistedDarkModePreference();
        this.isInitialized = true;
        console.log('🏥 Content script initialized successfully');
      } else {
        console.log('🏥 EMR system not detected on this page:', window.location.href);
      }
    } catch (error) {
      console.error('Content script initialization failed:', error);
    }
  }

  private detectEMRSystem(): EMRSystem | null {
    const hostname = window.location.hostname;
    const _url = window.location.href;

    // Xestro EMR
    if (hostname.includes('my.xestro.com')) {
      return {
        name: 'Xestro',
        baseUrl: 'https://my.xestro.com',
        fields: {
          investigationSummary: {
            selector: 'textarea[data-field="investigation-summary"], #investigation-summary, .investigation-summary textarea, #AddNoteArea',
            type: 'textarea',
            label: 'Investigation Summary',
            waitFor: '.XestroBoxTitle:contains("Investigation Summary")'
          },
          background: {
            selector: 'textarea[data-field="background"], #background, .background textarea',
            type: 'textarea',
            label: 'Background',
            waitFor: '.XestroBoxTitle:contains("Background")'
          },
          medications: {
            selector: 'textarea[data-field="medications"], #medications, .medications textarea',
            type: 'textarea',
            label: 'Medications'
          },
          notes: {
            selector: 'textarea[data-field="notes"], #notes, .notes textarea, #AddNoteArea',
            type: 'textarea',
            label: 'Notes'
          },
          testsRequested: {
            selector: '.TestsRequested input[type="text"], .tests-requested-tagit input[type="text"], ul.TestsRequested li.tagit-new input',
            type: 'input',
            label: 'Tests Requested'
          },
          labField: {
            selector: 'ul li input.ui-widget-content.ui-autocomplete-input, li.tagit-new input.ui-widget-content.ui-autocomplete-input, .ui-widget-content.ui-autocomplete-input:not(.PatientName):not(#PatientName), #Lab.form-control.LabForm.ui-autocomplete-input',
            type: 'input',
            label: 'Lab Autocomplete Field'
          }
        },
        selectors: {
          patientRecord: '.patient-record, .record-view, #patient-view',
          noteArea: '#AddNoteArea, .note-area, textarea[placeholder*="note"]',
          quickLetter: '.quick-letter, .QuickLetter, [data-action="quick-letter"]',
          taskButton: '.task-button, [data-action="create-task"]'
        }
      };
    }


    return null;
  }

  private setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === 'OPEN_CAMERA_OVERLAY' || message?.type === 'OPEN_CANVAS_OVERLAY') {
        const targetSlot = typeof message.targetSlot === 'number' ? message.targetSlot : 0;
        this.openCameraOverlay(targetSlot);
        sendResponse?.({ ok: true });
        return true;
      }
      return false;
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
    });

    // Optional global drag/drop guard to prevent browser navigation
    const dragPreventer = (e: Event) => {
      if (this.blockGlobalFileDrop) {
        e.preventDefault();
        e.stopPropagation();
        return false as unknown as void;
      }
    };
    window.addEventListener('dragover', dragPreventer, true);
    window.addEventListener('drop', dragPreventer, true);

    // Watch for DOM changes to handle dynamic content
    const observer = new MutationObserver((mutations) => {
      this.handleDOMChanges(mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id']
    });

    // Listen for hash changes to auto-trigger patient search
    window.addEventListener('hashchange', () => {
      this.autoSearchFromHash();
    });

    // Check hash on initial page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.autoSearchFromHash();
      });
    } else {
      this.autoSearchFromHash();
    }
  }

  private cameraOverlay: {
    container: HTMLDivElement;
    video: HTMLVideoElement;
    stream: MediaStream | null;
    deviceSelect: HTMLSelectElement;
    refreshButton: HTMLButtonElement;
    targetSlot: number | null;
  } | null = null;

  private async openCameraOverlay(targetSlot: number) {
    try {
      this.destroyCameraOverlay();

      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.backdropFilter = 'blur(4px)';
      overlay.style.zIndex = '2147483647';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      const card = document.createElement('div');
      card.style.width = 'min(960px, 92vw)';
      card.style.maxWidth = '960px';
      card.style.background = '#fff';
      card.style.borderRadius = '24px';
      card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)';
      card.style.overflow = 'hidden';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.padding = '16px 20px';
      header.style.borderBottom = '1px solid #e5e7eb';

      const titleWrap = document.createElement('div');
      const title = document.createElement('div');
      title.textContent = `Use Camera (Slot ${targetSlot + 1})`;
      title.style.fontSize = '18px';
      title.style.fontWeight = '700';
      title.style.color = '#111827';
      const subtitle = document.createElement('div');
      subtitle.textContent = 'Continuity Camera works when this page is foregrounded';
      subtitle.style.fontSize = '13px';
      subtitle.style.color = '#6b7280';
      subtitle.style.marginTop = '4px';
      titleWrap.appendChild(title);
      titleWrap.appendChild(subtitle);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.border = 'none';
      closeBtn.style.background = 'transparent';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.color = '#6b7280';
      closeBtn.onclick = () => this.destroyCameraOverlay();

      header.appendChild(titleWrap);
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.style.padding = '16px 20px';
      body.style.display = 'grid';
      body.style.gap = '12px';

      const selectWrap = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = 'Camera source';
      label.style.fontSize = '14px';
      label.style.fontWeight = '600';
      label.style.color = '#111827';
      label.style.display = 'block';
      label.style.marginBottom = '4px';
      label.setAttribute('for', 'operator-camera-select');

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const select = document.createElement('select');
      select.id = 'operator-camera-select';
      select.style.width = '100%';
      select.style.padding = '10px 12px';
      select.style.border = '1px solid #d1d5db';
      select.style.borderRadius = '10px';
      select.style.fontSize = '14px';
      select.style.color = '#111827';
      select.style.background = '#fff';
      select.style.outline = 'none';
      select.onchange = () => this.startCamera(select.value);

      const refresh = document.createElement('button');
      refresh.textContent = 'Refresh';
      refresh.style.padding = '10px 12px';
      refresh.style.border = '1px solid #d1d5db';
      refresh.style.borderRadius = '10px';
      refresh.style.background = '#fff';
      refresh.style.cursor = 'pointer';
      refresh.onclick = () => this.enumerateAndStart(select);

      row.appendChild(select);
      row.appendChild(refresh);
      selectWrap.appendChild(label);
      selectWrap.appendChild(row);

      const tip = document.createElement('div');
      tip.textContent = 'Unlock your iPhone, keep Wi‑Fi & Bluetooth on, then click Refresh if “iPhone Camera” is missing.';
      tip.style.fontSize = '12px';
      tip.style.color = '#6b7280';

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.width = '100%';
      video.style.aspectRatio = '16 / 9';
      video.style.background = '#000';
      video.style.borderRadius = '16px';
      video.style.objectFit = 'cover';

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.justifyContent = 'flex-end';
      controls.style.gap = '10px';
      controls.style.paddingTop = '8px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '10px 16px';
      cancelBtn.style.border = '1px solid #d1d5db';
      cancelBtn.style.borderRadius = '10px';
      cancelBtn.style.background = '#fff';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.onclick = () => this.destroyCameraOverlay();

      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Capture';
      captureBtn.style.padding = '10px 16px';
      captureBtn.style.border = 'none';
      captureBtn.style.borderRadius = '10px';
      captureBtn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
      captureBtn.style.color = '#fff';
      captureBtn.style.cursor = 'pointer';
      captureBtn.onclick = () => this.captureFrame(targetSlot);

      controls.appendChild(cancelBtn);
      controls.appendChild(captureBtn);

      body.appendChild(selectWrap);
      body.appendChild(tip);
      body.appendChild(video);
      body.appendChild(controls);

      card.appendChild(header);
      card.appendChild(body);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      this.cameraOverlay = {
        container: overlay,
        video,
        stream: null,
        deviceSelect: select,
        refreshButton: refresh,
        targetSlot
      };

      await this.enumerateAndStart(select);
    } catch (error) {
      console.error('Failed to open camera overlay:', error);
    }
  }

  private async enumerateAndStart(select: HTMLSelectElement) {
    try {
      let permissionStream: MediaStream | null = null;
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        console.warn('Camera permission request failed before enumerate:', err);
      } finally {
        if (permissionStream) {
          permissionStream.getTracks().forEach((t) => t.stop());
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === 'videoinput');
      select.innerHTML = '';
      videos.forEach((device, idx) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${idx + 1}`;
        select.appendChild(option);
      });
      const preferred =
        videos.find((d) => d.label.toLowerCase().includes('iphone')) ||
        videos.find((d) => d.label.toLowerCase().includes('continuity')) ||
        videos[0];
      if (preferred) {
        select.value = preferred.deviceId;
        await this.startCamera(preferred.deviceId);
      }
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
    }
  }

  private async startCamera(deviceId: string) {
    if (!this.cameraOverlay) return;
    try {
      if (this.cameraOverlay.stream) {
        this.cameraOverlay.stream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      });
      this.cameraOverlay.video.srcObject = stream;
      this.cameraOverlay.stream = stream;
    } catch (error) {
      console.error('Failed to start camera:', error);
    }
  }

  private captureFrame(targetSlot: number) {
    if (!this.cameraOverlay?.video) return;
    const video = this.cameraOverlay.video;
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;
    const square = Math.min(videoWidth, videoHeight);
    const sx = (videoWidth - square) / 2;
    const sy = (videoHeight - square) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, square, square, 0, 0, 1024, 1024);
    const dataUrl = canvas.toDataURL('image/png');
    chrome.runtime.sendMessage({
      type: 'CAMERA_OVERLAY_RESULT',
      payload: { slot: targetSlot, dataUrl, width: 1024, height: 1024 }
    });
    this.destroyCameraOverlay();
  }

  private destroyCameraOverlay() {
    if (this.cameraOverlay?.stream) {
      this.cameraOverlay.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.cameraOverlay?.container) {
      this.cameraOverlay.container.remove();
    }
    this.cameraOverlay = null;
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    console.log('🏥 Content script received message:', message);
    console.log('📝 Content script version:', CONTENT_SCRIPT_VERSION, 'at', new Date().toISOString());
    console.log('🔧 Available message types: EXTRACT_EMR_DATA, EXECUTE_ACTION, SHOW_SCREENSHOT_INSTRUCTIONS, START_CLIPBOARD_MONITORING');
    try {
      const { type, action, data } = message;
      console.log('📨 Processing message type:', type, 'action:', action);

      // Handle ping for content script readiness check
      if (type === 'PING') {
        sendResponse({ success: true, ready: true, version: CONTENT_SCRIPT_VERSION });
        return;
      }

      // Toggle global file-drop guard (prevents browser navigation on drop)
      if (type === 'SET_FILE_DROP_GUARD') {
        this.blockGlobalFileDrop = !!message.enabled;
        console.log('🛡️ File drop guard set to', this.blockGlobalFileDrop);
        sendResponse({ success: true, enabled: this.blockGlobalFileDrop });
        return;
      }

      // Handle page status check for batch AI review
      if (type === 'PAGE_STATUS_CHECK') {
        try {
          const pageStatus = this.getPageStatus();
          sendResponse({ success: true, status: pageStatus });
        } catch (error) {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Page status check failed' });
        }
        return;
      }

      // Handle XestroBox detection for patient page verification
      if (type === 'CHECK_XESTRO_BOXES') {
        try {
          const xestroBoxCount = document.querySelectorAll('.XestroBox').length;
          const hasPatientData = xestroBoxCount > 0;
          console.log(`📋 XestroBox check: found ${xestroBoxCount} boxes, hasPatientData: ${hasPatientData}`);
          sendResponse({ 
            success: true, 
            found: hasPatientData, 
            count: xestroBoxCount,
            url: window.location.href 
          });
        } catch (error) {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'XestroBox check failed' });
        }
        return;
      }

      if (type === 'SHOW_SCREENSHOT_INSTRUCTIONS') {
        await this.showScreenshotInstructions(data);
        sendResponse({ success: true });
        return;
      }

      if (type === 'CLOSE_SCREENSHOT_INSTRUCTIONS') {
        this.closeScreenshotModal();
        sendResponse({ success: true });
        return;
      }

      if (type === 'START_CLIPBOARD_MONITORING') {
        console.log('📸 Content script received START_CLIPBOARD_MONITORING request');
        this.startClipboardMonitoring(data.timeoutMs || 30000);
        sendResponse({ success: true });
        return;
      }

      if (type === 'EXTRACT_EMR_DATA') {
        console.log('📋 Received EXTRACT_EMR_DATA request - HANDLER FOUND!');
        console.log('📋 Request data:', data);
        console.log('📋 Extracting fields:', data?.fields || ['background', 'investigations', 'medications']);
        try {
          const extractedData = await this.extractEMRData(data?.fields || ['background', 'investigations', 'medications']);
          console.log('📋 EMR extraction completed successfully:', extractedData);
          sendResponse({ success: true, data: extractedData });
        } catch (error) {
          console.error('📋 EMR extraction failed:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'EMR extraction failed' });
        }
        return;
      }

      // Handle AI Review specific EMR data extraction (non-invasive)
      if (type === 'EXTRACT_EMR_DATA_AI_REVIEW') {
        console.log('🤖 Received EXTRACT_EMR_DATA_AI_REVIEW request - NON-INVASIVE EXTRACTION');
        console.log('🤖 Request data:', data);
        console.log('🤖 Extracting fields (non-invasive):', data?.fields || ['background', 'investigations', 'medications-problemlist']);
        try {
          const extractedData = await this.extractEMRDataForAIReview(data?.fields || ['background', 'investigations', 'medications-problemlist']);
          console.log('🤖 AI Review EMR extraction completed successfully:', extractedData);
          sendResponse({ success: true, data: extractedData });
        } catch (error) {
          console.error('🤖 AI Review EMR extraction failed:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'AI Review EMR extraction failed' });
        }
        return;
      }

      // Handle patient data extraction from XestroBoxContent
      if (type === 'EXTRACT_PATIENT_DATA') {
        console.log('👤 Received EXTRACT_PATIENT_DATA request');
        try {
          const patientData = this.extractPatientData();
          console.log('👤 Patient data extraction completed:', patientData);
          sendResponse({ success: true, data: patientData });
        } catch (error) {
          console.error('👤 Patient data extraction failed:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Patient data extraction failed' });
        }
        return;
      }

      // Handle direct custom note content extraction (efficient, no dialog opening)
      if (type === 'EXTRACT_CUSTOM_NOTE_CONTENT') {
        console.log('📋 Received EXTRACT_CUSTOM_NOTE_CONTENT request for field:', message.fieldName);
        try {
          const content = await this.extractCustomNoteContent(message.fieldName);
          console.log(`📋 Custom note extraction completed for "${message.fieldName}": ${content.length} chars`);
          sendResponse({ success: true, data: content });
        } catch (error) {
          console.error(`📋 Custom note extraction failed for "${message.fieldName}":`, error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Custom note extraction failed' });
        }
        return;
      }

      // Handle calendar patient extraction for batch AI review
      if (type === 'extract-calendar-patients') {
        console.log('📅 Received extract-calendar-patients request');
        try {
          const patientData = await this.extractCalendarPatients();
          console.log('📅 Calendar patient extraction completed:', patientData);
          sendResponse({ success: true, data: patientData });
        } catch (error) {
          console.error('📅 Calendar patient extraction failed:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Calendar extraction failed' });
        }
        return;
      }

      if (type !== 'EXECUTE_ACTION') {
        console.log('❌ Unknown message type:', type);
        sendResponse({ error: 'Unknown message type' });
        return;
      }

      console.log(`🏥 Executing action: ${action}`);

      switch (action) {
        case 'insertText':
          await this.insertText(data.text, data.fieldType);
          sendResponse({ success: true });
          break;

        case 'openField':
          await this.openFieldByType(data.fieldType);
          sendResponse({ success: true });
          break;

        case 'investigation-summary':
          if (data?.extractOnly) {
            // Extract content instead of opening
            const content = await this.extractFieldContent('Investigation Summary');
            sendResponse({ success: true, data: content });
          } else if (data?.insertMode === 'append' && data?.content) {
            // Append mode: Open field and append content to existing text
            console.log('📝 Investigation Summary: Opening field and appending content');
            await this.openInvestigationSummary();
            await this.wait(500); // Wait for field to be ready
            
            const noteArea = await this.findNoteArea();
            if (noteArea) {
              await this.insertTextAtEndOfField(noteArea, data.content);
              console.log('✅ Content appended to Investigation Summary field');
            } else {
              console.error('❌ Could not find note area for appending');
              throw new Error('Note area not found for content insertion');
            }
            
            sendResponse({ success: true });
          } else {
            // Open Investigation Summary field for manual entry or with content
            await this.openInvestigationSummary();
            
            // If there's formatted content to insert, add it to the field
            if (data?.content) {
              await this.wait(500); // Wait for field to be ready
              await this.insertFormattedSummary(data.content);
            }
            
            sendResponse({ success: true });
          }
          break;

        case 'background':
          if (data?.extractOnly) {
            // Extract content instead of opening
            const content = await this.extractFieldContent('Background');
            sendResponse({ success: true, data: content });
          } else if (data?.insertMode === 'append' && data?.content) {
            // Append mode: Open field and append content to existing text
            console.log('📝 Background: Opening field and appending content');
            await this.openBackground();
            await this.wait(500); // Wait for field to be ready
            
            const noteArea = await this.findNoteArea();
            if (noteArea) {
              await this.insertTextAtEndOfField(noteArea, data.content);
              console.log('✅ Content appended to Background field');
            } else {
              console.error('❌ Could not find note area for appending');
              throw new Error('Note area not found for content insertion');
            }
            
            sendResponse({ success: true });
          } else {
            await this.openBackground();
            sendResponse({ success: true });
          }
          break;

        case 'medications':
          if (data?.extractOnly) {
            // Extract content instead of opening
            const content = await this.extractFieldContent('Medications (Problem List for Phil)') || 
                            await this.extractFieldContent('Medications');
            sendResponse({ success: true, data: content });
          } else if (data?.insertMode === 'append' && data?.content) {
            // Append mode: Open field and append content to existing text
            console.log('📝 Medications: Opening field and appending content');
            await this.openMedications();
            await this.wait(500); // Wait for field to be ready
            
            const noteArea = await this.findNoteArea();
            if (noteArea) {
              await this.insertTextAtEndOfField(noteArea, data.content);
              console.log('✅ Content appended to Medications field');
            } else {
              console.error('❌ Could not find note area for appending');
              throw new Error('Note area not found for content insertion');
            }
            
            sendResponse({ success: true });
          } else {
            await this.openMedications();
            sendResponse({ success: true });
          }
          break;
        case 'social-history':
          if (data?.insertMode === 'append' && data?.content) {
            // Append mode: Open field and append content to existing text
            console.log('📝 Social History: Opening field and appending content');
            await this.openSocialHistory();
            await this.wait(500); // Wait for field to be ready
            
            const noteArea = await this.findNoteArea();
            if (noteArea) {
              await this.insertTextAtEndOfField(noteArea, data.content);
              console.log('✅ Content appended to Social History field');
            } else {
              console.error('❌ Could not find note area for appending');
              throw new Error('Note area not found for content insertion');
            }
            
            sendResponse({ success: true });
          } else {
            await this.openSocialHistory();
            sendResponse({ success: true });
          }
          break;

        case 'bloods':
          await this.clickPathologyButton();
          await this.setupLabField();
          sendResponse({ success: true });
          break;
        case 'bloods-insert':
          await this.insertIntoLabField(data.content);
          sendResponse({ success: true });
          break;

        case 'imaging':
          await this.clickRadiologyButton();
          sendResponse({ success: true });
          break;

        case 'message-patient':
          if (!data?.message || typeof data.message !== 'string') {
            throw new Error('Message text is required for patient messaging');
          }
          await this.openMessagingWithPrefill(
            typeof data.subject === 'string' ? data.subject : null,
            data.message
          );
          sendResponse({ success: true });
          break;

        case 'extract-patient-data': {
          const patientData = this.extractPatientData();
          if (patientData) {
            sendResponse({ success: true, data: patientData });
          } else {
            sendResponse({ success: false, error: 'No patient data found' });
          }
          break;
        }

        case 'quick-letter':
          await this.openQuickLetter();
          sendResponse({ success: true });
          break;

        case 'create-task':
          await this.createTask();
          sendResponse({ success: true });
          break;

        case 'appointment-wrap-up':
          await this.appointmentWrapUp(data);
          sendResponse({ success: true });
          break;

        case 'profile-photo':
          await this.handleProfilePhoto(data);
          sendResponse({ success: true });
          break;

        case 'xestro-dark-mode': {
          const enabled = this.toggleXestroDarkMode(typeof data?.force === 'boolean' ? data.force : undefined);
          if (enabled === null) {
            sendResponse({ success: false, error: 'Dark mode is only available on my.xestro.com' });
          } else {
            sendResponse({ success: true, enabled });
          }
          break;
        }

        case 'save':
          await this.saveNote();
          sendResponse({ success: true });
          break;

        case 'ai-medical-review':
          // AI medical review should not reach content script
          console.warn('⚠️ AI medical review should be processed entirely in side panel');
          sendResponse({ success: true, message: 'AI medical review should use side panel processing only' });
          break;

        case 'navigate-to-patient':
          console.log('🧭 Received navigate-to-patient request');
          try {
            await this.navigateToPatient(data.fileNumber, data.patientName);
            sendResponse({ success: true });
          } catch (error) {
            console.error('🧭 Patient navigation failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Navigation failed' });
          }
          break;

        case 'GO_TO_PATIENT_BY_FILING':
          console.log('🔍 Received GO_TO_PATIENT_BY_FILING request');
          try {
            await this.searchPatientByFiling(data.fileNumber);
            sendResponse({ success: true });
          } catch (error) {
            console.error('🔍 Patient search by filing failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Search failed' });
          }
          break;

        case 'activate-patient-by-element':
          console.log('🖱️ Received activate-patient-by-element request');
          try {
            await this.activatePatientByElement(data.patientSelector || data.patientIndex);
            sendResponse({ success: true });
          } catch (error) {
            console.error('🖱️ Patient activation failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Patient activation failed' });
          }
          break;
        case 'double-click-patient':
          console.log('👆 SWITCH CASE HIT: double-click-patient');
          console.log('👆 Received double-click-patient request with data:', data);
          console.log('👆 About to call this.doubleClickPatient method...');
          try {
            await this.doubleClickPatient(data.patientName, data.patientId);
            console.log('👆 doubleClickPatient method completed successfully');
            sendResponse({ success: true });
          } catch (error) {
            console.error('👆 Double-click patient failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Double-click patient failed' });
          }
          break;
        case 'navigate-to-patient-record':
          console.log('🏥 SWITCH CASE HIT: navigate-to-patient-record');
          console.log('🏥 Received navigate-to-patient-record request');
          console.log('🏥 About to call this.navigateToPatientRecord method...');
          try {
            await this.navigateToPatientRecord();
            console.log('🏥 navigateToPatientRecord method completed successfully');
            sendResponse({ success: true });
          } catch (error) {
            console.error('🏥 Navigate to patient record failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Navigate to patient record failed' });
          }
          break;
        case 'navigate-to-appointment-book':
          console.log('📅 Received navigate-to-appointment-book request');
          try {
            await this.navigateToAppointmentBook();
            sendResponse({ success: true });
          } catch (error) {
            console.error('📅 Navigate to appointment book failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Navigate to appointment book failed' });
          }
          break;
        case 'extract-calendar-patients':
          console.log('📅 Received extract-calendar-patients request (via EXECUTE_ACTION)');
          try {
            const patientData = await this.extractCalendarPatients();
            console.log('📅 Calendar patient extraction completed:', patientData);
            sendResponse({ success: true, data: patientData });
          } catch (error) {
            console.error('📅 Calendar patient extraction failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Calendar extraction failed' });
          }
          break;
        case 'extract-patient-fields':
          console.log('📋 SWITCH CASE HIT: extract-patient-fields');
          console.log('📋 Received extract-patient-fields request');
          console.log('📋 About to call extractPatientFields method...');
          try {
            const fieldsData = await this.extractPatientFields();
            console.log('📋 extractPatientFields completed, sending response:', fieldsData);
            sendResponse({ success: true, data: fieldsData });
          } catch (error) {
            console.error('📋 Extract patient fields failed:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Extract patient fields failed' });
          }
          break;

        default:
          console.log(`❌ DEFAULT CASE HIT: Unknown action "${action}"`);
          console.log(`❌ Available SPA actions: double-click-patient, navigate-to-patient-record, extract-patient-fields`);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script message handling error:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private getXestroDarkModeCssText(): string {
    return `
      /* Operator Xestro Dark Mode (Material-inspired) */
      html.operator-xestro-dark-mode {
        color-scheme: dark;

        /* Core palette (Material Dark Theme guidance: dark surfaces + high contrast text) */
        --operator-xestro-bg: #000000;
        --operator-xestro-surface-0: #121212;
        --operator-xestro-surface-1: #1e1e1e;
        --operator-xestro-surface-2: #2a2a2a;
        --operator-xestro-surface-3: #333333;

        --operator-xestro-text-primary: rgba(255, 255, 255, 0.87);
        --operator-xestro-text-secondary: rgba(255, 255, 255, 0.60);
        --operator-xestro-text-disabled: rgba(255, 255, 255, 0.38);

        --operator-xestro-border: rgba(255, 255, 255, 0.12);
        --operator-xestro-border-strong: rgba(255, 255, 255, 0.20);

        --operator-xestro-link: #8ab4f8;
        --operator-xestro-accent: #03dac6;
        --operator-xestro-danger: #cf6679;
        --operator-xestro-focus: rgba(138, 180, 248, 0.35);

        background: var(--operator-xestro-bg);
      }

      html.operator-xestro-dark-mode body {
        background: var(--operator-xestro-bg) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode a {
        color: var(--operator-xestro-link) !important;
      }

      html.operator-xestro-dark-mode ::selection {
        background: rgba(3, 218, 198, 0.25);
      }

      /* Xestro core surfaces */
      html.operator-xestro-dark-mode .XestroBox,
      html.operator-xestro-dark-mode .XestroBoxContent,
      html.operator-xestro-dark-mode .patient-record,
      html.operator-xestro-dark-mode .record-view,
      html.operator-xestro-dark-mode #patient-view {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .XestroBox {
        border: 1px solid var(--operator-xestro-border) !important;
        box-shadow: none !important;
      }

      html.operator-xestro-dark-mode .XestroBoxTitle,
      html.operator-xestro-dark-mode .XestroBoxHeader,
      html.operator-xestro-dark-mode .XestroHeader,
      html.operator-xestro-dark-mode .Header,
      html.operator-xestro-dark-mode header {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Common container fallbacks (Bootstrap-like patterns) */
      html.operator-xestro-dark-mode .panel,
      html.operator-xestro-dark-mode .panel-body,
      html.operator-xestro-dark-mode .panel-heading,
      html.operator-xestro-dark-mode .card,
      html.operator-xestro-dark-mode .card-body,
      html.operator-xestro-dark-mode .card-header,
      html.operator-xestro-dark-mode .modal-content,
      html.operator-xestro-dark-mode .dropdown-menu {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Document views and attachments */
      html.operator-xestro-dark-mode .documents,
      html.operator-xestro-dark-mode .documents-list,
      html.operator-xestro-dark-mode .document-item,
      html.operator-xestro-dark-mode .document-preview,
      html.operator-xestro-dark-mode .document-thumbnail,
      html.operator-xestro-dark-mode .attachment,
      html.operator-xestro-dark-mode .attachment-list,
      html.operator-xestro-dark-mode .attachment-item,
      html.operator-xestro-dark-mode .file-preview,
      html.operator-xestro-dark-mode .file-list,
      html.operator-xestro-dark-mode .preview-container,
      html.operator-xestro-dark-mode .thumbnail-container {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Sidebar panels and sections */
      html.operator-xestro-dark-mode .sidebar,
      html.operator-xestro-dark-mode .side-panel,
      html.operator-xestro-dark-mode .right-panel,
      html.operator-xestro-dark-mode .left-panel,
      html.operator-xestro-dark-mode .info-panel,
      html.operator-xestro-dark-mode .detail-panel,
      html.operator-xestro-dark-mode .patient-info,
      html.operator-xestro-dark-mode .patient-details,
      html.operator-xestro-dark-mode .summary-panel,
      html.operator-xestro-dark-mode .context-panel {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Section headers and titles */
      html.operator-xestro-dark-mode .section,
      html.operator-xestro-dark-mode .section-header,
      html.operator-xestro-dark-mode .section-title,
      html.operator-xestro-dark-mode .section-content,
      html.operator-xestro-dark-mode .section-body,
      html.operator-xestro-dark-mode .content-section,
      html.operator-xestro-dark-mode .box,
      html.operator-xestro-dark-mode .box-header,
      html.operator-xestro-dark-mode .box-body,
      html.operator-xestro-dark-mode .box-content {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Generic div containers with white backgrounds */
      html.operator-xestro-dark-mode .content,
      html.operator-xestro-dark-mode .main-content,
      html.operator-xestro-dark-mode .wrapper,
      html.operator-xestro-dark-mode .container-fluid,
      html.operator-xestro-dark-mode .inner,
      html.operator-xestro-dark-mode .inner-content,
      html.operator-xestro-dark-mode .view,
      html.operator-xestro-dark-mode .view-content {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      /* Lists and items */
      html.operator-xestro-dark-mode .list,
      html.operator-xestro-dark-mode .list-item,
      html.operator-xestro-dark-mode .item,
      html.operator-xestro-dark-mode .list-group,
      html.operator-xestro-dark-mode .list-group-item {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Catch-all for common background colors inline styles */
      html.operator-xestro-dark-mode [style*="background-color: white"],
      html.operator-xestro-dark-mode [style*="background-color: #fff"],
      html.operator-xestro-dark-mode [style*="background-color: #ffffff"],
      html.operator-xestro-dark-mode [style*="background-color: rgb(255, 255, 255)"],
      html.operator-xestro-dark-mode [style*="background: white"],
      html.operator-xestro-dark-mode [style*="background: #fff"],
      html.operator-xestro-dark-mode [style*="background: #ffffff"] {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      /* Form controls (scoped to likely Xestro containers to avoid theming Operator overlays) */
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="text"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="search"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="email"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="url"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="tel"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="password"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="number"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) textarea,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) select,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) .form-control {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border-strong) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input::placeholder,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) textarea::placeholder {
        color: var(--operator-xestro-text-secondary) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input:focus,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) textarea:focus,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) select:focus,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) .form-control:focus {
        border-color: rgba(138, 180, 248, 0.55) !important;
        box-shadow: 0 0 0 3px var(--operator-xestro-focus) !important;
        outline: none !important;
      }

      /* Buttons (scoped) */
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) button,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) input[type="button"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) input[type="submit"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) .btn {
        background: var(--operator-xestro-surface-2) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) .btn-primary,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) button.primary {
        background: rgba(3, 218, 198, 0.16) !important;
        border-color: rgba(3, 218, 198, 0.35) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) button:hover,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) .btn:hover {
        background: var(--operator-xestro-surface-3) !important;
      }

      /* jQuery UI (autocomplete/dialogs) */
      html.operator-xestro-dark-mode .ui-widget-content,
      html.operator-xestro-dark-mode .ui-dialog,
      html.operator-xestro-dark-mode .ui-dialog-content,
      html.operator-xestro-dark-mode .ui-menu,
      html.operator-xestro-dark-mode .ui-datepicker {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .ui-widget-header,
      html.operator-xestro-dark-mode .ui-dialog-titlebar {
        background: var(--operator-xestro-surface-2) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .ui-state-default,
      html.operator-xestro-dark-mode .ui-button,
      html.operator-xestro-dark-mode .ui-menu-item-wrapper {
        background: var(--operator-xestro-surface-2) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .ui-state-hover,
      html.operator-xestro-dark-mode .ui-state-focus,
      html.operator-xestro-dark-mode .ui-menu-item-wrapper.ui-state-active {
        background: var(--operator-xestro-surface-3) !important;
        border-color: var(--operator-xestro-border-strong) !important;
      }

      html.operator-xestro-dark-mode .ui-state-active,
      html.operator-xestro-dark-mode .ui-state-highlight {
        background: rgba(3, 218, 198, 0.16) !important;
        border-color: rgba(3, 218, 198, 0.35) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      /* jQuery UI icon sprites are usually dark; invert them only */
      html.operator-xestro-dark-mode .ui-icon {
        filter: invert(1) hue-rotate(180deg) saturate(1.2);
      }

      /* Tag-it */
      html.operator-xestro-dark-mode ul.tagit {
        background: var(--operator-xestro-surface-1) !important;
        border: 1px solid var(--operator-xestro-border-strong) !important;
      }

      html.operator-xestro-dark-mode ul.tagit li.tagit-choice {
        background: rgba(138, 180, 248, 0.12) !important;
        border: 1px solid rgba(138, 180, 248, 0.35) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode ul.tagit li.tagit-choice .tagit-close {
        color: var(--operator-xestro-text-secondary) !important;
      }

      /* Tables (scoped) */
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) table {
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) th,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) td {
        border-color: var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) tr:nth-child(even) td {
        background: rgba(255, 255, 255, 0.03) !important;
      }

      /* Scrollbars (WebKit) */
      html.operator-xestro-dark-mode ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      html.operator-xestro-dark-mode ::-webkit-scrollbar-track {
        background: var(--operator-xestro-surface-0);
      }
      html.operator-xestro-dark-mode ::-webkit-scrollbar-thumb {
        background: var(--operator-xestro-surface-2);
        border-radius: 8px;
        border: 3px solid var(--operator-xestro-surface-0);
      }
      html.operator-xestro-dark-mode ::-webkit-scrollbar-thumb:hover {
        background: var(--operator-xestro-surface-3);
      }
    `;
  }

  private ensureDarkModeStyles() {
    if (this.darkModeStyleElement) return;

    const style = document.createElement('style');
    style.id = '__operator_xestro_dark_mode__';
    style.textContent = this.getXestroDarkModeCssText();

    (document.head || document.documentElement).appendChild(style);
    this.darkModeStyleElement = style;
  }

  private ensureDarkModeStylesInDocument(targetDocument: Document) {
    if (targetDocument.getElementById('__operator_xestro_dark_mode__')) return;

    const style = targetDocument.createElement('style');
    style.id = '__operator_xestro_dark_mode__';
    style.textContent = this.getXestroDarkModeCssText();
    (targetDocument.head || targetDocument.documentElement).appendChild(style);
  }

  private applyXestroDarkModeToSameOriginIframes(enabled: boolean) {
    if (!this.emrSystem || this.emrSystem.name !== 'Xestro') return;

    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      try {
        const iframeDocument = iframe.contentDocument;
        if (!iframeDocument?.documentElement) continue;
        this.ensureDarkModeStylesInDocument(iframeDocument);
        iframeDocument.documentElement.classList.toggle('operator-xestro-dark-mode', enabled);
      } catch {
        // Ignore cross-origin iframes
      }
    }
  }

  private toggleXestroDarkMode(forceState?: boolean): boolean | null {
    if (!this.emrSystem || this.emrSystem.name !== 'Xestro') {
      console.warn('🌙 Dark mode toggle ignored: Xestro EMR not detected');
      return null;
    }

    this.ensureDarkModeStyles();

    const currentlyEnabled = this.darkModeEnabled || document.documentElement.classList.contains('operator-xestro-dark-mode');
    const nextState = typeof forceState === 'boolean' ? forceState : !currentlyEnabled;

    document.documentElement.classList.toggle('operator-xestro-dark-mode', nextState);
    this.darkModeEnabled = nextState;
    this.applyXestroDarkModeToSameOriginIframes(nextState);

    try {
      localStorage.setItem('operator-xestro-dark-mode', nextState ? 'true' : 'false');
    } catch (error) {
      console.debug('Unable to persist dark mode preference:', error);
    }

    console.log(`🌙 Xestro dark mode ${nextState ? 'enabled' : 'disabled'}`);
    return nextState;
  }

  private applyPersistedDarkModePreference() {
    if (!this.emrSystem || this.emrSystem.name !== 'Xestro') return;

    try {
      const stored = localStorage.getItem('operator-xestro-dark-mode');
      if (stored === 'true') {
        console.log('🌙 Restoring Xestro dark mode from previous session');
        this.toggleXestroDarkMode(true);
      }
    } catch (error) {
      console.debug('Skipping dark mode restore:', error);
    }
  }

  private handleKeyboardShortcut(event: KeyboardEvent) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (!isCtrlOrCmd || !event.shiftKey) return;

    switch (event.key.toLowerCase()) {
      case 'i':
        event.preventDefault();
        this.openInvestigationSummary();
        break;
      case 'b':
        event.preventDefault();
        this.openBackground();
        break;
      case 'm':
        event.preventDefault();
        this.openMedications();
        break;
      case 's':
        event.preventDefault();
        this.openSocialHistory();
        break;
      case 'l':
        event.preventDefault();
        this.openQuickLetter();
        break;
      case 't':
        event.preventDefault();
        this.createTask();
        break;
    }
  }

  private handleDOMChanges(mutations: MutationRecord[]) {
    // Handle dynamic content loading
    let iframeAdded = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if new EMR elements were added
            if (element.matches?.('.note-area, textarea, .field-container')) {
              // Update field mappings if needed
              this.updateFieldMappings();
            }

            if (!iframeAdded && (element.matches?.('iframe') || element.querySelector?.('iframe'))) {
              iframeAdded = true;
            }
          }
        });
      }
    }

    if (iframeAdded && this.darkModeEnabled && this.emrSystem?.name === 'Xestro') {
      if (this.pendingIframeDarkModeRefresh) {
        window.clearTimeout(this.pendingIframeDarkModeRefresh);
      }
      this.pendingIframeDarkModeRefresh = window.setTimeout(() => {
        this.pendingIframeDarkModeRefresh = null;
        this.applyXestroDarkModeToSameOriginIframes(true);
      }, 250);
    }
  }

  private async insertText(text: string, fieldType?: string) {
    let targetElement: HTMLElement | null = null;

    if (fieldType && this.emrSystem?.fields[fieldType]) {
      // Special handling for investigation-summary to ensure AddNoteArea is available
      if (fieldType === 'investigationSummary' || fieldType === 'investigation-summary') {
        console.log('📝 Special handling for Investigation Summary insertion - waiting for AddNoteArea');

        // First try to find AddNoteArea specifically (it appears after dialog opens)
        targetElement = await this.findElement('#AddNoteArea', 3000); // Wait up to 3 seconds

        if (!targetElement) {
          console.log('⚠️ AddNoteArea not found, falling back to Investigation Summary textarea');
          // Fallback to other investigation summary selectors
          targetElement = await this.findElement(this.emrSystem.fields[fieldType].selector);
        } else {
          console.log('✅ Found AddNoteArea for Investigation Summary insertion');
        }
      } else {
        targetElement = await this.findElement(this.emrSystem.fields[fieldType].selector);
      }
    } else {
      // Find the currently focused element or active note area
      targetElement = document.activeElement as HTMLElement;

      if (!this.isTextInputElement(targetElement)) {
        targetElement = await this.findActiveNoteArea();
      }
    }

    if (!targetElement) {
      throw new Error('No suitable text input found');
    }

    await this.insertTextIntoElement(targetElement, text);
  }

  private async openFieldByType(fieldType: string) {
    console.log(`📝 Opening EMR field by type: ${fieldType}`);

    // Use the same field opening logic as the specific field actions
    // This ensures Insert button behavior matches the "Type" option behavior
    switch (fieldType) {
      case 'investigationSummary':
      case 'investigation-summary':
        console.log('📝 Using openInvestigationSummary() for field opening');
        await this.openInvestigationSummary();
        break;

      case 'background':
        console.log('📝 Using openBackground() for field opening');
        await this.openBackground();
        break;

      case 'medications':
        console.log('📝 Using openMedications() for field opening');
        await this.openMedications();
        break;

      default:
        // Fallback to the old behavior for unmapped field types
        console.log(`📝 Using fallback field opening for: ${fieldType}`);
        if (!this.emrSystem?.fields[fieldType]) {
          throw new Error(`Unknown field type: ${fieldType}`);
        }

        {
          const field = this.emrSystem.fields[fieldType];
          const element = await this.findElement(field.selector, 5000);

          if (element) {
            this.focusElement(element);
          } else {
            throw new Error(`Field ${fieldType} not found`);
          }
        }
        break;
    }

    console.log(`✅ Field ${fieldType} opened successfully`);
  }

  private async insertTextIntoElement(element: HTMLElement, text: string) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      
      // Get current cursor position
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = input.value;
      
      // Insert text at cursor position
      const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
      input.value = newValue;
      
      // Set cursor position after inserted text
      const newCursorPos = start + text.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
    } else if (element.contentEditable === 'true') {
      // Handle contenteditable elements
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
      
      // Trigger events
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Focus the element
    element.focus();
  }

  private async insertFormattedSummary(formattedContent: string) {
    console.log('📝 Inserting formatted investigation summary:', formattedContent);
    
    try {
      // Find the specific Investigation Summary textarea (AddNoteArea)
      const noteArea = await this.findInvestigationSummaryTextarea();
      if (!noteArea) {
        console.error('❌ No Investigation Summary textarea (AddNoteArea) found');
        return;
      }

      // Insert the formatted content at the end of the field with proper formatting
      await this.insertTextAtEndOfField(noteArea, formattedContent);
      
      console.log('✅ Successfully inserted formatted investigation summary');
    } catch (error) {
      console.error('❌ Error inserting formatted summary:', error);
    }
  }

  private async findInvestigationSummaryTextarea(): Promise<HTMLElement | null> {
    console.log('🔍 Looking for Investigation Summary textarea...');
    
    // First try to find the Investigation Summary specific textarea within the XestroBox context
    const investigationSpecificSelectors = [
      // Look for textarea within Investigation Summary XestroBox
      '.XestroBox:has(.XestroBoxTitle:contains("Investigation Summary")) textarea',
      '.XestroBox:has(.XestroBoxTitle:contains("Investigation Summary")) .AddNoteArea',
      // Look for Investigation Summary section with textarea
      '[data-field="investigation-summary"] textarea',
      '#investigation-summary textarea',
      '.investigation-summary textarea'
    ];
    
    for (const selector of investigationSpecificSelectors) {
      console.log(`🔍 Trying Investigation Summary specific selector: ${selector}`);
      const element = await this.findElement(selector, 2000);
      if (element && element.tagName === 'TEXTAREA') {
        console.log(`✅ Found Investigation Summary specific textarea with selector: ${selector}`);
        return element;
      }
    }
    
    // Fallback to generic selectors but prefer ones that are currently visible and focused
    const genericSelectors = [
      'textarea#AddNoteArea:focus',
      'textarea.AddNoteArea:focus', 
      'textarea#AddNoteArea',
      'textarea.AddNoteArea',
      'textarea[placeholder*="Add a note"]',
      'textarea.form-control.AddNoteArea'
    ];
    
    for (const selector of genericSelectors) {
      console.log(`🔍 Trying generic selector: ${selector}`);
      const element = await this.findElement(selector, 1000);
      if (element && element.tagName === 'TEXTAREA') {
        // Additional check: make sure this textarea is visible and not at the bottom of the page
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        const isNotAtBottom = rect.top < window.innerHeight * 0.8; // Not in bottom 20% of page
        
        if (isVisible && isNotAtBottom) {
          console.log(`✅ Found suitable Investigation Summary textarea with selector: ${selector}`);
          return element;
        } else {
          console.log(`⚠️ Found textarea but it appears to be at bottom of page, skipping: ${selector}`);
        }
      }
    }
    
    console.warn('⚠️ Could not find suitable Investigation Summary textarea with any selector');
    return null;
  }

  private async insertTextAtEndOfField(element: HTMLElement, text: string) {
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      
      console.log('📝 Inserting into input/textarea:', { id: input.id, className: input.className, length: input.value?.length || 0 });

      // Get current content and prepare insertion
      const currentValue = input.value;
      let textToInsert = text;
      
      // If field has existing content, add a newline before the new content
      if (currentValue.trim().length > 0) {
        textToInsert = '\n' + text;
      }
      
      // Position cursor at the very end
      const endPosition = currentValue.length;
      input.setSelectionRange(endPosition, endPosition);
      
      // Insert text at the end
      const newValue = currentValue + textToInsert;
      input.value = newValue;
      
      // Position cursor after the newly inserted text
      const newCursorPos = newValue.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger events to ensure the change is registered
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Keep the field focused for user review
      input.focus();
      
      // Scroll to bottom of textarea if needed
      if (element.tagName === 'TEXTAREA') {
        input.scrollTop = input.scrollHeight;
      }
      
      console.log(`📝 Inserted text at end of field. Field now has ${newValue.length} characters.`);
      
    } else if (element.contentEditable === 'true') {
      // Handle contenteditable elements - move to end
      console.log('📝 Inserting into contenteditable element:', { id: element.id, className: element.className });
      element.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Move to the end of the element
      range.selectNodeContents(element);
      range.collapse(false); // Collapse to end
      
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Add newline if content exists
      const currentContent = element.textContent || '';
      let textToInsert = text;
      if (currentContent.trim().length > 0) {
        textToInsert = '\n' + text;
      }
      
      // Insert the text
      range.insertNode(document.createTextNode(textToInsert));
      
      // Move cursor to end
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Trigger events and focus
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.focus();
    }
    
    console.log('✅ Text inserted at end of field and field kept focused for review');
  }

  private async openInvestigationSummary() {
    console.log('📝 Opening Investigation Summary section in Xestro');
    await this.openCustomField('Investigation Summary');
  }

  private async openCustomFieldWithTemplate(fieldName: string, templateFn: () => string) {
    console.log(`📝 Opening ${fieldName} with template in note area`);
    
    const noteArea = await this.findNoteArea();
    if (!noteArea) {
      console.error('❌ No suitable note area found on page');
      throw new Error('Note area not found');
    }
    
    // Focus the element
    noteArea.focus();
    
    // Get template content and current value
    const templateContent = templateFn();
    const isContentEditable = noteArea.contentEditable === 'true';
    const currentValue = isContentEditable ? noteArea.innerText || '' : (noteArea as HTMLTextAreaElement).value || '';
    
    // Check if this field already exists
    const firstLine = templateContent.split('\n')[0];
    if (!currentValue.includes(firstLine)) {
      // Add the template content
      const newValue = `${templateContent}\n${currentValue}`;
      
      if (isContentEditable) {
        // Handle contenteditable div (original Xestro approach)
        noteArea.innerText = newValue;
        noteArea.dispatchEvent(new Event('input', { bubbles: true }));
        noteArea.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Handle textarea
        const textarea = noteArea as HTMLTextAreaElement;
        textarea.value = newValue;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    // Visual feedback
    noteArea.style.boxShadow = '0 0 5px 2px rgba(33, 150, 243, 0.5)';
    setTimeout(() => {
      noteArea.style.boxShadow = '';
    }, 1000);
    
    // Ensure the element is visible
    noteArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Original Xestro auto-save functionality
    setTimeout(() => {
      const saveButton = document.querySelector('#patientNotesSave') as HTMLButtonElement;
      if (saveButton && confirm('Save the updated notes?')) {
        saveButton.click();
        console.log('💾 Auto-saved via Xestro save button');
      }
    }, 1000);
    
    console.log('✅ Note area ready for input with template (Xestro method)');
  }

  private async findNoteArea(): Promise<HTMLElement | null> {
    console.log('🔍 Looking for Xestro note input areas...');
    
    // Prefer the AddNoteArea textarea if present (reliable for Xestro sections)
    const addNoteArea = document.getElementById('AddNoteArea') as HTMLTextAreaElement | null;
    if (addNoteArea && addNoteArea.offsetParent !== null) {
      console.log('✅ Using AddNoteArea textarea as note area');
      return addNoteArea;
    }

    // Original working Xestro selectors (contenteditable divs, not textareas)
    const xestroSelectors = [
      '#patientNotesInput',      // Primary Xestro notes area
      '#patientNoteInput',       // Alternative spelling
      '.patient-notes-input',    // Class-based
      '[contenteditable="true"]' // Any contenteditable element
    ];

    // Try Xestro-specific selectors first
    for (const selector of xestroSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && (element as HTMLElement).offsetParent !== null) {
        console.log(`✅ Found Xestro note area with selector: ${selector}`);
        return element;
      }
    }

    // Log all contenteditable elements for debugging
    const allContentEditable = document.querySelectorAll('[contenteditable="true"], [contenteditable]');
    console.log(`🔍 Found ${allContentEditable.length} contenteditable elements:`);
    allContentEditable.forEach((elem, index) => {
      console.log(`  ${index + 1}. ID: "${elem.id}" Class: "${elem.className}" Size: ${(elem as HTMLElement).offsetWidth}x${(elem as HTMLElement).offsetHeight}`);
    });

    // Also check textareas as fallback
    const allTextareas = document.querySelectorAll('textarea');
    console.log(`🔍 Found ${allTextareas.length} textareas:`);
    allTextareas.forEach((textarea, index) => {
      console.log(`  ${index + 1}. ID: "${textarea.id}" Class: "${textarea.className}" Placeholder: "${textarea.placeholder}"`);
    });

    // Try any visible contenteditable element
    for (let i = 0; i < allContentEditable.length; i++) {
      const element = allContentEditable[i] as HTMLElement;
      if ((element as HTMLElement).offsetParent !== null && 
          (element as HTMLElement).offsetWidth > 50 && 
          (element as HTMLElement).offsetHeight > 30) {
        console.log(`✅ Found usable contenteditable at index ${i + 1}`);
        return element;
      }
    }

    // Fallback to textareas
    for (let i = 0; i < allTextareas.length; i++) {
      const textarea = allTextareas[i] as HTMLTextAreaElement;
      if (textarea.offsetParent !== null && 
          !textarea.readOnly && 
          !textarea.disabled &&
          textarea.offsetWidth > 50 && 
          textarea.offsetHeight > 30) {
        console.log(`✅ Found usable textarea at index ${i + 1}${textarea.id ? ` (id: ${textarea.id})` : ''}`);
        return textarea;
      }
    }

    // If no textarea found, wait for dynamic content with MutationObserver
    console.log('⏳ No textarea found immediately, waiting for dynamic content...');
    
    return new Promise<HTMLTextAreaElement | null>((resolve) => {
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (observer) observer.disconnect();
      };

      const checkForTextarea = () => {
        // Prefer AddNoteArea if it appears dynamically
        const dynamicAddNoteArea = document.getElementById('AddNoteArea') as HTMLTextAreaElement | null;
        if (dynamicAddNoteArea && dynamicAddNoteArea.offsetParent !== null) {
          console.log('✅ Found AddNoteArea dynamically');
          cleanup();
          resolve(dynamicAddNoteArea);
          return;
        }

        // Try specific selectors first
        for (const selector of xestroSelectors) {
          const element = document.querySelector(selector) as HTMLTextAreaElement;
          if (element && element.offsetParent !== null) {
            console.log(`✅ Found note area dynamically with selector: ${selector}`);
            cleanup();
            resolve(element);
            return;
          }
        }

        // Try any visible textarea
        const allTextareas = document.querySelectorAll('textarea');
        for (let i = 0; i < allTextareas.length; i++) {
          const textarea = allTextareas[i] as HTMLTextAreaElement;
          if (textarea.offsetParent !== null &&
              !textarea.readOnly &&
              !textarea.disabled &&
              textarea.offsetWidth > 50 &&
              textarea.offsetHeight > 30) {
            console.log(`✅ Found usable textarea dynamically at index ${i + 1}`);
            cleanup();
            resolve(textarea);
            return;
          }
        }
      };

      // Set up MutationObserver to watch for new elements
      const observer = new MutationObserver((mutations) => {
        let hasNewTextarea = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.tagName === 'TEXTAREA' || element.querySelector('textarea')) {
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
      
      // Start observing
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also check periodically in case we miss something
      const intervalId = setInterval(checkForTextarea, 500);
      
      // Set timeout to avoid waiting forever
      const timeoutId = setTimeout(() => {
        cleanup();
        clearInterval(intervalId);
        console.log('❌ Timeout waiting for textarea');
        resolve(null);
      }, 10000); // 10 second timeout
      
      // Check one more time immediately
      checkForTextarea();
    });
  }

  private async openCustomField(fieldName: string) {
    console.log(`📝 Opening ${fieldName} section in Xestro`);
    
    // Step 1: Find and click the XestroBox title to expand the section
    const xestroBox = await this.findAndClickXestroBox(fieldName);
    if (!xestroBox) {
      console.error(`❌ Could not find XestroBox for ${fieldName}`);
      throw new Error(`XestroBox for ${fieldName} not found`);
    }
    
    // Step 2: Wait for AddNoteArea textarea to appear after clicking
    console.log('⏳ Waiting for AddNoteArea textarea to appear...');
    const noteArea = await this.waitForAddNoteArea();
    if (!noteArea) {
      console.error('❌ AddNoteArea textarea did not appear after clicking XestroBox');
      throw new Error('AddNoteArea textarea not found');
    }
    
    // Step 3: Focus the textarea and position cursor at the end
    noteArea.focus();
    console.log(`✅ Found AddNoteArea textarea for ${fieldName}`);
    
    // Position cursor at the end of existing content
    const currentValue = noteArea.value || '';
    const cursorPos = currentValue.length;
    noteArea.setSelectionRange(cursorPos, cursorPos);
    
    // Trigger focus event to ensure cursor is visible
    noteArea.dispatchEvent(new Event('focus', { bubbles: true }));
    
    // Visual feedback
    noteArea.style.boxShadow = '0 0 5px 2px rgba(33, 150, 243, 0.5)';
    setTimeout(() => {
      noteArea.style.boxShadow = '';
    }, 1000);
    
    // Ensure the textarea is visible
    noteArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    console.log(`✅ ${fieldName} section opened and ready for input`);
  }

  private async openBackground() {
    console.log('📝 Opening Background in note area');
    await this.openCustomField('Background');
  }

  private async openMedications() {
    console.log('📝 Opening Medications section in Xestro');
    // Use the specific medication title
    await this.openCustomField('Medications (Problem List for Phil)');
  }

  private async openSocialHistory() {
    console.log('📝 Opening Social & Family History section in Xestro');
    await this.openCustomField('Social & Family History');
  }

  private async openPatientConversation() {
    const messageButton = await this.findElement('.MessageButton', 5000);
    if (!messageButton) {
      throw new Error('Message button not found');
    }

    console.log('💬 Opening messaging panel');
    messageButton.click();
    await this.wait(800);

    const patientConversationButton = await this.findElement('.CreateConversationButton[data-conversationtype="Patient"]', 5000);
    if (!patientConversationButton) {
      throw new Error('Patient conversation button not found');
    }

    console.log('👤 Selecting patient conversation');
    patientConversationButton.click();
    await this.wait(500);
  }

  private setupPathologyOverlayWatcher() {
    if (this.emrSystem?.name !== 'Xestro') return;
    if (this.pathologyOverlayObserver) return;

    // Try immediately in case the overlay is already open
    this.tryEnhancePathologyOverlay(document.body);

    this.pathologyOverlayObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;

        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (this.tryEnhancePathologyOverlay(node)) {
            return;
          }
        }
      }
    });

    this.pathologyOverlayObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private tryEnhancePathologyOverlay(root: Element | Document | null): boolean {
    if (!root) return false;

    const overlay = (root instanceof HTMLElement && root.id === 'Clinical_Investigations_Edit'
      ? root
      : root.querySelector?.('#Clinical_Investigations_Edit')) as HTMLElement | null;

    if (overlay && !overlay.hasAttribute('data-operator-save-send')) {
      console.log('🩸 Pathology overlay detected - injecting Save and Send button');
      this.injectSaveAndSendButton(overlay);
      return true;
    }

    return false;
  }

  private injectSaveAndSendButton(overlay: HTMLElement) {
    const footerInner = overlay.querySelector('.footer .inner');
    if (!footerInner) {
      console.warn('⚠️ Pathology overlay footer not found - cannot inject Save and Send button');
      return;
    }

    const saveAndSendButton = document.createElement('button');
    saveAndSendButton.type = 'button';
    saveAndSendButton.className = 'btn btn-default full operator-save-and-send';
    saveAndSendButton.textContent = 'Save and Send';
    saveAndSendButton.style.display = 'inline-block';

    // Position after Save (Button2) and before Print if possible
    const printButton = footerInner.querySelector('.Button1');
    if (printButton && printButton.parentElement === footerInner) {
      footerInner.insertBefore(saveAndSendButton, printButton);
    } else {
      footerInner.appendChild(saveAndSendButton);
    }

    overlay.setAttribute('data-operator-save-send', 'true');

    saveAndSendButton.addEventListener('click', () => {
      this.handleSaveAndSendFlow(overlay, saveAndSendButton);
    });
  }

  private async handleSaveAndSendFlow(overlay: HTMLElement, triggerButton: HTMLButtonElement) {
    if (this.saveAndSendRunning) {
      console.log('ℹ️ Save and Send already running, ignoring duplicate click');
      return;
    }

    this.saveAndSendRunning = true;
    const originalText = triggerButton.textContent || 'Save and Send';
    triggerButton.disabled = true;
    triggerButton.textContent = 'Working...';

    try {
      const saveButton = overlay.querySelector<HTMLButtonElement>('.Button2');
      if (!saveButton) {
        throw new Error('Save button not found in pathology overlay');
      }

      console.log('💾 Clicking Save before messaging flow');
      saveButton.click();
      await this.wait(800);

      await this.openMessagingAndAttachLatestRequest();
      this.showSuccessMessage('Saved and prepared patient message with latest pathology slip.');
    } catch (error) {
      console.error('❌ Save and Send workflow failed:', error);
      this.showErrorMessage('Save and Send failed. Please complete manually.');
    } finally {
      triggerButton.disabled = false;
      triggerButton.textContent = originalText;
      this.saveAndSendRunning = false;
    }
  }

  private async openMessagingAndAttachLatestRequest() {
    await this.openPatientConversation();

    const attachDropdown = await this.findElement('#dropdownMenuExisting', 5000);
    if (!attachDropdown) {
      throw new Error('Attach dropdown not found');
    }

    console.log('📎 Opening attach dropdown');
    attachDropdown.click();
    await this.wait(300);

    const investigationMenuItem = await this.findElement('.AttachFiles[data-type="REQUEST"]', 5000);
    if (!investigationMenuItem) {
      throw new Error('Investigation request attach option not found');
    }

    console.log('🧪 Choosing Investigation Requests attach option');
    investigationMenuItem.click();
    await this.wait(500);

    const investigationCheckbox = await this.findElement('input[name="PrimaryKey[]"]', 5000) as HTMLInputElement | null;
    if (!investigationCheckbox) {
      throw new Error('No investigation request available to attach');
    }

    if (!investigationCheckbox.checked) {
      console.log('✅ Selecting newest investigation request');
      investigationCheckbox.click();
    }

    const attachButton = this.findNearestAttachButton(investigationCheckbox);
    if (attachButton) {
      console.log('📎 Confirming attach action');
      attachButton.click();
    } else {
      console.warn('⚠️ Attach button not found after selecting investigation');
    }

    await this.wait(400);
    await this.populateConversationFields();
  }

  private findNearestAttachButton(startElement: HTMLElement): HTMLButtonElement | null {
    const candidateSelectors = [
      'button.AttachSelected',
      'button.AttachFilesSubmit',
      'button.attach-button',
      'button.btn-primary',
      'button.btn-success'
    ];

    let container: HTMLElement | null = startElement.closest('.modal, .dialog, form, .dropdown-menu') as HTMLElement | null;
    const visited = new Set<HTMLElement>();

    while (container && !visited.has(container)) {
      visited.add(container);

      for (const selector of candidateSelectors) {
        const btn = container.querySelector(selector) as HTMLButtonElement;
        if (btn && btn.textContent?.toLowerCase().includes('attach')) {
          return btn;
        }
      }

      const textMatch = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
      const attachByText = textMatch.find(btn => btn.textContent?.toLowerCase().includes('attach'));
      if (attachByText) {
        return attachByText;
      }

      container = container.parentElement;
    }

    const globalAttach = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    return globalAttach.find(btn => btn.textContent?.toLowerCase().includes('attach') && btn.offsetParent !== null) || null;
  }

  private async populateConversationFields(subjectText?: string | null, messageText?: string | null, useDefaults = true) {
    const subjectToUse = subjectText ?? (useDefaults ? 'Blood Test Form' : null);
    const messageToUse = messageText ?? (useDefaults ? 'Your blood test slip is attached here.' : null);

    const subjectInput = await this.findElement('#Subject', 5000) as HTMLInputElement | null;
    if (subjectInput && subjectToUse !== null) {
      subjectInput.focus();
      subjectInput.value = subjectToUse;
      this.triggerAllEvents(subjectInput, subjectToUse);
    } else if (!subjectInput) {
      console.warn('⚠️ Subject field not found in conversation');
    }

    let messageTextarea = await this.findElement('#Message', 5000) as HTMLTextAreaElement | null;
    if (!messageTextarea) {
      messageTextarea = await this.findElement('textarea.conversation-message', 3000) as HTMLTextAreaElement | null;
    }

    if (messageTextarea && messageToUse !== null) {
      messageTextarea.focus();
      messageTextarea.value = messageToUse;
      this.triggerAllEvents(messageTextarea, messageToUse);
    } else if (!messageTextarea) {
      console.warn('⚠️ Message field not found in conversation');
    }
  }

  private async openMessagingWithPrefill(subjectText: string | null, messageText: string) {
    await this.openPatientConversation();
    await this.populateConversationFields(subjectText, messageText, false);
  }

  private async clickPathologyButton() {
    console.log('🩸 Clicking Order Pathology icon in Xestro');
    
    // Primary: Try to find the icon by ID (most reliable)
    let pathologyElement = document.getElementById('OrderPathologyInvestigations') as HTMLElement;
    
    if (!pathologyElement) {
      console.log('🔍 Icon ID not found, trying button fallback...');
      // Fallback: search for button elements (legacy support)
      pathologyElement = document.querySelector('button.btn-default.NewPathology') as HTMLElement;
      
      if (!pathologyElement) {
        console.log('🔍 Button selector failed, trying text-based fallback...');
        // Final fallback: text-based search
        const defaultButtons = document.querySelectorAll('button.btn-default');
        for (const button of defaultButtons) {
          const buttonText = button.textContent?.toLowerCase() || '';
          if (buttonText.includes('pathology') || buttonText.includes('order pathology')) {
            pathologyElement = button as HTMLElement;
            console.log('✅ Found pathology element via text search');
            break;
          }
        }
      }
    }
    
    if (pathologyElement) {
      console.log('🩸 Found pathology element, clicking...');
      pathologyElement.click();
      
      // Wait a moment for the click to process
      await this.wait(500);
      console.log('✅ Order Pathology clicked successfully');
    } else {
      console.error('❌ Order Pathology element not found');
      throw new Error('Order Pathology element not found. Please ensure you are on the correct EMR page with pathology access.');
    }
  }

  private async setupLabField() {
    console.log('🩸 Setting up Lab field - typing "Generic Pathology Request" and selecting from dropdown');
    
    // Target the specific #Lab field for setup (not the tagit field)
    // XPath: /html/body/div[2]/div[7]/div/div[3]/div/div[1]/form/div/div[1]/div[2]/div/input[1]
    let labElement: HTMLInputElement | null = null;
    
    // Try direct #Lab selector first
    labElement = document.querySelector('#Lab') as HTMLInputElement;
    
    if (!labElement) {
      console.log('🔍 #Lab field not found, trying XPath-based selector...');
      // Try XPath-based approach as fallback
      const xpathResult = document.evaluate(
        '/html/body/div[2]/div[7]/div/div[3]/div/div[1]/form/div/div[1]/div[2]/div/input[1]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      labElement = xpathResult.singleNodeValue as HTMLInputElement;
    }
    
    if (!labElement) {
      console.log('🔍 XPath failed, trying class-based fallback...');
      // Last fallback: look for form-control LabForm field
      labElement = document.querySelector('input.form-control.LabForm.ui-autocomplete-input') as HTMLInputElement;
    }
    
    if (labElement) {
      console.log('🩸 Found Lab setup field, typing "Generic Pathology Request"...', {
        id: labElement.id,
        classes: labElement.className,
        tagName: labElement.tagName
      });
      
      // Focus the field
      labElement.focus();
      
      // Clear any existing value
      labElement.value = '';
      
      // Type "Generic Pathology Request" to trigger autocomplete
      labElement.value = 'Generic Pathology Request';
      
      // Trigger input events to show autocomplete dropdown
      labElement.dispatchEvent(new Event('input', { bubbles: true }));
      labElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Also trigger keyup to ensure autocomplete activates
      labElement.dispatchEvent(new KeyboardEvent('keyup', { key: 't', bubbles: true }));
      
      console.log('⏳ Waiting for autocomplete dropdown to appear...');
      
      // Wait for autocomplete dropdown to appear and click the menu item
      const menuItemClicked = await this.waitForAndClickAutocompleteItem('Generic Pathology Request');
      
      if (menuItemClicked) {
        console.log('✅ Lab field setup completed: selected "Generic Pathology Request" from dropdown');
      } else {
        // Fallback: try pressing Enter if dropdown didn't appear
        console.log('⚠️ Dropdown not found, trying Enter key fallback...');
        labElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        labElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
        await this.wait(100);
        labElement.blur();
        console.log('✅ Lab field setup completed with Enter key fallback');
      }
    } else {
      console.warn('⚠️ Lab field (#Lab) not found - user may need to navigate manually');
    }
  }

  private async waitForAndClickAutocompleteItem(itemText: string, maxWaitMs: number = 3000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      // Look for visible ui-autocomplete dropdown menus
      const autocompleteMenus = document.querySelectorAll('ul.ui-autocomplete.ui-menu');
      
      for (const menu of autocompleteMenus) {
        const menuEl = menu as HTMLElement;
        
        // Check if menu is visible (display: block and has dimensions)
        if (menuEl.style.display === 'none' || menuEl.offsetWidth === 0) {
          continue;
        }
        
        console.log('🔍 Found visible autocomplete menu, searching for item...');
        
        // Look for menu items containing the target text
        const menuItems = menuEl.querySelectorAll('li.ui-menu-item');
        
        for (const item of menuItems) {
          const itemEl = item as HTMLElement;
          const itemTextContent = itemEl.textContent || '';
          
          // Check if this item contains "Generic Pathology Request" but NOT "(start typing to search)"
          if (itemTextContent.includes(itemText) && !itemTextContent.includes('start typing to search')) {
            console.log('✅ Found matching autocomplete item:', itemTextContent.substring(0, 50));
            
            // Find the clickable anchor element inside the menu item
            const anchor = itemEl.querySelector('a');
            if (anchor) {
              console.log('🖱️ Clicking autocomplete menu item...');
              anchor.click();
              await this.wait(200);
              return true;
            } else {
              // Click the li element directly if no anchor
              console.log('🖱️ Clicking menu item directly (no anchor)...');
              itemEl.click();
              await this.wait(200);
              return true;
            }
          }
        }
      }
      
      // Wait a bit before checking again
      await this.wait(100);
    }
    
    console.warn('⚠️ Autocomplete dropdown with matching item not found within timeout');
    return false;
  }

  private async insertIntoLabField(content: string) {
    console.log('🩸 Inserting blood test results into tagit field:', content.substring(0, 100));
    
    // Target the specific tagit autocomplete field for results insertion (NOT the #Lab setup field)
    // XPath: /html/body/div[2]/div[7]/div/div[3]/div/div[1]/form/div/div[4]/div[2]/div/ul/li/input
    let labElement: HTMLInputElement | null = null;
    
    // Try XPath-based selector first for the tagit field
    const xpathResult = document.evaluate(
      '/html/body/div[2]/div[7]/div/div[3]/div/div[1]/form/div/div[4]/div[2]/div/ul/li/input',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    labElement = xpathResult.singleNodeValue as HTMLInputElement;
    
    if (!labElement) {
      console.log('🔍 XPath failed, trying tagit-specific selectors...');
      // Try tagit-specific selectors that exclude #Lab field
      const fallbackSelectors = [
        'ul li input.ui-widget-content.ui-autocomplete-input', // Specific tagit structure
        'li.tagit-new input.ui-widget-content.ui-autocomplete-input', // Tagit new item input
        'ul.tagit li input.ui-widget-content', // Tagit list input
        '.ui-widget-content.ui-autocomplete-input:not(#Lab):not(.form-control)'  // Exclude #Lab field explicitly
      ];
      
      for (const selector of fallbackSelectors) {
        const candidates = document.querySelectorAll(selector) as NodeListOf<HTMLInputElement>;
        for (const candidate of candidates) {
          // Explicitly exclude the #Lab setup field
          if (candidate.id === 'Lab' || candidate.classList.contains('form-control') || 
              candidate.classList.contains('LabForm')) {
            console.log(`🚫 Results: Skipping #Lab setup field: ${candidate.id}`);
            continue;
          }
          
          labElement = candidate;
          console.log(`🩸 Results: Found tagit field with selector: ${selector}`, candidate);
          break;
        }
        if (labElement) break;
      }
    }
    
    // Final validation: double-check we didn't get the wrong fields
    if (labElement && (
        labElement.id === 'PatientName' || labElement.classList.contains('PatientName') || labElement.name === 'PatientName' ||
        labElement.id === 'Lab' || labElement.classList.contains('form-control') || labElement.classList.contains('LabForm')
    )) {
      console.error('🚨 ERROR: Still targeting wrong field! Aborting insertion to prevent data corruption.');
      console.error('   Found element:', {
        id: labElement.id,
        classes: labElement.className,
        name: labElement.name,
        isPatientName: labElement.id === 'PatientName',
        isLabSetupField: labElement.id === 'Lab'
      });
      return;
    }
    
    if (labElement) {
      console.log('🩸 Found correct tagit field for results insertion...', {
        id: labElement.id,
        classes: labElement.className,
        name: labElement.name,
        tagName: labElement.tagName
      });
      
      // Focus the field
      labElement.focus();
      
      // Clear existing content and insert new content
      labElement.value = content;
      
      // Trigger input events to ensure proper form handling
      labElement.dispatchEvent(new Event('input', { bubbles: true }));
      labElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Trigger autocomplete events if it's an autocomplete field
      if (labElement.classList.contains('ui-autocomplete-input')) {
        // Trigger keydown events to activate autocomplete
        labElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        labElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        
        // For tagit fields, trigger additional events
        if (labElement.closest('li.tagit-new')) {
          console.log('🩸 Detected tagit field, triggering additional events');
          labElement.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
          labElement.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Small delay then focus to ensure tagit processes the input
          setTimeout(() => {
            if (labElement) {
              labElement.focus();
            }
          }, 100);
        }
      }
      
      console.log('✅ Blood test results inserted into tagit field successfully');
    } else {
      console.warn('⚠️ Tagit field not found, falling back to Tests Requested field');
      return this.insertIntoTestsRequestedField(content);
    }
  }

  private async insertIntoTestsRequestedField(content: string) {
    console.log('🩸 Inserting blood test content into Tests Requested field:', content.substring(0, 100));
    
    // Find the Tests Requested input field using our defined selector
    const testsRequestedField = this.emrSystem?.fields.testsRequested;
    if (!testsRequestedField) {
      throw new Error('Tests Requested field not defined for this EMR system');
    }

    let inputElement = await this.findElement(testsRequestedField.selector, 5000);
    
    if (!inputElement) {
      console.log('🔍 Tests Requested field not found, trying alternative selectors...');
      // Try alternative selectors for the tagit widget
      const alternativeSelectors = [
        '.TestsRequested input',
        '.tests-requested-tagit input', 
        'ul.TestsRequested input',
        '.tagit-new input',
        '[name="Tests"] + .tagit input'
      ];
      
      for (const selector of alternativeSelectors) {
        inputElement = document.querySelector(selector) as HTMLElement;
        if (inputElement) {
          console.log('✅ Found Tests Requested field with selector:', selector);
          break;
        }
      }
    }

    if (!inputElement) {
      console.error('❌ Tests Requested field not found');
      throw new Error('Tests Requested field not found. Please ensure you are on the pathology ordering page.');
    }

    // Handle the tagit widget input insertion
    if (inputElement.tagName === 'INPUT') {
      const input = inputElement as HTMLInputElement;
      
      // Clear existing content and set new content
      input.focus();
      input.value = content;
      
      // Trigger events that tagit widget expects
      const events = ['input', 'change', 'keyup'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        input.dispatchEvent(event);
      });

      // Simulate Enter key if tagit expects it for adding tags
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter', 
        keyCode: 13,
        bubbles: true 
      });
      input.dispatchEvent(enterEvent);

      console.log('✅ Content inserted into Tests Requested field');
    } else {
      console.warn('⚠️ Found element is not an input field, treating as generic element');
      await this.insertTextIntoElement(inputElement, content);
    }
  }

  private async clickRadiologyButton() {
    console.log('📷 Clicking Order Radiology icon in Xestro');
    
    // Primary: Try to find the icon by ID (most reliable)
    let radiologyElement = document.getElementById('orderRadiologInvestigations') as HTMLElement;
    
    if (!radiologyElement) {
      console.log('🔍 Icon ID not found, trying button fallback...');
      // Fallback: search for button elements (legacy support)
      radiologyElement = document.querySelector('button.btn-default.NewRadiology') as HTMLElement;
      
      if (!radiologyElement) {
        console.log('🔍 Button selector failed, trying text-based fallback...');
        // Final fallback: text-based search
        const defaultButtons = document.querySelectorAll('button.btn-default');
        for (const button of defaultButtons) {
          const buttonText = button.textContent?.toLowerCase() || '';
          if (buttonText.includes('radiology') || buttonText.includes('order radiology')) {
            radiologyElement = button as HTMLElement;
            console.log('✅ Found radiology element via text search');
            break;
          }
        }
      }
    }
    
    if (radiologyElement) {
      console.log('📷 Found radiology element, clicking...');
      radiologyElement.click();
      
      // Wait a moment for the click to process
      await this.wait(500);
      console.log('✅ Order Radiology clicked successfully');
    } else {
      console.error('❌ Order Radiology element not found');
      throw new Error('Order Radiology element not found. Please ensure you are on the correct EMR page with radiology access.');
    }
  }

  private async openQuickLetter() {
    const quickLetterButton = await this.findElement(
      'button:contains("Quick Letter"), [data-action="quick-letter"], .quick-letter-btn, .QuickLetter'
    );
    
    if (quickLetterButton) {
      quickLetterButton.click();
    } else {
      // Fallback: open notes area
      const notesArea = await this.findActiveNoteArea();
      if (notesArea) {
        this.focusElement(notesArea);
      }
    }
  }

  private async createTask() {
    console.log('📝 Starting Create Task workflow (3-step sequence)...');

    try {
      // STEP 1: Click the "Actions" button to open the actions menu
      console.log('🔘 Step 1: Clicking Actions button...');
      const actionsButtonXPath = '/html/body/div[3]/div[2]/div/div[4]/div[1]/div[1]/button';
      const actionsButton = this.findByXPath(actionsButtonXPath) as HTMLElement;

      if (!actionsButton) {
        throw new Error('Actions button not found. Please ensure you are viewing a patient record.');
      }

      console.log('✅ Found Actions button, clicking...');
      actionsButton.click();
      await this.wait(500); // Wait for menu to render
      console.log('✅ Actions menu should be open');

      // STEP 2: Click the dropdown toggle button to expand task submenu
      console.log('🔘 Step 2: Clicking dropdown toggle...');
      const dropdownToggleXPath = '/html/body/div[2]/div[7]/div/div[3]/div/div[2]/div[2]/div/div/div[1]/div[2]/div[1]/div/button';
      const dropdownToggle = this.findByXPath(dropdownToggleXPath) as HTMLElement;

      if (!dropdownToggle) {
        throw new Error('Dropdown toggle not found. Actions menu may not have loaded properly.');
      }

      console.log('✅ Found dropdown toggle, clicking...');
      dropdownToggle.click();
      await this.wait(100); // Wait for submenu to expand
      console.log('✅ Dropdown submenu should be expanded');

      // STEP 3: Click "Create Task" option in the submenu
      console.log('🔘 Step 3: Clicking Create Task button...');
      const createTaskXPath = '/html/body/div[2]/div[7]/div/div[3]/div/div[2]/div[2]/div/div/div[1]/div[2]/div[1]/div/ul/li[2]/a';
      const createTaskButton = this.findByXPath(createTaskXPath) as HTMLElement;

      if (!createTaskButton) {
        throw new Error('Create Task button not found in dropdown menu.');
      }

      console.log('✅ Found Create Task button, clicking...', {
        tagName: createTaskButton.tagName,
        className: createTaskButton.className,
        textContent: createTaskButton.textContent?.trim()
      });
      createTaskButton.click();
      await this.wait(500); // Wait for task dialog to open
      console.log('✅ Create Task clicked successfully - dialog should be opening');

    } catch (error) {
      console.error('❌ Task creation failed:', error);

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to create task: ${errorMessage}\n\nPlease create the task manually.`);

      throw error; // Re-throw to prevent workflow from continuing
    }
  }

  // NEW: Create task with subject and message content
  private async createTaskWithContent(taskData: { subject: string; message: string }) {
    console.log('📝 Creating task with content:', taskData);

    try {
      // Step 1: Click task button to open task dialog
      await this.createTask();

      // Step 2: Wait for task dialog to fully load
      await this.wait(1000);
      console.log('⏳ Waiting for task dialog to load...');

      // Step 3: Find and populate Subject field
      const subjectInput = await this.findTaskSubjectField();
      if (subjectInput) {
        console.log('✅ Found Subject field, populating...');
        subjectInput.focus();
        subjectInput.click();
        this.setValueAndDispatchInputEvents(subjectInput, taskData.subject);
        console.log(`✅ Populated Subject: ${taskData.subject}`);
      } else {
        console.warn('⚠️ Subject field not found - task may need manual entry');
      }

      // Step 4: Find and populate Message textarea
      const messageTextarea = await this.findTaskMessageField();
      if (messageTextarea) {
        console.log('✅ Found Message field, populating...');
        messageTextarea.focus();
        messageTextarea.click();
        this.setValueAndDispatchInputEvents(messageTextarea, taskData.message);
        console.log(`✅ Populated Message: ${taskData.message.substring(0, 50)}...`);
      } else {
        console.warn('⚠️ Message field not found - task may need manual entry');
      }

      console.log('✅ Task populated with content successfully');
    } catch (error) {
      console.error('❌ Error creating task with content:', error);

      // Show user-friendly error message
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Failed to create task with follow-up information:\n\n${errorMsg}\n\nPlease create the task manually with this content:\n\nSubject: ${taskData.subject}\nMessage: ${taskData.message.substring(0, 200)}...`);

      // Re-throw to stop workflow
      throw error;
    }
  }

  // NEW: Find Subject field in task dialog
  private async findTaskSubjectField(): Promise<HTMLInputElement | null> {
    console.log('🔍 Searching for task Subject field...');

    // Strategy 1: Try common Subject field selectors
    const subjectSelectors = [
      'input[name*="subject"]',
      'input[id*="subject"]',
      'input[placeholder*="Subject"]',
      'input[placeholder*="subject"]',
      'input.subject',
      'input.Subject'
    ];

    for (const selector of subjectSelectors) {
      const element = document.querySelector(selector) as HTMLInputElement;
      if (element && element.offsetParent !== null) {
        console.log(`✅ Found Subject field via selector: ${selector}`);
        return element;
      }
    }

    // Strategy 2: Try label-based search
    const subjectByLabel = this.findFieldByLabelText('subject') as HTMLInputElement;
    if (subjectByLabel) {
      console.log('✅ Found Subject field via label text');
      return subjectByLabel;
    }

    // Strategy 3: Find first visible text input in modal (fallback)
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')) as HTMLInputElement[];
    const visibleInputs = allInputs.filter(input => input.offsetParent !== null);
    if (visibleInputs.length > 0) {
      console.log('⚠️ Using first visible input as Subject field (fallback)');
      return visibleInputs[0];
    }

    console.warn('❌ Subject field not found after trying all strategies');
    return null;
  }

  // NEW: Find Message field in task dialog
  private async findTaskMessageField(): Promise<HTMLTextAreaElement | null> {
    console.log('🔍 Searching for task Message field...');

    // Strategy 1: Try specific ID, name, and class selectors (highest priority)
    const specificSelectors = [
      'textarea#Message',                    // ID selector
      'textarea[name="Message"]',            // name attribute (exact match)
      'textarea.conversation-message',       // class selector
      'textarea.form-control.conversation-message' // full class chain
    ];

    for (const selector of specificSelectors) {
      const element = document.querySelector(selector) as HTMLTextAreaElement;
      if (element && element.offsetParent !== null) {
        console.log(`✅ Found Message field via specific selector: ${selector}`);
        return element;
      }
    }

    // Strategy 2: Try XPath (user-provided fallback)
    try {
      const xpathResult = document.evaluate(
        '/html/body/div[2]/div[7]/div[1]/div[3]/div/form/div[2]/div[2]/textarea',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const xpathElement = xpathResult.singleNodeValue as HTMLTextAreaElement;
      if (xpathElement && xpathElement.offsetParent !== null) {
        console.log('✅ Found Message field via XPath');
        return xpathElement;
      }
    } catch (error) {
      console.log('⚠️ XPath search failed:', error);
    }

    // Strategy 3: Try exact label text match (case-sensitive, exact match only)
    const labels = Array.from(document.querySelectorAll('label'));
    for (const label of labels) {
      const labelText = label.textContent?.trim();
      // Exact match "Message" only, not "Copy incoming messages to"
      if (labelText === 'Message') {
        console.log('✅ Found exact label: "Message"');

        // Try 'for' attribute
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const textarea = document.getElementById(forAttr) as HTMLTextAreaElement;
          if (textarea && textarea.tagName === 'TEXTAREA' && textarea.offsetParent !== null) {
            console.log(`✅ Found Message field via exact label 'for' attribute: #${forAttr}`);
            return textarea;
          }
        }

        // Try next sibling
        let sibling = label.nextElementSibling;
        while (sibling) {
          if (sibling.tagName === 'TEXTAREA' && (sibling as HTMLTextAreaElement).offsetParent !== null) {
            console.log('✅ Found Message field as label sibling');
            return sibling as HTMLTextAreaElement;
          }
          sibling = sibling.nextElementSibling;
        }

        // Try parent's next textarea
        let parent = label.parentElement;
        while (parent) {
          const textarea = parent.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea && textarea.offsetParent !== null) {
            console.log('✅ Found Message field in label parent');
            return textarea;
          }
          parent = parent.parentElement;
          if (parent?.tagName === 'FORM') break; // Stop at form boundary
        }
      }
    }

    // Strategy 4: Find first visible textarea, excluding wrong fields (last resort)
    const allTextareas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
    const visibleTextareas = allTextareas.filter(textarea => {
      // Exclude Notes field
      if (textarea.name === 'Notes' || textarea.classList.contains('Notes')) {
        return false;
      }
      // Exclude fields with "copy" in nearby labels
      const nearbyText = textarea.parentElement?.textContent?.toLowerCase() || '';
      if (nearbyText.includes('copy incoming')) {
        return false;
      }
      return textarea.offsetParent !== null;
    });

    if (visibleTextareas.length > 0) {
      console.log('⚠️ Using first visible textarea as Message field (fallback, filtered)');
      return visibleTextareas[0];
    }

    console.warn('❌ Message field not found after trying all strategies');
    return null;
  }

  private async appointmentWrapUp(data: any) {
    // Implementation depends on EMR system
    if (this.emrSystem?.name === 'Xestro') {
      await this.xestroAppointmentWrapUp(data);
    } else {
      console.warn('Appointment wrap-up not implemented for this EMR system');
    }
  }

  private getXestroAppointmentIdFromWindow(): string | null {
    const w = window as any;
    const candidates = [
      'AppointmentID',
      'AppointmentId',
      'appointmentId',
      'apptId',
      'currentAppointmentId',
      'CurrentAppointmentId',
      'CurrentAppointmentID'
    ];
    for (const key of candidates) {
      const value = w?.[key];
      if (typeof value === 'string' && value.trim().length > 0) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (value && typeof value === 'object') {
        const objCandidates = [
          value.appointmentId,
          value.appointmentID,
          value.apptId,
          value.id,
          value.ID
        ];
        for (const candidate of objCandidates) {
          if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
          if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
        }
      }
    }
    return null;
  }

  private extractXestroId(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // UUID/GUID
    const uuid = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuid) return uuid[0];

    // Long numeric IDs
    const digits = trimmed.match(/\d{3,}/);
    if (digits) return digits[0];

    return null;
  }

  private getXestroAppointmentIdFromDom(root: Document | HTMLElement = document): string | null {
    const selectors = [
      'input[name="AppointmentID"]',
      'input[name="AppointmentId"]',
      'input[name="appointmentId"]',
      'input#AppointmentID',
      'input#AppointmentId',
      'input[type="hidden"][name*="Appointment" i]',
      'input[type="hidden"][id*="Appointment" i]',
      'input[type="hidden"][name*="Appt" i]',
      'input[type="hidden"][id*="Appt" i]',
      'input[id*="Appointment"][id*="Id" i]',
      'input[name*="Appointment"][name*="Id" i]',
      'input[name*="Appt" i][name*="Id" i]',
      'input[id*="Appt" i][id*="Id" i]',
      'input[name*="PrimaryKey" i]',
      'input[id*="PrimaryKey" i]',
      'input[name*="pk" i]',
      'input[id*="pk" i]',
      '[data-appointment-id]',
      '[data-appointmentid]',
      '[data-appt-id]',
      '[data-apptid]'
    ];

    for (const selector of selectors) {
      const el = root.querySelector(selector) as HTMLElement | null;
      if (!el) continue;

      if (el instanceof HTMLInputElement) {
        const extracted = this.extractXestroId(el.value || '');
        if (extracted) return extracted;
      }

      const dataset = (el as any).dataset as Record<string, string> | undefined;
      const datasetKeys = ['appointmentId', 'appointmentID', 'appointmentid', 'apptId', 'apptid', 'apptID'];
      for (const key of datasetKeys) {
        const value = dataset?.[key];
        if (typeof value === 'string') {
          const extracted = this.extractXestroId(value);
          if (extracted) return extracted;
        }
      }

      // Fallback: try attributes that often encode IDs
      const attrNames = ['data-appointment-id', 'data-appointmentid', 'data-appt-id', 'data-apptid', 'value'];
      for (const attrName of attrNames) {
        const value = el.getAttribute(attrName);
        if (typeof value === 'string') {
          const extracted = this.extractXestroId(value);
          if (extracted) return extracted;
        }
      }

      const onclick = el.getAttribute('onclick') || '';
      const extracted = this.extractXestroId(onclick);
      if (extracted) return extracted;
    }

    // Heuristic: some pages embed appointment IDs in button/link handlers.
    const handlerEls = Array.from(root.querySelectorAll('[onclick],[data-url],a[href]')) as HTMLElement[];
    for (const el of handlerEls) {
      const onclick = el.getAttribute('onclick') || '';
      const href = el.getAttribute('href') || '';
      const dataUrl = el.getAttribute('data-url') || '';
      const haystack = `${onclick} ${href} ${dataUrl}`.toLowerCase();
      if (!haystack.includes('appt') && !haystack.includes('appointment')) continue;
      const extracted = this.extractXestroId(haystack);
      if (extracted) return extracted;
    }

    // Try selected appointment row/container patterns.
    const selected = root.querySelector(
      'tr.appt.selected, tr.appt.active, tr.appt.ui-selected, .appt.selected, .appt.active, .appt.ui-selected'
    ) as HTMLElement | null;
    if (selected) {
      const attrsToCheck = ['data-appointment-id', 'data-appointmentid', 'data-appt-id', 'data-apptid', 'data-id', 'id'];
      for (const attr of attrsToCheck) {
        const value = selected.getAttribute(attr);
        if (typeof value === 'string' && value.trim().length > 0) {
          const extracted = this.extractXestroId(value);
          if (extracted) return extracted;
        }
      }
      const anyData = (selected as any).dataset as Record<string, string> | undefined;
      if (anyData) {
        for (const [k, v] of Object.entries(anyData)) {
          if (!v) continue;
          if (k.toLowerCase().includes('appt') || k.toLowerCase().includes('appointment')) {
            const extracted = this.extractXestroId(v);
            if (extracted) return extracted;
          }
        }
      }
    }

    return null;
  }

  private getXestroAppointmentWrapUpDialogRoot(): HTMLElement | null {
    // The wrap-up dialog in Xestro is typically a jQuery UI dialog. Prefer the visible one.
    const dialogs = Array.from(document.querySelectorAll('div.ui-dialog')) as HTMLElement[];
    const visibleDialogs = dialogs.filter(d => d.offsetParent !== null);
    const candidates = visibleDialogs.length ? visibleDialogs : dialogs;
    for (const dialog of candidates) {
      const title = dialog.querySelector('.ui-dialog-title')?.textContent?.trim().toLowerCase() || '';
      if (title.includes('appt wrap up') || title.includes('wrap up')) {
        return dialog;
      }
    }

    // Fallback to the XPath-rooted container used elsewhere in this file.
    const xpathRoot = this.findByXPath('/html/body/div[2]/div[7]') as HTMLElement | null;
    return xpathRoot;
  }

  private ensureXestroAppointmentContextOrThrow(): string {
    const appointmentId =
      this.getXestroAppointmentIdFromWindow() ||
      this.getXestroAppointmentIdFromDom(document);

    if (appointmentId) return appointmentId;

    console.warn('⚠️ Appointment wrap-up aborted: appointment ID not set');
    throw new Error(
      'Appointment ID is not set (no active appointment selected). Click/select the appointment in Xestro, then run Wrap Up again.'
    );
  }

  private closeXestroDialog(dialogRoot: HTMLElement | null) {
    if (!dialogRoot) return;
    const closeButton = dialogRoot.querySelector('button.ui-dialog-titlebar-close, .ui-dialog-titlebar-close') as HTMLElement | null;
    closeButton?.click();
  }

  private async xestroAppointmentWrapUp(data: any) {
    // STEP 1: Create task FIRST (if taskMessage exists)
    if (data.preset?.taskMessage) {
      console.log('📝 Creating task with follow-up information before opening wrap-up dialog...');
      try {
        await this.createTaskWithContent({
          subject: 'Post Appointment Tasks',
          message: data.preset.taskMessage
        });
        console.log('✅ Task created successfully');
      } catch (error) {
        console.error('❌ Task creation failed, but continuing with wrap-up dialog:', error);
        // Don't throw - allow wrap-up to continue even if task creation fails
      }
    }

    // STEP 2: Then open appointment wrap-up dialog
    // Best-effort pre-check (some pages only expose appointment context after the dialog opens).
    const preAppointmentId =
      this.getXestroAppointmentIdFromWindow() ||
      this.getXestroAppointmentIdFromDom(document);
    if (!preAppointmentId) {
      console.log('ℹ️ No appointment ID detected before opening Wrap Up dialog; proceeding and will validate after open.');
    }

    // Prefer a visible button to avoid clicking hidden/template elements.
    const wrapUpButtonSelector = 'button.btn.btn-primary.appt-wrap-up-btn, [data-action="appt-wrap-up"]';
    const wrapUpButtons = Array.from(document.querySelectorAll(wrapUpButtonSelector)) as HTMLElement[];
    const wrapUpButton = wrapUpButtons.find(btn => btn.offsetParent !== null) || wrapUpButtons[0] || null;

    if (wrapUpButton) {
      console.log('📋 Opening appointment wrap-up dialog...');
      wrapUpButton.click();
      await this.wait(1500); // Wait longer for modal to open

      // STEP 3: Populate item code and click Notes field
      if (data.preset) {
        await this.populateAppointmentPreset(data.preset);
      }
    } else {
      throw new Error('Wrap Up button not found in Xestro');
    }
  }

  // Helper method to find Patient Details XestroBoxContent specifically
  private findPatientDetailsXestroBoxContent(): Element | null {
    console.log('🔍 Strategy: Patient Details XestroBoxContent - looking for patient details section...');
    
    // Strategy A: Look for PatientDetailsContent class (most specific)
    const patientDetailsContent = document.querySelector('.XestroBox.PatientDetailsContent .XestroBoxContent');
    if (patientDetailsContent) {
      console.log('✅ Found PatientDetailsContent XestroBoxContent via class selector');
      return patientDetailsContent;
    }
    
    // Strategy B: Find XestroBoxTitle that contains "Patient Details"
    const xestroTitles = document.querySelectorAll('.XestroBoxTitle');
    console.log(`🔍 Found ${xestroTitles.length} XestroBoxTitle elements`);
    
    for (let i = 0; i < xestroTitles.length; i++) {
      const title = xestroTitles[i];
      const titleText = title.textContent?.trim() || '';
      console.log(`🔍 XestroBoxTitle ${i + 1}: "${titleText}"`);
      
      if (titleText === 'Patient Details') {
        console.log('✅ Found "Patient Details" title, looking for next sibling XestroBoxContent...');
        
        // Get the next sibling XestroBoxContent
        let sibling = title.nextElementSibling;
        while (sibling) {
          if (sibling.classList.contains('XestroBoxContent')) {
            console.log('✅ Found Patient Details XestroBoxContent via title search!');
            return sibling;
          }
          sibling = sibling.nextElementSibling;
        }
        
        // If no immediate sibling, check parent's children
        const parent = title.parentElement;
        if (parent) {
          const xestroBoxContent = parent.querySelector('.XestroBoxContent');
          if (xestroBoxContent) {
            console.log('✅ Found Patient Details XestroBoxContent in parent!');
            return xestroBoxContent;
          }
        }
      }
    }
    
    console.log('❌ No Patient Details XestroBoxContent found');
    return null;
  }
  
  // Helper method to extract from patient selector input (fallback)
  private extractFromPatientSelectorInput(): any | null {
    console.log('🔍 Strategy: Patient Selector Input - checking for patient data...');
    
    try {
      const selectorInput = document.querySelector('#PatientSelectorInput') as HTMLInputElement;
      if (selectorInput && (selectorInput.value || selectorInput.placeholder)) {
        const patientName = (selectorInput.value || selectorInput.placeholder).trim();
        if (patientName && !patientName.toLowerCase().includes('select') && !patientName.toLowerCase().includes('search')) {
          console.log('✅ Found patient name in selector input:', patientName);
          return {
            name: patientName,
            extractedAt: Date.now(),
            extractionMethod: 'patientSelectorInput'
          };
        }
      }
      
      console.log('❌ No patient data found in selector input');
      return null;
    } catch (error) {
      console.error('❌ Error extracting from patient selector input:', error);
      return null;
    }
  }

  // Helper method to extract from hidden input fields (most reliable)
  private extractFromHiddenInputs(): any | null {
    console.log('🔍 Strategy: Hidden Input Fields - checking for patient data...');
    
    try {
      const patientData: any = {
        extractedAt: Date.now(),
        extractionMethod: 'hiddenInputs'
      };
      
      // Extract from hidden input fields
      const patientNameInput = document.querySelector('#PatientName') as HTMLInputElement;
      const dialogTitleInput = document.querySelector('#DialogTitleName') as HTMLInputElement;
      const patientIdInput = document.querySelector('#PatientID_FYI') as HTMLInputElement;
      
      console.log('🔍 Found input elements:', {
        patientName: patientNameInput?.value || 'not found',
        dialogTitle: dialogTitleInput?.value || 'not found', 
        patientId: patientIdInput?.value || 'not found'
      });
      
      // Try DialogTitleName first (contains name + ID)
      if (dialogTitleInput && dialogTitleInput.value) {
        const dialogValue = dialogTitleInput.value.trim(); // "Mr Adrian Test (17755)"
        console.log('✅ Found DialogTitleName:', dialogValue);
        
        // Extract name and ID from dialog title
        const match = dialogValue.match(/^(.+?)\s*\((\d+)\)$/);
        if (match) {
          patientData.name = match[1].trim();
          patientData.id = match[2];
          console.log('📝 Extracted from DialogTitleName - Name:', patientData.name, 'ID:', patientData.id);
        } else {
          patientData.name = dialogValue;
          console.log('📝 Extracted name only from DialogTitleName:', patientData.name);
        }
      }
      
      // Fallback to separate PatientName input
      if (!patientData.name && patientNameInput && patientNameInput.value) {
        patientData.name = patientNameInput.value.trim();
        console.log('📝 Extracted from PatientName input:', patientData.name);
      }
      
      // Get Patient ID if not already extracted
      if (!patientData.id && patientIdInput && patientIdInput.value) {
        patientData.id = patientIdInput.value.trim();
        console.log('📝 Extracted from PatientID_FYI input:', patientData.id);
      }
      
      if (patientData.name) {
        console.log('✅ Successfully extracted from hidden inputs:', patientData);
        return patientData;
      }
      
      console.log('❌ No patient data found in hidden inputs');
      return null;
    } catch (error) {
      console.error('❌ Error extracting from hidden inputs:', error);
      return null;
    }
  }

  // Extract patient data from Xestro EMR XestroBoxContent element
  private extractPatientData(): any {
    console.log('👤 Extracting patient data from Xestro EMR page...');
    
    try {
      // Initialize patient data object
      const patientData: any = {
        extractedAt: Date.now()
      };

      // Strategy 1: Extract from hidden input fields (most reliable)
      const hiddenInputResult = this.extractFromHiddenInputs();
      if (hiddenInputResult && hiddenInputResult.name) {
        console.log('✅ Successfully extracted using Hidden Inputs strategy:', hiddenInputResult);
        return hiddenInputResult;
      }

      // Strategy 2: Target Patient Details XestroBoxContent specifically
      let patientElement = this.findPatientDetailsXestroBoxContent();
      
      if (patientElement) {
        console.log('✅ Strategy 2: Found Patient Details XestroBoxContent');
        const result = this.extractFromXestroBoxContent(patientElement, patientData);
        if (result && result.name) {
          console.log('✅ Successfully extracted using PatientDetailsXestroBoxContent strategy:', result);
          return result;
        }
      } else {
        console.log('❌ Strategy 2: No Patient Details XestroBoxContent found');
      }

      // Strategy 3: Extract from patient selector input (fallback)
      const selectorResult = this.extractFromPatientSelectorInput();
      if (selectorResult && selectorResult.name) {
        console.log('✅ Successfully extracted using PatientSelectorInput strategy:', selectorResult);
        return selectorResult;
      }

      // Strategy 2: Look for patient details div with pull-right structure (your provided HTML)
      const patientDetailDivs = Array.from(document.querySelectorAll('div')).filter(div => {
        // Look for divs that contain both patient name and pull-right with ID
        const textContent = div.textContent || '';
        const hasPatientName = /^(Mr|Mrs|Ms|Dr|Miss)\s+[A-Za-z\s()]+/.test(textContent.trim());
        const hasPullRight = div.querySelector('.pull-right');
        const hasId = textContent.includes('ID:');
        return hasPatientName && hasPullRight && hasId;
      });

      if (patientDetailDivs.length > 0) {
        patientElement = patientDetailDivs[0];
        console.log(`✅ Strategy 2: Found patient data in patient details div (${patientDetailDivs.length} candidates)`);
        const result = this.extractFromPatientDetailsDiv(patientElement, patientData);
        if (result && result.name) {
          console.log('✅ Successfully extracted using PatientDetailsDiv strategy:', result);
          return result;
        }
      }

      // Strategy 3: Look for any div with ID pattern and name pattern
      const allDivs = document.querySelectorAll('div');
      for (let i = 0; i < allDivs.length; i++) {
        const div = allDivs[i];
        const textContent = div.textContent || '';
        
        // Check if this div contains patient-like information
        if (textContent.includes('ID:') && /\d{4,6}/.test(textContent)) {
          const childDivs = div.querySelectorAll('div');
          if (childDivs.length >= 3) { // Should have multiple child divs for different info
            console.log('✅ Strategy 3: Found potential patient data in generic div');
            const result = this.extractFromGenericPatientDiv(div, patientData);
            if (result && result.name) {
              console.log('✅ Successfully extracted using GenericPatientDiv strategy:', result);
              return result;
            }
          }
        }
      }

      // Strategy 4: Fallback - try to extract from any element containing patient-like data
      console.log('⚠️ All primary strategies failed, attempting fallback extraction...');
      const fallbackResult = this.extractPatientDataFallback(patientData);
      if (fallbackResult && fallbackResult.name) {
        console.log('✅ Successfully extracted using fallback strategy:', fallbackResult);
        return fallbackResult;
      }

      console.log(`❌ All extraction strategies failed. Page structure might be different.`);
      console.log('🔍 Available elements for debugging:');
      console.log('- .XestroBoxContent elements:', document.querySelectorAll('.XestroBoxContent').length);
      console.log('- .pull-right elements:', document.querySelectorAll('.pull-right').length);
      console.log('- Elements with "ID:" text:', Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.includes('ID:')).length);
      
      return null;

    } catch (error) {
      console.error('❌ Error extracting patient data:', error);
      return null;
    }
  }

  private extractFromXestroBoxContent(xestroBox: Element, patientData: any): any {
    console.log('📋 Extracting from XestroBoxContent...');
    
    // Get the main content div
    const contentDiv = xestroBox.querySelector('div');
    if (!contentDiv) {
      console.log('❌ No content div found in XestroBoxContent');
      return null;
    }

    return this.extractFromPatientDetailsDiv(contentDiv, patientData);
  }

  private extractFromPatientDetailsDiv(contentDiv: Element, patientData: any): any {
    console.log('📋 Extracting from patient details div...');
    
    try {
      // Extract name with robust, structure-aware strategies
      let patientName = '';

      // Strategy 1: Get the first child div and extract its direct text content (excluding pull-right)
      // This matches your HTML: <div>Mr Darren Meer<div class="pull-right">...</div></div>
      const firstChildDiv = contentDiv.querySelector(':scope > div');
      if (firstChildDiv) {
        console.log('🔍 Found first child div, extracting direct text content...');
        
        // Get all text nodes that are direct children (not inside pull-right)
        const textNodes: string[] = [];
        for (let i = 0; i < firstChildDiv.childNodes.length; i++) {
          const node = firstChildDiv.childNodes[i];
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim() || '';
            if (text) {
              textNodes.push(text);
            }
          }
        }
        
        if (textNodes.length > 0) {
          patientName = textNodes.join(' ').trim();
          console.log('✅ Extracted name from text nodes:', patientName);
        }
      }

      // Fallback 1: Look for a name-like element that is not inside .pull-right
      if (!patientName) {
        console.log('🔍 Text node extraction failed, trying fallback strategies...');
        const scoped = contentDiv as HTMLElement;
        const candidates = Array.from(scoped.querySelectorAll(':scope > div div, :scope > div'))
          .filter(el => !el.closest('.pull-right')) as HTMLElement[];
        
        for (const el of candidates) {
          const text = (el.textContent || '').trim();
          if (!text) continue;
          // Heuristic: Title + name and must not contain 'ID:'
          if (/^(Mr|Mrs|Ms|Dr|Miss)\b/.test(text) && !/\bID:\b/.test(text)) {
            patientName = text;
            console.log('✅ Extracted name from fallback element:', patientName);
            break;
          }
        }
      }

      // Fallback 2: First text node on container
      if (!patientName) {
        const nameNode = contentDiv.firstChild;
        if (nameNode && nameNode.nodeType === Node.TEXT_NODE) {
          patientName = (nameNode.textContent || '').trim();
        }
      }

      // Fallback 3: Container text minus first child text
      if (!patientName) {
        const firstChild = contentDiv.firstElementChild as HTMLElement | null;
        if (firstChild) {
          const allText = (contentDiv.textContent || '').trim();
          const firstChildText = (firstChild.textContent || '').trim();
          const stripped = allText.replace(firstChildText, '').trim();
          if (stripped && !/\bID:\b/.test(stripped)) patientName = stripped;
        }
      }

      // Fallback 4: Regex from full text
      if (!patientName) {
        const fullText = contentDiv.textContent || '';
        const nameMatch = fullText.match(/\b(Mr|Mrs|Ms|Dr|Miss)\s+([A-Za-z\s()]+?)(?=\s*ID:|$)/);
        if (nameMatch) {
          patientName = nameMatch[0].trim();
        }
      }

      if (patientName) {
        patientData.name = patientName;
        console.log('📝 Extracted name:', patientData.name);
      }

      // Extract additional demographic information
      const allDivs = Array.from(contentDiv.querySelectorAll('div'));
      
      // Extract phone number
      const phoneDiv = allDivs.find(div => {
        const text = div.textContent?.trim() || '';
        return /^0\d{2,3}\s?\d{3}\s?\d{3}$/.test(text.replace(/\s/g, ''));
      });
      if (phoneDiv) {
        patientData.phone = phoneDiv.textContent?.trim();
        console.log('📞 Extracted phone:', patientData.phone);
      }
      
      // Extract Medicare status
      const medicareDiv = allDivs.find(div => {
        const text = div.textContent?.trim() || '';
        return text.toLowerCase().includes('medicare');
      });
      if (medicareDiv) {
        patientData.medicare = medicareDiv.textContent?.trim();
        console.log('🏥 Extracted Medicare status:', patientData.medicare);
      }

      // Extract ID and DOB from pull-right div
      const pullRightDiv = contentDiv.querySelector('.pull-right');
      if (pullRightDiv) {
        const boldElement = pullRightDiv.querySelector('b');
        if (boldElement && boldElement.textContent) {
          const idMatch = boldElement.textContent.match(/ID:\s*(\d+)/);
          if (idMatch) {
            patientData.id = idMatch[1];
            console.log('📝 Extracted ID:', patientData.id);
          }
        }

        // Extract DOB and age from text content
        const textContent = pullRightDiv.textContent || '';
        const dobMatch = textContent.match(/(\d{2}\/\d{2}\/\d{4})\s*\((\d+)\)/);
        if (dobMatch) {
          patientData.dob = dobMatch[1];
          patientData.age = dobMatch[2];
          console.log('📝 Extracted DOB:', patientData.dob, 'Age:', patientData.age);
        }
      }

      // Extract contact details from data-allow divs
      const dataAllowDivs = contentDiv.querySelectorAll('div[data-allow="1"]');
      dataAllowDivs.forEach((div, _index) => {
        const text = div.textContent?.trim() || '';
        if (text) {
          // Phone number patterns
          if (/^[\d\s\-()+]{8,}$/.test(text)) {
            patientData.phone = text;
            console.log('📝 Extracted phone:', patientData.phone);
          }
          // Email pattern
          else if (text.includes('@') && text.includes('.')) {
            patientData.email = text;
            console.log('📝 Extracted email:', patientData.email);
          }
          // Address pattern (contains Australian states/territories)
          else if (/\b(VIC|NSW|QLD|SA|WA|TAS|ACT|NT)\b/i.test(text)) {
            patientData.address = text;
            console.log('📝 Extracted address:', patientData.address);
          }
        }
      });

      // Extract Medicare and insurance info
      allDivs.forEach(div => {
        const text = div.textContent?.trim() || '';
        if (text) {
          if (text.includes('Medicare:')) {
            const medicareMatch = text.match(/Medicare:\s*([^<]+)/);
            if (medicareMatch) {
              patientData.medicare = medicareMatch[1].trim();
              console.log('📝 Extracted Medicare:', patientData.medicare);
            }
          } else if (text.includes('Private') || text.includes('Limited:')) {
            patientData.insurance = text;
            console.log('📝 Extracted insurance:', patientData.insurance);
          }
        }
      });

      return patientData;
    } catch (error) {
      console.error('❌ Error in extractFromPatientDetailsDiv:', error);
      return null;
    }
  }

  private extractFromGenericPatientDiv(div: Element, patientData: any): any {
    console.log('📋 Extracting from generic patient div...');
    return this.extractFromPatientDetailsDiv(div, patientData);
  }

  private extractPatientDataFallback(patientData: any): any {
    console.log('📋 Attempting fallback patient data extraction...');
    
    try {
      // Look for elements containing ID pattern
      const elementsWithId = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.includes('ID:') && /ID:\s*\d{4,6}/.test(el.textContent)
      );

      for (const element of elementsWithId) {
        const text = element.textContent || '';
        
        // Extract ID
        const idMatch = text.match(/ID:\s*(\d+)/);
        if (idMatch) {
          patientData.id = idMatch[1];
          console.log('📝 Fallback extracted ID:', patientData.id);
        }
        
        // Look for name in the same element or parent
        const nameMatch = text.match(/(Mr|Mrs|Ms|Dr|Miss)\s+[A-Za-z\s()]+/);
        if (nameMatch) {
          patientData.name = nameMatch[0].trim();
          console.log('📝 Fallback extracted name:', patientData.name);
          break; // Found name, exit loop
        }
        
        // Look for name in parent element
        const parent = element.parentElement;
        if (parent) {
          const parentText = parent.textContent || '';
          const parentNameMatch = parentText.match(/(Mr|Mrs|Ms|Dr|Miss)\s+[A-Za-z\s()]+/);
          if (parentNameMatch) {
            patientData.name = parentNameMatch[0].trim();
            console.log('📝 Fallback extracted name from parent:', patientData.name);
            break;
          }
        }
      }

      return patientData.name || patientData.id ? patientData : null;
    } catch (error) {
      console.error('❌ Error in fallback extraction:', error);
      return null;
    }
  }

  /**
   * Helper method to find an input/textarea field by its associated label text
   */
  private findFieldByLabelText(labelText: string): HTMLInputElement | HTMLTextAreaElement | null {
    console.log(`🔍 Looking for field with label containing: "${labelText}"`);

    // Strategy 1: Find label element and get its associated input via 'for' attribute
    const labels = Array.from(document.querySelectorAll('label'));
    for (const label of labels) {
      if (label.textContent?.toLowerCase().includes(labelText.toLowerCase())) {
        console.log(`✅ Found label: "${label.textContent?.trim()}"`);

        // Try 'for' attribute
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const input = document.getElementById(forAttr) as HTMLInputElement | HTMLTextAreaElement;
          if (input) {
            console.log(`✅ Found field via label 'for' attribute: #${forAttr}`);
            return input;
          }
        }

        // Try next sibling
        let sibling = label.nextElementSibling;
        while (sibling) {
          if (sibling instanceof HTMLInputElement || sibling instanceof HTMLTextAreaElement) {
            console.log(`✅ Found field as next sibling of label`);
            return sibling;
          }
          // Check children
          const childInput = sibling.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (childInput) {
            console.log(`✅ Found field as child of element after label`);
            return childInput;
          }
          sibling = sibling.nextElementSibling;
        }

        // Try parent's next input/textarea
        const parent = label.parentElement;
        if (parent) {
          const input = parent.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (input) {
            console.log(`✅ Found field in same parent as label`);
            return input;
          }
        }
      }
    }

    console.log(`❌ No field found for label: "${labelText}"`);
    return null;
  }

  /**
   * Helper method to find element by XPath
   */
  private findByXPath(xpath: string): HTMLElement | null {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue as HTMLElement | null;
    } catch (error) {
      console.error(`❌ Error evaluating XPath: ${xpath}`, error);
      return null;
    }
  }

  /**
   * Dispatch comprehensive events to ensure UI frameworks detect the change
   */
  private triggerAllEvents(element: HTMLElement, value: string) {
    // Set value using multiple methods
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;

    // Native setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (inputElement instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(inputElement, value);
    } else if (inputElement instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(inputElement, value);
    }

    // Trigger all relevant events
    const events = [
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('change', { bubbles: true, cancelable: true }),
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
      new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
      // eslint-disable-next-line no-undef
      new FocusEvent('focus', { bubbles: true }),
      // eslint-disable-next-line no-undef
      new FocusEvent('blur', { bubbles: true })
    ];

    events.forEach(event => element.dispatchEvent(event));
  }

  /**
   * Set an input/textarea value using the native setter and dispatch minimal events.
   * Useful for EMR widgets where extra focus/blur/keyboard events can cause side-effects.
   */
  private setValueAndDispatchInputEvents(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ) {
    const setter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    // Use non-bubbling events to avoid triggering unrelated global input processors
    // on complex EMR pages, while still notifying element-level listeners.
    element.dispatchEvent(new Event('input', { bubbles: false, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: false, cancelable: true }));
  }

  private dispatchKey(
    element: HTMLElement,
    options: { key: string; code: string; keyCode: number }
  ) {
    const base = {
      key: options.key,
      code: options.code,
      keyCode: options.keyCode,
      which: options.keyCode,
      bubbles: false,
      cancelable: true
    };
    element.dispatchEvent(new KeyboardEvent('keydown', base));
    element.dispatchEvent(new KeyboardEvent('keyup', base));
    element.dispatchEvent(new KeyboardEvent('keypress', base));
  }

  private async acceptAutocompleteSelection(
    input: HTMLInputElement | HTMLTextAreaElement,
    options?: { waitForMenuMs?: number }
  ) {
    input.focus();
    input.click();

    // Move cursor to end (some widgets only accept on Enter if caret is at end)
    try {
      const len = input.value?.length ?? 0;
      input.setSelectionRange?.(len, len);
    } catch {
      // Some inputs (or non-text types) may not support setSelectionRange
    }

    // Wait for the jQuery UI autocomplete menu (if present) to populate.
    const deadline = Date.now() + (options?.waitForMenuMs ?? 800);
    let menuReady = false;
    while (Date.now() < deadline) {
      const menu = document.querySelector('ul.ui-autocomplete.ui-menu') as HTMLElement | null;
      const hasItems = !!menu?.querySelector('.ui-menu-item');
      const isVisible = !!menu && menu.style.display !== 'none' && menu.offsetParent !== null;
      if (hasItems && isVisible) {
        menuReady = true;
        break;
      }
      await this.wait(50);
    }

    // If the menu is open, ArrowDown highlights the first suggestion.
    if (menuReady) {
      this.dispatchKey(input, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 });
      await this.wait(50);
    }

    // Enter accepts the highlighted suggestion (or the current input if no menu).
    this.dispatchKey(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
  }

  private async populateAppointmentPreset(preset: any) {
    try {
      console.log('📋 Starting appointment preset population...');
      console.log('📋 Preset data:', { itemCode: preset.itemCode, notes: preset.notes, displayName: preset.displayName });

      // Wait for the appointment wrap-up modal to be fully loaded
      await this.wait(500);

      // Find and populate Item Codes field
      if (preset.itemCode) {
        console.log('🔍 Searching for Item Codes field...');

        let itemCodesInput: HTMLInputElement | null = null;

        // Strategy 0: Try exact XPath first (most reliable for Xestro)
        const itemCodesXPath = '/html/body/div[2]/div[7]/div/div[3]/div/div/div[1]/div/ul/li';
        const xpathElement = this.findByXPath(itemCodesXPath);
        if (xpathElement) {
          // The XPath points to an <li> element, need to find the input inside or nearby
          const input = xpathElement.querySelector('input') as HTMLInputElement;
          if (input) {
            console.log('✅ Found Item Codes field via XPath (inside li element)');
            itemCodesInput = input;
          } else {
            // Check if the li itself is focusable/editable (some UI frameworks use contenteditable)
            console.log('🔍 XPath element found but no input inside, checking element type...');
            console.log('Element details:', {
              tagName: xpathElement.tagName,
              className: xpathElement.className,
              contentEditable: (xpathElement as any).contentEditable
            });
          }
        }

        // Strategy 1: Try specific selectors
        if (!itemCodesInput) {
          const itemCodeSelectors = [
            'input.item-codes-autocomplete',
            'input.ui-autocomplete-input',
            'input[name*="item"]',
            'input[name*="code"]',
            'input[id*="item"]',
            'input[id*="code"]',
            'input[placeholder*="Item"]',
            'input[placeholder*="Code"]'
          ];

          for (const selector of itemCodeSelectors) {
            const element = document.querySelector(selector) as HTMLInputElement;
            if (element && element.offsetParent !== null) { // Check if visible
              console.log(`✅ Found Item Codes field via selector: ${selector}`);
              itemCodesInput = element;
              break;
            }
          }
        }

        // Strategy 2: Try label-based search
        if (!itemCodesInput) {
          itemCodesInput = this.findFieldByLabelText('item code') as HTMLInputElement;
        }

        // Strategy 3: Find all visible inputs in the modal and guess
        if (!itemCodesInput) {
          console.log('🔍 Trying to find visible inputs in modal...');
          const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')) as HTMLInputElement[];
          const visibleInputs = allInputs.filter(input => input.offsetParent !== null);
          console.log(`Found ${visibleInputs.length} visible text inputs`);

          // The first visible text input in a modal is often the first field
          if (visibleInputs.length > 0) {
            itemCodesInput = visibleInputs[0];
            console.log(`⚠️ Using first visible input as Item Codes field (fallback strategy)`);
          }
        }

        if (itemCodesInput) {
          console.log(`✅ Found Item Codes field, setting value to: ${preset.itemCode}`);

          // Validate that the wrap-up UI is actually bound to an appointment.
          // Xestro can open the dialog chrome without an appointment context; then "Done" can hang.
          const dialogRoot = this.getXestroAppointmentWrapUpDialogRoot();
          const appointmentContextRoot =
            (itemCodesInput.closest('form') as HTMLElement | null) ||
            dialogRoot ||
            document;
          const appointmentContextId =
            this.getXestroAppointmentIdFromDom(appointmentContextRoot) ||
            this.getXestroAppointmentIdFromWindow();

          if (!appointmentContextId) {
            console.warn('⚠️ Wrap Up dialog opened without an appointment context; closing to avoid Xestro hang.');
            this.closeXestroDialog(dialogRoot);

            try {
              const inputs = Array.from(appointmentContextRoot.querySelectorAll('input')) as HTMLInputElement[];
              const hidden = inputs
                .filter(i => i.type === 'hidden')
                .slice(0, 50)
                .map(i => ({ name: i.name, id: i.id, value: i.value }));
              const all = inputs
                .slice(0, 50)
                .map(i => ({ type: i.type, name: i.name, id: i.id, value: i.value }));
              console.warn('🔎 Wrap Up dialog inputs (first 50):', all);
              console.warn('🔎 Wrap Up dialog hidden inputs (first 50):', hidden);
            } catch {
              // ignore debug failures
            }

            throw new Error('Appointment ID is not set (wrap-up dialog missing appointment context)');
          }

          // Clear + set value with minimal events (avoid extra focus/blur churn)
          this.setValueAndDispatchInputEvents(itemCodesInput, '');
          this.setValueAndDispatchInputEvents(itemCodesInput, preset.itemCode);

          // Re-enter the field, move cursor to end, and press Return to accept the selection.
          // (Xestro's billing code autocomplete often requires Enter to commit.)
          await this.wait(100);
          await this.acceptAutocompleteSelection(itemCodesInput, { waitForMenuMs: 1000 });

          console.log(`✅ Populated Item Code: ${preset.itemCode}`);
        } else {
          console.warn('⚠️ Item codes input field not found after trying all strategies');
          console.log('💡 Available inputs:', Array.from(document.querySelectorAll('input')).map(i => ({
            type: i.type,
            name: i.getAttribute('name'),
            id: i.id,
            class: i.className,
            placeholder: i.placeholder
          })));
        }
      }

      // Notes field is left blank - task is created separately before wrap-up dialog
      console.log('📝 Notes field left blank (task created separately)');

      console.log(`✅ Successfully applied preset: ${preset.displayName}`);
    } catch (error) {
      console.error('❌ Error populating appointment preset:', error);
    }
  }

  private async ensurePatientRecordView() {
    if (!this.emrSystem) return;
    
    const patientRecord = await this.findElement(this.emrSystem.selectors.patientRecord, 1000);
    if (!patientRecord) {
      // Try to navigate to patient record view
      const recordButton = await this.findElement(
        'button:contains("Record"), [data-view="record"], .record-view-btn'
      );
      if (recordButton) {
        recordButton.click();
        await this.wait(2000);
      }
    }
  }

  /**
   * Ensure patient record is opened for Batch AI Review data extraction
   * Specifically looks for and clicks the "Patient Record" button
   */
  private async ensurePatientRecordOpened(): Promise<void> {
    console.log('🔍 Ensuring patient record is opened...');
    
    // Check if XestroBox elements are already present (record may already be open)
    const initialXestroBoxes = document.querySelectorAll('.XestroBox');
    console.log(`🔍 Initial XestroBox count: ${initialXestroBoxes.length}`);
    
    // Look for the specific "Patient Record" button using individual selectors
    let recordButton = await this.findElement('button.PatientDetailsButton');
    
    if (!recordButton) {
      // Try to find button by text content
      recordButton = await this.findButtonByText('Patient Record');
    }
    
    if (!recordButton) {
      // Try to find button with "Patient" text
      recordButton = await this.findButtonByText('Patient');
    }
    
    if (!recordButton) {
      // Try btn-default buttons and check their text
      const defaultButtons = document.querySelectorAll('button.btn-default');
      for (const button of defaultButtons) {
        if (button.textContent?.includes('Patient')) {
          recordButton = button as HTMLElement;
          break;
        }
      }
    }
    
    if (recordButton) {
      console.log('🔍 Found Patient Record button, clicking...');
      recordButton.click();
      
      // Wait for record to load
      await this.wait(3000);
      
      // Verify record opened by checking for clinical content
      const finalXestroBoxes = document.querySelectorAll('.XestroBox');
      console.log(`🔍 Final XestroBox count: ${finalXestroBoxes.length}`);
      
      if (finalXestroBoxes.length === 0) {
        console.warn('⚠️ Patient record button clicked but no clinical content found');
        // Don't throw error - proceed with extraction anyway
      } else if (finalXestroBoxes.length > initialXestroBoxes.length) {
        console.log('✅ Patient record opened successfully - clinical content detected');
      } else {
        console.log('ℹ️ Patient record may have already been open');
      }
    } else {
      console.warn('⚠️ Patient Record button not found - proceeding with extraction');
      console.log('💡 Available buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean));
    }
  }

  private async findActiveNoteArea(): Promise<HTMLElement | null> {
    if (!this.emrSystem) return null;
    
    return await this.findElement(this.emrSystem.selectors.noteArea);
  }

  private async findElement(selector: string, timeout = 5000): Promise<HTMLElement | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Handle jQuery-style :contains selector
      if (selector.includes(':contains(')) {
        const match = selector.match(/(.+):contains\("(.+)"\)/);
        if (match) {
          const [, baseSelector, text] = match;
          const elements = document.querySelectorAll(baseSelector);
          for (const element of elements) {
            if (element.textContent?.includes(text)) {
              return element as HTMLElement;
            }
          }
        }
      } else {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          return element;
        }
      }
      
      await this.wait(100);
    }
    
    return null;
  }


  private focusElement(element: HTMLElement) {
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight the element briefly
    const originalStyle = element.style.cssText;
    element.style.cssText += 'border: 2px solid #3b82f6 !important; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5) !important;';
    
    setTimeout(() => {
      element.style.cssText = originalStyle;
    }, 2000);
  }

  private isTextInputElement(element: HTMLElement | null): boolean {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'textarea' ||
      (tagName === 'input' && ['text', 'email', 'search', 'url'].includes((element as HTMLInputElement).type)) ||
      element.contentEditable === 'true'
    );
  }

  private updateFieldMappings() {
    // Update field mappings if EMR UI has changed
    // This is a placeholder for dynamic field mapping updates
  }

  private async findAndClickXestroBox(fieldName: string): Promise<HTMLElement | null> {
    console.log(`🔍 Looking for XestroBox with title "${fieldName}"`);
    
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
    const target = normalize(fieldName);

    const findNearestNotesRoot = (anchor: HTMLElement | null): HTMLElement | null => {
      if (!anchor) return null;
      let current: HTMLElement | null = anchor;
      while (current) {
        if (current.querySelector?.('.XestroBoxTitle')) return current;
        current = current.parentElement;
      }
      return null;
    };

    // Prefer scoping to the patient notes area to avoid matching similarly-named
    // sections inside other dialogs (e.g., Quick Letter templates with "Background").
    const patientNotesRoot =
      findNearestNotesRoot(document.getElementById('patientNotesSave')) ||
      findNearestNotesRoot(document.getElementById('patientNotesInput')) ||
      findNearestNotesRoot(document.getElementById('patientNoteInput'));

    // Find all XestroBox elements
    const root = patientNotesRoot ?? document;
    const xestroBoxes = Array.from(root.querySelectorAll('.XestroBox')) as HTMLElement[];
    console.log(`Found ${xestroBoxes.length} XestroBox elements`);

    const candidates = xestroBoxes
      .map((box, index) => {
        const titleElement = box.querySelector('.XestroBoxTitle') as HTMLElement | null;
        const rawTitle = titleElement?.textContent || '';
        const title = normalize(rawTitle);
        const inModal = !!box.closest?.('.modal, [role="dialog"], [aria-modal="true"]');
        const visible = box.offsetParent !== null && (!!titleElement && titleElement.offsetParent !== null);
        // If we successfully scoped to the patient notes root, prefer non-modal content.
        const eligible = patientNotesRoot ? !inModal : true;
        return { box, titleElement, rawTitle, title, index, visible, eligible };
      })
      .filter(c => c.titleElement && c.title && c.visible && c.eligible);

    const pick =
      candidates.find(c => c.title === target) ||
      candidates.find(c => c.title.startsWith(target)) ||
      candidates.find(c => c.title.includes(target));

    if (pick?.titleElement) {
      console.log(`✅ Found XestroBox for "${fieldName}" at index ${pick.index}`);
      console.log(`🖱️ Clicking XestroBox title: "${pick.rawTitle}"`);
      pick.titleElement.click();
      await this.wait(500);
      return pick.box;
    }

    console.log(`❌ No XestroBox found matching "${fieldName}"`);
    // Log all available titles for debugging
    xestroBoxes.forEach((box, index) => {
      const titleElement = box.querySelector('.XestroBoxTitle');
      console.log(`  ${index + 1}. XestroBoxTitle: "${titleElement?.textContent || 'No title'}"`);
    });

    return null;
  }

  private async waitForAddNoteArea(): Promise<HTMLTextAreaElement | null> {
    const maxWaitTime = 5000; // 5 seconds
    const checkInterval = 100; // Check every 100ms
    const maxAttempts = maxWaitTime / checkInterval;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const addNoteArea = document.getElementById('AddNoteArea') as HTMLTextAreaElement;
      
      if (addNoteArea && addNoteArea.offsetParent !== null) { // Check if visible
        console.log(`✅ AddNoteArea found after ${attempt * checkInterval}ms`);
        return addNoteArea;
      }
      
      if (attempt % 10 === 0) { // Log every second
        console.log(`⏳ Still waiting for AddNoteArea... (${attempt * checkInterval}ms)`);
      }
      
      await this.wait(checkInterval);
    }
    
    console.log(`❌ AddNoteArea not found after ${maxWaitTime}ms`);
    return null;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current page status for batch AI review readiness
   */
  private getPageStatus(): any {
    const url = window.location.href;
    const title = document.title;
    const readyState = document.readyState;
    
    // Check for various page elements to determine page type and readiness
    const hasXestroBoxes = document.querySelectorAll('.XestroBox').length > 0;
    const hasPatientNotes = document.querySelector('#patientNotesInput, #AddNoteArea') !== null;
    const hasCalendarElements = document.querySelectorAll('.appointmentBook, .one-appt-book').length > 0;
    const hasDateInput = document.querySelector('input.date.form-control') !== null;
    
    // Determine page type
    let pageType = 'unknown';
    if (hasCalendarElements && hasDateInput) {
      pageType = 'calendar';
    } else if (hasXestroBoxes && hasPatientNotes) {
      pageType = 'patient';
    } else if (url.includes('Dashboard')) {
      pageType = 'dashboard';
    }

    // Determine if page is ready for operations
    const isReady = readyState === 'complete' && 
                   (pageType === 'calendar' || (pageType === 'patient' && hasXestroBoxes));

    return {
      url,
      title,
      readyState,
      pageType,
      isReady,
      elements: {
        xestroBoxCount: document.querySelectorAll('.XestroBox').length,
        hasPatientNotes,
        hasCalendarElements,
        hasDateInput
      },
      timestamp: Date.now()
    };
  }

  private async handleProfilePhoto(data: any) {
    console.log('📸 Handling profile photo capture:', data);
    
    if (data?.imageData) {
      try {
        // First, navigate to the photo upload interface
        console.log('📸 Opening photo upload interface...');
        await this.openPhotoUploadInterface();
        
        // Then insert the image data into DropZone
        await this.insertImageIntoDropZone(data.imageData, data.method || 'tab-capture');
        
        console.log('✅ Profile photo workflow completed successfully');
      } catch (error) {
        console.error('❌ Profile photo workflow failed:', error);
        this.showErrorMessage(`Profile photo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    } else {
      // No image data, this means we need to show instructions for manual capture
      console.log('📸 No image data provided, showing capture instructions');
      this.showErrorMessage('Profile photo capture requires image data');
      throw new Error('Profile photo capture requires image data');
    }
  }

  private async insertImageIntoDropZone(imageData: string, method: string) {
    console.log(`📸 Inserting image into DropZone using method: ${method}`);
    
    try {
      // Find the DropZone element with validation
      console.log('🔍 Step 4: Looking for DropZone element...');
      const dropZone = await this.findDropZone();
      if (!dropZone) {
        console.error('❌ Step 4 failed: DropZone not found on page');
        console.log('🔍 This usually means the Upload button click did not work properly');
        
        // Provide helpful debug information
        console.log('🔍 Current page state:');
        console.log('  - URL:', window.location.href);
        console.log('  - Modal elements:', document.querySelectorAll('.modal, [class*="modal"]').length);
        console.log('  - Upload elements:', document.querySelectorAll('input[type="file"], [class*="upload"], [class*="drop"]').length);
        
        this.showErrorMessage('Upload area not found. Please try clicking the profile photo manually and then use the extension.');
        throw new Error('DropZone field not found - the upload interface may not have loaded properly');
      }

      console.log('✅ Step 4 completed: Found DropZone element');
      console.log('📸 DropZone details:', {
        tagName: dropZone.tagName,
        id: dropZone.id,
        className: dropZone.className,
        visible: dropZone.offsetParent !== null
      });

      // Convert base64 image data to File object
      console.log('🔄 Step 5: Converting image data to file...');
      const file = await this.base64ToFile(imageData, 'profile-photo.png');
      console.log('✅ Step 5 completed: File created', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Simulate file drop into DropZone
      console.log('🔄 Step 6: Simulating file drop...');
      await this.simulateFileDrop(dropZone, file);
      console.log('✅ Step 6 completed: File drop simulation finished');
      
      // Wait a moment to see if the upload was processed
      await this.wait(1000);
      
      // Check if the image appears to have been uploaded
      const hasUploadedImage = document.querySelector('img[src*="blob:"], img[src*="data:"], .uploaded-image, .image-preview');
      if (hasUploadedImage) {
        console.log('✅ Upload appears successful - found uploaded image preview');
        this.showSuccessMessage('Profile photo uploaded successfully!');
      } else {
        console.log('⚠️ Upload status unclear - no image preview detected');
        this.showSuccessMessage('Profile photo uploaded (verification incomplete)');
      }
      
      console.log('✅ Profile photo insertion workflow completed');
      
    } catch (error) {
      console.error('❌ Error inserting image into DropZone:', error);
      this.showErrorMessage(`Failed to upload profile photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async openPhotoUploadInterface(): Promise<void> {
    console.log('🔄 Starting photo upload interface navigation...');
    
    try {
      // Step 1: Click the sidebar patient photo with retry logic
      console.log('🔄 Step 1: Clicking sidebar patient photo...');
      const patientPhoto = await this.findElementWithRetry(['#SidebarPatientPhoto', '.sidebar-patient-photo', '[id*="patient"][id*="photo" i]', 'img[alt*="patient" i]'], 5000, 3);
      if (!patientPhoto) {
        console.error('❌ Step 1 failed: Could not find sidebar patient photo');
        console.log('🔍 Available elements on page:', document.querySelectorAll('[id*="patient"], [class*="patient"], img').length);
        throw new Error('Could not find sidebar patient photo. The patient edit window may not have opened correctly.');
      }
      
      console.log('✅ Found sidebar patient photo element:', patientPhoto.id || patientPhoto.className);
      patientPhoto.click();
      await this.wait(1500); // Increased wait time for UI loading
      
      // Validate that clicking opened a modal or changed the UI
      console.log('🔍 Validating patient photo click result...');
      await this.wait(500); // Additional wait for UI changes
      
      // Step 2: Click the "Profile Picture" description with improved searching
      console.log('🔄 Step 2: Clicking Profile Picture tab/description...');
      const profilePictureDescription = await this.findProfilePictureTab();
      
      if (!profilePictureDescription) {
        console.error('❌ Step 2 failed: Could not find Profile Picture tab');
        console.log('🔍 Available descriptions:', Array.from(document.querySelectorAll('.description, .tab, .tab-item, [role="tab"]')).map(el => el.textContent?.trim()).filter(text => text));
        throw new Error('Could not find Profile Picture tab. The patient modal may not have opened correctly.');
      }
      
      console.log('✅ Found Profile Picture tab:', profilePictureDescription.textContent?.trim());
      profilePictureDescription.click();
      await this.wait(1500); // Increased wait time for tab switching
      
      // Step 3: Click the "Upload New" button with fallback selectors
      console.log('🔄 Step 3: Clicking Upload New button...');
      const uploadButton = await this.findElementWithRetry([
        '#UploadPhotoButton', 
        'button:contains("Upload New")', 
        'button:contains("Upload")', 
        'button:contains("Browse")', 
        '[data-action="upload"]',
        'input[type="file"]'
      ], 5000, 3);
      
      if (!uploadButton) {
        console.error('❌ Step 3 failed: Could not find Upload button');
        console.log('🔍 Available buttons in profile section:', Array.from(document.querySelectorAll('button, input[type="file"]')).map(el => el.textContent?.trim() || el.getAttribute('type')).filter(text => text));
        throw new Error('Could not find Upload New button. The Profile Picture tab may not have loaded correctly.');
      }
      
      console.log('✅ Found upload button:', uploadButton.textContent?.trim() || uploadButton.tagName);
      uploadButton.click();
      await this.wait(2000); // Longer wait for DropZone to appear
      
      console.log('✅ Photo upload interface navigation completed successfully');
      
    } catch (error) {
      console.error('❌ Failed to open photo upload interface:', error);
      // Add more detailed error context
      console.log('🔍 Current page URL:', window.location.href);
      console.log('🔍 Current page title:', document.title);
      console.log('🔍 Page contains patient edit elements:', document.querySelectorAll('[id*="edit"], [class*="edit"], .modal').length > 0);
      
      throw new Error(`Navigation failed at step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findDropZone(): Promise<HTMLElement | null> {
    console.log('🔍 Looking for DropZone element...');
    
    // First try the specific DropZone selector
    let dropZone = await this.waitForDropZone();
    if (dropZone) {
      console.log('✅ Found DropZone with primary selector');
      return dropZone;
    }
    
    // Try alternative selectors for file upload areas
    const alternativeSelectors = [
      '[class*="dropzone" i]',
      '[class*="drop-zone" i]',
      '[class*="file-drop" i]',
      '[class*="upload-zone" i]',
      '.file-upload-area',
      '[data-drop="true"]',
      'input[type="file"]'
    ];
    
    console.log('🔍 Trying alternative DropZone selectors...');
    dropZone = await this.findElementWithRetry(alternativeSelectors, 5000, 2);
    
    if (dropZone) {
      console.log('✅ Found DropZone with alternative selector');
      return dropZone;
    }
    
    console.warn('⚠️ Could not find DropZone even with alternative selectors');
    console.log('🔍 Available file-related elements:', document.querySelectorAll('input[type="file"], [class*="upload"], [class*="drop"]').length);
    return null;
  }

  private async waitForDropZone(timeout = 5000): Promise<HTMLElement | null> {
    console.log('⏳ Waiting for DropZone to appear...');
    
    const startTime = Date.now();
    const checkInterval = 200; // Check every 200ms
    
    while (Date.now() - startTime < timeout) {
      const dropZone = document.querySelector('#DropZone') as HTMLElement;
      if (dropZone && dropZone.offsetParent !== null) {
        console.log('✅ DropZone appeared and is visible');
        return dropZone;
      }
      
      await this.wait(checkInterval);
    }
    
    console.log('❌ Timeout waiting for DropZone to appear');
    return null;
  }

  private async base64ToFile(base64Data: string, filename: string): Promise<File> {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to blob
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // Create File object
    return new File([blob], filename, { type: 'image/png' });
  }

  private async simulateFileDrop(dropZone: HTMLElement, file: File) {
    console.log('📁 Simulating file drop into DropZone');
    
    // Create a FileList-like object
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null
    } as unknown as FileList;

    // Create and dispatch drag events
    const dragEnterEvent = new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });

    // Add file to dataTransfer
    dropEvent.dataTransfer?.items.add(file);

    // Dispatch events in sequence
    dropZone.dispatchEvent(dragEnterEvent);
    await this.wait(50);
    
    dropZone.dispatchEvent(dragOverEvent);
    await this.wait(50);
    
    dropZone.dispatchEvent(dropEvent);
    
    // Also try direct file input approach as fallback
    const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      console.log('📁 Found file input, setting files directly');
      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    console.log('📁 File drop simulation completed');
  }

  private showSuccessMessage(message: string) {
    // Create and show success message
    const messageDiv = document.createElement('div');
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
    
    // Remove after 3 seconds
    setTimeout(() => {
      messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  }

  private async showScreenshotInstructions(data: any) {
    console.log('📸 Showing screenshot instructions:', data);
    
    // First, navigate to the photo upload interface so DropZone will be ready
    try {
      console.log('📸 Opening photo upload interface for clipboard workflow...');
      await this.openPhotoUploadInterface();
    } catch (error) {
      console.error('❌ Failed to open photo upload interface for clipboard workflow:', error);
      // Continue anyway and show instructions - user can navigate manually
    }
    
    // Create instruction modal
    const modal = document.createElement('div');
    modal.id = 'screenshot-instructions-modal';
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

    const modalContent = document.createElement('div');
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

    const title = document.createElement('h2');
    title.textContent = '📸 Take Screenshot';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      text-align: center;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = data.tabCaptureError 
      ? `No doxy.me tabs found. ${data.tabCaptureError}`
      : 'No doxy.me tabs found. Please take a manual screenshot.';
    subtitle.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
    `;

    const instructionsList = document.createElement('div');
    instructionsList.style.cssText = `
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin: 20px 0;
    `;

    const instructions = data.instructions || [
      'Press cmd+shift+4 to take a screenshot',
      'Select the area you want to capture', 
      'The image will automatically be inserted when ready'
    ];

    instructions.forEach((instruction: string, index: number) => {
      const step = document.createElement('div');
      step.style.cssText = `
        display: flex;
        align-items: flex-start;
        margin: ${index > 0 ? '12px' : '0'} 0 0 0;
        font-size: 14px;
        color: #374151;
        line-height: 1.5;
      `;
      
      const stepNumber = document.createElement('span');
      stepNumber.textContent = `${index + 1}.`;
      stepNumber.style.cssText = `
        display: inline-block;
        width: 20px;
        font-weight: 600;
        color: #3b82f6;
        flex-shrink: 0;
      `;
      
      const stepText = document.createElement('span');
      stepText.textContent = instruction;
      
      step.appendChild(stepNumber);
      step.appendChild(stepText);
      instructionsList.appendChild(step);
    });

    // Status indicator
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      margin: 20px 0;
    `;

    const statusText = document.createElement('span');
    statusText.textContent = '⏳ Waiting for screenshot...';
    statusText.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #92400e;
    `;

    statusDiv.appendChild(statusText);

    // Manual paste button as backup option
    const pasteButton = document.createElement('button');
    pasteButton.textContent = '📋 Manual Paste';
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

    pasteButton.addEventListener('mouseenter', () => {
      pasteButton.style.backgroundColor = '#2563eb';
    });

    pasteButton.addEventListener('mouseleave', () => {
      pasteButton.style.backgroundColor = '#3b82f6';
    });

    pasteButton.addEventListener('click', async () => {
      try {
        console.log('📋 Manual paste button clicked, attempting clipboard read...');
        const clipboardItems = await navigator.clipboard.read();
        
        if (clipboardItems.length === 0) {
          alert('No items found in clipboard. Please copy an image first.');
          return;
        }

        let imageFound = false;
        for (let i = 0; i < clipboardItems.length; i++) {
          const item = clipboardItems[i];
          
          // Check for image types
          const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp'];
          const foundImageType = item.types.find(type => 
            imageTypes.includes(type) || type.startsWith('image/')
          );
          
          if (foundImageType) {
            console.log(`📋 Found image in clipboard: ${foundImageType}`);
            const blob = await item.getType(foundImageType);
            const base64Data = await this.blobToBase64(blob);
            
            // Close the instruction modal
            this.closeScreenshotModal();
            
            // Insert image into DropZone
            await this.insertImageIntoDropZone(base64Data, 'manual-paste');
            
            // Notify service worker of success
            try {
              await chrome.runtime.sendMessage({
                type: 'CLIPBOARD_MONITORING_RESULT',
                data: {
                  success: true,
                  imageData: base64Data,
                  method: 'manual-paste'
                }
              });
            } catch (error) {
              console.error('Failed to notify service worker:', error);
            }
            
            imageFound = true;
            break;
          }
        }
        
        if (!imageFound) {
          alert('No image found in clipboard. Please copy an image and try again.');
        }
        
      } catch (error) {
        console.error('Manual paste failed:', error);
        alert('Failed to access clipboard. Please ensure you have copied an image and try again.');
      }
    });

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
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

    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.backgroundColor = '#e5e7eb';
    });

    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.backgroundColor = '#f3f4f6';
    });

    cancelButton.addEventListener('click', () => {
      this.closeScreenshotModal();
    });

    // Assemble modal
    modalContent.appendChild(title);
    modalContent.appendChild(subtitle);
    modalContent.appendChild(instructionsList);
    modalContent.appendChild(statusDiv);
    modalContent.appendChild(pasteButton);
    modalContent.appendChild(cancelButton);
    modal.appendChild(modalContent);

    // Add styles for animations
    const style = document.createElement('style');
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

    // Add to document
    document.body.appendChild(modal);

    console.log('📸 Screenshot instructions modal shown');
  }

  private closeScreenshotModal() {
    const modal = document.getElementById('screenshot-instructions-modal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      const content = modal.querySelector('div');
      if (content) {
        (content as HTMLElement).style.animation = 'scaleOut 0.3s ease-out';
      }
      
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
      
      console.log('📸 Screenshot instructions modal closed');
    }
  }

  private async startClipboardMonitoring(timeoutMs: number) {
    console.log(`📸 Starting enhanced clipboard monitoring for ${timeoutMs/1000} seconds...`);
    
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms for more responsive detection
    let lastClipboardChecksum: string | null = null;
    let checkCount = 0;
    
    const monitorLoop = async () => {
      const elapsedTime = Date.now() - startTime;
      checkCount++;
      
      if (elapsedTime >= timeoutMs) {
        console.log(`❌ Clipboard monitoring timeout after ${checkCount} checks over ${elapsedTime/1000} seconds`);
        // Notify service worker of timeout
        try {
          await chrome.runtime.sendMessage({
            type: 'CLIPBOARD_MONITORING_RESULT',
            data: {
              success: false,
              error: `Timeout waiting for screenshot in clipboard (${checkCount} checks)`
            }
          });
        } catch (error) {
          console.error('❌ Failed to notify service worker of timeout:', error);
        }
        return;
      }
      
      // Log progress every 5 seconds
      if (checkCount % 10 === 0) {
        console.log(`📸 Clipboard monitoring: check ${checkCount}, ${Math.round((timeoutMs - elapsedTime)/1000)}s remaining`);
      }
      
      try {
        // Ensure the page is focused for clipboard access
        if (document.hasFocus && !document.hasFocus()) {
          console.log('📸 Page not focused, attempting to focus...');
          window.focus();
          // Give focus a moment to take effect
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Check clipboard permissions first
        const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
        if (permissionStatus.state === 'denied') {
          console.error('❌ Clipboard read permission denied');
          throw new Error('Clipboard read permission denied');
        }
        
        // Check if clipboard contains image data
        const clipboardItems = await navigator.clipboard.read();
        
        // Create a simple checksum to detect clipboard changes
        const clipboardChecksum = clipboardItems.map(item => item.types.join(',')).join('|');
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
          
          // Check for various image formats with expanded list
          const imageTypes = [
            'image/png', 
            'image/jpeg', 
            'image/jpg', 
            'image/gif', 
            'image/webp', 
            'image/bmp',
            'image/svg+xml',
            'image/tiff',
            'image/ico',
            'image/avif'
          ];
          
          const foundImageType = item.types.find(type => 
            imageTypes.includes(type) || type.startsWith('image/')
          );
          
          if (foundImageType) {
            console.log(`📸 ✅ IMAGE DETECTED in clipboard! Type: ${foundImageType}, Size check starting...`);
            
            try {
              // Get the image blob with timeout
              const blob = await Promise.race([
                item.getType(foundImageType),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Blob retrieval timeout')), 5000)
                )
              ]);
              
              console.log(`📸 ✅ Successfully retrieved blob: ${blob.size} bytes, type: ${blob.type}`);
              
              // Validate blob size
              if (blob.size === 0) {
                console.warn('⚠️ Blob is empty, skipping...');
                continue;
              }
              
              if (blob.size > 10 * 1024 * 1024) { // 10MB limit
                console.warn(`⚠️ Blob too large: ${blob.size} bytes, skipping...`);
                continue;
              }
              
              // Convert blob to base64 with progress
              console.log(`📸 Converting ${blob.size} byte blob to base64...`);
              const base64Data = await this.blobToBase64(blob);
              console.log(`📸 ✅ Successfully converted to base64: ${base64Data.length} characters`);
              
              // Validate base64 data
              if (!base64Data.startsWith('data:image/')) {
                console.warn('⚠️ Invalid base64 image data format, skipping...');
                continue;
              }
              
              console.log('🎉 CLIPBOARD IMAGE PROCESSING SUCCESSFUL! Closing modal and inserting image...');
              
              // Close the instruction modal
              this.closeScreenshotModal();
              
              // Insert image into DropZone
              await this.insertImageIntoDropZone(base64Data, 'clipboard');
              
              // Notify service worker of success
              try {
                await chrome.runtime.sendMessage({
                  type: 'CLIPBOARD_MONITORING_RESULT',
                  data: {
                    success: true,
                    imageData: base64Data,
                    method: 'clipboard',
                    imageType: foundImageType,
                    imageSize: blob.size,
                    checksCount: checkCount
                  }
                });
                console.log('✅ Successfully notified service worker of clipboard success');
              } catch (notificationError) {
                console.error('❌ Failed to notify service worker of success:', notificationError);
              }
              
              return;
              
            } catch (blobError) {
              console.error(`❌ Failed to process clipboard image blob (${foundImageType}):`, blobError);
              
              // Try to continue with other items or formats
              if (i < clipboardItems.length - 1) {
                console.log('🔄 Trying next clipboard item...');
                continue;
              }
            }
          }
        }
        
        // Continue monitoring
        setTimeout(monitorLoop, checkInterval);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Clipboard access failed (check ${checkCount}):`, errorMessage);
        
        // Different handling based on error type
        if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
          console.error('🚫 Clipboard permission issue - stopping monitoring');
          try {
            await chrome.runtime.sendMessage({
              type: 'CLIPBOARD_MONITORING_RESULT',
              data: {
                success: false,
                error: `Clipboard permission denied: ${errorMessage}`
              }
            });
          } catch (notificationError) {
            console.error('❌ Failed to notify service worker of permission error:', notificationError);
          }
          return;
        }
        
        // For other errors, continue monitoring but with longer interval
        console.log(`🔄 Continuing monitoring with longer interval due to error...`);
        setTimeout(monitorLoop, checkInterval * 2);
      }
    };
    
    // Initial clipboard state check
    try {
      const initialItems = await navigator.clipboard.read();
      lastClipboardChecksum = initialItems.map(item => item.types.join(',')).join('|');
      console.log(`📸 Initial clipboard state: ${initialItems.length} items`);
    } catch (error) {
      console.log('📸 Could not read initial clipboard state:', error);
    }
    
    // Start monitoring
    console.log('📸 🚀 Starting clipboard monitoring loop...');
    monitorLoop();
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async extractEMRData(fields: string[]): Promise<Record<string, string>> {
    console.log('📋 Extracting EMR data for fields:', fields);
    console.log('📋 Current page URL:', window.location.href);
    console.log('📋 Current page type:', window.location.href.includes('Dashboard') ? 'DASHBOARD' : 'PATIENT_PAGE');
    
    // Enhanced validation for patient record view
    const xestroBoxes = document.querySelectorAll('.XestroBox');
    
    // Check for Patient Record button using valid selectors
    let patientRecordButton = document.querySelector('button.PatientDetailsButton');
    if (!patientRecordButton) {
      patientRecordButton = await this.findButtonByText('Patient Record');
    }
    
    console.log('📋 Found XestroBox elements:', xestroBoxes.length);
    console.log('📋 Patient Record button present:', !!patientRecordButton);
    
    if (xestroBoxes.length === 0) {
      console.warn('⚠️ No XestroBox elements found - patient record may not be opened');
      
      if (patientRecordButton) {
        console.warn('💡 Patient Record button is available - attempting to open record');
        try {
          await this.ensurePatientRecordOpened();
          
          // Re-check for XestroBox elements after attempting to open record
          const newXestroBoxes = document.querySelectorAll('.XestroBox');
          if (newXestroBoxes.length === 0) {
            console.warn('⚠️ Still no XestroBox elements after clicking Patient Record button');
            console.warn('💡 Proceeding with extraction but results may be limited');
          } else {
            console.log(`✅ Found ${newXestroBoxes.length} XestroBox elements after opening record`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to open patient record:', error);
        }
      } else {
        console.warn('💡 EMR data extraction requires patient page with clinical fields');
        console.warn('💡 Make sure you are on the correct patient page');
      }
    }
    
    const extractedData: Record<string, string> = {};
    
    for (const fieldName of fields) {
      try {
        let fieldValue = '';
        
        // Map common field name variations
        const normalizedFieldName = this.normalizeFieldName(fieldName);
        
        switch (normalizedFieldName) {
          case 'background':
            fieldValue = await this.extractFieldContent('Background');
            break;
          case 'investigations':
          case 'investigation-summary':
            fieldValue = await this.extractFieldContent('Investigation Summary');
            break;
          case 'medications':
            fieldValue = await this.extractFieldContent('Medications (Problem List for Phil)') || 
                        await this.extractFieldContent('Medications');
            break;
          default:
            // Try to extract custom field
            fieldValue = await this.extractFieldContent(fieldName);
        }
        
        extractedData[fieldName] = fieldValue;
        console.log(`📋 Extracted ${fieldName}: ${fieldValue ? fieldValue.length + ' chars' : 'empty'}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to extract field "${fieldName}":`, error);
        extractedData[fieldName] = '';
      }
    }
    
    console.log('📋 EMR data extraction completed:', Object.keys(extractedData));
    return extractedData;
  }

  /**
   * Non-invasive EMR data extraction specifically for AI Review
   * Only reads existing content without opening/expanding any fields
   * Includes visual field highlighting during extraction
   */
  private async extractEMRDataForAIReview(fields: string[]): Promise<Record<string, string>> {
    console.log('🤖 AI REVIEW EXTRACTION: Starting non-invasive EMR extraction for fields:', fields);
    console.log('🤖 AI REVIEW EXTRACTION: Current URL:', window.location.href);
    console.log('🤖 AI REVIEW EXTRACTION: Page title:', document.title);
    
    // First, check if we're on the right page
    if (!window.location.href.includes('my.xestro.com')) {
      throw new Error('Not on Xestro EMR page - please navigate to my.xestro.com');
    }
    
    // Check if XestroBoxes are available
    const allXestroBoxes = document.querySelectorAll('.XestroBox');
    console.log(`🤖 AI REVIEW EXTRACTION: Found ${allXestroBoxes.length} XestroBox elements on page`);
    
    if (allXestroBoxes.length === 0) {
      throw new Error('No XestroBox elements found - please navigate to a patient record page');
    }
    
    // Log all available XestroBox titles for debugging
    console.log('🤖 AI REVIEW EXTRACTION: Available XestroBox titles:');
    allXestroBoxes.forEach((box, index) => {
      const titleElement = box.querySelector('.XestroBoxTitle');
      const titleText = titleElement?.textContent || 'No title';
      console.log(`  [${index}] "${titleText}"`);
    });
    
    const extractedData: Record<string, string> = {};
    const extractionLog: Record<string, any> = {};
    
    for (const fieldName of fields) {
      console.log(`\n🤖 AI REVIEW EXTRACTION: Processing field: "${fieldName}"`);
      let fieldValue = '';
      let highlightedElement: HTMLElement | null = null;
      const fieldLog: any = { fieldName, attempts: [] };
      
      try {
        const normalizedFieldName = fieldName.toLowerCase();
        
        // Highlight field during extraction
        highlightedElement = this.highlightFieldDuringExtraction(normalizedFieldName);
        
        // Add small delay to show highlighting
        await this.wait(300);
        
        switch (normalizedFieldName) {
          case 'background':
            fieldLog.searchTerms = ['Background'];
            fieldValue = await this.extractCustomNoteContent('Background');
            fieldLog.attempts.push({ searchTerm: 'Background', result: fieldValue.length > 0 ? 'success' : 'empty' });
            break;
          case 'investigations':
          case 'investigation-summary':
            fieldLog.searchTerms = ['Investigation Summary'];
            fieldValue = await this.extractCustomNoteContent('Investigation Summary');
            fieldLog.attempts.push({ searchTerm: 'Investigation Summary', result: fieldValue.length > 0 ? 'success' : 'empty' });
            break;
          case 'medications-problemlist':
            fieldLog.searchTerms = ['Medications (Problem List for Phil)'];
            fieldValue = await this.extractCustomNoteContent('Medications (Problem List for Phil)');
            fieldLog.attempts.push({ searchTerm: 'Medications (Problem List for Phil)', result: fieldValue.length > 0 ? 'success' : 'empty' });
            break;
          case 'medications':
            console.warn('🤖 AI REVIEW EXTRACTION: Generic "medications" field requested. Trying specific fields...');
            fieldLog.searchTerms = ['Medications (Problem List for Phil)', 'Medications'];
            
            fieldValue = await this.extractCustomNoteContent('Medications (Problem List for Phil)');
            fieldLog.attempts.push({ searchTerm: 'Medications (Problem List for Phil)', result: fieldValue.length > 0 ? 'success' : 'empty' });
            
            if (!fieldValue) {
              fieldValue = await this.extractCustomNoteContent('Medications');
              fieldLog.attempts.push({ searchTerm: 'Medications', result: fieldValue.length > 0 ? 'success' : 'empty' });
            }
            break;
          default:
            fieldLog.searchTerms = [fieldName];
            fieldValue = await this.extractCustomNoteContent(fieldName);
            fieldLog.attempts.push({ searchTerm: fieldName, result: fieldValue.length > 0 ? 'success' : 'empty' });
        }
        
        fieldLog.finalResult = {
          success: fieldValue.length > 0,
          contentLength: fieldValue.length,
          preview: fieldValue.length > 0 ? fieldValue.substring(0, 100) + (fieldValue.length > 100 ? '...' : '') : 'No content'
        };
        
        if (fieldValue) {
          console.log(`✅ AI REVIEW EXTRACTION: Successfully extracted "${fieldName}": ${fieldValue.length} chars`);
          console.log(`   Preview: "${fieldValue.substring(0, 100)}${fieldValue.length > 100 ? '...' : ''}"`);
        } else {
          console.log(`⚠️ AI REVIEW EXTRACTION: No content found for "${fieldName}"`);
        }
        
        extractedData[fieldName] = fieldValue;
        extractionLog[fieldName] = fieldLog;
        
      } catch (error) {
        console.error(`❌ AI REVIEW EXTRACTION: Failed to extract "${fieldName}":`, error);
        fieldLog.error = error instanceof Error ? error.message : String(error);
        extractedData[fieldName] = '';
        extractionLog[fieldName] = fieldLog;
      } finally {
        // Remove highlighting after extraction
        if (highlightedElement) {
          this.removeFieldHighlight(highlightedElement);
        }
      }
    }
    
    // Summary logging
    const successfulFields = Object.entries(extractedData).filter(([, value]) => value.length > 0);
    const totalFields = Object.keys(extractedData).length;
    
    console.log('\n🤖 AI REVIEW EXTRACTION: SUMMARY');
    console.log(`   Successful extractions: ${successfulFields.length}/${totalFields}`);
    console.log('   Extraction details:', extractionLog);
    console.log('   Final extracted data keys:', Object.keys(extractedData));
    
    if (successfulFields.length === 0) {
      console.error('🤖 AI REVIEW EXTRACTION: No data extracted from any field');
      console.log('🤖 AI REVIEW EXTRACTION: Diagnostic info:');
      console.log('   - Available XestroBox titles:', Array.from(allXestroBoxes).map(box => 
        box.querySelector('.XestroBoxTitle')?.textContent || 'No title'
      ));
      
      throw new Error(`No EMR data could be extracted. Available fields: ${Array.from(allXestroBoxes).map(box => 
        box.querySelector('.XestroBoxTitle')?.textContent || 'No title'
      ).join(', ')}`);
    }
    
    console.log('✅ AI REVIEW EXTRACTION: Non-invasive extraction completed successfully');
    return extractedData;
  }

  /**
   * Highlight field during extraction to provide visual feedback
   */
  private highlightFieldDuringExtraction(fieldName: string): HTMLElement | null {
    try {
      let targetElement: HTMLElement | null = null;
      
      // Map field names to their likely containers
      switch (fieldName) {
        case 'background':
          targetElement = this.findFieldContainer('Background');
          break;
        case 'investigations':
          targetElement = this.findFieldContainer('Investigation Summary') || 
                          this.findFieldContainer('Investigations');
          break;
        case 'medications-problemlist':
          targetElement = this.findFieldContainer('Medications') || 
                          this.findFieldContainer('Problem List');
          break;
        default:
          targetElement = this.findFieldContainer(fieldName);
      }
      
      if (targetElement) {
        // Add highlighting styles
        targetElement.style.transition = 'all 0.3s ease';
        targetElement.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
        targetElement.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
        targetElement.style.borderRadius = '8px';
        
        console.log(`✨ Highlighted field: ${fieldName}`);
        return targetElement;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Failed to highlight field ${fieldName}:`, error);
      return null;
    }
  }

  /**
   * Remove highlighting from field
   */
  private removeFieldHighlight(element: HTMLElement): void {
    try {
      // Remove highlighting styles
      element.style.boxShadow = '';
      element.style.backgroundColor = '';
      element.style.borderRadius = '';
      
      // Remove transition after a brief delay
      setTimeout(() => {
        element.style.transition = '';
      }, 300);
      
      console.log(`🔄 Removed field highlighting`);
    } catch (error) {
      console.warn(`⚠️ Failed to remove field highlighting:`, error);
    }
  }

  /**
   * Find field container element for highlighting
   */
  private findFieldContainer(fieldDisplayName: string): HTMLElement | null {
    try {
      // Look for XestroBoxTitle and get parent XestroBox
      const titles = document.querySelectorAll('.XestroBoxTitle');
      for (const title of titles) {
        if (title.textContent?.includes(fieldDisplayName)) {
          const container = title.closest('.XestroBox') || title.parentElement;
          return container as HTMLElement;
        }
      }
      
      // Alternative: Look for elements with data attributes or specific classes
      const fieldSelectors = [
        `[data-field="${fieldDisplayName.toLowerCase()}"]`,
        `[data-field-name="${fieldDisplayName.toLowerCase()}"]`,
        `.${fieldDisplayName.toLowerCase().replace(/\s+/g, '-')}-field`,
        `.field-${fieldDisplayName.toLowerCase().replace(/\s+/g, '-')}`
      ];
      
      for (const selector of fieldSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element as HTMLElement;
        }
      }
      
      // Fallback: Look for any element containing the field name in specific containers
      const containers = document.querySelectorAll('.XestroBox, .field, .section, .form-group');
      for (const container of containers) {
        if (container.textContent?.includes(fieldDisplayName)) {
          return container as HTMLElement;
        }
      }
      
      console.log(`⚠️ Could not find container for field: ${fieldDisplayName}`);
      return null;
    } catch (error) {
      console.warn(`⚠️ Error finding field container for ${fieldDisplayName}:`, error);
      return null;
    }
  }

  private normalizeFieldName(fieldName: string): string {
    return fieldName.toLowerCase().replace(/[_\s-]+/g, '-');
  }

  private async extractCustomNoteContent(fieldDisplayName: string): Promise<string> {
    console.log(`📋 Looking for customNote content in field: "${fieldDisplayName}"`);
    
    try {
      // Find the XestroBox for this field
      const xestroBox = await this.findXestroBoxByTitle(fieldDisplayName);
      if (!xestroBox) {
        console.log(`⚠️ No XestroBox found for "${fieldDisplayName}"`);
        return '';
      }
      
      // Look for .customNote elements within this XestroBox
      const customNotes = xestroBox.querySelectorAll('.customNote');
      console.log(`📋 Found ${customNotes.length} customNote elements in "${fieldDisplayName}" XestroBox`);
      
      if (customNotes.length === 0) {
        console.log(`⚠️ No .customNote elements found in "${fieldDisplayName}" XestroBox`);
        return '';
      }
      
      // Extract content from all customNote elements (even if hidden - data is in DOM)
      let combinedContent = '';
      for (let i = 0; i < customNotes.length; i++) {
        const note = customNotes[i] as HTMLElement;
        const content = (note.textContent || note.innerText || '').trim();
        if (content) {
          if (combinedContent) {
            combinedContent += '\n\n' + content; // Separate multiple notes
          } else {
            combinedContent = content;
          }
          const isVisible = note.offsetParent !== null;
          console.log(`📋 Extracted customNote ${i + 1} content: ${content.length} chars (visible: ${isVisible})`);
        }
      }

      if (combinedContent) {
        console.log(`✅ Total customNote content for "${fieldDisplayName}": ${combinedContent.length} chars`);
        return combinedContent;
      } else {
        console.log(`⚠️ No visible content found in customNote elements for "${fieldDisplayName}"`);
        return '';
      }
      
    } catch (error) {
      console.error(`❌ Error extracting customNote content for "${fieldDisplayName}":`, error);
      return '';
    }
  }

  private async extractFieldContent(fieldDisplayName: string): Promise<string> {
    console.log(`📋 Extracting content for field: "${fieldDisplayName}"`);
    
    try {
      // First, try the new direct customNote extraction method
      const customNoteContent = await this.extractCustomNoteContent(fieldDisplayName);
      if (customNoteContent) {
        console.log(`📋 Found customNote content for "${fieldDisplayName}": ${customNoteContent.length} chars`);
        return customNoteContent;
      }
      
      // Fallback: try to find and expand the XestroBox for this field (original method)
      const xestroBox = await this.findXestroBoxByTitle(fieldDisplayName);
      if (xestroBox) {
        console.log(`✅ Found XestroBox for "${fieldDisplayName}"`);

        let dialogOpened = false;

        // Click to expand if needed (some boxes may be collapsed)
        const titleElement = xestroBox.querySelector('.XestroBoxTitle');
        if (titleElement) {
          (titleElement as HTMLElement).click();
          dialogOpened = true;
          await this.wait(300); // Wait for expansion
        }

        let extractedContent = '';

        // Look for textarea or contenteditable within this box
        const textArea = xestroBox.querySelector('textarea') as HTMLTextAreaElement;
        if (textArea && textArea.offsetParent !== null) {
          extractedContent = textArea.value.trim();
          console.log(`📋 Found textarea content for "${fieldDisplayName}": ${extractedContent.length} chars`);
        } else {
          // Try contenteditable elements
          const contentEditables = xestroBox.querySelectorAll('[contenteditable="true"]');
          for (const element of contentEditables) {
            const htmlElement = element as HTMLElement;
            if (htmlElement.offsetParent !== null) {
              const content = (htmlElement.textContent || htmlElement.innerText || '').trim();
              if (content) {
                extractedContent = content;
                console.log(`📋 Found contenteditable content for "${fieldDisplayName}": ${content.length} chars`);
                break;
              }
            }
          }
        }

        // Close any dialog that was opened
        if (dialogOpened) {
          await this.closeAnyOpenDialog();
        }

        if (extractedContent) {
          return extractedContent;
        }
      }
      
      // Fallback: try to find any textarea/input with matching attributes
      const fallbackSelectors = [
        `textarea[data-field="${fieldDisplayName.toLowerCase()}"]`,
        `textarea[placeholder*="${fieldDisplayName}"]`,
        `textarea[aria-label*="${fieldDisplayName}"]`,
        `#${fieldDisplayName.replace(/\s+/g, '').toLowerCase()}`,
        `.${fieldDisplayName.replace(/\s+/g, '-').toLowerCase()}`
      ];
      
      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector) as HTMLTextAreaElement | HTMLInputElement;
        if (element && element.offsetParent !== null) {
          const content = element.value.trim();
          console.log(`📋 Found fallback content for "${fieldDisplayName}" via ${selector}: ${content.length} chars`);
          return content;
        }
      }
      
      console.log(`⚠️ No content found for field "${fieldDisplayName}"`);
      return '';
      
    } catch (error) {
      console.error(`❌ Error extracting field "${fieldDisplayName}":`, error);
      return '';
    }
  }

  /**
   * Close any open modal/dialog by pressing Escape or clicking close buttons
   */
  private async closeAnyOpenDialog(): Promise<void> {
    console.log(`🚪 Attempting to close any open dialogs...`);

    try {
      // Method 1: Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(escapeEvent);
      await this.wait(200);

      // Method 2: Look for common close button selectors and click them
      const closeButtonSelectors = [
        'button[aria-label="Close"]',
        'button.close',
        '.modal-close',
        '.dialog-close',
        'button:has(.fa-times)',
        'button:has(.fa-close)',
        '[data-dismiss="modal"]'
      ];

      for (const selector of closeButtonSelectors) {
        const closeButton = document.querySelector(selector) as HTMLElement;
        if (closeButton && closeButton.offsetParent !== null) {
          console.log(`🚪 Found close button: ${selector}`);
          closeButton.click();
          await this.wait(200);
          break;
        }
      }

      console.log(`✅ Dialog close attempt completed`);
    } catch (error) {
      console.error(`❌ Error closing dialog:`, error);
    }
  }

  private async findXestroBoxByTitle(title: string): Promise<HTMLElement | null> {
    console.log(`🔍 Looking for XestroBox with title: "${title}"`);

    const xestroBoxes = document.querySelectorAll('.XestroBox');
    console.log(`🔍 Found ${xestroBoxes.length} XestroBox elements`);

    // Log all XestroBox titles for debugging
    xestroBoxes.forEach((box, index) => {
      const titleElement = box.querySelector('.XestroBoxTitle');
      const titleText = titleElement?.textContent || 'No title';
      console.log(`🔍 XestroBox ${index}: "${titleText}"`);
    });

    for (const box of xestroBoxes) {
      const titleElement = box.querySelector('.XestroBoxTitle');
      if (titleElement && titleElement.textContent?.includes(title)) {
        console.log(`✅ Found XestroBox with matching title: "${titleElement.textContent}"`);
        return box as HTMLElement;
      }
    }
    
    // Try partial matches for common variations
    const partialMatches = [
      title.split(' ')[0], // First word
      title.replace(/\s+/g, ''), // No spaces
      title.toLowerCase()
    ];
    
    for (const partialTitle of partialMatches) {
      for (const box of xestroBoxes) {
        const titleElement = box.querySelector('.XestroBoxTitle');
        const titleText = titleElement?.textContent?.toLowerCase() || '';
        if (titleText.includes(partialTitle.toLowerCase())) {
          console.log(`✅ Found XestroBox with partial match: "${titleElement?.textContent}" for "${title}"`);
          return box as HTMLElement;
        }
      }
    }
    
    console.log(`❌ No XestroBox found for title: "${title}"`);
    return null;
  }

  private async saveNote() {
    console.log('💾 Attempting to save note...');
    
    // Find and click the save button
    const saveButton = document.getElementById('patientNotesSave') as HTMLButtonElement ||
                       document.querySelector('button[title*="Save"]') as HTMLButtonElement ||
                       document.querySelector('button:contains("Save")') as HTMLButtonElement;
    
    if (saveButton) {
      saveButton.click();
      console.log('💾 Note saved via button');
      return;
    }
    
    // Try Shift+Enter as fallback
    const noteArea = document.getElementById('AddNoteArea') as HTMLTextAreaElement;
    if (noteArea) {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true
      });
      noteArea.dispatchEvent(event);
      console.log('💾 Note saved via Shift+Enter');
      return;
    }
    
    console.log('❌ No save method available');
  }

  // Calendar/Appointment Book Patient Extraction
  private async extractCalendarPatients(): Promise<any> {
    console.log('📅 Starting calendar patient extraction...');
    console.log('📅 Current page URL:', window.location.href);
    
    // Check if we're on a calendar/appointment book page
    if (!this.isCalendarPage()) {
      throw new Error('Not on a calendar/appointment book page');
    }
    
    // Extract appointment date
    const appointmentDate = this.extractAppointmentDate();
    console.log('📅 Appointment date:', appointmentDate);
    
    // Find the appointment book table
    const appointmentTable = document.querySelector('table.appointmentBook');
    if (!appointmentTable) {
      throw new Error('Appointment book table not found');
    }
    
    // Extract patient appointments
    const patients = this.extractPatientsFromTable(appointmentTable as HTMLTableElement);
    console.log('📅 Extracted patients:', patients);
    
    return {
      appointmentDate,
      calendarUrl: window.location.href,
      patients,
      totalCount: patients.length
    };
  }

  private isCalendarPage(): boolean {
    // Check for appointment book elements
    const appointmentBook = document.querySelector('.one-appt-book, table.appointmentBook');
    const dateInput = document.querySelector('input.date.form-control');
    
    return !!(appointmentBook && dateInput);
  }

  private extractAppointmentDate(): string {
    // Extract date from the date input field
    const dateInput = document.querySelector('input.date.form-control') as HTMLInputElement;
    if (dateInput) {
      return dateInput.value || dateInput.getAttribute('data-value') || '';
    }
    
    // Fallback to searching for date in the DOM
    const dateElements = document.querySelectorAll('[data-date]');
    for (const element of dateElements) {
      const dataDate = element.getAttribute('data-date');
      if (dataDate) {
        return dataDate;
      }
    }
    
    return new Date().toDateString(); // Fallback to today
  }

  private extractPatientsFromTable(table: HTMLTableElement): any[] {
    console.log('📅 Extracting patients from appointment table...');
    const patients: any[] = [];
    
    // Find all appointment rows (those with patient data)
    const appointmentRows = table.querySelectorAll('tr.appt');
    console.log(`📅 Found ${appointmentRows.length} appointment rows`);
    
    appointmentRows.forEach((row, index) => {
      try {
        const nameCell = row.querySelector('td.Name');
        if (!nameCell || !nameCell.textContent?.trim()) {
          // Skip empty appointments
          return;
        }
        
        const patient = this.extractPatientFromRow(row as HTMLTableRowElement);
        if (patient) {
          // Validate patient pattern
          const isValidPattern = this.validatePatientPattern(patient);
          if (isValidPattern.isValid) {
            patients.push(patient);
            console.log(`📅 ✅ Extracted patient ${index + 1} (${isValidPattern.patternType}):`, patient);
          } else {
            console.warn(`📅 ⚠️ Patient ${index + 1} has invalid pattern:`, { patient, reason: isValidPattern.reason });
            // Still include for backward compatibility, but mark as legacy
            patients.push({ ...patient, _patternType: 'legacy' });
          }
        }
      } catch (error) {
        console.warn(`📅 Failed to extract patient from row ${index}:`, error);
      }
    });
    
    console.log(`📅 Successfully extracted ${patients.length} patients from appointment table`);
    return patients;
  }

  private extractPatientFromRow(row: HTMLTableRowElement): any | null {
    // Extract time
    const timeCell = row.querySelector('td.Time');
    const appointmentTime = timeCell?.textContent?.trim() || '';
    
    // Extract appointment type
    const typeCell = row.querySelector('td.Type');
    const appointmentType = typeCell?.textContent?.trim() || '';
    
    // Extract patient name and details from Name cell
    const nameCell = row.querySelector('td.Name');
    if (!nameCell) return null;
    
    const patientInfo = this.parsePatientNameCell(nameCell);
    if (!patientInfo) return null;
    
    // Extract confirmation status
    const confirmCell = row.querySelector('td.Confirm');
    const confirmed = this.isAppointmentConfirmed(confirmCell);
    
    // Check if first appointment
    const isFirstAppointment = nameCell.querySelector('.fa-star') !== null;
    
    // Extract notes
    const notesCell = row.querySelector('td.Notes');
    const notes = notesCell?.textContent?.trim() || '';
    
    return {
      name: patientInfo.name,
      dob: patientInfo.dob,
      fileNumber: patientInfo.fileNumber,
      appointmentTime,
      appointmentType,
      confirmed,
      isFirstAppointment,
      notes: notes || undefined
    };
  }

  private parsePatientNameCell(nameCell: Element): { name: string; dob: string; fileNumber: string } | null {
    // Look for the pattern: "Name (ID)" as specified by user workflow
    const nameSpan = nameCell.querySelector('span[aria-label]');
    if (!nameSpan) return null;
    
    const ariaLabel = nameSpan.getAttribute('aria-label') || '';
    const displayName = nameSpan.textContent?.trim() || '';
    
    console.log('📅 Parsing patient name cell:', { ariaLabel, displayName });
    
    // Try new pattern first: "Name (ID)" e.g., "Test Test (14524)"
    const nameIdMatch = displayName.match(/^(.+?)\s*\((\d+)\)$/);
    if (nameIdMatch) {
      const fullName = nameIdMatch[1].trim();
      const patientId = nameIdMatch[2];
      
      console.log('📅 Found Name (ID) pattern:', { fullName, patientId });
      
      // Extract DOB from aria-label if available (for backward compatibility)
      const dobMatch = ariaLabel.match(/\((\d{2}\/\d{2}\/\d{4})\)/);
      const dob = dobMatch ? dobMatch[1] : '';
      
      return {
        name: fullName,
        dob,
        fileNumber: patientId // Use patient ID as file number
      };
    }
    
    // Fallback to legacy DOB pattern: "Mrs Jessica (Jess) Demicoli (07/08/1985)"
    const legacyNameMatch = ariaLabel.match(/^(.+?)\s*\((\d{2}\/\d{2}\/\d{4})\)$/);
    if (legacyNameMatch) {
      console.log('📅 Using legacy DOB pattern as fallback');
      const fullName = legacyNameMatch[1].trim();
      const dob = legacyNameMatch[2];
      
      // Extract file number from small element
      const fileNumberElement = nameCell.querySelector('small');
      const fileNumberText = fileNumberElement?.textContent?.trim() || '';
      const fileNumber = fileNumberText.replace(/[^\d]/g, ''); // Extract just the number
      
      return {
        name: fullName,
        dob,
        fileNumber
      };
    }
    
    console.warn('📅 Could not parse patient name from either pattern:', { ariaLabel, displayName });
    return null;
  }

  /**
   * Validate patient pattern to ensure it follows the expected "Name (ID)" format
   */
  private validatePatientPattern(patient: any): { isValid: boolean; patternType: string; reason?: string } {
    if (!patient || !patient.name || !patient.fileNumber) {
      return { isValid: false, patternType: 'invalid', reason: 'Missing name or fileNumber' };
    }

    // Check if fileNumber is numeric (indicating ID pattern)
    const isNumericId = /^\d+$/.test(patient.fileNumber);
    
    if (isNumericId) {
      // Validate that the name doesn't contain obvious DOB patterns
      const containsDOB = /\d{2}\/\d{2}\/\d{4}/.test(patient.name);
      if (!containsDOB) {
        return { isValid: true, patternType: 'name-id' };
      }
    }

    // Check for legacy DOB pattern
    if (patient.dob && /\d{2}\/\d{2}\/\d{4}/.test(patient.dob)) {
      return { isValid: true, patternType: 'legacy-dob' };
    }

    return { 
      isValid: false, 
      patternType: 'unknown', 
      reason: `Unrecognized pattern: name="${patient.name}", fileNumber="${patient.fileNumber}", dob="${patient.dob}"` 
    };
  }

  private isAppointmentConfirmed(confirmCell: Element | null): boolean {
    if (!confirmCell) return false;
    
    // Look for confirmation icons
    const confirmIcon = confirmCell.querySelector('.fa-calendar-check.text-success');
    return !!confirmIcon;
  }

  private async autoSearchFromHash(): Promise<void> {
    const hash = window.location.hash;

    // Check if hash contains filing parameter (#filing=17755)
    if (!hash.includes('filing=')) {
      return;
    }

    // Extract and decode filing number
    const match = hash.match(/filing=([^&]+)/);
    if (!match) return;

    const filingNumber = decodeURIComponent(match[1]);
    console.log(`🔍 Hash-based navigation detected for filing: ${filingNumber}`);

    // Reuse search logic (no code duplication)
    try {
      await this.searchPatientByFiling(filingNumber);
    } catch (error) {
      console.warn('⚠️ Hash-based search failed:', error);
    }

    // Clean up hash after triggering (prevents re-triggering on refresh)
    setTimeout(() => {
      if (window.location.hash.includes(`filing=${encodeURIComponent(filingNumber)}`)) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }, 2000);
  }

  private async searchPatientByFiling(filingNumber: string): Promise<void> {
    console.log(`🔍 Searching for patient by filing: ${filingNumber}`);

    // Find patient search input (confirmed selector: #PatientSelectorInput)
    const searchInput = document.querySelector('#PatientSelectorInput') as HTMLInputElement;
    if (!searchInput) {
      throw new Error('PatientSelectorInput not found - Xestro may not be ready');
    }

    // Fill search input with filing number
    searchInput.value = filingNumber;
    searchInput.focus();

    // Dispatch events to trigger Xestro's search dropdown
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

    console.log(`🔍 Typed filing number, waiting for dropdown...`);

    // Brief wait to allow XHR request to start (reduced from 800ms)
    await this.wait(200);

    // Poll for autocomplete menu to appear with results (max 3 seconds)
    let attempts = 0;
    let menuReady = false;
    while (attempts < 30) { // 30 × 100ms = 3 seconds max
      const menu = document.querySelector('.ui-autocomplete') as HTMLElement;
      const menuItems = menu?.querySelectorAll('.ui-menu-item');
      const hasItems = menuItems && menuItems.length > 0;
      const isVisible = menu && menu.style.display !== 'none';

      console.log(`🔍 Autocomplete menu status (attempt ${attempts + 1}/30):`, {
        menuExists: !!menu,
        itemCount: menuItems?.length || 0,
        isVisible: isVisible,
        display: menu?.style.display
      });

      if (hasItems && isVisible) {
        console.log('✅ Autocomplete menu ready with items');
        menuReady = true;
        break;
      }

      await this.wait(100);
      attempts++;
    }

    if (!menuReady) {
      console.warn('⚠️ Autocomplete menu did not appear within 3 seconds, proceeding anyway...');
    }

    // Press Down Arrow to select first result in dropdown
    searchInput.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      keyCode: 40,
      code: 'ArrowDown',
      bubbles: true
    }));

    console.log(`⬇️ Pressed Down Arrow to select first result`);

    // Small delay before pressing Enter
    await this.wait(200);

    // Press Enter to confirm selection (dispatch all event types for robustness)
    ['keydown', 'keyup', 'keypress'].forEach(eventType => {
      searchInput.dispatchEvent(new KeyboardEvent(eventType, {
        key: 'Enter',
        keyCode: 13,
        code: 'Enter',
        bubbles: true
      }));
    });

    console.log(`✅ Pressed Enter (keydown/keyup/keypress) - patient navigation should complete`);
  }

  private async navigateToPatient(fileNumber: string, patientName: string): Promise<void> {
    console.log(`🧭 Navigating to patient: ${patientName} (Filing: ${fileNumber})`);

    // Set hash with filing parameter - hashchange listener will auto-trigger search
    const hashUrl = `#filing=${encodeURIComponent(fileNumber)}`;
    window.location.hash = hashUrl;

    console.log(`✅ Set hash to ${hashUrl} - auto-search will trigger`);
  }

  /**
   * Activate a patient using UI-driven approach (for SPA navigation)
   * @param patientSelector - Either a CSS selector or patient index number
   */
  private async activatePatientByElement(patientSelector: string | number): Promise<void> {
    console.log(`🖱️ Activating patient by element: ${patientSelector}`);
    console.log(`🖱️ Current page URL: ${window.location.href}`);
    console.log(`🖱️ Page title: ${document.title}`);
    
    let patientElement: HTMLElement | null = null;
    
    if (typeof patientSelector === 'number') {
      // Patient index - get the nth patient from appointment table using correct selectors
      const appointmentTable = document.querySelector('table.appointmentBook');
      if (!appointmentTable) {
        // Debug: Show what table elements are available
        const allTables = document.querySelectorAll('table');
        const tableClasses = Array.from(allTables).map(table => 
          table.className || 'no-class'
        );
        console.error(`🖱️ table.appointmentBook not found. Available tables:`, tableClasses);
        throw new Error(`Appointment table not found. Expected table.appointmentBook. Found ${allTables.length} tables: ${tableClasses.join(', ')}`);
      }
      
      // Find appointment rows first, then patient name cells (matching working discovery logic)
      const appointmentRows = appointmentTable.querySelectorAll('tr.appt');
      console.log(`🖱️ Found ${appointmentRows.length} appointment rows`);
      
      const patientElements = Array.from(appointmentRows)
        .map(row => row.querySelector('td.Name'))
        .filter(cell => cell && cell.textContent?.trim()) as HTMLElement[];
        
      console.log(`🖱️ Found ${patientElements.length} valid patient elements`);
      
      if (patientSelector >= patientElements.length) {
        throw new Error(`Patient index ${patientSelector} out of range. Found ${patientElements.length} patients from ${appointmentRows.length} rows.`);
      }
      
      patientElement = patientElements[patientSelector];
      console.log(`🖱️ Found patient element by index ${patientSelector}`);
      
    } else {
      // CSS selector - find specific element
      patientElement = document.querySelector(patientSelector) as HTMLElement;
      if (!patientElement) {
        throw new Error(`Patient element not found using selector: ${patientSelector}`);
      }
      console.log(`🖱️ Found patient element by selector: ${patientSelector}`);
    }
    
    // Extract patient info for logging
    const patientInfo = this.extractPatientInfoFromElement(patientElement);
    console.log(`🖱️ Activating patient: ${patientInfo.name} (${patientInfo.fileNumber})`);
    
    // Click the patient name element to activate them
    patientElement.click();
    console.log('🖱️ Patient name clicked');
    
    // Wait for patient activation
    await this.wait(1000);
    
    // Verify activation (look for visual indicators)
    const isActivated = this.checkPatientActivation(patientElement);
    if (isActivated) {
      console.log('✅ Patient activation confirmed visually');
    } else {
      console.warn('⚠️ Patient activation not visually confirmed, proceeding anyway');
    }
    
    // Ensure patient record is opened
    await this.ensurePatientRecordOpened();
    
    console.log(`✅ Successfully activated patient: ${patientInfo.name}`);
  }

  /**
   * Extract patient information from a patient name element
   */
  private extractPatientInfoFromElement(patientElement: HTMLElement): { name: string; dob: string; fileNumber: string } {
    const nameSpan = patientElement.querySelector('span[aria-label]');
    const fileNumberElement = patientElement.querySelector('small');
    
    if (!nameSpan) {
      return { name: 'Unknown', dob: '', fileNumber: '' };
    }
    
    // Parse aria-label: "Mr Test Test (14/09/1976)"
    const ariaLabel = nameSpan.getAttribute('aria-label') || '';
    const nameMatch = ariaLabel.match(/^(.+?)\s*\((.+?)\)$/);
    
    const name = nameMatch ? nameMatch[1].trim() : nameSpan.textContent?.trim() || 'Unknown';
    const dob = nameMatch ? nameMatch[2] : '';
    const fileNumber = fileNumberElement?.textContent?.replace(/[^\d]/g, '') || '';
    
    return { name, dob, fileNumber };
  }

  /**
   * Check if patient is visually activated (has selected styling)
   */
  private checkPatientActivation(patientElement: HTMLElement): boolean {
    const row = patientElement.closest('tr');
    if (!row) return false;
    
    // Check for common activation indicators
    return (
      row.classList.contains('selected') ||
      row.classList.contains('active') ||
      row.style.backgroundColor !== '' ||
      row.querySelector('.fa-check') !== null ||
      window.getComputedStyle(row).backgroundColor !== 'rgba(0, 0, 0, 0)' // Any background color
    );
  }

  /**
   * SPA Workflow: Double-click patient name to activate
   */
  private async doubleClickPatient(patientName: string, patientId: string): Promise<void> {
    console.log(`👆 Double-clicking patient: ${patientName} (ID: ${patientId})`);
    console.log(`👆 Current URL: ${window.location.href}`);
    console.log(`👆 Page title: ${document.title}`);

    // Find the appointment table
    const appointmentTable = document.querySelector('table.appointmentBook');
    if (!appointmentTable) {
      throw new Error('Appointment book table not found. Make sure you are on the appointment calendar page.');
    }

    // Find all appointment rows
    const appointmentRows = appointmentTable.querySelectorAll('tr.appt');
    console.log(`👆 Found ${appointmentRows.length} appointment rows in table`);

    // Search for the patient row by matching name and file number
    let targetPatientElement: HTMLElement | null = null;

    for (const row of Array.from(appointmentRows)) {
      const nameCell = row.querySelector('td.Name');
      if (!nameCell) continue;

      const nameSpan = nameCell.querySelector('span[aria-label]') as HTMLElement;
      if (!nameSpan) continue;

      const ariaLabel = nameSpan.getAttribute('aria-label') || '';
      const displayName = nameSpan.textContent?.trim() || '';

      // Check if this row matches our patient
      // The aria-label contains the name with DOB, e.g., "Mr Testa Rossa (01/01/2001)"
      // The displayName might be "Testa Rossa" or "Mr Testa Rossa (16238)" depending on the view
      const nameMatches = ariaLabel.includes(patientName) || displayName.includes(patientName);

      // Check if the row contains the file number (might be in a data attribute or adjacent element)
      // For now, if the name matches and it's the only match, we'll use it
      // In a more robust implementation, we'd also verify the file number
      if (nameMatches) {
        // Try to verify file number if possible
        const rowText = row.textContent || '';
        const hasFileNumber = rowText.includes(patientId);

        console.log(`👆 Found potential match:`, {
          ariaLabel,
          displayName,
          nameMatches,
          hasFileNumber,
          rowText: rowText.substring(0, 100)
        });

        if (hasFileNumber || appointmentRows.length === 1) {
          // Either the file number matches, or there's only one patient, so it must be the right one
          targetPatientElement = nameSpan;
          console.log(`👆 Selected patient element in row:`, {
            ariaLabel,
            displayName,
            className: nameSpan.className,
            tagName: nameSpan.tagName
          });
          break;
        }
      }
    }

    if (!targetPatientElement) {
      console.error(`👆 ERROR: Patient not found in appointment book`);
      console.error(`👆 Search criteria: Name="${patientName}", ID="${patientId}"`);
      console.error(`👆 Available patients:`, Array.from(appointmentRows).map((row, index) => {
        const nameCell = row.querySelector('td.Name');
        const nameSpan = nameCell?.querySelector('span[aria-label]');
        return {
          index,
          ariaLabel: nameSpan?.getAttribute('aria-label'),
          displayName: nameSpan?.textContent?.trim(),
          rowText: row.textContent?.substring(0, 100)
        };
      }));
      throw new Error(`Patient not found in appointment book: ${patientName} (${patientId})`);
    }

    console.log(`👆 Performing double-click on patient element...`);

    // Simulate double-click event
    const dblClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    targetPatientElement.dispatchEvent(dblClickEvent);
    console.log(`👆 Double-click event dispatched`);

    // Wait for navigation to patient record
    console.log(`👆 Waiting 1 second for navigation...`);
    await this.wait(1000);

    console.log(`👆 Double-click completed for patient: ${patientName}`);
    console.log(`👆 Post-click URL: ${window.location.href}`);
    console.log(`👆 Post-click title: ${document.title}`);
  }

  /**
   * SPA Workflow: Navigate to Patient Record view
   */
  private async navigateToPatientRecord(): Promise<void> {
    console.log(`🏥 Navigating to Patient Record view`);
    
    // Look for "Patient Record" button in top navigation
    const patientRecordButton = this.findButtonByText('Patient Record') || 
                               this.findButtonByText('Patient') ||
                               document.querySelector('button[title*="Patient Record"]') ||
                               document.querySelector('a[href*="patient"]');
    
    if (!patientRecordButton) {
      throw new Error('Patient Record button not found in navigation');
    }
    
    console.log(`🏥 Found Patient Record button, clicking...`);
    if (patientRecordButton instanceof HTMLElement) {
      patientRecordButton.click();
    } else {
      throw new Error('Patient Record button is not a clickable element');
    }
    
    // Wait for view to load
    await this.wait(2000);
    
    // Verify we're in patient record view by checking for XestroBoxes
    const xestroBoxCount = document.querySelectorAll('.XestroBox').length;
    if (xestroBoxCount === 0) {
      console.warn(`🏥 Patient Record view may not have loaded (no XestroBoxes found)`);
    }
    
    console.log(`🏥 Navigation to Patient Record completed (${xestroBoxCount} XestroBoxes found)`);
  }

  /**
   * SPA Workflow: Navigate back to Appointment Book view
   */
  private async navigateToAppointmentBook(): Promise<void> {
    console.log(`📅 Navigating back to Appointment Book view`);
    console.log(`📅 Current URL: ${window.location.href}`);
    console.log(`📅 Page title: ${document.title}`);
    
    // First, let's inspect what navigation elements are available
    console.log(`📅 Inspecting available navigation elements...`);
    
    // Log all buttons on the page
    const allButtons = document.querySelectorAll('button');
    console.log(`📅 All buttons found (${allButtons.length}):`, Array.from(allButtons).map((btn, index) => ({
      index,
      textContent: btn.textContent?.trim(),
      className: btn.className,
      id: btn.id,
      title: btn.title,
      onclick: btn.onclick ? 'has onclick' : 'no onclick',
      visible: btn.offsetParent !== null
    })));
    
    // Log all links on the page
    const allLinks = document.querySelectorAll('a');
    console.log(`📅 All links found (${allLinks.length}):`, Array.from(allLinks).map((link, index) => ({
      index,
      textContent: link.textContent?.trim(),
      href: link.href,
      className: link.className,
      id: link.id,
      title: link.title,
      visible: link.offsetParent !== null
    })));
    
    // Look for navigation elements with various patterns
    console.log(`📅 Searching for navigation buttons...`);
    
    const searchPatterns = [
      'Appointment Book',
      'Appointments', 
      'Calendar',
      'Dashboard',
      'Home',
      'Back',
      'Close',
      'Return'
    ];
    
    let appointmentBookButton = null;
    let foundPattern = '';
    
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
    
    // Also try specific selectors
    if (!appointmentBookButton) {
      console.log(`📅 Trying specific selectors...`);
      const selectors = [
        'button[title*="Appointment"]',
        'a[href*="appointment"]',
        'button[title*="Dashboard"]',
        'a[href*="Dashboard"]',
        'button.btn-default:contains("Back")',
        'button.btn-default:contains("Close")',
        '.navbar-nav a',
        '.nav-tabs a',
        '.breadcrumb a'
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
              href: (element as any).href
            });
            if (!appointmentBookButton) {
              appointmentBookButton = element;
              foundPattern = `selector: ${selector}`;
            }
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
    }
    
    if (!appointmentBookButton) {
      console.error(`📅 ERROR: No navigation button found`);
      console.error(`📅 DOM inspection complete - no suitable navigation element located`);
      throw new Error('Appointment Book button not found in navigation');
    }
    
    console.log(`📅 Found navigation button with pattern "${foundPattern}", clicking...`);
    
    if (appointmentBookButton instanceof HTMLElement) {
      appointmentBookButton.click();
      console.log(`📅 Clicked navigation button successfully`);
    } else {
      console.error(`📅 ERROR: Found element is not clickable HTMLElement`);
      throw new Error('Appointment Book button is not a clickable element');
    }
    
    // Wait for view to load
    console.log(`📅 Waiting 2 seconds for page transition...`);
    await this.wait(2000);
    
    console.log(`📅 Verifying navigation result...`);
    console.log(`📅 New URL: ${window.location.href}`);
    console.log(`📅 New title: ${document.title}`);
    
    // Verify we're back in appointment book by checking for calendar elements
    const calendarElements = document.querySelectorAll('.appointmentBook, .one-appt-book, input.date.form-control');
    console.log(`📅 Calendar elements found: ${calendarElements.length}`);
    
    if (calendarElements.length === 0) {
      console.warn(`📅 WARNING: Appointment Book view may not have loaded (no calendar elements found)`);
      console.warn(`📅 Current page elements:`, {
        xestroBoxes: document.querySelectorAll('.XestroBox').length,
        buttons: document.querySelectorAll('button').length,
        links: document.querySelectorAll('a').length,
        forms: document.querySelectorAll('form').length
      });
    }
    
    console.log(`📅 Navigation to Appointment Book completed (${calendarElements.length} calendar elements found)`);
  }

  /**
   * SPA Workflow: Extract patient fields from Patient Record view
   */
  private async extractPatientFields(): Promise<any> {
    console.log(`📋 Extracting patient fields from Patient Record view`);
    console.log(`📋 Current URL: ${window.location.href}`);
    console.log(`📋 Page title: ${document.title}`);
    
    // Verify we're in patient record view
    const xestroBoxCount = document.querySelectorAll('.XestroBox').length;
    console.log(`📋 XestroBox count: ${xestroBoxCount}`);
    
    if (xestroBoxCount === 0) {
      console.error(`📋 ERROR: No XestroBoxes found - not in Patient Record view`);
      throw new Error('Not in Patient Record view - no XestroBoxes found');
    }
    
    // Log page structure for debugging
    const xestroBoxes = document.querySelectorAll('.XestroBox');
    console.log(`📋 XestroBox details:`, Array.from(xestroBoxes).map((box, index) => ({
      index,
      id: box.id,
      className: box.className,
      textContent: box.textContent?.substring(0, 100) + '...'
    })));
    
    // Smart empty field detection - check for visual indicators before extraction
    console.log(`📋 Performing smart empty field detection...`);
    const fieldStatus = this.detectEmptyFieldsVisually();
    console.log(`📋 Visual field detection results:`, fieldStatus);
    
    console.log(`📋 Starting optimized field extraction...`);
    
    // Extract fields intelligently - only click into fields that have content
    const extractedData = await this.extractEMRDataOptimized(['background', 'investigations', 'medications', 'problemList'], fieldStatus);
    
    console.log(`📋 Raw extracted data:`, {
      background: {
        length: extractedData.background?.length || 0,
        preview: extractedData.background?.substring(0, 100) || 'EMPTY',
        hasContent: !!(extractedData.background?.trim())
      },
      investigations: {
        length: extractedData.investigations?.length || 0,
        preview: extractedData.investigations?.substring(0, 100) || 'EMPTY',
        hasContent: !!(extractedData.investigations?.trim())
      },
      medications: {
        length: extractedData.medications?.length || 0,
        preview: extractedData.medications?.substring(0, 100) || 'EMPTY',
        hasContent: !!(extractedData.medications?.trim())
      },
      problemList: {
        length: extractedData.problemList?.length || 0,
        preview: extractedData.problemList?.substring(0, 100) || 'EMPTY',
        hasContent: !!(extractedData.problemList?.trim())
      }
    });
    
    // Validate that we extracted meaningful data
    const hasAnyData = [
      extractedData.background,
      extractedData.investigations,
      extractedData.medications,
      extractedData.problemList
    ].some(field => field && field.trim().length > 0);
    
    console.log(`📋 Data validation: hasAnyData = ${hasAnyData}`);
    
    if (!hasAnyData) {
      console.warn(`📋 WARNING: No meaningful data extracted from any field`);
    }
    
    const result = {
      background: extractedData.background || '',
      investigations: extractedData.investigations || '',
      medications: extractedData.medications || '',
      problemList: extractedData.problemList || '',
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
  private detectEmptyFieldsVisually(): Record<string, boolean> {
    console.log(`🔍 Scanning page for empty field visual indicators...`);
    
    const fieldStatus: Record<string, boolean> = {
      background: false,
      investigations: false,
      medications: false,
      problemList: false
    };
    
    // Look for empty field indicators with grayed text
    const emptyIndicators = document.querySelectorAll('div[style*="color:#ccc"], div[style*="color: #ccc"], .empty-field, .no-content');
    
    console.log(`🔍 Found ${emptyIndicators.length} potential empty field indicators`);
    
    emptyIndicators.forEach((indicator, index) => {
      const text = indicator.textContent?.toLowerCase() || '';
      console.log(`🔍 Indicator ${index}: "${text.substring(0, 50)}..."`);
      
      // Check for background section indicators
      if (text.includes('no background') || text.includes('no history') || text.includes('background summary')) {
        fieldStatus.background = true;
        console.log(`🔍 ✅ Background field detected as empty`);
      }
      
      // Check for investigations section indicators  
      if (text.includes('no investigation') || text.includes('no results') || text.includes('investigation summary')) {
        fieldStatus.investigations = true;
        console.log(`🔍 ✅ Investigations field detected as empty`);
      }
      
      // Check for medications section indicators
      if (text.includes('no medication') || text.includes('no drugs') || text.includes('medications')) {
        fieldStatus.medications = true;
        console.log(`🔍 ✅ Medications field detected as empty`);
      }
      
      // Check for problem list indicators
      if (text.includes('no problems') || text.includes('no conditions') || text.includes('problem list')) {
        fieldStatus.problemList = true;
        console.log(`🔍 ✅ Problem list field detected as empty`);
      }
    });
    
    return fieldStatus;
  }
  
  /**
   * Optimized EMR data extraction that skips empty fields
   */
  private async extractEMRDataOptimized(
    fields: string[], 
    emptyFieldStatus: Record<string, boolean>
  ): Promise<Record<string, string>> {
    console.log(`📋 Starting optimized extraction for fields:`, fields);
    console.log(`📋 Empty field status:`, emptyFieldStatus);
    
    const extractedData: Record<string, string> = {};
    
    for (const fieldName of fields) {
      const normalizedFieldName = fieldName.toLowerCase();
      
      // Check if field is visually detected as empty
      if (emptyFieldStatus[normalizedFieldName]) {
        console.log(`⚡ OPTIMIZATION: Skipping empty field "${fieldName}" - detected visually as empty`);
        extractedData[fieldName] = '';
        continue;
      }
      
      // Extract field content normally for non-empty fields
      console.log(`📋 Extracting content for field: "${fieldName}" (not empty)`);
      let fieldValue = '';
      
      try {
        switch (normalizedFieldName) {
          case 'background':
            fieldValue = await this.extractFieldContent('Background');
            break;
          case 'investigations':
          case 'investigation-summary':
            fieldValue = await this.extractFieldContent('Investigation Summary');
            break;
          case 'medications':
            fieldValue = await this.extractFieldContent('Medications (Problem List for Phil)') || 
                        await this.extractFieldContent('Medications');
            break;
          case 'problemlist':
            fieldValue = await this.extractFieldContent('Problem List');
            break;
          default:
            // Try to extract custom field
            fieldValue = await this.extractFieldContent(fieldName);
        }
        
        extractedData[fieldName] = fieldValue;
        console.log(`✅ Extracted ${fieldValue.length} characters from ${fieldName}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to extract ${fieldName}:`, error);
        extractedData[fieldName] = '';
      }
    }
    
    return extractedData;
  }

  /**
   * Helper method to find button by text content
   */
  private findButtonByText(buttonText: string): HTMLElement | null {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const found = buttons.find(button => 
      button.textContent?.trim().toLowerCase().includes(buttonText.toLowerCase()) ||
      (button as HTMLElement).title?.toLowerCase().includes(buttonText.toLowerCase())
    );
    return found instanceof HTMLElement ? found : null;
  }

  /**
   * Find element with multiple selectors and retry logic
   */
  private async findElementWithRetry(selectors: string[], timeout = 5000, maxRetries = 3): Promise<HTMLElement | null> {
    for (let retry = 0; retry < maxRetries; retry++) {
      console.log(`🔄 Attempt ${retry + 1}/${maxRetries} to find element...`);
      
      for (const selector of selectors) {
        console.log(`🔍 Trying selector: ${selector}`);
        const element = await this.findElement(selector, timeout / maxRetries);
        if (element) {
          console.log(`✅ Found element with selector: ${selector}`);
          return element;
        }
      }
      
      if (retry < maxRetries - 1) {
        console.log(`⏳ Retry ${retry + 1} failed, waiting before next attempt...`);
        await this.wait(1000);
      }
    }
    
    console.log(`❌ All attempts failed to find element with selectors: ${selectors.join(', ')}`);
    return null;
  }

  /**
   * Find Profile Picture tab with multiple search strategies
   */
  private async findProfilePictureTab(): Promise<HTMLElement | null> {
    console.log('🔍 Searching for Profile Picture tab with multiple strategies...');
    
    // Strategy 1: Look for exact "Profile Picture" text
    const descriptions = Array.from(document.querySelectorAll('.description, .tab, .tab-item, [role="tab"], .nav-item'));
    for (const desc of descriptions) {
      if (desc.textContent?.includes('Profile Picture')) {
        console.log('✅ Found Profile Picture tab via exact text match');
        return desc as HTMLElement;
      }
    }
    
    // Strategy 2: Look for variations of profile/picture text
    const variations = ['profile', 'picture', 'photo', 'image', 'avatar'];
    for (const desc of descriptions) {
      const text = desc.textContent?.toLowerCase() || '';
      if (variations.some(variation => text.includes(variation))) {
        console.log(`✅ Found potential Profile Picture tab via text variation: ${desc.textContent?.trim()}`);
        return desc as HTMLElement;
      }
    }
    
    // Strategy 3: Look for tabs/descriptions in modal or patient sections
    const modalElements = document.querySelectorAll('.modal .description, .patient-edit .description, [class*="patient"] .tab');
    for (const element of modalElements) {
      if (element.textContent?.toLowerCase().includes('profile') || element.textContent?.toLowerCase().includes('picture')) {
        console.log(`✅ Found Profile Picture tab in modal/patient section: ${element.textContent?.trim()}`);
        return element as HTMLElement;
      }
    }
    
    console.log('❌ Could not find Profile Picture tab with any strategy');
    return null;
  }

  /**
   * Show error message to user
   */
  private showErrorMessage(message: string) {
    // Create and show error message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `⚠️ ${message}`;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 400px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 5 seconds for errors (longer than success messages)
    setTimeout(() => {
      messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 5000);
  }
}

  // Initialize content script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new ContentScriptHandler();
    });
  } else {
    new ContentScriptHandler();
  }
}
