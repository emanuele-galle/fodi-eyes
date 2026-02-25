import { Panel } from './Panel';
import { searchDatasets, POPULAR_DATASETS, type CKANResult } from '@/services/ckan-italia';
import { escapeHtml } from '@/utils/sanitize';

export class OpenDataPanel extends Panel {
  private searchQuery = '';
  private results: CKANResult[] = [];
  private totalCount = 0;
  private loading = false;

  constructor() {
    super({ id: 'open-data', title: 'Open Data Italia' });
    this.renderInitial();
  }

  private renderInitial(): void {
    this.setContent(`
      <div class="opendata-panel">
        <div class="opendata-search">
          <input type="text" class="opendata-search-input" placeholder="Cerca dataset su dati.gov.it..." value="" />
          <button class="opendata-search-btn">Cerca</button>
        </div>
        <div class="opendata-popular">
          <div class="opendata-popular-title">Dataset Popolari</div>
          <div class="opendata-popular-grid">
            ${POPULAR_DATASETS.map(d => `
              <button class="opendata-popular-btn" data-query="${escapeHtml(d.query)}">
                <span class="opendata-popular-icon">${d.icon}</span>
                <span class="opendata-popular-label">${escapeHtml(d.label)}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="opendata-footer">
          Fonte: <a href="https://dati.gov.it" target="_blank" rel="noopener">dati.gov.it</a> — Portale Open Data PA
        </div>
      </div>
    `);
    this.bindEvents();
  }

  private async doSearch(query: string): Promise<void> {
    if (this.loading || !query.trim()) return;
    this.loading = true;
    this.searchQuery = query;
    this.renderLoading();

    try {
      const response = await searchDatasets(query, 15);
      this.results = response.results;
      this.totalCount = response.count;
    } catch {
      this.results = [];
      this.totalCount = 0;
    } finally {
      this.loading = false;
    }
    this.renderResults();
  }

  private renderLoading(): void {
    this.setContent(`
      <div class="opendata-panel">
        <div class="opendata-search">
          <input type="text" class="opendata-search-input" placeholder="Cerca dataset su dati.gov.it..." value="${escapeHtml(this.searchQuery)}" />
          <button class="opendata-search-btn" disabled>...</button>
        </div>
        <div class="opendata-loading">Ricerca in corso...</div>
      </div>
    `);
  }

  private renderResults(): void {
    const resultsHtml = this.results.length > 0
      ? `<div class="opendata-results-header">${this.totalCount} dataset trovati</div>
         <div class="opendata-results">
          ${this.results.map(r => `
            <div class="opendata-result-card">
              <div class="opendata-result-title">${escapeHtml(r.title)}</div>
              <div class="opendata-result-org">${escapeHtml(r.organization)}</div>
              ${r.notes ? `<div class="opendata-result-desc">${escapeHtml(r.notes.slice(0, 150))}${r.notes.length > 150 ? '...' : ''}</div>` : ''}
              <div class="opendata-result-resources">
                ${r.resources.map(res => `
                  <a class="opendata-resource-btn" href="${escapeHtml(res.url)}" target="_blank" rel="noopener">
                    ${escapeHtml(res.format || 'Download')}
                  </a>
                `).join('')}
              </div>
              ${r.tags.length > 0 ? `
                <div class="opendata-result-tags">
                  ${r.tags.slice(0, 4).map(t => `<span class="opendata-tag">${escapeHtml(t)}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>`
      : `<div class="opendata-empty">Nessun dataset trovato per "${escapeHtml(this.searchQuery)}"</div>`;

    this.setContent(`
      <div class="opendata-panel">
        <div class="opendata-search">
          <input type="text" class="opendata-search-input" placeholder="Cerca dataset su dati.gov.it..." value="${escapeHtml(this.searchQuery)}" />
          <button class="opendata-search-btn">Cerca</button>
        </div>
        ${resultsHtml}
        <div class="opendata-footer">
          Fonte: <a href="https://dati.gov.it" target="_blank" rel="noopener">dati.gov.it</a> — Portale Open Data PA
        </div>
      </div>
    `);
    this.bindEvents();
  }

  private bindEvents(): void {
    const searchInput = this.content.querySelector('.opendata-search-input') as HTMLInputElement;
    const searchBtn = this.content.querySelector('.opendata-search-btn');

    if (searchInput && searchBtn) {
      searchBtn.addEventListener('click', () => {
        void this.doSearch(searchInput.value);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          void this.doSearch(searchInput.value);
        }
      });
    }

    this.content.querySelectorAll('.opendata-popular-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const query = (e.currentTarget as HTMLElement).dataset.query;
        if (query) {
          if (searchInput) searchInput.value = query;
          void this.doSearch(query);
        }
      });
    });
  }
}
