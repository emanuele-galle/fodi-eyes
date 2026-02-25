import { Panel } from './Panel';
import { ENTITIES, ENTITY_TYPES, getEntitiesByType, type EntityType, type ItalianEntity } from '@/config/entities-italy';
import { escapeHtml } from '@/utils/sanitize';

export class EntitySearchPanel extends Panel {
  private searchQuery = '';
  private activeFilter: EntityType | 'all' = 'all';
  private filteredEntities: ItalianEntity[] = ENTITIES;
  private expandedEntity: string | null = null;

  constructor() {
    super({ id: 'entity-search', title: 'Entità Investigate' });
    this.render();
  }

  private filterEntities(): void {
    let entities = this.activeFilter === 'all'
      ? ENTITIES
      : getEntitiesByType(this.activeFilter);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      entities = entities.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.keywords.some(k => k.includes(q)) ||
        (e.party && e.party.toLowerCase().includes(q)) ||
        (e.sector && e.sector.toLowerCase().includes(q))
      );
    }

    this.filteredEntities = entities;
  }

  private render(): void {
    this.filterEntities();

    const filterBtns = `
      <div class="entity-filters">
        <button class="entity-filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">
          Tutti (${ENTITIES.length})
        </button>
        ${Object.entries(ENTITY_TYPES).map(([key, { label, icon }]) => `
          <button class="entity-filter-btn ${this.activeFilter === key ? 'active' : ''}" data-filter="${escapeHtml(key)}">
            ${icon} ${escapeHtml(label)} (${getEntitiesByType(key as EntityType).length})
          </button>
        `).join('')}
      </div>
    `;

    const entitiesHtml = this.filteredEntities.length > 0
      ? `<div class="entity-list">
          ${this.filteredEntities.map(e => this.renderEntityCard(e)).join('')}
        </div>`
      : `<div class="entity-empty">Nessuna entità trovata per "${escapeHtml(this.searchQuery)}"</div>`;

    this.setContent(`
      <div class="entity-search-panel">
        <div class="entity-search">
          <input type="text" class="entity-search-input" placeholder="Cerca entità (nome, ruolo, partito, settore)..." value="${escapeHtml(this.searchQuery)}" />
          <span class="entity-result-count">${this.filteredEntities.length} entità</span>
        </div>
        ${filterBtns}
        ${entitiesHtml}
      </div>
    `);

    this.bindEvents();
  }

  private renderEntityCard(entity: ItalianEntity): string {
    const isExpanded = this.expandedEntity === entity.id;
    const typeInfo = ENTITY_TYPES[entity.type];

    return `
      <div class="entity-card ${isExpanded ? 'expanded' : ''}" data-entity-id="${escapeHtml(entity.id)}">
        <div class="entity-card-header">
          <div class="entity-card-main">
            <span class="entity-type-icon">${typeInfo.icon}</span>
            <div class="entity-card-info">
              <span class="entity-name">${escapeHtml(entity.name)}</span>
              <span class="entity-role">${escapeHtml(entity.role)}</span>
            </div>
          </div>
          <div class="entity-card-badges">
            ${entity.party ? `<span class="entity-badge party">${escapeHtml(entity.party)}</span>` : ''}
            ${entity.sector ? `<span class="entity-badge sector">${escapeHtml(entity.sector)}</span>` : ''}
          </div>
        </div>
        ${isExpanded ? `
          <div class="entity-card-details">
            <div class="entity-desc">${escapeHtml(entity.description)}</div>
            <div class="entity-keywords">
              ${entity.keywords.map(k => `<span class="entity-keyword">${escapeHtml(k)}</span>`).join('')}
            </div>
            ${entity.links.length > 0 ? `
              <div class="entity-links">
                ${entity.links.map(l => `
                  <a class="entity-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>
                `).join('')}
              </div>
            ` : ''}
            <div class="entity-actions">
              <a class="entity-action-btn" href="https://news.google.com/search?q=${encodeURIComponent(entity.name)}&hl=it&gl=IT" target="_blank" rel="noopener">
                Ultime News
              </a>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private bindEvents(): void {
    const searchInput = this.content.querySelector('.entity-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.render();
        const newInput = this.content.querySelector('.entity-search-input') as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
      });
    }

    this.content.querySelectorAll('.entity-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).dataset.filter as EntityType | 'all';
        this.activeFilter = filter;
        this.render();
      });
    });

    this.content.querySelectorAll('.entity-card').forEach(card => {
      const header = card.querySelector('.entity-card-header');
      if (header) {
        header.addEventListener('click', () => {
          const entityId = (card as HTMLElement).dataset.entityId;
          if (entityId) {
            this.expandedEntity = this.expandedEntity === entityId ? null : entityId;
            this.render();
          }
        });
      }
    });
  }
}
