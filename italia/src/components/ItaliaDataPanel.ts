import { Panel } from './Panel';
import { fetchIstatEconomia, fetchIstatDemografia, getPnrrData, type IstatIndicator, type PnrrIndicator } from '@/services/istat';
import { escapeHtml } from '@/utils/sanitize';

type TabId = 'economia' | 'demografia' | 'pnrr';

export class ItaliaDataPanel extends Panel {
  private activeTab: TabId = 'economia';
  private economiaData: IstatIndicator[] = [];
  private demografiaData: IstatIndicator[] = [];
  private pnrrData: PnrrIndicator[] = [];
  private lastUpdate: Date | null = null;
  private loading = false;

  constructor() {
    super({ id: 'italia-data', title: '🇮🇹 Dati Italia' });
  }

  public async fetchData(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.showLoading('Caricamento dati ISTAT...');

    try {
      const [economia, demografia] = await Promise.allSettled([
        fetchIstatEconomia(),
        fetchIstatDemografia(),
      ]);

      if (economia.status === 'fulfilled') this.economiaData = economia.value;
      if (demografia.status === 'fulfilled') this.demografiaData = demografia.value;
      this.pnrrData = getPnrrData();
      this.lastUpdate = new Date();
      this.render();
    } catch {
      this.showError('Errore caricamento dati ISTAT');
    } finally {
      this.loading = false;
    }
  }

  private render(): void {
    const tabsHtml = `
      <div class="italia-data-tabs">
        <button class="italia-tab ${this.activeTab === 'economia' ? 'active' : ''}" data-tab="economia">
          📊 Economia
        </button>
        <button class="italia-tab ${this.activeTab === 'demografia' ? 'active' : ''}" data-tab="demografia">
          👥 Demografia
        </button>
        <button class="italia-tab ${this.activeTab === 'pnrr' ? 'active' : ''}" data-tab="pnrr">
          🏗️ PNRR
        </button>
      </div>
    `;

    let contentHtml = '';
    switch (this.activeTab) {
      case 'economia':
        contentHtml = this.renderEconomia();
        break;
      case 'demografia':
        contentHtml = this.renderDemografia();
        break;
      case 'pnrr':
        contentHtml = this.renderPnrr();
        break;
    }

    const updateTime = this.lastUpdate
      ? this.lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
      : '';

    this.setContent(`
      ${tabsHtml}
      <div class="italia-data-content">
        ${contentHtml}
      </div>
      <div class="italia-data-footer">
        <span class="italia-data-source">
          ${this.activeTab === 'pnrr' ? 'Italia Domani' : 'ISTAT'} • ${updateTime}
        </span>
      </div>
    `);

    this.content.querySelectorAll('.italia-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = (e.currentTarget as HTMLElement).dataset.tab as TabId;
        if (tabId) {
          this.activeTab = tabId;
          this.render();
        }
      });
    });
  }

  private renderEconomia(): string {
    if (this.economiaData.length === 0) {
      return '<div class="italia-data-empty">Dati economici non disponibili</div>';
    }

    return `
      <div class="italia-indicators">
        ${this.economiaData.map(ind => `
          <div class="italia-indicator">
            <div class="italia-ind-header">
              <span class="italia-ind-name">${escapeHtml(ind.name)}</span>
            </div>
            <div class="italia-ind-value">
              <span class="value">${ind.value !== null ? escapeHtml(String(ind.value)) : 'N/D'}</span>
              <span class="unit">${escapeHtml(ind.unit)}</span>
            </div>
            <div class="italia-ind-period">${escapeHtml(ind.period)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderDemografia(): string {
    if (this.demografiaData.length === 0) {
      return '<div class="italia-data-empty">Dati demografici non disponibili</div>';
    }

    return `
      <div class="italia-indicators">
        ${this.demografiaData.map(ind => `
          <div class="italia-indicator">
            <div class="italia-ind-header">
              <span class="italia-ind-name">${escapeHtml(ind.name)}</span>
            </div>
            <div class="italia-ind-value">
              <span class="value">${ind.value !== null ? escapeHtml(Number(ind.value).toLocaleString('it-IT')) : 'N/D'}</span>
            </div>
            <div class="italia-ind-period">${escapeHtml(ind.period)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderPnrr(): string {
    if (this.pnrrData.length === 0) {
      return '<div class="italia-data-empty">Dati PNRR non disponibili</div>';
    }

    const totalAllocated = this.pnrrData.reduce((s, p) => s + p.allocated, 0);
    const totalSpent = this.pnrrData.reduce((s, p) => s + p.spent, 0);
    const totalPct = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0';

    return `
      <div class="pnrr-summary">
        <div class="pnrr-total">
          <span class="pnrr-total-label">Totale PNRR</span>
          <span class="pnrr-total-value">${totalSpent.toFixed(1)} / ${totalAllocated.toFixed(1)} Mld €</span>
          <span class="pnrr-total-pct">${totalPct}% speso</span>
        </div>
      </div>
      <div class="pnrr-pillars">
        ${this.pnrrData.map(p => `
          <div class="pnrr-pillar">
            <div class="pnrr-pillar-header">
              <span class="pnrr-pillar-name">${escapeHtml(p.pillar)}</span>
              <span class="pnrr-pillar-amount">${p.spent.toFixed(1)} / ${p.allocated.toFixed(1)} Mld €</span>
            </div>
            <div class="pnrr-progress-bar">
              <div class="pnrr-progress-fill" style="width: ${Math.min(p.percentage, 100)}%"></div>
            </div>
            <div class="pnrr-pillar-pct">${p.percentage.toFixed(1)}%</div>
          </div>
        `).join('')}
      </div>
    `;
  }
}
