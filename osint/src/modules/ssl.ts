import * as tls from 'tls';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

export const sslModule: ScanModule = {
  id: 'ssl',
  name: 'SSL/TLS Certificate',
  description: 'Analyze SSL/TLS certificate details',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    return new Promise((resolve) => {
      const socket = tls.connect(443, target, { servername: target, timeout: 10000 }, () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || !cert.subject) {
            resolve({
              moduleId: 'ssl',
              name: 'SSL/TLS Certificate',
              status: 'error',
              data: { error: 'No certificate received' },
              relationships: [],
              duration: Date.now() - start,
            });
            return;
          }

          const now = new Date();
          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpired = daysRemaining < 0;

          // Extract SANs
          const sans = cert.subjectaltname
            ? cert.subjectaltname.split(',').map((s: string) => s.trim().replace('DNS:', ''))
            : [];

          if (cert.issuer?.O) {
            relationships.push({ source: target, target: cert.issuer.O, type: 'cert_issued_by' });
          }

          // SANs as relationships
          for (const san of sans) {
            if (san !== target && san !== `*.${target}`) {
              relationships.push({ source: target, target: san, type: 'shares_cert_with' });
            }
          }

          resolve({
            moduleId: 'ssl',
            name: 'SSL/TLS Certificate',
            status: 'success',
            data: {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: validFrom.toISOString(),
              validTo: validTo.toISOString(),
              daysRemaining,
              isExpired,
              serialNumber: cert.serialNumber,
              fingerprint: cert.fingerprint256,
              sans,
              protocol: socket.getProtocol(),
            },
            relationships,
            duration: Date.now() - start,
          });
        } catch (err) {
          socket.end();
          resolve({
            moduleId: 'ssl',
            name: 'SSL/TLS Certificate',
            status: 'error',
            data: {},
            relationships: [],
            duration: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

      socket.on('error', (err) => {
        resolve({
          moduleId: 'ssl',
          name: 'SSL/TLS Certificate',
          status: 'error',
          data: {},
          relationships: [],
          duration: Date.now() - start,
          error: err.message,
        });
      });

      signal.addEventListener('abort', () => {
        socket.destroy();
        resolve({
          moduleId: 'ssl',
          name: 'SSL/TLS Certificate',
          status: 'error',
          data: {},
          relationships: [],
          duration: Date.now() - start,
          error: 'Aborted',
        });
      });
    });
  },
};
