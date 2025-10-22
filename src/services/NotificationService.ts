import type { AgentType } from '@/types/medical.types';

export interface NotificationConfig {
  enabledForAllAgents: boolean;
  alwaysEnabledForLongProcesses: boolean; // AI Review, Batch Review
  onlyWhenUnfocused: boolean;
}

export class NotificationService {
  private static defaultConfig: NotificationConfig = {
    enabledForAllAgents: true,
    alwaysEnabledForLongProcesses: true,
    onlyWhenUnfocused: false
  };

  /**
   * Show completion notification for an agent
   */
  public static async showCompletionNotification(
    agent: AgentType, 
    processingTime: number, 
    extraInfo?: string,
    patientName?: string
  ): Promise<void> {
    try {
      // Check if we should show notification
      if (!(await this.shouldShowNotification(agent, processingTime))) {
        return;
      }

      // Create the notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
        title: this.getAgentTitle(agent, patientName),
        message: this.getCompletionMessage(agent, processingTime, extraInfo)
      });

      console.log(`🔔 Notification sent: ${agent} completed in ${processingTime}ms${patientName ? ` for ${patientName}` : ''}`);
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
    }
  }

  /**
   * Show error notification for failed processing
   */
  public static async showErrorNotification(
    agent: AgentType, 
    processingTime: number, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
        title: `❌ ${this.getAgentDisplayName(agent)} Failed`,
        message: errorMessage || `Processing failed after ${this.formatTime(processingTime)}. Please try again.`
      });

      console.log(`🔔 Error notification sent: ${agent} failed after ${processingTime}ms`);
    } catch (error) {
      console.error('❌ Failed to send error notification:', error);
    }
  }

  /**
   * Determine if notification should be shown based on conditions
   */
  private static async shouldShowNotification(agent: AgentType, processingTime: number): Promise<boolean> {
    // Always show for long-running processes (over 30 seconds)
    if (processingTime > 30000) {
      return true;
    }

    // Check if notifications are enabled for all agents
    if (!this.defaultConfig.enabledForAllAgents) {
      return false;
    }

    // If configured to only show when unfocused, check if Chrome is focused
    if (this.defaultConfig.onlyWhenUnfocused) {
      try {
        // Check if any Chrome window is focused
        const windows = await chrome.windows.getAll({ populate: false });
        const focusedWindow = windows.find(window => window.focused);
        
        // If Chrome is focused, don't show notification (user is actively using it)
        if (focusedWindow) {
          return false;
        }
      } catch (error) {
        console.warn('Could not check window focus, showing notification anyway:', error);
      }
    }

    return true;
  }

  /**
   * Get agent-specific notification title
   */
  private static getAgentTitle(agent: AgentType, patientName?: string): string {
    const titles: Record<AgentType, string> = {
      'tavi': '🫀 TAVI Report Complete',
      'angiogram-pci': '🩺 Angiogram/PCI Report Complete', 
      'quick-letter': '💌 Medical Letter Complete',
      'consultation': '👨‍⚕️ Consultation Report Complete',
      'investigation-summary': '📊 Investigation Summary Complete',
      'background': '📋 Background Report Complete',
      'medication': '💊 Medication Report Complete',
      'bloods': '🩸 Blood Test Order Complete',
      'imaging': '📷 Imaging Order Complete',
      'mteer': '🫀 mTEER Report Complete',
      'tteer': '🫀 tTEER Report Complete',
      'pfo-closure': '🫀 PFO Closure Report Complete',
      'asd-closure': '🫀 ASD Closure Report Complete',
      'right-heart-cath': '🫀 RHC Report Complete',
      'pvl-plug': '🫀 PVL Plug Report Complete',
      'bypass-graft': '🫀 Bypass Graft Report Complete',
      'tavi-workup': '🫀 TAVI Workup Complete',
      'ohif-viewer': '🩻 Imaging Viewer Ready',
      'aus-medical-review': '🇦🇺 Australian Medical Review Complete',
      'ai-medical-review': '🔍 AI Medical Review Complete',
      'batch-ai-review': '📋 Batch AI Review Complete',
      'patient-education': '🎓 Patient Education Complete',
      'pre-op-plan': '📋 Pre-Op Plan Ready',
      'enhancement': '✨ Enhancement Complete',
      'transcription': '🎤 Transcription Complete',
      'generation': '⚡ Generation Complete'
    };

    const baseTitle = titles[agent] || '✅ Medical Report Complete';
    
    // Add patient name if available
    if (patientName && patientName !== 'unknown patient') {
      return `${baseTitle} - ${patientName}`;
    }
    
    return baseTitle;
  }

  /**
   * Get completion message with processing time and extra info
   */
  private static getCompletionMessage(agent: AgentType, processingTime: number, extraInfo?: string): string {
    const baseMessage = `Generated in ${this.formatTime(processingTime)}`;
    
    // Add agent-specific context
    const context = this.getAgentContext(agent, extraInfo);
    
    return context ? `${baseMessage} • ${context}` : baseMessage;
  }

  /**
   * Get agent-specific context for notification message
   */
  private static getAgentContext(agent: AgentType, extraInfo?: string): string {
    if (extraInfo) {
      return extraInfo;
    }

    const contexts: Partial<Record<AgentType, string>> = {
      'ai-medical-review': 'Review findings ready',
      'batch-ai-review': 'All patients processed',
      'quick-letter': 'Ready to copy or insert',
      'investigation-summary': 'Summary formatted for EMR',
      'tavi': 'Hemodynamics & valve assessment complete',
      'angiogram-pci': 'Vessel analysis & intervention plan ready',
      'pre-op-plan': 'Card prepared for cath lab handover'
    };

    return contexts[agent] || 'Click to view results';
  }

  /**
   * Get human-readable agent display name
   */
  private static getAgentDisplayName(agent: AgentType): string {
    const names: Record<AgentType, string> = {
      'tavi': 'TAVI Agent',
      'angiogram-pci': 'Angiogram/PCI Agent',
      'quick-letter': 'Quick Letter Agent',
      'consultation': 'Consultation Agent', 
      'investigation-summary': 'Investigation Summary Agent',
      'background': 'Background Agent',
      'medication': 'Medication Agent',
      'bloods': 'Bloods Agent',
      'imaging': 'Imaging Agent',
      'mteer': 'mTEER Agent',
      'tteer': 'tTEER Agent',
      'pfo-closure': 'PFO Closure Agent',
      'asd-closure': 'ASD Closure Agent',
      'right-heart-cath': 'RHC Agent',
      'pvl-plug': 'PVL Plug Agent', 
      'bypass-graft': 'Bypass Graft Agent',
      'tavi-workup': 'TAVI Workup Agent',
      'ohif-viewer': 'OHIF Viewer Agent',
      'aus-medical-review': 'Australian Medical Review Agent',
      'ai-medical-review': 'AI Medical Review',
      'batch-ai-review': 'Batch AI Review',
      'patient-education': 'Patient Education Agent',
      'pre-op-plan': 'Pre-Op Plan Agent',
      'enhancement': 'Enhancement Agent',
      'transcription': 'Transcription Agent', 
      'generation': 'Generation Agent'
    };

    return names[agent] || agent.toUpperCase();
  }

  /**
   * Format processing time for display
   */
  private static formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  /**
   * Update notification configuration
   */
  public static updateConfig(config: Partial<NotificationConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get current notification configuration
   */
  public static getConfig(): NotificationConfig {
    return { ...this.defaultConfig };
  }
}
