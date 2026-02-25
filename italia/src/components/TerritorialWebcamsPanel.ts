import { Panel } from './Panel';
import { WEBCAMS_ITALIA, type TerritorialWebcam } from '@/config/webcams-italia';
import { escapeHtml } from '@/utils/sanitize';

type TipoFilter = 'all' | TerritorialWebcam['tipo'];

/** Dynamic webcams fetched from API (Open Data Hub) */
let dynamicWebcams: TerritorialWebcam[] = [];
let dynamicFetched = false;

async function fetchDynamicWebcams(): Promise<void> {
  if (dynamicFetched) return;
  dynamicFetched = true;
  try {
    const res = await fetch('/api/webcams/dynamic');
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    // Deduplicate: skip if within ~500m of an existing static webcam
    const existing = new Set(WEBCAMS_ITALIA.map(w => `${w.lat.toFixed(2)},${w.lon.toFixed(2)}`));
    dynamicWebcams = data.filter((w: TerritorialWebcam) => {
      const key = `${w.lat.toFixed(2)},${w.lon.toFixed(2)}`;
      return !existing.has(key);
    });
  } catch {
    // Silently fail — dynamic webcams are optional
  }
}

function getAllWebcams(): TerritorialWebcam[] {
  return [...WEBCAMS_ITALIA, ...dynamicWebcams];
}

// Portals with HLS stream extraction (play video directly via hls.js player)
const HLS_PORTALS = ['skylinewebcams.com'];

// YouTube portals: embed directly via youtube-nocookie.com
const YOUTUBE_PORTALS = ['youtube.com', 'youtu.be'];

// Other portals that need frame-proxy to bypass X-Frame-Options
const FRAME_PROXY_DOMAINS = ['meteowebcam.it', 'serravalle.it', 'airportwebcams.net'];

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] ?? null : null;
}

