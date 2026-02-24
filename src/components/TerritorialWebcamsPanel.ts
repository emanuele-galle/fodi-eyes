import { Panel } from './Panel';
import { WEBCAMS_ITALIA, type TerritorialWebcam } from '@/config/webcams-italia';
import { escapeHtml } from '@/utils/sanitize';

type TipoFilter = 'all' | TerritorialWebcam['tipo'];

// Domains known to allow iframe embedding
const EMBEDDABLE_DOMAINS = ['skylinewebcams.com', 'webcamitalia.it'];

function isEmbeddable(webcam: TerritorialWebcam): boolean {
  return EMBEDDABLE_DOMAINS.some(d => webcam.url.includes(d));
}

function getRegionList(): string[] {
  const set = new Set<string>();
  for (const w of WEBCAMS_ITALIA) {
    set.add(w.regione);
  }
  return Array.from(set).sort();
}

export class TerritorialWebcamsPanel extends Panel {
  private regionFilter = 'all';
  private provinciaFilter = 'all';
  private tipoFilter: TipoFilter = 'all';
  private activeWebcam: TerritorialWebcam | null = null;
  private onWebcamSelect: ((webcam: TerritorialWebcam) => void) | null = null;
  private modalOverlay: HTMLDivElement | null = null;

  constructor() {
    super({ id: 'webcam-territoriali', title: 'Webcam Territoriali' });
    this.render();
  }

  setWebcamSelectHandler(handler: (webcam: TerritorialWebcam) => void): void {
    this.onWebcamSelect = handler;
  }

  private getFilteredWebcams(): TerritorialWebcam[] {
    return WEBCAMS_ITALIA.filter((w) => {
      if (this.regionFilter !== 'all' && w.regione.toLowerCase() !== this.regionFilter) return false;
      if (this.provinciaFilter !== 'all' && w.provincia !== this.provinciaFilter) return false;
      if (this.tipoFilter !== 'all' && w.tipo !== this.tipoFilter) return false;
      return true;
    });
  }

  private getProvinceList(): string[] {
    const set = new Set<string>();
    for (const w of WEBCAMS_ITALIA) {
      if (this.regionFilter === 'all' || w.regione.toLowerCase() === this.regionFilter) {
        set.add(w.provincia);
      }
    }
    return Array.from(set).sort();
  }

  private getTipoList(): TerritorialWebcam['tipo'][] {
    const set = new Set<TerritorialWebcam['tipo']>();
    for (const w of WEBCAMS_ITALIA) {
      if (this.regionFilter === 'all' || w.regione.toLowerCase() === this.regionFilter) {
        set.add(w.tipo);
      }
    }
    return Array.from(set).sort();
  }

  private openModal(webcam: TerritorialWebcam): void {
    this.closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'tw-modal-overlay';

    const header = document.createElement('div');
    header.className = 'tw-modal-header';

    const title = document.createElement('span');
    title.className = 'tw-modal-title';
    title.textContent = `${webcam.comune} - ${webcam.localita}`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tw-modal-close';
    closeBtn.textContent = 'Chiudi \u2715';
    closeBtn.addEventListener('click', () => this.closeModal());

    header.appendChild(title);
    header.appendChild(closeBtn);
    overlay.appendChild(header);

    if (isEmbeddable(webcam)) {
      const iframe = document.createElement('iframe');
      iframe.className = 'tw-modal-iframe';
      iframe.src = webcam.url;
      iframe.title = `${webcam.comune} - ${webcam.localita}`;
      iframe.allow = 'autoplay; fullscreen';
      iframe.allowFullscreen = true;
      iframe.setAttribute('loading', 'lazy');
      overlay.appendChild(iframe);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'tw-modal-fallback';
      fallback.innerHTML = `
        <p>Questa webcam non supporta l'embedding diretto.</p>
        <a href="${escapeHtml(webcam.url)}" target="_blank" rel="noopener noreferrer">Apri webcam in nuova finestra \u2197</a>
      `;
      overlay.appendChild(fallback);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    document.addEventListener('keydown', this.handleEscKey);
    document.body.appendChild(overlay);
    this.modalOverlay = overlay;
  }

  private handleEscKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.closeModal();
  };

