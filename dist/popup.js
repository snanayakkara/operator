import "./chunks/modulepreload-polyfill.DaKOjhqt.js";
class PopupManager {
  constructor() {
    this.init();
  }
  async init() {
    this.setupEventListeners();
    await this.checkConnectionStatus();
  }
  setupEventListeners() {
    document.getElementById("openSidePanel")?.addEventListener("click", async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          await chrome.sidePanel.open({ tabId: activeTab.id });
          window.close();
        }
      } catch (error) {
        console.error("Failed to open side panel:", error);
      }
    });
    document.getElementById("voiceRecording")?.addEventListener("click", () => {
      this.openSidePanelWithFeature("voice");
    });
    document.getElementById("aiProcessing")?.addEventListener("click", () => {
      this.openSidePanelWithFeature("ai");
    });
    document.getElementById("emrIntegration")?.addEventListener("click", () => {
      this.openSidePanelWithFeature("emr");
    });
    document.getElementById("quickActions")?.addEventListener("click", () => {
      this.openSidePanelWithFeature("actions");
    });
  }
  async openSidePanelWithFeature(feature) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        await chrome.storage.session.set({ highlightFeature: feature });
        await chrome.sidePanel.open({ tabId: activeTab.id });
        window.close();
      }
    } catch (error) {
      console.error("Failed to open side panel with feature:", error);
    }
  }
  async checkConnectionStatus() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      const statusElement = document.getElementById("statusIndicator");
      const statusDot = statusElement.querySelector(".status-dot");
      if (this.isEMRSite(activeTab?.url)) {
        try {
          const response = await fetch("http://localhost:1234/v1/models", {
            method: "GET",
            signal: AbortSignal.timeout(3e3)
          });
          if (response.ok) {
            statusDot.className = "status-dot status-online";
            statusElement.lastChild.textContent = "Ready for medical dictation";
          } else {
            throw new Error("LMStudio not responding");
          }
        } catch (error) {
          statusDot.className = "status-dot status-offline";
          statusElement.lastChild.textContent = "LMStudio not connected";
        }
      } else {
        statusDot.className = "status-dot status-offline";
        statusElement.lastChild.textContent = "Navigate to EMR to use";
      }
    } catch (error) {
      console.error("Failed to check connection status:", error);
      const statusElement = document.getElementById("statusIndicator");
      const statusDot = statusElement.querySelector(".status-dot");
      statusDot.className = "status-dot status-offline";
      statusElement.lastChild.textContent = "Connection check failed";
    }
  }
  isEMRSite(url) {
    if (!url) return false;
    return url.includes("my.xestro.com");
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new PopupManager();
  });
} else {
  new PopupManager();
}
