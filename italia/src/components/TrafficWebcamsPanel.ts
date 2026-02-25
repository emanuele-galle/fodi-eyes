import { Panel } from './Panel';
import { TRAFFIC_WEBCAMS, getHighways, type TrafficWebcam } from '@/config/traffic-webcams';
import { escapeHtml } from '@/utils/sanitize';

export class TrafficWebcamsPanel extends Panel {
  private highwayFilter = 'all';
  private activeWebcam: TrafficWebcam | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private onWebcamSelect: ((lat: number, lon: number) => void) | null = null;

  constructor() {
    super({ id: 'traffic-webcams', title: 'Traffico Autostrade' });
    this.render();
  }

  setWebcamSelectHandler(handler: (lat: number, lon: number) => void): void {
    this.onWebcamSelect = handler;
  }

  private getFiltered(): TrafficWebcam[] {
    if (this.highwayFilter === 'all') return TRAFFIC_WEBCAMS;
    return TRAFFIC_WEBCAMS.filter(w => w.autostrada === this.highwayFilter);
  }

  private startAutoRefresh(webcam: TrafficWebcam): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      const img = this.content.querySelector('.trf-snapshot') as HTMLImageElement;
      if (img) {
        // Cache-bust to force reload
        img.src = `${webcam.snapshotUrl}?_t=${Date.now()}`;
      }
    }, webcam.refreshIntervalSec * 1000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private renderViewer(webcam: TrafficWebcam): HTMLDivElement {
    const viewer = document.createElement('div');
    viewer.className = 'trf-viewer';

    const header = document.createElement('div');
    header.className = 'trf-viewer-header';

    const title = document.createElement('span');
    title.className = 'trf-viewer-title';
    title.textContent = `${webcam.autostrada} km ${webcam.km} - ${webcam.localita}`;

    const refreshBadge = document.createElement('span');
    refreshBadge.className = 'trf-refresh-badge';
    refreshBadge.textContent = `⟳ ${webcam.refreshIntervalSec}s`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tw-viewer-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.title = 'Chiudi viewer';
    closeBtn.addEventListener('click', () => {
      this.activeWebcam = null;
      this.stopAutoRefresh();
      this.render();
    });

    header.appendChild(title);
    header.appendChild(refreshBadge);
    header.appendChild(closeBtn);
    viewer.appendChild(header);

    const imgContainer = document.createElement('div');
    imgContainer.className = 'trf-img-container';

    const img = document.createElement('img');
    img.className = 'trf-snapshot';
    img.src = `/api/traffic-snapshot?url=${encodeURIComponent(webcam.snapshotUrl)}`;
    img.alt = `${webcam.autostrada} km ${webcam.km} - ${webcam.localita}`;
    img.loading = 'lazy';

    img.addEventListener('error', () => {
      imgContainer.innerHTML = `
        <div class="tw-viewer-error">
          <div class="tw-viewer-error-icon">&#x26A0;</div>
          <div class="tw-viewer-error-text">Snapshot non disponibile</div>
          <div class="tw-viewer-error-sub">${escapeHtml(webcam.localita)}</div>
        </div>
      `;
    });

    imgContainer.appendChild(img);
    viewer.appendChild(imgContainer);

    this.startAutoRefresh(webcam);

    return viewer;
  }

  private render(): void {
    const filtered = this.getFiltered();
    const highways = getHighways();

    this.content.innerHTML = '';
    this.content.className = 'panel-content traffic-webcams-content';

    // Active webcam viewer
    if (this.activeWebcam) {
      this.content.appendChild(this.renderViewer(this.activeWebcam));
    }

    // Filters toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'tw-toolbar';

    const hwSelect = document.createElement('select');
    hwSelect.className = 'tw-filter-select';
    hwSelect.title = 'Filtra per autostrada';

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'Tutte le autostrade';
    hwSelect.appendChild(allOpt);

    for (const hw of highways) {
      const opt = document.createElement('option');
      opt.value = hw;
      opt.textContent = hw;
      if (hw === this.highwayFilter) opt.selected = true;
      hwSelect.appendChild(opt);
    }

    hwSelect.addEventListener('change', () => {
      this.highwayFilter = hwSelect.value;
      this.render();
    });

    const countBadge = document.createElement('span');
    countBadge.className = 'tw-count';
    countBadge.textContent = `${filtered.length}`;

    toolbar.appendChild(hwSelect);
    toolbar.appendChild(countBadge);
    this.content.appendChild(toolbar);

    // Webcam list
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tw-empty';
      empty.textContent = 'Nessuna webcam traffico disponibile';
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
      name.textContent = escapeHtml(`${webcam.autostrada} km ${webcam.km} - ${webcam.localita}`);

      const meta = document.createElement('span');
      meta.className = 'tw-row-meta';
      meta.textContent = `Direzione: ${webcam.direzione} · ${webcam.portale}`;

      info.appendChild(name);
      info.appendChild(meta);

      const badges = document.createElement('div');
      badges.className = 'tw-row-badges';

      const hwBadge = document.createElement('span');
      hwBadge.className = 'tw-badge tw-badge-tipo';
      hwBadge.textContent = webcam.autostrada;
      badges.appendChild(hwBadge);

      const liveBadge = document.createElement('span');
      liveBadge.className = 'tw-badge tw-badge-online';
      liveBadge.textContent = 'LIVE';
      badges.appendChild(liveBadge);

      row.appendChild(info);
      row.appendChild(badges);

      row.addEventListener('click', () => {
        this.activeWebcam = webcam;
        this.render();
        if (this.onWebcamSelect) {
          this.onWebcamSelect(webcam.lat, webcam.lon);
        }
      });

      list.appendChild(row);
    }

    this.content.appendChild(list);
  }

  refresh(): void {
    this.render();
  }

  destroy(): void {
    this.stopAutoRefresh();
    this.onWebcamSelect = null;
    super.destroy();
  }
}
