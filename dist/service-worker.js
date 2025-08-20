var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { W as WhisperServerService } from "./chunks/services.NrlqZpNE.js";
class BackgroundService {
  constructor() {
    __publicField(this, "isInitialized", false);
    __publicField(this, "activeTabs", /* @__PURE__ */ new Set());
    __publicField(this, "whisperServerService");
    __publicField(this, "clipboardResultPromise", null);
    this.whisperServerService = WhisperServerService.getInstance();
    this.initialize();
  }
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Background service already initialized");
      return;
    }
    console.log("🚀 Initializing background service...");
    this.setupEventListeners();
    console.log("✅ Event listeners set up");
    await this.setupSidePanel();
    console.log("✅ Side panel initialized");
    await this.initializeWhisperServer();
    console.log("✅ Whisper server initialized");
    this.isInitialized = true;
    console.log("🎉 Background service fully initialized");
  }
  setupEventListeners() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === "install") {
        await this.handleInstallation();
      }
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      console.log(`📋 Tab ${tabId} updated:`, {
        status: changeInfo.status,
        url: tab.url,
        title: tab.title?.substring(0, 50)
      });
      if (changeInfo.status === "complete") {
        const isEMR = this.isEMRTab(tab.url);
        console.log(`🎯 Tab ${tabId} processing: EMR=${isEMR}`);
        if (isEMR) {
          this.activeTabs.add(tabId);
          console.log(`✅ Adding tab ${tabId} to active EMR tabs`);
          try {
            await chrome.sidePanel.setOptions({
              tabId,
              path: "src/sidepanel/index.html",
              enabled: true
            });
            console.log(`✅ Side panel ENABLED for tab ${tabId}`);
          } catch (error) {
            console.error("❌ Could not enable side panel for tab:", error);
          }
        } else {
          this.activeTabs.delete(tabId);
          console.log(`🗑️ Removing tab ${tabId} from active EMR tabs`);
          try {
            await chrome.sidePanel.setOptions({
              tabId,
              enabled: false
            });
            console.log(`🚫 Side panel DISABLED for tab ${tabId}`);
          } catch (error) {
            console.error("❌ Could not disable side panel for tab:", error);
          }
        }
      }
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      console.log(`🗑️ Tab ${tabId} removed`);
      this.activeTabs.delete(tabId);
    });
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log(`🎯 Tab ${activeInfo.tabId} activated`);
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        console.log(`🎯 Active tab info:`, { id: tab.id, url: tab.url, title: tab.title?.substring(0, 50) });
        const isEMR = this.isEMRTab(tab.url);
        if (isEMR) {
          await chrome.sidePanel.setOptions({
            tabId: activeInfo.tabId,
            path: "src/sidepanel/index.html",
            enabled: true
          });
          console.log(`✅ Side panel ENABLED for activated tab ${activeInfo.tabId}`);
        }
      } catch (error) {
        console.error("❌ Error handling tab activation:", error);
      }
    });
    chrome.commands.onCommand.addListener(async (command) => {
      await this.handleCommand(command);
    });
    this.checkExistingTabs();
    chrome.action.onClicked.addListener((tab) => {
      console.log("🎯 Extension icon clicked for tab:", tab.id, tab.url);
      if (!tab.id) {
        console.error("❌ Cannot open side panel - no tab ID");
        return;
      }
      const isEMR = this.isEMRTab(tab.url);
      if (!isEMR) {
        console.log("ℹ️ Cannot open side panel - not on EMR domain");
        return;
      }
      chrome.sidePanel.open({ tabId: tab.id }).then(() => {
        console.log("✅ Side panel opened successfully");
      }).catch((error) => {
        console.error("❌ Failed to open side panel:", error);
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        if (error.message.includes("user gesture")) {
          console.error("💡 User gesture timing issue - Chrome requires immediate synchronous call");
        } else if (error.message.includes("No active side panel")) {
          console.error("💡 Side panel not properly registered - check tab management logic");
        }
      });
    });
    if ("onPanelOpened" in chrome.sidePanel) {
      chrome.sidePanel.onPanelOpened?.addListener(() => {
        console.log("✅ Side panel opened successfully");
      });
    }
  }
  async setupSidePanel() {
    try {
      console.log("🔧 Setting up side panel...");
      await chrome.sidePanel.setOptions({
        path: "src/sidepanel/index.html",
        enabled: false
        // Only enable for my.xestro.com domains
      });
      console.log("✅ Side panel path set to src/sidepanel/index.html");
      try {
        const response = await fetch(chrome.runtime.getURL("src/sidepanel/index.html"));
        if (response.ok) {
          console.log("✅ Side panel HTML is accessible");
        } else {
          console.error("❌ Side panel HTML not accessible:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("❌ Failed to test side panel HTML accessibility:", error);
      }
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
      });
      console.log("✅ Side panel behavior set to open on action click");
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
            path: "src/sidepanel/index.html",
            enabled: true
          });
          console.log("✅ Side panel enabled for current tab:", tabs[0].url);
        } else {
          console.log("ℹ️ Current tab is not EMR, side panel remains disabled");
        }
      } else {
        console.log("⚠️ No active tab found during setup");
      }
      console.log("✅ Side panel setup complete");
    } catch (error) {
      console.error("❌ Failed to setup side panel:", error);
    }
  }
  async handleInstallation() {
    try {
      await chrome.storage.local.set({
        settings: {
          lmStudioUrl: "http://localhost:1234",
          classifierModel: "medgemma-4b-it",
          processorModel: "medgemma-27b-it",
          autoDetectAgent: true,
          voiceActivation: true
        },
        agentMemory: {},
        sessionHistory: []
      });
      try {
        await chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/icons/icon-48.png",
          title: "Reflow Medical Assistant",
          message: "Extension installed successfully! Open the side panel to get started."
        });
      } catch (notificationError) {
        console.log("Welcome notification skipped:", notificationError);
      }
    } catch (error) {
      console.error("Installation setup failed:", error);
    }
  }
  async handleMessage(message, sender, sendResponse) {
    try {
      const { type, action, data, tabId } = message;
      switch (type) {
        case "EXECUTE_ACTION":
          await this.executeAction(action, data, tabId || sender.tab?.id, sendResponse);
          break;
        case "SIDE_PANEL_ACTION":
          await this.handleSidePanelAction(action, data, sendResponse);
          break;
        case "GET_TAB_INFO":
          sendResponse(await this.getTabInfo(sender.tab?.id));
          break;
        case "UPDATE_AGENT_MEMORY":
          await this.updateAgentMemory(data.agentType, data.memory);
          sendResponse({ success: true });
          break;
        case "GET_SETTINGS":
          const settings = await chrome.storage.local.get("settings");
          sendResponse(settings.settings || {});
          break;
        case "UPDATE_SETTINGS":
          await chrome.storage.local.set({ settings: data });
          sendResponse({ success: true });
          break;
        case "CLIPBOARD_MONITORING_RESULT":
          this.handleClipboardResult(data);
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Message handling error:", error);
      sendResponse({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  async executeAction(action, data, tabId, sendResponse) {
    if (action === "profile-photo") {
      await this.handleProfilePhotoCapture(data, tabId, sendResponse);
      return;
    }
    if (!tabId) {
      console.log("🔍 No tabId provided, searching for active EMR tab...");
      const activeTab = await this.getActiveEMRTab();
      if (!activeTab?.id) {
        console.log("❌ No active EMR tab found");
        sendResponse?.({ error: "No active EMR tab found" });
        return;
      }
      tabId = activeTab.id;
      console.log("✅ Found active EMR tab:", tabId, activeTab.url);
    }
    try {
      console.log(`🚀 Executing action "${action}" on tab ${tabId}`);
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => window.reflowContentScriptLoaded === true
        });
        if (!results[0]?.result) {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content-script.js"]
          });
          console.log("📝 Content script injected manually");
          await this.wait(1e3);
        } else {
          console.log("📝 Content script already loaded");
        }
      } catch (injectError) {
        console.log("📝 Content script injection failed:", injectError);
      }
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "EXECUTE_ACTION",
        action,
        data
      });
      console.log(`✅ Action "${action}" completed:`, response);
      sendResponse?.(response);
    } catch (error) {
      console.error(`❌ Action ${action} failed:`, error);
      sendResponse?.({ error: error instanceof Error ? error.message : "Action failed" });
    }
  }
  async handleSidePanelAction(action, data, sendResponse) {
    try {
      const activeTab = await this.getActiveEMRTab();
      if (!activeTab) {
        sendResponse({ error: "No active EMR tab found" });
        return;
      }
      await this.executeAction(action, data, activeTab.id, sendResponse);
    } catch (error) {
      console.error(`Side panel action ${action} failed:`, error);
      sendResponse({ error: error instanceof Error ? error.message : "Action failed" });
    }
  }
  async handleCommand(command) {
    try {
      const activeTab = await this.getActiveEMRTab();
      switch (command) {
        case "toggle-recording":
          await chrome.runtime.sendMessage({
            type: "KEYBOARD_SHORTCUT",
            command: "toggle-recording"
          });
          break;
        case "open-side-panel":
          if (activeTab?.id) {
          }
          break;
        case "quick-transcribe":
          await chrome.runtime.sendMessage({
            type: "KEYBOARD_SHORTCUT",
            command: "quick-transcribe"
          });
          break;
      }
    } catch (error) {
      console.error(`Command ${command} failed:`, error);
    }
  }
  async getActiveEMRTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab && this.isEMRTab(activeTab.url)) {
        return activeTab;
      }
      const emrTabs = await chrome.tabs.query({});
      for (const tab of emrTabs) {
        if (this.isEMRTab(tab.url)) {
          return tab;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get active EMR tab:", error);
      return null;
    }
  }
  isEMRTab(url) {
    console.log("🔍 Checking if EMR tab:", url);
    if (!url) {
      console.log("❌ No URL provided");
      return false;
    }
    try {
      const urlObj = new URL(url);
      const isMatch = urlObj.hostname === "my.xestro.com";
      console.log(`🔍 URL hostname: "${urlObj.hostname}", matches my.xestro.com: ${isMatch}`);
      return isMatch;
    } catch (error) {
      console.log("❌ Invalid URL format:", error);
      return false;
    }
  }
  async getTabInfo(tabId) {
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
      console.error("Failed to get tab info:", error);
      return null;
    }
  }
  async updateAgentMemory(agentType, memory) {
    try {
      const stored = await chrome.storage.local.get("agentMemory");
      const agentMemory = stored.agentMemory || {};
      agentMemory[agentType] = {
        ...agentMemory[agentType],
        ...memory,
        lastUpdated: Date.now()
      };
      await chrome.storage.local.set({ agentMemory });
    } catch (error) {
      console.error("Failed to update agent memory:", error);
    }
  }
  async initializeWhisperServer() {
    try {
      console.log("🎙️ Initializing MLX Whisper server...");
      const status = await this.whisperServerService.checkServerStatus();
      if (status.running) {
        console.log("✅ MLX Whisper server is already running");
        console.log(`📍 Model: ${status.model}, Port: ${status.port}`);
      } else {
        console.log("⚠️ MLX Whisper server is not running");
        console.log("💡 Starting server automatically...");
        const startResult = await this.whisperServerService.startServer();
        if (startResult.running) {
          console.log("✅ MLX Whisper server started successfully");
        } else {
          console.warn("❌ Failed to start MLX Whisper server automatically");
          console.warn("💡 Manual start required: ./start-whisper-server.sh");
          console.warn("💡 Or run: source venv-whisper/bin/activate && python whisper-server.py");
        }
      }
    } catch (error) {
      console.error("❌ MLX Whisper server initialization failed:", error);
    }
  }
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async handleProfilePhotoCapture(data, targetTabId, sendResponse) {
    console.log("📸 Starting profile photo capture workflow...");
    try {
      const emrTab = targetTabId ? await chrome.tabs.get(targetTabId) : await this.getActiveEMRTab();
      if (!emrTab?.id) {
        console.error("❌ No EMR tab found for image insertion");
        sendResponse?.({ error: "No EMR tab found for image insertion" });
        return;
      }
      console.log(`📸 Target EMR tab: ${emrTab.id} (${emrTab.url})`);
      console.log("📸 Attempting tab capture method...");
      const tabCaptureResult = await this.captureDoxyTab();
      if (tabCaptureResult.success) {
        console.log("✅ Tab capture successful, inserting image...");
        console.log("📝 Ensuring content script is available for image insertion...");
        await this.ensureContentScriptLoaded(emrTab.id);
        const response = await chrome.tabs.sendMessage(emrTab.id, {
          type: "EXECUTE_ACTION",
          action: "profile-photo",
          data: {
            imageData: tabCaptureResult.imageData,
            method: tabCaptureResult.method,
            tabInfo: tabCaptureResult.tabInfo
          }
        });
        console.log("✅ Profile photo capture and insertion completed");
        sendResponse?.({ success: true, method: tabCaptureResult.method, response });
        return;
      }
      console.log("⚠️ Tab capture failed, falling back to clipboard method...");
      await this.handleClipboardFallback(emrTab.id, tabCaptureResult.error, sendResponse);
    } catch (error) {
      console.error("❌ Profile photo capture failed:", error);
      sendResponse?.({
        error: error instanceof Error ? error.message : "Screenshot capture failed",
        method: "failed"
      });
    }
  }
  async captureDoxyTab() {
    console.log("📸 Looking for doxy.me tabs...");
    try {
      const doxyTabs = await chrome.tabs.query({
        url: ["*://*.doxy.me/*", "*://doxy.me/*"]
      });
      console.log(`📸 Found ${doxyTabs.length} doxy.me tabs`);
      if (doxyTabs.length === 0) {
        return {
          success: false,
          method: "failed",
          error: "No doxy.me tabs found"
        };
      }
      let targetTab = doxyTabs[0];
      if (doxyTabs.length > 1) {
        const activeDoxyTab = doxyTabs.find((tab) => tab.active);
        if (activeDoxyTab) {
          targetTab = activeDoxyTab;
          console.log("📸 Using active doxy.me tab");
        } else {
          targetTab = doxyTabs.reduce(
            (latest, current) => (current.lastAccessed || 0) > (latest.lastAccessed || 0) ? current : latest
          );
          console.log("📸 Using most recently accessed doxy.me tab");
        }
      }
      console.log(`📸 Capturing tab: ${targetTab.id} - ${targetTab.title}`);
      console.log(`📸 Tab URL: ${targetTab.url}`);
      console.log(`📸 Window ID: ${targetTab.windowId}`);
      const currentActiveTab = await chrome.tabs.query({ active: true, windowId: targetTab.windowId });
      const originalActiveTab = currentActiveTab[0];
      try {
        if (!targetTab.active) {
          console.log("📸 Temporarily activating tab for capture...");
          await chrome.tabs.update(targetTab.id, { active: true });
          await this.wait(300);
        }
        console.log("📸 Attempting chrome.tabs.captureVisibleTab...");
        const imageData = await chrome.tabs.captureVisibleTab(
          targetTab.windowId,
          { format: "png", quality: 90 }
        );
        console.log("📸 Tab capture completed successfully");
        if (originalActiveTab && originalActiveTab.id !== targetTab.id) {
          console.log("📸 Restoring original active tab...");
          await chrome.tabs.update(originalActiveTab.id, { active: true });
        }
        console.log("✅ Tab capture successful");
        return {
          success: true,
          imageData,
          method: "tab-capture",
          tabInfo: {
            title: targetTab.title || "doxy.me",
            url: targetTab.url || "",
            windowId: targetTab.windowId
          }
        };
      } catch (captureError) {
        if (originalActiveTab && originalActiveTab.id !== targetTab.id) {
          try {
            await chrome.tabs.update(originalActiveTab.id, { active: true });
          } catch (restoreError) {
            console.log("⚠️ Could not restore original active tab:", restoreError);
          }
        }
        throw captureError;
      }
    } catch (error) {
      console.error("❌ Tab capture failed:", error);
      return {
        success: false,
        method: "failed",
        error: error instanceof Error ? error.message : "Tab capture failed"
      };
    }
  }
  async handleClipboardFallback(emrTabId, tabCaptureError, sendResponse) {
    console.log("📸 Starting clipboard fallback method...");
    try {
      console.log("📸 Ensuring content script is available...");
      await this.ensureContentScriptLoaded(emrTabId);
      console.log("📸 Showing clipboard capture instructions...");
      await chrome.tabs.sendMessage(emrTabId, {
        type: "SHOW_SCREENSHOT_INSTRUCTIONS",
        data: {
          method: "clipboard",
          tabCaptureError,
          instructions: [
            "Press cmd+shift+4 to take a screenshot",
            "Select the area you want to capture",
            "The image will automatically be inserted when ready"
          ]
        }
      });
      console.log("📸 Starting clipboard monitoring via content script...");
      await chrome.tabs.sendMessage(emrTabId, {
        type: "START_CLIPBOARD_MONITORING",
        data: { timeoutMs: 3e4 }
      });
      console.log("📸 Waiting for clipboard monitoring result...");
      const clipboardResult = await this.waitForClipboardResult();
      if (clipboardResult.success) {
        console.log("✅ Clipboard method successful via content script");
        sendResponse?.({ success: true, method: "clipboard", result: clipboardResult });
      } else {
        console.error("❌ Clipboard method failed:", clipboardResult.error);
        sendResponse?.({
          error: clipboardResult.error || "Clipboard method failed",
          method: "failed"
        });
      }
    } catch (error) {
      console.error("❌ Clipboard fallback failed:", error);
      sendResponse?.({
        error: error instanceof Error ? error.message : "Clipboard fallback failed",
        method: "failed"
      });
    }
  }
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  async ensureContentScriptLoaded(tabId) {
    try {
      const isResponsive = await this.testContentScriptResponsiveness(tabId);
      if (isResponsive) {
        console.log("📝 Content script already loaded and responsive");
        return;
      }
      console.log("📝 Injecting content script...");
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-script.js"]
      });
      console.log("📝 Content script injected successfully");
      await this.wait(1e3);
      const isNowResponsive = await this.testContentScriptResponsiveness(tabId);
      if (!isNowResponsive) {
        throw new Error("Content script injection successful but not responsive");
      }
    } catch (error) {
      console.error("❌ Failed to inject content script:", error);
      throw new Error("Could not load content script for functionality");
    }
  }
  /**
   * Test if content script is responsive with timeout
   */
  async testContentScriptResponsiveness(tabId) {
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Content script ping timeout"));
        }, 2e3);
        chrome.tabs.sendMessage(tabId, { type: "PING" }, (response2) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response2);
        });
      });
      return !!(response && response.success);
    } catch (error) {
      console.log("📝 Content script not responsive:", error);
      return false;
    }
  }
  async waitForClipboardResult() {
    return new Promise((resolve, reject) => {
      this.clipboardResultPromise = { resolve, reject };
      setTimeout(() => {
        if (this.clipboardResultPromise) {
          this.clipboardResultPromise.reject(new Error("Timeout waiting for clipboard result"));
          this.clipboardResultPromise = null;
        }
      }, 35e3);
    });
  }
  handleClipboardResult(result) {
    console.log("📸 Received clipboard monitoring result:", result);
    if (this.clipboardResultPromise) {
      if (result.success) {
        this.clipboardResultPromise.resolve(result);
      } else {
        this.clipboardResultPromise.reject(new Error(result.error || "Clipboard monitoring failed"));
      }
      this.clipboardResultPromise = null;
    } else {
      console.warn("⚠️ Received clipboard result but no promise waiting for it");
    }
  }
  /**
   * Check all existing tabs on startup to enable side panel for EMR tabs
   */
  async checkExistingTabs() {
    try {
      console.log("🔍 Checking all existing tabs for EMR domains...");
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
                path: "src/sidepanel/index.html",
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
      console.error("❌ Error checking existing tabs:", error);
    }
  }
  /**
   * Navigate tab with proper timing and error handling
   */
  async navigateTab(tabId, url) {
    console.log(`🧭 Navigating tab ${tabId} to: ${url}`);
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url }, async (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Navigation failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        console.log(`🧭 Navigation initiated for tab ${tabId}`);
        try {
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
  async waitForTabLoad(tabId) {
    const maxWaitTime = 15e3;
    const checkInterval = 500;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") {
          console.log(`✅ Tab ${tabId} loaded successfully`);
          await this.wait(500);
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
  async sendMessageToTab(tabId, message, options = {}) {
    const { timeout = 5e3, retries = 2, ensureContentScript = true } = options;
    if (ensureContentScript) {
      try {
        await this.ensureContentScriptLoaded(tabId);
      } catch (error) {
        console.warn(`⚠️ Could not ensure content script for tab ${tabId}:`, error);
      }
    }
    let lastError = null;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Message timeout after ${timeout}ms`));
          }, timeout);
          chrome.tabs.sendMessage(tabId, message, (response2) => {
            clearTimeout(timer);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response2);
          });
        });
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`📨 Message attempt ${attempt} failed for tab ${tabId}:`, lastError.message);
        if (attempt <= retries) {
          if (ensureContentScript && lastError.message.includes("Could not establish connection")) {
            try {
              console.log(`📝 Re-injecting content script for tab ${tabId} after connection failure...`);
              await chrome.scripting.executeScript({
                target: { tabId },
                files: ["content-script.js"]
              });
              await this.wait(1e3);
            } catch (injectError) {
              console.warn(`📝 Content script re-injection failed for tab ${tabId}:`, injectError);
            }
          }
          await this.wait(Math.min(1e3 * attempt, 3e3));
        }
      }
    }
    throw lastError || new Error("Message sending failed after all retries");
  }
  // Public methods for external access
  async broadcastToTabs(message, emrOnly = true) {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (!emrOnly || this.isEMRTab(tab.url)) {
          try {
            await this.sendMessageToTab(tab.id, message, {
              timeout: 2e3,
              retries: 0,
              ensureContentScript: false
            });
          } catch (error) {
          }
        }
      }
    } catch (error) {
      console.error("Failed to broadcast to tabs:", error);
    }
  }
}
const backgroundService = new BackgroundService();
if (typeof window !== "undefined") {
  window.backgroundService = backgroundService;
}
