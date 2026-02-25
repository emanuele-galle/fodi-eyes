interface ScanResult {
  id: string;
  target: { value: string; type: string };
  status: string;
  modules: Array<{
    moduleId: string;
    name: string;
    status: string;
    data: Record<string, unknown>;
    duration: number;
    error?: string;
    relationships: Array<{ source: string; target: string; type: string }>;
  }>;
  relationships: Array<{ source: string; target: string; type: string }>;
}

export class OsintResultsPanel {
  private element: HTMLElement;
  private currentResult: ScanResult | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'osint-results-panel';
    this.renderEmpty();
  }

  setResults(result: ScanResult): void {
    this.currentResult = result;
    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private renderEmpty(): void {
    this.element.innerHTML = `
      <div class="osint-results-empty">
        <div class="osint-results-icon">\u{1F4CB}</div>
        <p>Avvia una scansione per visualizzare i risultati</p>
      </div>
    `;
  }

  private render(): void {
    if (!this.currentResult) { this.renderEmpty(); return; }
    const r = this.currentResult;

    const statusClass = r.status === 'completed' ? 'success' : r.status === 'running' ? 'running' : 'error';

    this.element.innerHTML = `
      <div class="osint-results-header">
        <h3>Risultati: ${this.escapeHtml(r.target.value)}</h3>
        <span class="osint-status-badge ${statusClass}">${r.status}</span>
        <div class="osint-results-actions">
          <button class="osint-export-btn" data-format="json">Export JSON</button>
          <button class="osint-export-btn" data-format="csv">Export CSV</button>
        </div>
      </div>
      <div class="osint-results-modules">
        ${r.modules.map(m => this.renderModule(m)).join('')}
      </div>
    `;

    // Bind export buttons
    this.element.querySelectorAll('.osint-export-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = (btn as HTMLElement).dataset.format as 'json' | 'csv';
        this.exportResults(format);
      });
    });

    // Bind collapsible sections
    this.element.querySelectorAll('.osint-module-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = (header as HTMLElement).nextElementSibling as HTMLElement;
        if (body) {
          body.classList.toggle('collapsed');
          (header as HTMLElement).classList.toggle('collapsed');
        }
      });
    });
  }

  private renderModule(m: { moduleId: string; name: string; status: string; data: Record<string, unknown>; duration: number; error?: string }): string {
    const statusIcon = m.status === 'success' ? '\u2705' : m.status === 'partial' ? '\u26A0\uFE0F' : '\u274C';
    const dataHtml = m.error
      ? `<div class="osint-module-error">${this.escapeHtml(m.error)}</div>`
      : this.renderData(m.data);

    return `
      <div class="osint-module-result">
        <div class="osint-module-header">
          <span class="osint-module-status">${statusIcon}</span>
          <span class="osint-module-title">${this.escapeHtml(m.name)}</span>
          <span class="osint-module-duration">${m.duration}ms</span>
        </div>
        <div class="osint-module-body">
          ${dataHtml}
        </div>
      </div>
    `;
  }

  private renderData(data: Record<string, unknown>, depth = 0): string {
    if (!data || Object.keys(data).length === 0) return '<span class="osint-no-data">Nessun dato</span>';

    const items = Object.entries(data).map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return `<div class="osint-data-row"><span class="osint-data-key">${this.escapeHtml(key)}</span><span class="osint-data-value">[]</span></div>`;
        if (typeof value[0] === 'object') {
          return `<div class="osint-data-row"><span class="osint-data-key">${this.escapeHtml(key)} (${value.length})</span><div class="osint-data-array">${value.map((v, i) => `<div class="osint-data-array-item"><span class="osint-data-index">[${i}]</span> ${typeof v === 'object' ? this.renderData(v as Record<string, unknown>, depth + 1) : this.escapeHtml(String(v))}</div>`).join('')}</div></div>`;
        }
        return `<div class="osint-data-row"><span class="osint-data-key">${this.escapeHtml(key)}</span><span class="osint-data-value">${value.map(v => this.escapeHtml(String(v))).join(', ')}</span></div>`;
      }
      if (value && typeof value === 'object') {
        return `<div class="osint-data-row"><span class="osint-data-key">${this.escapeHtml(key)}</span>${this.renderData(value as Record<string, unknown>, depth + 1)}</div>`;
      }
      return `<div class="osint-data-row"><span class="osint-data-key">${this.escapeHtml(key)}</span><span class="osint-data-value">${this.escapeHtml(String(value ?? ''))}</span></div>`;
    });

    return `<div class="osint-data-table" style="margin-left:${depth * 12}px">${items.join('')}</div>`;
  }

  private async exportResults(format: 'json' | 'csv'): Promise<void> {
    if (!this.currentResult) return;
    try {
      const res = await fetch(`/api/osint/export/${this.currentResult.id}?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint-scan-${this.currentResult.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: export from local data
      const data = format === 'json'
        ? JSON.stringify(this.currentResult, null, 2)
        : this.toCSV();
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osint-scan.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  private toCSV(): string {
    if (!this.currentResult) return '';
    const lines = ['Module,Status,Duration,Key,Value'];
    for (const m of this.currentResult.modules) {
      const flat = this.flattenObj(m.data);
      for (const [k, v] of Object.entries(flat)) {
        lines.push(`"${m.name}","${m.status}",${m.duration},"${k}","${String(v).replace(/"/g, '""')}"`);
      }
    }
    return lines.join('\n');
  }

  private flattenObj(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) result[key] = v.join(', ');
      else if (v && typeof v === 'object') Object.assign(result, this.flattenObj(v as Record<string, unknown>, key));
      else result[key] = String(v ?? '');
    }
    return result;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
