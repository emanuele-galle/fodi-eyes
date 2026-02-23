import { Panel } from './Panel';
import { WEBCAMS_ITALIA, type TerritorialWebcam } from '@/config/webcams-italia';
import { escapeHtml } from '@/utils/sanitize';

type TipoFilter = 'all' | TerritorialWebcam['tipo'];

export class TerritorialWebcamsPanel extends Panel {
  private regionFilter = 'calabria';
  private provinciaFilter = 'all';
  private tipoFilter: TipoFilter = 'all';
  private activeWebcam: TerritorialWebcam | null = null;
  private onWebcamSelect: ((webcam: TerritorialWebcam) => void) | null = null;

  constructor() {
    super({ id: 'webcam-territoriali', title: 'Webcam Territoriali' });
    this.render();
  }

  setWebcamSelectHandler(handler: (webcam: TerritorialWebcam) => void): void {
    this.onWebcamSelect = handler;
  }

  private getFilteredWebcams(): TerritorialWebcam[] {
    return WEBCAMS_ITALIA.filter((w) => {
      if (w.regione.toLowerCase() !== this.regionFilter) return false;
      if (this.provinciaFilter !== 'all' && w.provincia !== this.provinciaFilter) return false;
      if (this.tipoFilter !== 'all' && w.tipo !== this.tipoFilter) return false;
      return true;
    });
  }

  private getProvinceList(): string[] {
    const set = new Set<string>();
    for (const w of WEBCAMS_ITALIA) {
      if (w.regione.toLowerCase() === this.regionFilter) {
        set.add(w.provincia);
      }
    }
    return Array.from(set).sort();
  }

  private getTipoList(): TerritorialWebcam['tipo'][] {
    const set = new Set<TerritorialWebcam['tipo']>();
    for (const w of WEBCAMS_ITALIA) {
      if (w.regione.toLowerCase() === this.regionFilter) {
        set.add(w.tipo);
      }
    }
    return Array.from(set).sort();
  }

  private render(): void {
    const filtered = this.getFilteredWebcams();
    const province = this.getProvinceList();
    const tipi = this.getTipoList();

    this.content.innerHTML = '';
    this.content.className = 'panel-content territorial-webcams-content';

    // Active webcam preview
    if (this.activeWebcam) {
      const preview = document.createElement('div');
      preview.className = 'tw-preview';

      const previewHeader = document.createElement('div');
      previewHeader.className = 'tw-preview-header';

      const previewTitle = document.createElement('span');
      previewTitle.className = 'tw-preview-title';
      previewTitle.textContent = `${this.activeWebcam.comune} - ${this.activeWebcam.localita}`;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tw-preview-close';
      closeBtn.textContent = '\u2715';
      closeBtn.title = 'Chiudi preview';
      closeBtn.addEventListener('click', () => {
        this.activeWebcam = null;
        this.render();
      });

      previewHeader.appendChild(previewTitle);
      previewHeader.appendChild(closeBtn);
      preview.appendChild(previewHeader);

      const link = document.createElement('a');
      link.className = 'tw-preview-link';
      link.href = this.activeWebcam.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Apri webcam \u2197';
      preview.appendChild(link);

      this.content.appendChild(preview);
    }

    // Filters toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'tw-toolbar';

    // Provincia filter
    const provSelect = document.createElement('select');
    provSelect.className = 'tw-filter-select';
    provSelect.title = 'Filtra per provincia';

    const provAllOpt = document.createElement('option');
    provAllOpt.value = 'all';
    provAllOpt.textContent = 'Tutte le province';
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
    tipoAllOpt.textContent = 'Tutti i tipi';
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
      meta.textContent = escapeHtml(webcam.provincia);

      info.appendChild(name);
      info.appendChild(meta);

      const badges = document.createElement('div');
      badges.className = 'tw-row-badges';

      const tipoBadge = document.createElement('span');
      tipoBadge.className = `tw-badge tw-badge-tipo`;
      tipoBadge.textContent = webcam.tipo;
      badges.appendChild(tipoBadge);

      const statusBadge = document.createElement('span');
      statusBadge.className = `tw-badge ${webcam.attiva ? 'tw-badge-online' : 'tw-badge-offline'}`;
      statusBadge.textContent = webcam.attiva ? 'LIVE' : 'OFFLINE';
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
    this.onWebcamSelect = null;
    super.destroy();
  }
}