function getIframeSrc(webcam: TerritorialWebcam): string {
  // SkylineWebcams: use HLS player for direct video stream
  if (HLS_PORTALS.some(d => webcam.url.includes(d))) {
    const title = `${webcam.comune} - ${webcam.localita}`;
    return `/api/webcam-player?url=${encodeURIComponent(webcam.url)}&title=${encodeURIComponent(title)}`;
  }
  // YouTube: embed directly via privacy-enhanced mode
  if (YOUTUBE_PORTALS.some(d => webcam.url.includes(d))) {
    const videoId = extractYouTubeVideoId(webcam.url);
    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0`;
    }
  }
  // Other portals: use frame-proxy
  if (FRAME_PROXY_DOMAINS.some(d => webcam.url.includes(d))) {
    return `/api/frame-proxy?url=${encodeURIComponent(webcam.url)}`;
  }
  return webcam.url;
}

function getRegionList(): string[] {
  const set = new Set<string>();
  for (const w of getAllWebcams()) {
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
  private onDynamicLoaded: ((webcams: TerritorialWebcam[]) => void) | null = null;
  private modalOverlay: HTMLDivElement | null = null;
  /** Webcam IDs that failed to load at runtime */
  private runtimeOffline = new Set<string>();

  constructor() {
    super({ id: 'webcam-territoriali', title: 'Webcam Territoriali' });
    this.render();
    // Fetch dynamic webcams (Open Data Hub) and re-render when ready
    fetchDynamicWebcams().then(() => {
      if (dynamicWebcams.length > 0) {
        this.render();
        this.onDynamicLoaded?.(dynamicWebcams);
      }
    });
  }

  setOnDynamicWebcamsLoaded(handler: (webcams: TerritorialWebcam[]) => void): void {
    this.onDynamicLoaded = handler;
    // If already loaded, fire immediately
    if (dynamicWebcams.length > 0) handler(dynamicWebcams);
  }

  setWebcamSelectHandler(handler: (webcam: TerritorialWebcam) => void): void {
    this.onWebcamSelect = handler;
  }

  private getFilteredWebcams(): TerritorialWebcam[] {
    return getAllWebcams().filter((w) => {
      if (this.regionFilter !== 'all' && w.regione.toLowerCase() !== this.regionFilter) return false;
      if (this.provinciaFilter !== 'all' && w.provincia !== this.provinciaFilter) return false;
      if (this.tipoFilter !== 'all' && w.tipo !== this.tipoFilter) return false;
      return true;
    });
  }

  private getProvinceList(): string[] {
    const set = new Set<string>();
    for (const w of getAllWebcams()) {
      if (this.regionFilter === 'all' || w.regione.toLowerCase() === this.regionFilter) {
        set.add(w.provincia);
      }
    }
    return Array.from(set).sort();
  }

  private getTipoList(): TerritorialWebcam['tipo'][] {
    const set = new Set<TerritorialWebcam['tipo']>();
    for (const w of getAllWebcams()) {
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

    const iframe = document.createElement('iframe');
    iframe.className = 'tw-modal-iframe';
    iframe.src = getIframeSrc(webcam);
    iframe.title = `${webcam.comune} - ${webcam.localita}`;
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.setAttribute('loading', 'lazy');

    // Error handling for modal iframe
    iframe.addEventListener('error', () => {
      this.runtimeOffline.add(webcam.id);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'tw-viewer-error tw-modal-error';
      errorDiv.innerHTML = `
        <div class="tw-viewer-error-icon">&#x26A0;</div>
        <div class="tw-viewer-error-text">Webcam non disponibile</div>
        <div class="tw-viewer-error-sub">${escapeHtml(webcam.comune)} - ${escapeHtml(webcam.localita)}</div>
      `;
      iframe.replaceWith(errorDiv);
    });

    overlay.appendChild(iframe);

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

    const iframe = document.createElement('iframe');
    iframe.className = 'tw-viewer-iframe';
    iframe.src = getIframeSrc(webcam);
    iframe.title = `${webcam.comune} - ${webcam.localita}`;
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.setAttribute('loading', 'lazy');

    // Error handling: if the webcam stream fails, show unavailable state
    iframe.addEventListener('error', () => {
      this.markWebcamOffline(webcam, viewer);
    });

    // Timeout fallback: if iframe doesn't load within 15s, mark as unavailable
    const loadTimeout = setTimeout(() => {
      if (!iframe.contentWindow) {
        this.markWebcamOffline(webcam, viewer);
      }
    }, 15_000);
    iframe.addEventListener('load', () => clearTimeout(loadTimeout));

    viewer.appendChild(iframe);

    return viewer;
  }

  private markWebcamOffline(webcam: TerritorialWebcam, viewer: HTMLDivElement): void {
    this.runtimeOffline.add(webcam.id);
    // Replace iframe with an error message inside the viewer
    const iframe = viewer.querySelector('.tw-viewer-iframe');
    if (iframe) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'tw-viewer-error';
      errorDiv.innerHTML = `
        <div class="tw-viewer-error-icon">&#x26A0;</div>
        <div class="tw-viewer-error-text">Webcam non disponibile</div>
        <div class="tw-viewer-error-sub">${escapeHtml(webcam.comune)} - ${escapeHtml(webcam.localita)}</div>
      `;
      iframe.replaceWith(errorDiv);
    }
    // Re-render the list to update the badge for this webcam
    this.render();
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
      const isOffline = !webcam.attiva || this.runtimeOffline.has(webcam.id);
      const row = document.createElement('div');
      row.className = `tw-row${this.activeWebcam?.id === webcam.id ? ' active' : ''}${isOffline ? ' tw-row-offline' : ''}`;

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

      if (webcam.source === 'api') {
        const apiBadge = document.createElement('span');
        apiBadge.className = 'tw-badge tw-badge-api';
        apiBadge.textContent = 'API';
        badges.appendChild(apiBadge);
      }

      const statusBadge = document.createElement('span');
      if (this.runtimeOffline.has(webcam.id)) {
        statusBadge.className = 'tw-badge tw-badge-offline';
        statusBadge.textContent = 'ERRORE';
      } else {
        statusBadge.className = `tw-badge ${webcam.attiva ? 'tw-badge-online' : 'tw-badge-offline'}`;
        statusBadge.textContent = webcam.attiva ? 'LIVE' : 'OFF';
      }
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

  selectWebcam(webcam: TerritorialWebcam): void {
    this.activeWebcam = webcam;
    // Auto-set region filter to match
    this.regionFilter = webcam.regione.toLowerCase();
    this.provinciaFilter = 'all';
    this.tipoFilter = 'all';
    this.render();
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
