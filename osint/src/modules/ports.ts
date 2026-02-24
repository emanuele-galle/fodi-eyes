import * as net from 'net';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

const COMMON_PORTS: Array<{ port: number; service: string }> = [
  { port: 21, service: 'FTP' },
  { port: 22, service: 'SSH' },
  { port: 23, service: 'Telnet' },
  { port: 25, service: 'SMTP' },
  { port: 53, service: 'DNS' },
  { port: 80, service: 'HTTP' },
  { port: 110, service: 'POP3' },
  { port: 143, service: 'IMAP' },
  { port: 443, service: 'HTTPS' },
  { port: 445, service: 'SMB' },
  { port: 993, service: 'IMAPS' },
  { port: 995, service: 'POP3S' },
  { port: 1433, service: 'MSSQL' },
  { port: 1521, service: 'Oracle' },
  { port: 3306, service: 'MySQL' },
  { port: 3389, service: 'RDP' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 5900, service: 'VNC' },
  { port: 6379, service: 'Redis' },
  { port: 8080, service: 'HTTP-Alt' },
  { port: 8443, service: 'HTTPS-Alt' },
  { port: 9200, service: 'Elasticsearch' },
  { port: 27017, service: 'MongoDB' },
];

function checkPort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

export const portsModule: ScanModule = {
  id: 'ports',
  name: 'Port Scanner',
  description: 'Scan common ports (top 23)',
  targetTypes: ['domain', 'ip'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];
    const openPorts: Array<{ port: number; service: string }> = [];

    // Scan in batches of 5 to avoid overwhelming
    const BATCH_SIZE = 5;
    for (let i = 0; i < COMMON_PORTS.length; i += BATCH_SIZE) {
      if (signal.aborted) break;
      const batch = COMMON_PORTS.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async ({ port, service }) => {
          const open = await checkPort(target, port, 3000);
          return { port, service, open };
        })
      );
      for (const r of results) {
        if (r.open) {
          openPorts.push({ port: r.port, service: r.service });
          relationships.push({
            source: target,
            target: `${r.port}/${r.service}`,
            type: 'has_open_port',
          });
        }
      }
    }

    return {
      moduleId: 'ports',
      name: 'Port Scanner',
      status: 'success',
      data: { openPorts, scannedCount: COMMON_PORTS.length },
      relationships,
      duration: Date.now() - start,
    };
  },
};
