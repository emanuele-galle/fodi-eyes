import { Panel } from './Panel';
import { fetchAllPoliticsData, type PollData, type PoliticsItem } from '@/services/politics-italy';
import { escapeHtml } from '@/utils/sanitize';

type TabId = 'sondaggi' | 'parlamento' | 'news';

export class PoliticsItalyPanel extends Panel {
  private activeTab: TabId = 'sondaggi';
  private polls: PollData[] = [];
  private parlamento: PoliticsItem[] = [];
  private news: PoliticsItem[] = [];
  private lastUpdate: Date | null = null;
  private loading = false;

  constructor() {
    super({ id: 'politics-italy', title: '🏛️ Politica Italia' });
  }

  public async fetchData(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.showLoading('Caricamento dati politici...');

    try {
      const data = await fetchAllPoliticsData();
      this.polls = data.polls;
      this.parlamento = data.parlamento;
      this.news = data.news;
      this.lastUpdate = new Date();
      this.render();
    } catch {
      this.showError('Errore caricamento dati politici');
    } finally {
      this.loading = false;
    }
  }

  private render(): void {
    const tabsHtml = `
      <div class="politics-it-tabs">
        <button class="politics-it-tab ${this.activeTab === 'sondaggi' ? 'active' : ''}" data-tab="sondaggi">
          📊 Sondaggi
        </button>
        <button class="politics-it-tab ${this.activeTab === 'parlamento' ? 'active' : ''}" data-tab="parlamento">
          🏛️ Parlamento (${this.parlamento.length})
        </button>
        <button class="politics-it-tab ${this.activeTab === 'news' ? 'active' : ''}" data-tab="news">
          📰 News (${this.news.length})
        </button>
      </div>
    `;

    let contentHtml = '';
    switch (this.activeTab) {
      case 'sondaggi':
        contentHtml = this.renderSondaggi();
        break;
      case 'parlamento':
        contentHtml = this.renderParlamento();
        break;
      case 'news':
        contentHtml = this.renderNews();
        break;
    }

    const updateTime = this.lastUpdate
      ? this.lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    this.setContent(`
      ${tabsHtml}
      <div class="politics-it-content">
        ${contentHtml}
      </div>
      <div class="politics-it-footer">
        <span class="politics-it-source">
          ${this.getSourceLabel()} • ${updateTime}
        </span>
      </div>
    `);

    this.content.querySelectorAll('.politics-it-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = (e.currentTarget as HTMLElement).dataset.tab as TabId;
        if (tabId) {
          this.activeTab = tabId;
          this.render();
        }
      });
    });
  }

  private getSourceLabel(): string {
    switch (this.activeTab) {
      case 'sondaggi': return 'YouTrend / SWG';
      case 'parlamento': return 'Camera & Senato RSS';
      case 'news': return 'ANSA Politica';
    }
  }

  private renderSondaggi(): string {
    if (this.polls.length === 0) {
      return '<div class="politics-it-empty">Nessun sondaggio disponibile</div>';
    }

    const maxPct = Math.max(...this.polls.map(p => p.percentage));

    return `
      <div class="polls-container">
        <div class="polls-header">
          <span class="polls-title">Intenzioni di voto</span>
          <span class="polls-source">Media sondaggi</span>
        </div>
        <div class="polls-bars">
          ${this.polls.map(p => {
            const trendIcon = p.trend === 'up' ? '▲' : p.trend === 'down' ? '▼' : '–';
            const trendClass = p.trend === 'up' ? 'trend-up' : p.trend === 'down' ? 'trend-down' : 'trend-stable';
            const barWidth = maxPct > 0 ? (p.percentage / maxPct) * 100 : 0;
            return `
              <div class="poll-row">
                <span class="poll-party">${escapeHtml(p.party)}</span>
                <div class="poll-bar-container">
                  <div class="poll-bar" style="width: ${barWidth}%; background: ${escapeHtml(p.color)}"></div>
                </div>
                <span class="poll-pct">${p.percentage}%</span>
                <span class="poll-trend ${escapeHtml(trendClass)}">${trendIcon}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderParlamento(): string {
    if (this.parlamento.length === 0) {
      return '<div class="politics-it-empty">Nessuna notizia parlamentare</div>';
    }

    return `
      <div class="parlamento-list">
        ${this.parlamento.slice(0, 15).map(item => `
          <a class="parlamento-item" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
            <div class="parlamento-source">${escapeHtml(item.source)}</div>
            <div class="parlamento-title">${escapeHtml(item.title)}</div>
            ${item.pubDate ? `<div class="parlamento-date">${this.formatDate(item.pubDate)}</div>` : ''}
          </a>
        `).join('')}
      </div>
    `;
  }

  private renderNews(): string {
    if (this.news.length === 0) {
      return '<div class="politics-it-empty">Nessuna notizia politica</div>';
    }

    return `
      <div class="parlamento-list">
        ${this.news.slice(0, 15).map(item => `
          <a class="parlamento-item" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
            <div class="parlamento-source">${escapeHtml(item.source)}</div>
            <div class="parlamento-title">${escapeHtml(item.title)}</div>
            ${item.pubDate ? `<div class="parlamento-date">${this.formatDate(item.pubDate)}</div>` : ''}
          </a>
        `).join('')}
      </div>
    `;
  }

  private formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      if (diffH < 1) return 'Adesso';
      if (diffH < 24) return `${diffH}h fa`;
      const diffD = Math.floor(diffH / 24);
      if (diffD === 1) return 'Ieri';
      if (diffD < 7) return `${diffD}g fa`;
      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }
}
