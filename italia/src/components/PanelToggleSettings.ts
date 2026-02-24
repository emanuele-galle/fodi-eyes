/**
 * PanelToggleSettings - In-sidebar panel for toggling card visibility.
 * Provides a compact toggle list directly in the Tools tab, avoiding
 * the need to open the header settings modal.
 */
import { Panel } from './Panel';
import type { PanelConfig } from '@/types';
import { t } from '@/services/i18n';

export interface PanelToggleCallbacks {
  getPanelSettings: () => Record<string, PanelConfig>;
  onToggle: (key: string, enabled: boolean) => void;
}

export class PanelToggleSettings extends Panel {
  private callbacks: PanelToggleCallbacks;

  constructor(callbacks: PanelToggleCallbacks) {
    super({ id: 'panel-toggle-settings', title: 'Visibilità Pannelli', showCount: false });
    this.callbacks = callbacks;
    this.renderToggles();
  }

  private getLocalizedName(key: string, fallback: string): string {
    const camelKey = key.replace(/-([a-z])/g, (_m, g: string) => g.toUpperCase());
    const lookup = `panels.${camelKey}`;
    const localized = t(lookup);
    return localized === lookup ? fallback : localized;
  }

  public renderToggles(): void {
    const settings = this.callbacks.getPanelSettings();
    const entries = Object.entries(settings).filter(([k]) => k !== 'runtime-config');

    const html = entries.map(([key, config]) => {
      const name = this.getLocalizedName(key, config.name);
      return `
        <label class="ptoggle-row" data-key="${key}">
          <span class="ptoggle-label">${name}</span>
          <input type="checkbox" class="ptoggle-check" ${config.enabled ? 'checked' : ''}>
          <span class="ptoggle-switch"></span>
        </label>
      `;
    }).join('');

    this.content.innerHTML = `<div class="ptoggle-list">${html}</div>`;

    this.content.querySelectorAll<HTMLLabelElement>('.ptoggle-row').forEach((row) => {
      const input = row.querySelector('input')!;
      const key = row.dataset.key!;
      input.addEventListener('change', () => {
        this.callbacks.onToggle(key, input.checked);
      });
    });
  }
}
