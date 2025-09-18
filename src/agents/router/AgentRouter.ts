import type { AgentType, MedicalContext } from '@/types/medical.types';
import { MedicalAgent } from '../base/MedicalAgent';
import { TAVIAgent } from '../specialized/TAVIAgent';
import { AngiogramPCIAgent } from '../specialized/AngiogramPCIAgent';
import { QuickLetterAgentPhase3 } from '../specialized/QuickLetterAgent.Phase3';
import { ConsultationAgent } from '../specialized/ConsultationAgent';
import { BloodsAgent } from '../specialized/BloodsAgent';
import { ImagingAgent } from '../specialized/ImagingAgent';

export class AgentRouter {
  private static instance: AgentRouter;

  private constructor() {
    // Simplified constructor - no classification logic needed
  }

  public static getInstance(): AgentRouter {
    if (!AgentRouter.instance) {
      AgentRouter.instance = new AgentRouter();
    }
    return AgentRouter.instance;
  }


  public async routeToAgent(
    input: string, 
    agentType: AgentType, 
    context?: MedicalContext
  ): Promise<string> {
    try {
      // Create agent directly based on type
      let agent: MedicalAgent;
      switch (agentType) {
        case 'tavi':
          agent = new TAVIAgent();
          break;
        case 'angiogram-pci':
          agent = new AngiogramPCIAgent();
          break;
        case 'quick-letter':
          agent = new QuickLetterAgentPhase3();
          break;
        case 'consultation':
          agent = new ConsultationAgent();
          break;
        case 'bloods':
          agent = new BloodsAgent();
          break;
        case 'imaging':
          agent = new ImagingAgent();
          break;
        default:
          throw new Error(`Agent type ${agentType} not supported`);
      }

      const report = await agent.process(input, context);
      return report.content;
      
    } catch (error) {
      console.error(`Error routing to ${agentType} agent:`, error);
      throw error;
    }
  }


}