  private closeModal(): void {
    if (this.modalOverlay) {
      document.removeEventListener('keydown', this.handleEscKey);
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
  }

  private renderViewer(webcam: TerritorialWebcam): HTMLDivElement {
    const viewer = document.createElement('div');
    viewer.className = 'tw-viewer';

    const header = document.createElement('div');
    header.className = 'tw-viewer-header';

    const title = document.createElement('span');
    title.className = 'tw-viewer-title';
    title.textContent = `${webcam.comune} - ${webcam.localita}`;

    const expandBtn = document.createElement('button');
    expandBtn.className = 'tw-viewer-btn';
    expandBtn.textContent = 'Espandi';
    expandBtn.title = 'Apri in fullscreen';
    expandBtn.addEventListener('click', () => this.openModal(webcam));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tw-viewer-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.title = 'Chiudi viewer';
    closeBtn.addEventListener('click', () => {
      this.activeWebcam = null;
      this.render();
    });

    header.appendChild(title);
    header.appendChild(expandBtn);
    header.appendChild(closeBtn);
    viewer.appendChild(header);

    if (isEmbeddable(webcam)) {
      const iframe = document.createElement('iframe');
      iframe.className = 'tw-viewer-iframe';
      iframe.src = webcam.url;
      iframe.title = `${webcam.comune} - ${webcam.localita}`;
      iframe.allow = 'autoplay';
      iframe.setAttribute('loading', 'lazy');
      viewer.appendChild(iframe);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'tw-viewer-fallback';
      fallback.innerHTML = `
        <p>Embedding non disponibile per ${escapeHtml(webcam.portale)}</p>
        <a href="${escapeHtml(webcam.url)}" target="_blank" rel="noopener noreferrer">Apri webcam esterna \u2197</a>
      `;
      viewer.appendChild(fallback);
    }

    return viewer;
  }

  private render(): void {
    const filtered = this.getFilteredWebcams();
    const province = this.getProvinceList();
    const tipi = this.getTipoList();
    const regions = getRegionList();

    this.content.innerHTML = '';
    this.content.className = 'panel-content territorial-webcams-content';

    // Active webcam viewer (inline iframe)
    if (this.activeWebcam) {
      this.content.appendChild(this.renderViewer(this.activeWebcam));
    }

    // Filters toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'tw-toolbar';

    // Region filter
    const regionSelect = document.createElement('select');
    regionSelect.className = 'tw-filter-select';
    regionSelect.title = 'Filtra per regione';

    const regionAllOpt = document.createElement('option');
    regionAllOpt.value = 'all';
    regionAllOpt.textContent = 'Tutte le regioni';
    regionSelect.appendChild(regionAllOpt);

    for (const region of regions) {
      const opt = document.createElement('option');
      opt.value = region.toLowerCase();
      opt.textContent = region;
      if (region.toLowerCase() === this.regionFilter) opt.selected = true;
      regionSelect.appendChild(opt);
    }

    regionSelect.addEventListener('change', () => {
      this.regionFilter = regionSelect.value;
      this.provinciaFilter = 'all';
      this.tipoFilter = 'all';
      this.render();
    });

    // Provincia filter
    const provSelect = document.createElement('select');
    provSelect.className = 'tw-filter-select';
    provSelect.title = 'Filtra per provincia';

    const provAllOpt = document.createElement('option');
    provAllOpt.value = 'all';
    provAllOpt.textContent = 'Province';
    provSelect.appendChild(provAllOpt);

    for (const prov of province) {
      const opt = document.createElement('option');
      opt.value = prov;
      opt.textContent = prov;
      if (prov === this.provinciaFilter) opt.selected = true;
      provSelect.appendChild(opt);
    }

    provSelect.addEventListener('change', () => {
      this.provinciaFilter = provSelect.value;
      this.render();
    });

    // Tipo filter
    const tipoSelect = document.createElement('select');
    tipoSelect.className = 'tw-filter-select';
    tipoSelect.title = 'Filtra per tipo';

    const tipoAllOpt = document.createElement('option');
    tipoAllOpt.value = 'all';
    tipoAllOpt.textContent = 'Tipi';
    tipoSelect.appendChild(tipoAllOpt);

    for (const tipo of tipi) {
      const opt = document.createElement('option');
      opt.value = tipo;
      opt.textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      if (tipo === this.tipoFilter) opt.selected = true;
      tipoSelect.appendChild(opt);
    }

    tipoSelect.addEventListener('change', () => {
      this.tipoFilter = tipoSelect.value as TipoFilter;
      this.render();
    });

    // Count badge
    const countBadge = document.createElement('span');
    countBadge.className = 'tw-count';
    countBadge.textContent = `${filtered.length}`;

    toolbar.appendChild(regionSelect);
    toolbar.appendChild(provSelect);
    toolbar.appendChild(tipoSelect);
    toolbar.appendChild(countBadge);
    this.content.appendChild(toolbar);

    // Webcam list
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tw-empty';
      empty.textContent = 'Nessuna webcam trovata con i filtri selezionati';
      this.content.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'tw-list';

    for (const webcam of filtered) {
      const row = document.createElement('div');
      row.className = `tw-row${this.activeWebcam?.id === webcam.id ? ' active' : ''}`;

      const info = document.createElement('div');
      info.className = 'tw-row-info';

      const name = document.createElement('span');
      name.className = 'tw-row-name';
      name.textContent = escapeHtml(`${webcam.comune} - ${webcam.localita}`);

      const meta = document.createElement('span');
      meta.className = 'tw-row-meta';
      meta.textContent = escapeHtml(`${webcam.provincia} · ${webcam.regione}`);

      info.appendChild(name);
      info.appendChild(meta);

      const badges = document.createElement('div');
      badges.className = 'tw-row-badges';

      const tipoBadge = document.createElement('span');
      tipoBadge.className = 'tw-badge tw-badge-tipo';
      tipoBadge.textContent = webcam.tipo;
      badges.appendChild(tipoBadge);

      const statusBadge = document.createElement('span');
      statusBadge.className = `tw-badge ${webcam.attiva ? 'tw-badge-online' : 'tw-badge-offline'}`;
      statusBadge.textContent = webcam.attiva ? 'LIVE' : 'OFF';
      badges.appendChild(statusBadge);

      row.appendChild(info);
      row.appendChild(badges);

      row.addEventListener('click', () => {
        this.activeWebcam = webcam;
        this.render();
        if (this.onWebcamSelect) {
          this.onWebcamSelect(webcam);
        }
      });

      list.appendChild(row);
    }

    this.content.appendChild(list);
  }

  setRegionFilter(region: string): void {
    this.regionFilter = region.toLowerCase();
    this.provinciaFilter = 'all';
    this.tipoFilter = 'all';
    this.activeWebcam = null;
    this.render();
  }

  getActiveWebcam(): TerritorialWebcam | null {
    return this.activeWebcam;
  }

  refresh(): void {
    this.render();
  }

  destroy(): void {
    this.closeModal();
    this.onWebcamSelect = null;
    super.destroy();
  }
}
