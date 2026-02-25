interface ScanResult {
  id: string;
  target: { value: string; type: string };
  status: string;
  startedAt: string;
  completedAt?: string;
  modules: Array<{
    moduleId: string;
    name: string;
    status: string;
    data: Record<string, unknown>;
    relationships: Array<{ source: string; target: string; type: string; label?: string }>;
    duration: number;
    error?: string;
  }>;
  relationships: Array<{ source: string; target: string; type: string; label?: string }>;
}

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  targetTypes: string[];
}

export class OsintScannerPanel {
  private element: HTMLElement;
  private onComplete: ((result: ScanResult) => void) | null = null;
  private onProgress: ((result: ScanResult) => void) | null = null;
  private modules: ModuleInfo[] = [];
  private isScanning = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'osint-scanner-panel';
    this.render();
    this.loadModules();
  }

  onScanComplete(fn: (result: ScanResult) => void): void {
    this.onComplete = fn;
  }

  onScanProgress(fn: (result: ScanResult) => void): void {
    this.onProgress = fn;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private async loadModules(): Promise<void> {
    try {
      const res = await fetch('/api/osint/modules');
      const data = await res.json();
      this.modules = data.modules || [];
      this.renderModuleCheckboxes();
    } catch {
      // Backend not available yet
      this.modules = [
        { id: 'dns', name: 'DNS Records', description: 'DNS lookup', targetTypes: ['domain'] },
        { id: 'whois', name: 'WHOIS', description: 'WHOIS lookup', targetTypes: ['domain', 'ip'] },
        { id: 'subdomains', name: 'Subdomains', description: 'Subdomain enum', targetTypes: ['domain'] },
        { id: 'headers', name: 'HTTP Headers', description: 'Header analysis', targetTypes: ['domain'] },
        { id: 'ssl', name: 'SSL/TLS', description: 'Certificate info', targetTypes: ['domain'] },
        { id: 'geo-ip', name: 'GeoIP', description: 'IP geolocation', targetTypes: ['ip', 'domain'] },
        { id: 'ports', name: 'Ports', description: 'Port scan', targetTypes: ['domain', 'ip'] },
        { id: 'social-lookup', name: 'Social Media', description: 'Username check', targetTypes: ['username'] },
        { id: 'email-harvest', name: 'Email Harvest', description: 'Email discovery', targetTypes: ['domain'] },
      ];
      this.renderModuleCheckboxes();
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="osint-scanner-header">
        <h2>\u{1F50D} OSINT Scanner</h2>
        <span class="osint-scanner-subtitle">Fodi-Eyes Intelligence Gathering</span>
      </div>
      <div class="osint-scanner-form">
        <div class="osint-input-row">
          <input type="text" id="osintTarget" class="osint-target-input"
            placeholder="Dominio, IP, email o username..."
            autocomplete="off" spellcheck="false" />
          <select id="osintType" class="osint-type-select">
            <option value="">Auto-detect</option>
            <option value="domain">Dominio</option>
            <option value="ip">IP</option>
            <option value="email">Email</option>
            <option value="username">Username</option>
          </select>
          <button id="osintScanBtn" class="osint-scan-btn">
            <span class="scan-icon">\u25B6</span> Scan
          </button>
        </div>
        <div class="osint-modules-row" id="osintModules"></div>
        <div class="osint-progress" id="osintProgress" style="display:none">
          <div class="osint-progress-bar"><div class="osint-progress-fill" id="osintProgressFill"></div></div>
          <span class="osint-progress-text" id="osintProgressText">Scansione in corso...</span>
        </div>
      </div>
    `;

    // Bind events
    this.element.querySelector('#osintScanBtn')?.addEventListener('click', () => this.startScan());
    this.element.querySelector('#osintTarget')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.startScan();
    });
  }

  private renderModuleCheckboxes(): void {
    const container = this.element.querySelector('#osintModules');
    if (!container) return;

    container.innerHTML = this.modules.map(m => `
      <label class="osint-module-checkbox">
        <input type="checkbox" value="${m.id}" checked />
        <span class="osint-module-name">${m.name}</span>
      </label>
    `).join('');
  }

  private getSelectedModules(): string[] {
    const checkboxes = this.element.querySelectorAll<HTMLInputElement>('#osintModules input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  private async startScan(): Promise<void> {
    if (this.isScanning) return;

    const targetInput = this.element.querySelector<HTMLInputElement>('#osintTarget');
    const typeSelect = this.element.querySelector<HTMLSelectElement>('#osintType');
    const target = targetInput?.value.trim();
    if (!target) return;

    const type = typeSelect?.value || undefined;
    const modules = this.getSelectedModules();

    this.isScanning = true;
    this.setScanning(true);

    try {
      const res = await fetch('/api/osint/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type, modules }),
      });
      const data = await res.json();

      if (data.id) {
        this.pollResults(data.id);
      } else {
        this.setScanning(false);
      }
    } catch (err) {
      console.error('[OSINT] Scan failed:', err);
      this.setScanning(false);
    }
  }

  private pollResults(scanId: string): void {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/osint/scan/${scanId}`);
        const result: ScanResult = await res.json();

        // Update progress
        const totalModules = result.modules.length;
        const completedModules = result.modules.filter(m => m.status !== 'running').length;
        this.updateProgress(completedModules, Math.max(totalModules, 1));

        // Emit progress
        this.onProgress?.(result);

        if (result.status === 'completed' || result.status === 'error') {
          if (this.pollInterval) clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.isScanning = false;
          this.setScanning(false);
          this.onComplete?.(result);

          // Save to history
          this.saveToHistory(result);
        }
      } catch {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = null;
        this.isScanning = false;
        this.setScanning(false);
      }
    }, 1000);
  }

  private setScanning(scanning: boolean): void {
    const btn = this.element.querySelector<HTMLButtonElement>('#osintScanBtn');
    const progress = this.element.querySelector<HTMLElement>('#osintProgress');

    if (btn) {
      btn.disabled = scanning;
      btn.innerHTML = scanning
        ? '<span class="scan-spinner"></span> Scanning...'
        : '<span class="scan-icon">\u25B6</span> Scan';
    }
    if (progress) {
      progress.style.display = scanning ? 'flex' : 'none';
    }
  }

  private updateProgress(completed: number, total: number): void {
    const fill = this.element.querySelector<HTMLElement>('#osintProgressFill');
    const text = this.element.querySelector<HTMLElement>('#osintProgressText');
    const pct = Math.round((completed / total) * 100);
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `Moduli completati: ${completed}/${total}`;
  }

  private saveToHistory(result: ScanResult): void {
    try {
      const history = JSON.parse(localStorage.getItem('osint-scan-history') || '[]');
      history.unshift({ id: result.id, target: result.target, date: result.startedAt, moduleCount: result.modules.length });
      if (history.length > 20) history.length = 20;
      localStorage.setItem('osint-scan-history', JSON.stringify(history));
    } catch { /* ignore */ }
  }
}
