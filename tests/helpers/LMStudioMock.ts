import { createServer, Server } from 'http';
import { URL } from 'url';

export class LMStudioMock {
  private server: Server | null = null;
  private port: number = 1234;
  private isRunning = false;

  async start(port: number = 1234): Promise<void> {
    this.port = port;
    
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(port, () => {
        this.isRunning = true;
        console.log(`🤖 Mock LMStudio server started on port ${port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Mock LMStudio server error:', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server || !this.isRunning) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        resolve();
      });
    });
  }

  private handleRequest(req: any, res: any): void {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${this.port}`);
    console.log(`Mock LMStudio handling: ${req.method} ${url.pathname}`);
    
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      this.handleModelsRequest(res);
    } else if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      this.handleChatCompletionRequest(req, res);
    } else if (req.method === 'POST' && url.pathname === '/v1/audio/transcriptions') {
      this.handleTranscriptionRequest(req, res);
    } else if (req.method === 'GET' && url.pathname === '/v1/health') {
      this.handleHealthRequest(res);
    } else {
      console.log(`Unknown endpoint: ${req.method} ${url.pathname}`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private handleModelsRequest(res: any): void {
    const modelsResponse = {
      object: 'list',
      data: [
        {
          id: 'parakeet-tdt-0.6b-v2',
          object: 'model',
          created: Date.now(),
          owned_by: 'mock-lmstudio'
        },
        {
          id: 'medgemma-4b-it',
          object: 'model',
          created: Date.now(),
          owned_by: 'mock-lmstudio'
        },
        {
          id: 'medgemma-27b-it',
          object: 'model',
          created: Date.now(),
          owned_by: 'mock-lmstudio'
        }
      ]
    };

    console.log('Returning models:', modelsResponse.data.map(m => m.id));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(modelsResponse));
  }

  private handleHealthRequest(res: any): void {
    const healthResponse = {
      status: 'ok',
      timestamp: Date.now(),
      models_loaded: ['parakeet-tdt-0.6b-v2', 'medgemma-4b-it', 'medgemma-27b-it']
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthResponse));
  }

  private handleTranscriptionRequest(req: any, res: any): void {
    let body = '';
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        console.log('Received transcription request, buffer length:', buffer.length);
        
        // Mock transcription response
        const transcriptionResponse = {
          text: 'Patient underwent transcatheter aortic valve implantation with Edwards Sapien 3 valve deployment via transfemoral approach with excellent hemodynamic results.'
        };
        
        console.log('Returning transcription:', transcriptionResponse.text.substring(0, 50) + '...');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(transcriptionResponse));
      } catch (error) {
        console.error('Transcription error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
  }

  private handleChatCompletionRequest(req: any, res: any): void {
    let body = '';
    
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const response = this.generateMockResponse(requestData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
  }

  private generateMockResponse(request: any): any {
    const userMessage = request.messages?.find((m: any) => m.role === 'user')?.content || '';
    const isClassification = userMessage.includes('Classify this medical dictation') || 
                           userMessage.includes('classify') || 
                           request.model === 'medgemma-4b-it';
    
    let responseContent: string;
    
    console.log(`Generating response for model: ${request.model}, isClassification: ${isClassification}`);
    console.log(`Message preview: ${userMessage.substring(0, 100)}...`);

    if (isClassification) {
      // Classification response - match the AgentRouter expectations
      if (userMessage.toLowerCase().includes('tavi') || 
          userMessage.toLowerCase().includes('aortic valve') ||
          userMessage.toLowerCase().includes('transcatheter')) {
        responseContent = 'TAVI';
      } else if (userMessage.toLowerCase().includes('pci') || 
                 userMessage.toLowerCase().includes('stent') ||
                 userMessage.toLowerCase().includes('percutaneous coronary')) {
        responseContent = 'PCI';
      } else if (userMessage.toLowerCase().includes('angiogram') || 
                 userMessage.toLowerCase().includes('catheterization') ||
                 userMessage.toLowerCase().includes('coronary angiography')) {
        responseContent = 'ANGIOGRAM';
      } else if (userMessage.toLowerCase().includes('letter') || 
                 userMessage.toLowerCase().includes('brief') ||
                 userMessage.toLowerCase().includes('correspondence')) {
        responseContent = 'QUICK_LETTER';
      } else {
        responseContent = 'CONSULTATION';
      }
      console.log(`Classification result: ${responseContent}`);
    } else {
      // Medical report generation
      responseContent = this.generateMockMedicalReport(userMessage);
      console.log(`Generated report length: ${responseContent.length} chars`);
    }

    return {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model || 'medgemma-27b-it',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: Math.floor(userMessage.length / 4),
        completion_tokens: Math.floor(responseContent.length / 4),
        total_tokens: Math.floor((userMessage.length + responseContent.length) / 4)
      }
    };
  }

  private generateMockMedicalReport(input: string): string {
    const templates = {
      tavi: `PROCEDURE: Transcatheter Aortic Valve Implantation

INDICATION: Severe aortic stenosis with symptomatic heart failure.

TECHNIQUE: The procedure was performed via transfemoral approach. A 29mm Edwards Sapien 3 valve was successfully deployed with excellent hemodynamic result.

FINDINGS:
- Pre-procedure aortic valve area: 0.7 cm²
- Post-procedure gradient: Mean 8 mmHg
- No paravalvular leak
- LVEF: 55%

CONCLUSION: Successful TAVI with excellent immediate result. Patient stable post-procedure.`,

      pci: `PROCEDURE: Percutaneous Coronary Intervention

INDICATION: Acute coronary syndrome with significant LAD stenosis.

TECHNIQUE: Via right radial approach, the LAD lesion was treated with drug-eluting stent deployment after balloon pre-dilatation.

FINDINGS:
- LAD: 90% stenosis reduced to <10% residual
- TIMI 3 flow achieved
- No complications
- Other vessels: Non-obstructive disease

CONCLUSION: Successful PCI to LAD with excellent angiographic result.`,

      angiogram: `PROCEDURE: Coronary Angiography

INDICATION: Chest pain evaluation and risk stratification.

FINDINGS:
- Left Main: Normal
- LAD: 70% mid-vessel stenosis
- LCx: 40% proximal stenosis
- RCA: Dominant, 50% mid-vessel stenosis
- LVEF: 60% with normal wall motion

CONCLUSION: Moderate three-vessel coronary artery disease. Recommend medical management and stress testing.`,

      default: `MEDICAL CONSULTATION

HISTORY: Patient presents with the described symptoms and clinical scenario.

EXAMINATION: Physical examination findings are consistent with the clinical presentation.

ASSESSMENT: Based on the available information, the clinical picture suggests the need for further evaluation and appropriate management.

PLAN: 
1. Continue current medical therapy
2. Follow-up in clinic as scheduled
3. Consider additional investigations if symptoms persist

CONCLUSION: Patient counselled regarding findings and management plan.`
    };

    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('tavi') || lowerInput.includes('aortic valve')) {
      return templates.tavi;
    } else if (lowerInput.includes('pci') || lowerInput.includes('stent')) {
      return templates.pci;
    } else if (lowerInput.includes('angiogram') || lowerInput.includes('catheterization')) {
      return templates.angiogram;
    } else {
      return templates.default;
    }
  }
}