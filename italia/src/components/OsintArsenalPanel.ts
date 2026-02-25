import { Panel } from './Panel';
import { OSINT_TOOLS, OSINT_CATEGORIES, type OsintCategory, type OsintTool } from '@/config/osint-tools';
import { escapeHtml } from '@/utils/sanitize';

export class OsintArsenalPanel extends Panel {
  private searchQuery = '';
  private activeCategory: OsintCategory | 'all' = 'all';
  private filteredTools: OsintTool[] = OSINT_TOOLS;

  constructor() {
    super({ id: 'osint-arsenal', title: 'OSINT Arsenal' });
    this.render();
  }

  private filterTools(): void {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredTools = OSINT_TOOLS.filter(tool => {
      const matchesCategory = this.activeCategory === 'all' || tool.category === this.activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  }

  private render(): void {
    this.filterTools();

    const categories = Object.entries(OSINT_CATEGORIES);
    const categoryCount = (cat: OsintCategory) =>
      OSINT_TOOLS.filter(t => t.category === cat).length;

    const categoriesHtml = `
      <div class="osint-categories">
        <button class="osint-cat-btn ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">
          🔎 Tutti (${OSINT_TOOLS.length})
        </button>
        ${categories.map(([key, { label, icon }]) => `
          <button class="osint-cat-btn ${this.activeCategory === key ? 'active' : ''}" data-cat="${escapeHtml(key)}">
            ${icon} ${escapeHtml(label)} (${categoryCount(key as OsintCategory)})
          </button>
        `).join('')}
      </div>
    `;

    const toolsHtml = this.filteredTools.length > 0
      ? `<div class="osint-tools-grid">
          ${this.filteredTools.map(tool => `
            <a class="osint-tool-card" href="${escapeHtml(tool.url)}" target="_blank" rel="noopener noreferrer">
              <div class="osint-tool-header">
                <span class="osint-tool-name">${escapeHtml(tool.name)}</span>
                ${tool.italyRelevant ? '<span class="osint-italy-badge">🇮🇹</span>' : ''}
              </div>
              <div class="osint-tool-desc">${escapeHtml(tool.description)}</div>
              <div class="osint-tool-tags">
                ${tool.tags.slice(0, 3).map(tag => `<span class="osint-tag">${escapeHtml(tag)}</span>`).join('')}
              </div>
            </a>
          `).join('')}
        </div>`
      : `<div class="osint-empty">Nessun tool trovato per "${escapeHtml(this.searchQuery)}"</div>`;

    this.setContent(`
      <div class="osint-arsenal">
        <div class="osint-search">
          <input type="text" class="osint-search-input" placeholder="Cerca tool OSINT..." value="${escapeHtml(this.searchQuery)}" />
          <span class="osint-result-count">${this.filteredTools.length} tool</span>
        </div>
        ${categoriesHtml}
        ${toolsHtml}
      </div>
    `);

    this.bindEvents();
  }

  private bindEvents(): void {
    const searchInput = this.content.querySelector('.osint-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.render();
        // Re-focus input after render
        const newInput = this.content.querySelector('.osint-search-input') as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
      });
    }

    this.content.querySelectorAll('.osint-cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).dataset.cat as OsintCategory | 'all';
        this.activeCategory = cat;
        this.render();
      });
    });
  }
}
