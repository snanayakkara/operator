// Background service worker for Operator Chrome Extension

import type { 
  AgentType,
  ScreenshotCaptureResult
} from '@/types/medical.types';
import { WhisperServerService } from '@/services/WhisperServerService';

interface ExtensionMessage {
  type: string;
  action?: string;
  data?: any;
  tabId?: number;
}

class BackgroundService {
  private isInitialized = false;
  private activeTabs = new Set<number>();
  private whisperServerService: WhisperServerService;
  private clipboardResultPromise: { resolve: (value: any) => void; reject: (error: any) => void } | null = null;
  private fileTabSuppression = false;

  constructor() {
    this.whisperServerService = WhisperServerService.getInstance();
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Background service already initialized');
      return;
    }

    console.log('🚀 Initializing background service...');

    // Set up event listeners
    this.setupEventListeners();
    console.log('✅ Event listeners set up');
    
    // Initialize side panel
    await this.setupSidePanel();
    console.log('✅ Side panel initialized');
    
    // Initialize Whisper server
    await this.initializeWhisperServer();
    console.log('✅ Whisper server initialized');
    
    this.isInitialized = true;
    console.log('🎉 Background service fully initialized');
  }

  private setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        await this.handleInstallation();
      }
    });

    // Handle messages from content scripts and side panel
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates to manage active tabs and enable/disable side panel
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      console.log(`📋 Tab ${tabId} updated:`, { 
        status: changeInfo.status, 
        url: tab.url,
        title: tab.title?.substring(0, 50) 
      });

      // Guard: if a file:// tab appears while suppression is enabled, close it immediately
      try {
        const updatedUrl = changeInfo.url || tab.url || (changeInfo as any).pendingUrl;
        if (this.fileTabSuppression && typeof updatedUrl === 'string' && updatedUrl.startsWith('file:') && tab.id) {
          console.log('🛑 Closing file:// tab due to active drop guard:', { id: tab.id, url: updatedUrl });
          await chrome.tabs.remove(tab.id);
          return;
        }
      } catch (e) {
        console.warn('⚠️ File tab suppression (onUpdated) failed:', e);
      }
      
      if (changeInfo.status === 'complete') {
        const isEMR = this.isEMRTab(tab.url);
        console.log(`🎯 Tab ${tabId} processing: EMR=${isEMR}`);
        
        if (isEMR) {
          this.activeTabs.add(tabId);
          console.log(`✅ Adding tab ${tabId} to active EMR tabs`);
          
          // Enable side panel for Xestro EMR tabs
          try {
            await chrome.sidePanel.setOptions({
              tabId,
              path: 'src/sidepanel/index.html',
              enabled: true
            });
            console.log(`✅ Side panel ENABLED for tab ${tabId}`);
          } catch (error) {
            console.error('❌ Could not enable side panel for tab:', error);
          }
        } else {
          this.activeTabs.delete(tabId);
          console.log(`🗑️ Removing tab ${tabId} from active EMR tabs`);
          
          // Disable side panel for non-EMR tabs
          try {
            await chrome.sidePanel.setOptions({
              tabId,
              enabled: false
            });
            console.log(`🚫 Side panel DISABLED for tab ${tabId}`);
          } catch (error) {
            console.error('❌ Could not disable side panel for tab:', error);
          }
        }
      }
    });

    // Guard: close newly-created file:// tabs while suppression is enabled
    chrome.tabs.onCreated.addListener(async (tab) => {
      try {
        const pendingUrl = (tab as any).pendingUrl as string | undefined;
        const url = tab.url || pendingUrl;
        if (this.fileTabSuppression && url && url.startsWith('file:') && tab.id) {
          console.log('🛑 Closing newly created file:// tab due to active drop guard:', { id: tab.id, url });
          await chrome.tabs.remove(tab.id);
        }
      } catch (e) {
        console.warn('⚠️ File tab suppression (onCreated) failed:', e);
      }
    });

    // Clean up closed tabs
    chrome.tabs.onRemoved.addListener((tabId) => {
      console.log(`🗑️ Tab ${tabId} removed`);
      this.activeTabs.delete(tabId);
    });

    // Handle tab activation (when user switches tabs)
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log(`🎯 Tab ${activeInfo.tabId} activated`);
      
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        console.log(`🎯 Active tab info:`, { id: tab.id, url: tab.url, title: tab.title?.substring(0, 50) });
        
        const isEMR = this.isEMRTab(tab.url);
        if (isEMR) {
          await chrome.sidePanel.setOptions({
            tabId: activeInfo.tabId,
            path: 'src/sidepanel/index.html',
            enabled: true
          });
          console.log(`✅ Side panel ENABLED for activated tab ${activeInfo.tabId}`);
        }
      } catch (error) {
        console.error('❌ Error handling tab activation:', error);
      }
    });

    // Handle keyboard shortcuts
    chrome.commands.onCommand.addListener(async (command) => {
      await this.handleCommand(command);
    });

    // Check all existing tabs on startup (in case extension loads after tabs are already open)
    this.checkExistingTabs();

    // Handle extension icon clicks (action button)
    chrome.action.onClicked.addListener((tab) => {
      console.log('🎯 Extension icon clicked for tab:', tab.id, tab.url);
      
      if (!tab.id) {
        console.error('❌ Cannot open side panel - no tab ID');
        return;
      }
      
      // Check if this is an EMR tab first
      const isEMR = this.isEMRTab(tab.url);
      if (!isEMR) {
        console.log('ℹ️ Cannot open side panel - not on EMR domain');
        return;
      }
      
      // Side panel should already be configured by tab management logic
      // Just try to open it synchronously to preserve user gesture
      chrome.sidePanel.open({ tabId: tab.id }).then(() => {
        console.log('✅ Side panel opened successfully');
      }).catch((error) => {
        console.error('❌ Failed to open side panel:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // If it's a user gesture error, log specifically
        if (error.message.includes('user gesture')) {
          console.error('💡 User gesture timing issue - Chrome requires immediate synchronous call');
        } else if (error.message.includes('No active side panel')) {
          console.error('💡 Side panel not properly registered - check tab management logic');
        }
      });
    });

    // Handle side panel events (if available)
    if ('onPanelOpened' in chrome.sidePanel) {
      (chrome.sidePanel as any).onPanelOpened?.addListener(() => {
        console.log('✅ Side panel opened successfully');
      });
    }
  }

  private async setupSidePanel() {
    try {
      console.log('🔧 Setting up side panel...');
      
      // Set default behavior for side panel - disabled until on my.xestro.com
      await chrome.sidePanel.setOptions({
        path: 'src/sidepanel/index.html',
        enabled: false  // Only enable for my.xestro.com domains
      });
      console.log('✅ Side panel path set to src/sidepanel/index.html');
      
      // Test if the side panel HTML is accessible
      try {
        const response = await fetch(chrome.runtime.getURL('src/sidepanel/index.html'));
        if (response.ok) {
          console.log('✅ Side panel HTML is accessible');
        } else {
          console.error('❌ Side panel HTML not accessible:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Failed to test side panel HTML accessibility:', error);
      }

      // Enable side panel behavior
      await chrome.sidePanel.setPanelBehavior({ 
        openPanelOnActionClick: true 
      });
      console.log('✅ Side panel behavior set to open on action click');

      // Check current active tab and enable if it's Xestro EMR
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log(`🔍 Found ${tabs.length} active tabs during setup`);
      
      if (tabs[0]) {
        console.log(`🔍 Current active tab:`, { 
          id: tabs[0].id, 
          url: tabs[0].url, 
          status: tabs[0].status,
          title: tabs[0].title?.substring(0, 50) 
        });
        
        if (this.isEMRTab(tabs[0].url)) {
          await chrome.sidePanel.setOptions({
            tabId: tabs[0].id,
            path: 'src/sidepanel/index.html',
            enabled: true
          });
          console.log('✅ Side panel enabled for current tab:', tabs[0].url);
        } else {
          console.log('ℹ️ Current tab is not EMR, side panel remains disabled');
        }
      } else {
        console.log('⚠️ No active tab found during setup');
      }
      
      console.log('✅ Side panel setup complete');
    } catch (error) {
      console.error('❌ Failed to setup side panel:', error);
    }
  }

  private async handleInstallation() {
    try {
      // Set default storage values
      await chrome.storage.local.set({
        settings: {
          lmStudioUrl: 'http://localhost:1234',
          classifierModel: 'medgemma-4b-it',
          processorModel: 'medgemma-27b-it',
          autoDetectAgent: true,
          voiceActivation: true
        },
        agentMemory: {},
        sessionHistory: []
      });

      // Show welcome notification (optional)
      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
          title: 'Operator Chrome Extension',
          message: 'Extension installed successfully! Open the side panel to get started.'
        });
      } catch (notificationError) {
        // Notification failed but extension still works
        console.log('Welcome notification skipped:', notificationError);
      }

    } catch (error) {
      console.error('Installation setup failed:', error);
    }
  }

  private async handleMessage(
    message: ExtensionMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ) {
    try {
      const { type, action, data, tabId } = message;

      switch (type) {
        case 'EXECUTE_ACTION':
          await this.executeAction(action!, data, tabId || sender.tab?.id, sendResponse);
          break;

        case 'PAGE_DROP_GUARD_INSTALLED':
          console.log('✅ Page drop guard installed for tab', sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'SET_DROP_HINT': {
          const slot = message.data?.slot ?? 1;
          // Update overlay text on all active EMR tabs
          try {
            for (const id of this.activeTabs) {
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: id },
                  func: (s: number) => {
                    try {
                      const overlay = document.getElementById('__operator_page_drop_overlay__');
                      if (!overlay) return;
                      const inner = overlay.firstElementChild as HTMLElement | null;
                      if (inner) {
                        inner.textContent = `Drop image for Slot ${s} to import into Annotate & Combine`;
                      }
                    } catch {}
                  },
                  args: [slot]
                });
              } catch (e) {
                console.warn('SET_DROP_HINT failed for tab', id, e);
              }
            }
          } catch (e) {
            console.warn('SET_DROP_HINT broadcast failed:', e);
          }
          sendResponse({ success: true });
          break;
        }

        case 'SIDE_PANEL_ACTION':
          await this.handleSidePanelAction(action!, data, sendResponse);
          break;

        case 'GET_TAB_INFO':
          sendResponse(await this.getTabInfo(sender.tab?.id));
          break;

        case 'UPDATE_AGENT_MEMORY':
          await this.updateAgentMemory(data.agentType, data.memory);
          sendResponse({ success: true });
          break;

        case 'GET_SETTINGS': {
          const settings = await chrome.storage.local.get('settings');
          sendResponse(settings.settings || {});
          break;
        }

        case 'UPDATE_SETTINGS':
          await chrome.storage.local.set({ settings: data });
          sendResponse({ success: true });
          break;

        case 'CLIPBOARD_MONITORING_RESULT':
          this.handleClipboardResult(data);
          sendResponse({ success: true });
          break;

        case 'EXTRACT_EMR_DATA_AI_REVIEW':
          await this.handleEMRDataExtractionForAIReview(data, sender.tab?.id, sendResponse);
          break;

        case 'SET_FILE_DROP_GUARD': {
          const enabled = !!message.data?.enabled || !!(message as any).enabled;
          this.fileTabSuppression = enabled;
          console.log('🛡️ Background file-tab suppression set to', this.fileTabSuppression);
          // Try to notify all active EMR tabs to enable page-level guard
          try {
            for (const id of this.activeTabs) {
              // Try best-effort message; do not abort injection on failure
              try {
                await chrome.tabs.sendMessage(id, { type: 'SET_FILE_DROP_GUARD', enabled: this.fileTabSuppression });
              } catch (e) {
                console.warn('SET_FILE_DROP_GUARD forward to tab failed:', id, e);
              }

              // Install a direct page guard to capture files and forward to side panel
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: id },
                  func: (flag: boolean) => {
                    try {
                      const w = window as any;
                      if (!w.__operatorInstallPageDropGuard) {
                        w.__operatorInstallPageDropGuard = (enable: boolean) => {
                          if (enable) {
                            if (w.__operatorDropGuard) return;
                            // Create overlay UI
                            const overlayId = '__operator_page_drop_overlay__';
                            let overlay = document.getElementById(overlayId) as HTMLDivElement | null;
                            if (!overlay) {
                              overlay = document.createElement('div');
                              overlay.id = overlayId;
                              overlay.style.position = 'fixed';
                              overlay.style.top = '0';
                              overlay.style.left = '0';
                              overlay.style.width = '100vw';
                              overlay.style.height = '100vh';
                              overlay.style.zIndex = '2147483647';
                              overlay.style.background = 'rgba(59,130,246,0.12)';
                              overlay.style.border = '2px dashed rgba(37,99,235,0.7)';
                              overlay.style.display = 'flex';
                              overlay.style.boxSizing = 'border-box';
                              overlay.style.alignItems = 'center';
                              overlay.style.justifyContent = 'center';
                              // Let window-level capture handlers receive events even if overlay is present
                              overlay.style.pointerEvents = 'none';
                              overlay.style.backdropFilter = 'blur(2px)';

                              const inner = document.createElement('div');
                              inner.style.padding = '16px 20px';
                              inner.style.background = 'rgba(255,255,255,0.9)';
                              inner.style.borderRadius = '12px';
                              inner.style.color = '#1f2937';
                              inner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                              inner.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
                              inner.style.fontSize = '14px';
                              inner.textContent = 'Drop image anywhere on this page to import into Annotate & Combine';
                              overlay.appendChild(inner);

                              document.body.appendChild(overlay);
                            }

                            const showOverlay = () => { if (overlay) overlay.style.display = 'flex'; };
                            // Keep overlay persistent while the annotator is open
                            const hideOverlay = () => { /* no-op: persist overlay */ };

                            const onDragEnter = (e: DragEvent) => { e.preventDefault(); showOverlay(); };
                            const onDragOver = (e: DragEvent) => { e.preventDefault(); if (e.dataTransfer) { e.dataTransfer.dropEffect = 'copy'; } };
                            const onDragLeave = (e: DragEvent) => { e.preventDefault(); /* keep overlay visible */ };
                            const onDrop = (e: DragEvent) => {
                              try {
                                e.preventDefault();
                                const dt = e.dataTransfer;
                                if (!dt) return;
                                let files: File[] = [];
                                if (dt.files && dt.files.length) files = Array.from(dt.files);
                                else if (dt.items && dt.items.length) {
                                  for (const item of Array.from(dt.items)) {
                                    if (item.kind === 'file') {
                                      const f = (item as any).getAsFile?.();
                                      if (f) files.push(f);
                                    }
                                  }
                                }
                                const img = files.find(f => f && /^image\//.test(f.type));
                                if (!img) return;
                                const r = new FileReader();
                                r.onload = () => {
                                  try {
                                    (chrome as any).runtime.sendMessage({
                                      type: 'PAGE_FILE_DROPPED',
                                      payload: { dataUrl: r.result, name: img.name, type: img.type, size: img.size }
                                    });
                                  } catch {}
                                };
                                r.readAsDataURL(img);
                              } catch {}
                            };
                            // Global guards to suppress browser default on page
                            window.addEventListener('dragenter', onDragEnter, true);
                            window.addEventListener('dragover', onDragOver, true);
                            window.addEventListener('dragleave', onDragLeave, true);
                            window.addEventListener('drop', onDrop, true);
                            w.__operatorDropGuard = { onDragEnter, onDragOver, onDragLeave, onDrop, overlay };

                            // Notify background for debugging
                            try { (chrome as any).runtime.sendMessage({ type: 'PAGE_DROP_GUARD_INSTALLED' }); } catch {}
                          } else {
                            if (w.__operatorDropGuard) {
                              window.removeEventListener('dragenter', w.__operatorDropGuard.onDragEnter, true);
                              window.removeEventListener('dragover', w.__operatorDropGuard.onDragOver, true);
                              window.removeEventListener('dragleave', w.__operatorDropGuard.onDragLeave, true);
                              window.removeEventListener('drop', w.__operatorDropGuard.onDrop, true);
                              try { if (w.__operatorDropGuard.overlay && w.__operatorDropGuard.overlay.parentNode) { w.__operatorDropGuard.overlay.parentNode.removeChild(w.__operatorDropGuard.overlay); } } catch {}
                              w.__operatorDropGuard = null;
                            }
                          }
                        };
                      }
                      w.__operatorInstallPageDropGuard(flag);
                    } catch (e) {
                      console.error('Page drop guard install failed', e);
                    }
                  },
                  args: [this.fileTabSuppression]
                });
                console.log('✅ Injected drop guard overlay into tab', id);
              } catch (e) {
                console.error('❌ Failed to inject drop guard overlay into tab', id, e);
              }
            }
          } catch (e) {
            console.warn('SET_FILE_DROP_GUARD broadcast failed:', e);
          }
          sendResponse({ success: true, enabled: this.fileTabSuppression });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async executeAction(
    action: string, 
    data: any, 
    tabId?: number, 
    sendResponse?: (response?: any) => void
  ) {
    // Handle screenshot capture separately (needs special logic)
    if (action === 'profile-photo') {
      await this.handleProfilePhotoCapture(data, tabId, sendResponse);
      return;
    }

    // If no tabId provided, try to find active EMR tab
    if (!tabId) {
      console.log('🔍 No tabId provided, searching for active EMR tab...');
      const activeTab = await this.getActiveEMRTab();
      if (!activeTab?.id) {
        console.log('❌ No active EMR tab found');
        sendResponse?.({ error: 'No active EMR tab found' });
        return;
      }
      tabId = activeTab.id;
      console.log('✅ Found active EMR tab:', tabId, activeTab.url);
    }

    try {
      console.log(`🚀 Executing action "${action}" on tab ${tabId}`);
      
      // First try to inject content script if it's not responding
      try {
        // Check if content script is already loaded
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => (window as any).operatorContentScriptLoaded === true
        });
        
        if (!results[0]?.result) {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-script.js']
          });
          console.log('📝 Content script injected manually');
          await this.wait(1000); // Wait for script to initialize
        } else {
          console.log('📝 Content script already loaded');
        }
      } catch (injectError) {
        console.log('📝 Content script injection failed:', injectError);
      }
      
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_ACTION',
        action,
        data
      });

      console.log(`✅ Action "${action}" completed:`, response);
      sendResponse?.(response);
    } catch (error) {
      console.error(`❌ Action ${action} failed:`, error);
      sendResponse?.({ error: error instanceof Error ? error.message : 'Action failed' });
    }
  }

  /**
   * Handle EMR data extraction for AI Review using robust messaging
   */
  private async handleEMRDataExtractionForAIReview(
    data: any,
    tabId?: number,
    sendResponse?: (response?: any) => void
  ) {
    console.log('🤖 Service Worker: Handling EXTRACT_EMR_DATA_AI_REVIEW request');
    
    try {
      // If no tabId provided, find active EMR tab
      if (!tabId) {
        console.log('🔍 No tabId provided, searching for active EMR tab...');
        const activeTab = await this.getActiveEMRTab();
        if (!activeTab?.id) {
          console.log('❌ No active EMR tab found');
          sendResponse?.({ success: false, error: 'No active EMR tab found. Please ensure you\'re on my.xestro.com with a patient record open.' });
          return;
        }
        tabId = activeTab.id;
        console.log('✅ Found active EMR tab:', tabId, activeTab.url);
      }

      // Use robust sendMessageToTab with auto-retry and content script injection
      console.log('📋 Service Worker: Sending EXTRACT_EMR_DATA_AI_REVIEW message to content script via robust method');
      
      const response = await this.sendMessageToTab(tabId, {
        type: 'EXTRACT_EMR_DATA_AI_REVIEW',
        fields: data?.fields || ['background', 'investigations', 'medications-problemlist']
      }, {
        retries: 3,
        timeout: 600000, // 10 minute timeout for AI Medical Review processing
        ensureContentScript: true // Enable automatic content script injection
      });

      console.log('✅ Service Worker: EMR data extraction completed successfully:', response);
      sendResponse?.({ success: true, data: response.data || response });

    } catch (error) {
      console.error('❌ Service Worker: EMR data extraction failed:', error);
      sendResponse?.({ 
        success: false, 
        error: error instanceof Error ? error.message : 'EMR data extraction failed' 
      });
    }
  }

  private async handleSidePanelAction(
    action: string, 
    data: any, 
    sendResponse: (response?: any) => void
  ) {
    try {
      const activeTab = await this.getActiveEMRTab();
      
      if (!activeTab) {
        sendResponse({ error: 'No active EMR tab found' });
        return;
      }

      await this.executeAction(action, data, activeTab.id, sendResponse);
    } catch (error) {
      console.error(`Side panel action ${action} failed:`, error);
      sendResponse({ error: error instanceof Error ? error.message : 'Action failed' });
    }
  }

  private async handleCommand(command: string) {
    try {
      const activeTab = await this.getActiveEMRTab();
      
      switch (command) {
        case 'toggle-recording':
          // Send message to side panel to toggle recording
          await chrome.runtime.sendMessage({
            type: 'KEYBOARD_SHORTCUT',
            command: 'toggle-recording'
          });
          break;

        case 'open-side-panel':
          if (activeTab?.id) {
            // Side panel will open automatically when extension is clicked
            // Side panel shortcut triggered
          }
          break;

        case 'quick-transcribe':
          // Trigger quick transcription workflow
          await chrome.runtime.sendMessage({
            type: 'KEYBOARD_SHORTCUT',
            command: 'quick-transcribe'
          });
          break;
      }
    } catch (error) {
      console.error(`Command ${command} failed:`, error);
    }
  }

  private async getActiveEMRTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (activeTab && this.isEMRTab(activeTab.url)) {
        return activeTab;
      }

      // If current tab is not EMR, look for any EMR tab
      const emrTabs = await chrome.tabs.query({});
      for (const tab of emrTabs) {
        if (this.isEMRTab(tab.url)) {
          return tab;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get active EMR tab:', error);
      return null;
    }
  }

  private isEMRTab(url?: string): boolean {
    console.log('🔍 Checking if EMR tab:', url);
    
    if (!url) {
      console.log('❌ No URL provided');
      return false;
    }
    
    try {
      // Only works with Xestro EMR - production security
      const urlObj = new URL(url);
      const isMatch = urlObj.hostname === 'my.xestro.com';
      console.log(`🔍 URL hostname: "${urlObj.hostname}", matches my.xestro.com: ${isMatch}`);
      return isMatch;
    } catch (error) {
      // Invalid URL format
      console.log('❌ Invalid URL format:', error);
      return false;
    }
  }

  private async getTabInfo(tabId?: number) {
    if (!tabId) return null;

    try {
      const tab = await chrome.tabs.get(tabId);
      return {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        isEMR: this.isEMRTab(tab.url)
      };
    } catch (error) {
      console.error('Failed to get tab info:', error);
      return null;
    }
  }

  private async updateAgentMemory(agentType: AgentType, memory: any) {
    try {
      const stored = await chrome.storage.local.get('agentMemory');
      const agentMemory = stored.agentMemory || {};
      
      agentMemory[agentType] = {
        ...agentMemory[agentType],
        ...memory,
        lastUpdated: Date.now()
      };

      await chrome.storage.local.set({ agentMemory });
    } catch (error) {
      console.error('Failed to update agent memory:', error);
    }
  }

  private async initializeWhisperServer(): Promise<void> {
    try {
      console.log('🎙️ Initializing MLX Whisper server...');
      
      const status = await this.whisperServerService.checkServerStatus();
      
      if (status.running) {
        console.log('✅ MLX Whisper server is already running');
        console.log(`📍 Model: ${status.model}, Port: ${status.port}`);
      } else {
        console.log('⚠️ MLX Whisper server is not running');
        console.log('💡 Starting server automatically...');
        
        const startResult = await this.whisperServerService.startServer();
        
        if (startResult.running) {
          console.log('✅ MLX Whisper server started successfully');
        } else {
          console.warn('❌ Failed to start MLX Whisper server automatically');
          console.warn('💡 Manual start required: ./start-whisper-server.sh');
          console.warn('💡 Or run: source venv-whisper/bin/activate && python whisper-server.py');
        }
      }
      
    } catch (error) {
      console.error('❌ MLX Whisper server initialization failed:', error);
    }
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleProfilePhotoCapture(
    data: any, 
    targetTabId?: number, 
    sendResponse?: (response?: any) => void
  ) {
    console.log('📸 Starting profile photo capture workflow...');
    
    try {
      // Find target EMR tab for insertion
      const emrTab = targetTabId ? 
        await chrome.tabs.get(targetTabId) : 
        await this.getActiveEMRTab();
      
      if (!emrTab?.id) {
        console.error('❌ No EMR tab found for image insertion');
        sendResponse?.({ error: 'No EMR tab found for image insertion' });
        return;
      }
      
      console.log(`📸 Target EMR tab: ${emrTab.id} (${emrTab.url})`);
      
      // Try tab capture method first
      console.log('📸 Attempting tab capture method...');
      const tabCaptureResult = await this.captureDoxyTab();
      
      if (tabCaptureResult.success) {
        console.log('✅ Tab capture successful, inserting image...');
        
        // Ensure content script is loaded before sending image data
        console.log('📝 Ensuring content script is available for image insertion...');
        await this.ensureContentScriptLoaded(emrTab.id);
        
        // Send captured image to content script for insertion
        const response = await chrome.tabs.sendMessage(emrTab.id, {
          type: 'EXECUTE_ACTION',
          action: 'profile-photo',
          data: {
            imageData: tabCaptureResult.imageData,
            method: tabCaptureResult.method,
            tabInfo: tabCaptureResult.tabInfo
          }
        });
        
        console.log('✅ Profile photo capture and insertion completed');
        sendResponse?.({ success: true, method: tabCaptureResult.method, response });
        return;
      }
      
      // Tab capture failed, fall back to clipboard method
      console.log('⚠️ Tab capture failed, falling back to clipboard method...');
      await this.handleClipboardFallback(emrTab.id, tabCaptureResult.error, sendResponse);
      
    } catch (error) {
      console.error('❌ Profile photo capture failed:', error);
      sendResponse?.({ 
        error: error instanceof Error ? error.message : 'Screenshot capture failed',
        method: 'failed'
      });
    }
  }

  private async captureDoxyTab(): Promise<ScreenshotCaptureResult> {
    console.log('📸 Looking for doxy.me tabs...');
    
    try {
      // Find all doxy.me tabs
      const doxyTabs = await chrome.tabs.query({
        url: ['*://*.doxy.me/*', '*://doxy.me/*']
      });
      
      console.log(`📸 Found ${doxyTabs.length} doxy.me tabs`);
      
      if (doxyTabs.length === 0) {
        return {
          success: false,
          method: 'failed',
          error: 'No doxy.me tabs found'
        };
      }
      
      // If multiple tabs, prefer the active one or most recently updated
      let targetTab = doxyTabs[0];
      if (doxyTabs.length > 1) {
        // Try to find active doxy tab first
        const activeDoxyTab = doxyTabs.find(tab => tab.active);
        if (activeDoxyTab) {
          targetTab = activeDoxyTab;
          console.log('📸 Using active doxy.me tab');
        } else {
          // Use the most recently accessed tab (fallback to first if no lastAccessed)
          targetTab = doxyTabs.reduce((latest, current) => 
            ((current as any).lastAccessed || 0) > ((latest as any).lastAccessed || 0) ? current : latest
          );
          console.log('📸 Using most recently accessed doxy.me tab');
        }
      }
      
      console.log(`📸 Capturing tab: ${targetTab.id} - ${targetTab.title}`);
      console.log(`📸 Tab URL: ${targetTab.url}`);
      console.log(`📸 Window ID: ${targetTab.windowId}`);
      
      // Store current active tab to restore later
      const currentActiveTab = await chrome.tabs.query({ active: true, windowId: targetTab.windowId });
      const originalActiveTab = currentActiveTab[0];
      
      try {
        // Temporarily activate the target tab for capture (required for captureVisibleTab)
        if (!targetTab.active) {
          console.log('📸 Temporarily activating tab for capture...');
          await chrome.tabs.update(targetTab.id!, { active: true });
          await this.wait(300); // Brief wait for tab activation
        }
        
        // Capture the now-visible tab
        console.log('📸 Attempting chrome.tabs.captureVisibleTab...');
        const imageData = await chrome.tabs.captureVisibleTab(
          targetTab.windowId, 
          { format: 'png', quality: 90 }
        );
        console.log('📸 Tab capture completed successfully');
        
        // Restore original active tab if we switched
        if (originalActiveTab && originalActiveTab.id !== targetTab.id) {
          console.log('📸 Restoring original active tab...');
          await chrome.tabs.update(originalActiveTab.id!, { active: true });
        }
        
        console.log('✅ Tab capture successful');
        
        return {
          success: true,
          imageData,
          method: 'tab-capture',
          tabInfo: {
            title: targetTab.title || 'doxy.me',
            url: targetTab.url || '',
            windowId: targetTab.windowId!
          }
        };
      } catch (captureError) {
        // Restore original active tab even if capture failed
        if (originalActiveTab && originalActiveTab.id !== targetTab.id) {
          try {
            await chrome.tabs.update(originalActiveTab.id!, { active: true });
          } catch (restoreError) {
            console.log('⚠️ Could not restore original active tab:', restoreError);
          }
        }
        throw captureError;
      }
      
    } catch (error) {
      console.error('❌ Tab capture failed:', error);
      return {
        success: false,
        method: 'failed',
        error: error instanceof Error ? error.message : 'Tab capture failed'
      };
    }
  }

  private async handleClipboardFallback(
    emrTabId: number, 
    tabCaptureError?: string,
    sendResponse?: (response?: any) => void
  ) {
    console.log('📸 Starting clipboard fallback method...');
    
    try {
      // Ensure content script is available before showing instructions
      console.log('📸 Ensuring content script is available...');
      await this.ensureContentScriptLoaded(emrTabId);
      
      // Show instructions to user via content script
      console.log('📸 Showing clipboard capture instructions...');
      
      await chrome.tabs.sendMessage(emrTabId, {
        type: 'SHOW_SCREENSHOT_INSTRUCTIONS',
        data: {
          method: 'clipboard',
          tabCaptureError,
          instructions: [
            'Press cmd+shift+4 to take a screenshot',
            'Select the area you want to capture',
            'The image will automatically be inserted when ready'
          ]
        }
      });
      
      // Start clipboard monitoring via content script
      console.log('📸 Starting clipboard monitoring via content script...');
      
      // Send message to content script to start clipboard monitoring
      await chrome.tabs.sendMessage(emrTabId, {
        type: 'START_CLIPBOARD_MONITORING',
        data: { timeoutMs: 30000 }
      });
      
      // Wait for clipboard monitoring result
      console.log('📸 Waiting for clipboard monitoring result...');
      const clipboardResult = await this.waitForClipboardResult();
      
      if (clipboardResult.success) {
        console.log('✅ Clipboard method successful via content script');
        sendResponse?.({ success: true, method: 'clipboard', result: clipboardResult });
      } else {
        console.error('❌ Clipboard method failed:', clipboardResult.error);
        sendResponse?.({ 
          error: clipboardResult.error || 'Clipboard method failed',
          method: 'failed'
        });
      }
      
    } catch (error) {
      console.error('❌ Clipboard fallback failed:', error);
      sendResponse?.({ 
        error: error instanceof Error ? error.message : 'Clipboard fallback failed',
        method: 'failed'
      });
    }
  }


  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async ensureContentScriptLoaded(tabId: number): Promise<void> {
    try {
      // Check if content script is already loaded and responsive
      const isResponsive = await this.testContentScriptResponsiveness(tabId);
      
      if (isResponsive) {
        console.log('📝 Content script already loaded and responsive');
        return;
      }

      console.log('📝 Injecting content script...');
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content-script.js']
      });
      console.log('📝 Content script injected successfully');
      
      // Wait for script to initialize
      await this.wait(1000);
      
      // Verify it's now responsive
      const isNowResponsive = await this.testContentScriptResponsiveness(tabId);
      if (!isNowResponsive) {
        throw new Error('Content script injection successful but not responsive');
      }
      
    } catch (error) {
      console.error('❌ Failed to inject content script:', error);
      throw new Error('Could not load content script for functionality');
    }
  }

  /**
   * Test if content script is responsive with timeout
   */
  private async testContentScriptResponsiveness(tabId: number): Promise<boolean> {
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script ping timeout'));
        }, 2000);

        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          resolve(response);
        });
      });

      return !!(response && (response as any).success);
    } catch (error) {
      console.log('📝 Content script not responsive:', error);
      return false;
    }
  }

  private async waitForClipboardResult(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.clipboardResultPromise = { resolve, reject };
      
      // Set a timeout in case we never get a result
      setTimeout(() => {
        if (this.clipboardResultPromise) {
          this.clipboardResultPromise.reject(new Error('Timeout waiting for clipboard result'));
          this.clipboardResultPromise = null;
        }
      }, 35000); // Slightly longer than the content script timeout
    });
  }

  private handleClipboardResult(result: any) {
    console.log('📸 Received clipboard monitoring result:', result);
    
    if (this.clipboardResultPromise) {
      if (result.success) {
        this.clipboardResultPromise.resolve(result);
      } else {
        this.clipboardResultPromise.reject(new Error(result.error || 'Clipboard monitoring failed'));
      }
      this.clipboardResultPromise = null;
    } else {
      console.warn('⚠️ Received clipboard result but no promise waiting for it');
    }
  }

  /**
   * Check all existing tabs on startup to enable side panel for EMR tabs
   */
  private async checkExistingTabs() {
    try {
      console.log('🔍 Checking all existing tabs for EMR domains...');
      const tabs = await chrome.tabs.query({});
      console.log(`🔍 Found ${tabs.length} total tabs to check`);
      
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          console.log(`🔍 Checking tab ${tab.id}: ${tab.url}`);
          
          const isEMR = this.isEMRTab(tab.url);
          if (isEMR) {
            this.activeTabs.add(tab.id);
            try {
              await chrome.sidePanel.setOptions({
                tabId: tab.id,
                path: 'src/sidepanel/index.html',
                enabled: true
              });
              console.log(`✅ Side panel ENABLED for existing EMR tab ${tab.id}`);
            } catch (error) {
              console.error(`❌ Failed to enable side panel for tab ${tab.id}:`, error);
            }
          }
        }
      }
      
      console.log(`✅ Finished checking existing tabs. Active EMR tabs: ${Array.from(this.activeTabs)}`);
    } catch (error) {
      console.error('❌ Error checking existing tabs:', error);
    }
  }

  /**
   * Navigate tab with proper timing and error handling
   */
  public async navigateTab(tabId: number, url: string): Promise<void> {
    console.log(`🧭 Navigating tab ${tabId} to: ${url}`);
    
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url }, async (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Navigation failed: ${chrome.runtime.lastError.message}`));
          return;
        }

        console.log(`🧭 Navigation initiated for tab ${tabId}`);
        
        try {
          // Wait for navigation to complete
          await this.waitForTabLoad(tabId);
          console.log(`✅ Navigation completed for tab ${tabId}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Wait for tab to complete loading
   */
  private async waitForTabLoad(tabId: number): Promise<void> {
    const maxWaitTime = 15000; // 15 seconds
    const checkInterval = 500;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const tab = await chrome.tabs.get(tabId);
        
        if (tab.status === 'complete') {
          console.log(`✅ Tab ${tabId} loaded successfully`);
          
          // Additional wait to ensure DOM is ready
          await this.wait(500);
          
          // Try to inject content script if needed
          try {
            await this.ensureContentScriptLoaded(tabId);
          } catch (error) {
            console.warn(`⚠️ Content script injection failed for tab ${tabId}, but continuing:`, error);
          }
          
          return;
        }

        await this.wait(checkInterval);

      } catch (error) {
        console.warn(`⚠️ Error checking tab ${tabId} status:`, error);
        await this.wait(checkInterval);
      }
    }

    throw new Error(`Tab ${tabId} load timeout after ${maxWaitTime}ms`);
  }

  /**
   * Send message to tab with retry logic
   */
  public async sendMessageToTab(tabId: number, message: any, options: { 
    timeout?: number; 
    retries?: number; 
    ensureContentScript?: boolean 
  } = {}): Promise<any> {
    const { timeout = 5000, retries = 2, ensureContentScript = true } = options;
    
    // Ensure content script is loaded if requested
    if (ensureContentScript) {
      try {
        await this.ensureContentScriptLoaded(tabId);
      } catch (error) {
        console.warn(`⚠️ Could not ensure content script for tab ${tabId}:`, error);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Message timeout after ${timeout}ms`));
          }, timeout);

          chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timer);
            
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            resolve(response);
          });
        });

        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`📨 Message attempt ${attempt} failed for tab ${tabId}:`, lastError.message);
        
        if (attempt <= retries) {
          // Try to re-inject content script if message failed
          if (ensureContentScript && lastError.message.includes('Could not establish connection')) {
            try {
              console.log(`📝 Re-injecting content script for tab ${tabId} after connection failure...`);
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content-script.js']
              });
              await this.wait(1000);
            } catch (injectError) {
              console.warn(`📝 Content script re-injection failed for tab ${tabId}:`, injectError);
            }
          }

          // Wait before retry
          await this.wait(Math.min(1000 * attempt, 3000));
        }
      }
    }

    throw lastError || new Error('Message sending failed after all retries');
  }


  // Public methods for external access
  public async broadcastToTabs(message: any, emrOnly = true) {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (!emrOnly || this.isEMRTab(tab.url)) {
          try {
            await this.sendMessageToTab(tab.id!, message, { 
              timeout: 2000, 
              retries: 0, 
              ensureContentScript: false 
            });
          } catch (error) {
            // Tab might not have content script loaded, ignore
          }
        }
      }
    } catch (error) {
      console.error('Failed to broadcast to tabs:', error);
    }
  }

}

// Initialize the background service
const backgroundService = new BackgroundService();

// Export for potential external access
declare global {
  interface Window {
    backgroundService: BackgroundService;
  }
}

if (typeof window !== 'undefined') {
  window.backgroundService = backgroundService;
}
