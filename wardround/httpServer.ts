import http from 'http';
import { FileSystemWardRoundStateStore } from './patientState';

export interface WardRoundHttpServerOptions {
  port?: number;
  host?: string;
  stateStore: FileSystemWardRoundStateStore;
}

export class WardRoundHttpServer {
  private server: http.Server | null = null;

  constructor(private options: WardRoundHttpServerOptions) {}

  public start(): void {
    if (this.server) return;
    const port = this.options.port ?? 5859;
    const host = this.options.host ?? '127.0.0.1';
    const stateStore = this.options.stateStore;

    this.server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }

      try {
        if (req.method === 'GET' && req.url.startsWith('/wardround/pending')) {
          const data = await stateStore.listPendingUpdates();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ pending: data }));
          return;
        }

        if (req.method === 'POST' && req.url.startsWith('/wardround/pending/')) {
          const id = req.url.split('/wardround/pending/')[1];
          if (!id) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'id required' }));
            return;
          }
          await stateStore.deletePendingUpdate(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        res.writeHead(404);
        res.end();
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    });

    this.server.listen(port, host, () => {
      console.log(`Ward round HTTP server listening on http://${host}:${port}`);
    });
  }
}
