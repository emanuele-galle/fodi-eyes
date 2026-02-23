import type { ConflictZone, Hotspot, NewsItem, MilitaryBase, StrategicWaterway, APTGroup, NuclearFacility, EconomicCenter, GammaIrradiator, Pipeline, UnderseaCable, CableAdvisory, RepairShip, InternetOutage, AIDataCenter, NaturalEvent, CyberThreat } from '@/types';
import type { Earthquake } from '@/services/earthquakes';
import type { WeatherAlert } from '@/services/weather';
import { UNDERSEA_CABLES } from '@/config';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { isMobileDevice, getCSSColor } from '@/utils';
import { t } from '@/services/i18n';
import { fetchHotspotContext, formatArticleDate, extractDomain, type GdeltArticle } from '@/services/gdelt-intel';
import { getNaturalEventIcon } from '@/services/eonet';
import { getHotspotEscalation, getEscalationChange24h } from '@/services/hotspot-escalation';
// cable-health service removed — stub for cable popup
const getCableHealthRecord = (_id: string): { status: string; latency_ms: number; recent_outages: number; evidence?: Array<{ source: string; summary: string }> } | null => null;

export type PopupType = 'conflict' | 'hotspot' | 'earthquake' | 'weather' | 'base' | 'waterway' | 'apt' | 'cyberThreat' | 'nuclear' | 'economic' | 'irradiator' | 'pipeline' | 'cable' | 'cable-advisory' | 'repair-ship' | 'outage' | 'datacenter' | 'datacenterCluster' | 'natEvent';

interface DatacenterClusterData {
  items: AIDataCenter[];
  region: string;
  country: string;
  count?: number;
  totalChips?: number;
  totalPowerMW?: number;
  existingCount?: number;
  plannedCount?: number;
  sampled?: boolean;
}

interface PopupData {
  type: PopupType;
  data: ConflictZone | Hotspot | Earthquake | WeatherAlert | MilitaryBase | StrategicWaterway | APTGroup | CyberThreat | NuclearFacility | EconomicCenter | GammaIrradiator | Pipeline | UnderseaCable | CableAdvisory | RepairShip | InternetOutage | AIDataCenter | NaturalEvent | DatacenterClusterData;
  relatedNews?: NewsItem[];
  x: number;
  y: number;
}

export class MapPopup {
  private container: HTMLElement;
  private popup: HTMLElement | null = null;
  private onClose?: () => void;
  private cableAdvisories: CableAdvisory[] = [];
  private repairShips: RepairShip[] = [];
  private isMobileSheet = false;
  private sheetTouchStartY: number | null = null;
  private sheetCurrentOffset = 0;
  private readonly mobileDismissThreshold = 96;
  private outsideListenerTimeoutId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public show(data: PopupData): void {
    this.hide();

    this.isMobileSheet = isMobileDevice();
    this.popup = document.createElement('div');
    this.popup.className = this.isMobileSheet ? 'map-popup map-popup-sheet' : 'map-popup';

    const content = this.renderContent(data);
    this.popup.innerHTML = this.isMobileSheet
      ? `<button class="map-popup-sheet-handle" aria-label="${t('common.close')}"></button>${content}`
      : content;

    // Get container's viewport position for absolute positioning
    const containerRect = this.container.getBoundingClientRect();

    if (this.isMobileSheet) {
      this.popup.style.left = '';
      this.popup.style.top = '';
      this.popup.style.transform = '';
    } else {
      this.positionDesktopPopup(data, containerRect);
    }

    // Append to body to avoid container overflow clipping
    document.body.appendChild(this.popup);

    // Close button handler
    this.popup.querySelector('.popup-close')?.addEventListener('click', () => this.hide());
    this.popup.querySelector('.map-popup-sheet-handle')?.addEventListener('click', () => this.hide());

    if (this.isMobileSheet) {
      this.popup.addEventListener('touchstart', this.handleSheetTouchStart, { passive: true });
      this.popup.addEventListener('touchmove', this.handleSheetTouchMove, { passive: false });
      this.popup.addEventListener('touchend', this.handleSheetTouchEnd);
      this.popup.addEventListener('touchcancel', this.handleSheetTouchEnd);
      requestAnimationFrame(() => {
        if (!this.popup) return;
        this.popup.classList.add('open');
        // Remove will-change after slide-in transition to free GPU memory
        this.popup.addEventListener('transitionend', () => {
          if (this.popup) this.popup.style.willChange = 'auto';
        }, { once: true });
      });
    }

    // Click outside to close
    if (this.outsideListenerTimeoutId !== null) {
      window.clearTimeout(this.outsideListenerTimeoutId);
    }
    this.outsideListenerTimeoutId = window.setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('touchstart', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleEscapeKey);
      this.outsideListenerTimeoutId = null;
    }, 0);
  }

  private positionDesktopPopup(data: PopupData, containerRect: DOMRect): void {
    if (!this.popup) return;

    const popupWidth = 380;
    const bottomBuffer = 50; // Buffer from viewport bottom
    const topBuffer = 60; // Header height

    // Temporarily append popup off-screen to measure actual height
    this.popup.style.visibility = 'hidden';
    this.popup.style.top = '0';
    this.popup.style.left = '-9999px';
    document.body.appendChild(this.popup);
    const popupHeight = this.popup.offsetHeight;
    document.body.removeChild(this.popup);
    this.popup.style.visibility = '';

    // Convert container-relative coords to viewport coords
    const viewportX = containerRect.left + data.x;
    const viewportY = containerRect.top + data.y;

    // Horizontal positioning (viewport-relative)
    const maxX = window.innerWidth - popupWidth - 20;
    let left = viewportX + 20;
    if (left > maxX) {
      // Position to the left of click if it would overflow right
      left = Math.max(10, viewportX - popupWidth - 20);
    }

    // Vertical positioning - prefer below click, but flip above if needed
    const availableBelow = window.innerHeight - viewportY - bottomBuffer;
    const availableAbove = viewportY - topBuffer;

    let top: number;
    if (availableBelow >= popupHeight) {
      // Enough space below - position below click
      top = viewportY + 10;
    } else if (availableAbove >= popupHeight) {
      // Not enough below, but enough above - position above click
      top = viewportY - popupHeight - 10;
    } else {
      // Limited space both ways - position at top buffer
      top = topBuffer;
    }

    // CRITICAL: Ensure popup stays within viewport vertically
    top = Math.max(topBuffer, top);
    const maxTop = window.innerHeight - popupHeight - bottomBuffer;
    if (maxTop > topBuffer) {
      top = Math.min(top, maxTop);
    }

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
  }

  private handleOutsideClick = (e: Event) => {
    if (this.popup && !this.popup.contains(e.target as Node)) {
      this.hide();
    }
  };

  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.hide();
    }
  };

  private handleSheetTouchStart = (e: TouchEvent): void => {
    if (!this.popup || !this.isMobileSheet || e.touches.length !== 1) return;

    const target = e.target as HTMLElement | null;
    const popupBody = this.popup.querySelector('.popup-body');
    if (target?.closest('.popup-body') && popupBody && popupBody.scrollTop > 0) {
      this.sheetTouchStartY = null;
      return;
    }

    this.sheetTouchStartY = e.touches[0]?.clientY ?? null;
    this.sheetCurrentOffset = 0;
    this.popup.classList.add('dragging');
  };

  private handleSheetTouchMove = (e: TouchEvent): void => {
    if (!this.popup || !this.isMobileSheet || this.sheetTouchStartY === null) return;

    const currentY = e.touches[0]?.clientY;
    if (currentY == null) return;

    const delta = Math.max(0, currentY - this.sheetTouchStartY);
    if (delta <= 0) return;

    this.sheetCurrentOffset = delta;
    this.popup.style.transform = `translate3d(0, ${delta}px, 0)`;
    e.preventDefault();
  };

  private handleSheetTouchEnd = (): void => {
    if (!this.popup || !this.isMobileSheet || this.sheetTouchStartY === null) return;

    const shouldDismiss = this.sheetCurrentOffset >= this.mobileDismissThreshold;
    this.popup.classList.remove('dragging');
    this.sheetTouchStartY = null;

    if (shouldDismiss) {
      this.hide();
      return;
    }

    this.sheetCurrentOffset = 0;
    this.popup.style.transform = '';
    this.popup.classList.add('open');
  };

  public hide(): void {
    if (this.outsideListenerTimeoutId !== null) {
      window.clearTimeout(this.outsideListenerTimeoutId);
      this.outsideListenerTimeoutId = null;
    }

    if (this.popup) {
      this.popup.removeEventListener('touchstart', this.handleSheetTouchStart);
      this.popup.removeEventListener('touchmove', this.handleSheetTouchMove);
      this.popup.removeEventListener('touchend', this.handleSheetTouchEnd);
      this.popup.removeEventListener('touchcancel', this.handleSheetTouchEnd);
      this.popup.remove();
      this.popup = null;
      this.isMobileSheet = false;
      this.sheetTouchStartY = null;
      this.sheetCurrentOffset = 0;
      document.removeEventListener('click', this.handleOutsideClick);
      document.removeEventListener('touchstart', this.handleOutsideClick);
      document.removeEventListener('keydown', this.handleEscapeKey);
      this.onClose?.();
    }
  }

  public setOnClose(callback: () => void): void {
    this.onClose = callback;
  }

  public setCableActivity(advisories: CableAdvisory[], repairShips: RepairShip[]): void {
    this.cableAdvisories = advisories;
    this.repairShips = repairShips;
  }

  private renderContent(data: PopupData): string {
    switch (data.type) {
      case 'conflict':
        return this.renderConflictPopup(data.data as ConflictZone);
      case 'hotspot':
        return this.renderHotspotPopup(data.data as Hotspot, data.relatedNews);
      case 'earthquake':
        return this.renderEarthquakePopup(data.data as Earthquake);
      case 'weather':
        return this.renderWeatherPopup(data.data as WeatherAlert);
      case 'base':
        return this.renderBasePopup(data.data as MilitaryBase);
      case 'waterway':
        return this.renderWaterwayPopup(data.data as StrategicWaterway);
      case 'apt':
        return this.renderAPTPopup(data.data as APTGroup);
      case 'cyberThreat':
        return this.renderCyberThreatPopup(data.data as CyberThreat);
      case 'nuclear':
        return this.renderNuclearPopup(data.data as NuclearFacility);
      case 'economic':
        return this.renderEconomicPopup(data.data as EconomicCenter);
      case 'irradiator':
        return this.renderIrradiatorPopup(data.data as GammaIrradiator);
      case 'pipeline':
        return this.renderPipelinePopup(data.data as Pipeline);
      case 'cable':
        return this.renderCablePopup(data.data as UnderseaCable);
      case 'cable-advisory':
        return this.renderCableAdvisoryPopup(data.data as CableAdvisory);
      case 'repair-ship':
        return this.renderRepairShipPopup(data.data as RepairShip);
      case 'outage':
        return this.renderOutagePopup(data.data as InternetOutage);
      case 'datacenter':
        return this.renderDatacenterPopup(data.data as AIDataCenter);
      case 'datacenterCluster':
        return this.renderDatacenterClusterPopup(data.data as DatacenterClusterData);
      case 'natEvent':
        return this.renderNaturalEventPopup(data.data as NaturalEvent);
      default:
        return '';
    }
  }

  private renderConflictPopup(conflict: ConflictZone): string {
    const severityClass = conflict.intensity === 'high' ? 'high' : conflict.intensity === 'medium' ? 'medium' : 'low';
    const severityLabel = escapeHtml(conflict.intensity?.toUpperCase() || t('popups.unknown').toUpperCase());

    return `
      <div class="popup-header conflict">
        <span class="popup-title">${escapeHtml(conflict.name.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.startDate')}</span>
            <span class="stat-value">${escapeHtml(conflict.startDate || t('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.casualties')}</span>
            <span class="stat-value">${escapeHtml(conflict.casualties || t('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.displaced')}</span>
            <span class="stat-value">${escapeHtml(conflict.displaced || t('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.location')}</span>
            <span class="stat-value">${escapeHtml(conflict.location || `${conflict.center[1]}°N, ${conflict.center[0]}°E`)}</span>
          </div>
        </div>
        ${conflict.description ? `<p class="popup-description">${escapeHtml(conflict.description)}</p>` : ''}
        ${conflict.parties && conflict.parties.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.belligerents')}</span>
            <div class="popup-tags">
              ${conflict.parties.map(p => `<span class="popup-tag">${escapeHtml(p)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${conflict.keyDevelopments && conflict.keyDevelopments.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.keyDevelopments')}</span>
            <ul class="popup-list">
              ${conflict.keyDevelopments.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getLocalizedHotspotSubtext(subtext: string): string {
    const slug = subtext
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const key = `popups.hotspotSubtexts.${slug}`;
    const localized = t(key);
    return localized === key ? subtext : localized;
  }

  private renderHotspotPopup(hotspot: Hotspot, relatedNews?: NewsItem[]): string {
    const severityClass = hotspot.level || 'low';
    const severityLabel = escapeHtml((hotspot.level || 'low').toUpperCase());
    const localizedSubtext = hotspot.subtext ? this.getLocalizedHotspotSubtext(hotspot.subtext) : '';

    // Get dynamic escalation score
    const dynamicScore = getHotspotEscalation(hotspot.id);
    const change24h = getEscalationChange24h(hotspot.id);

    // Escalation score display
    const escalationColors: Record<number, string> = {
      1: getCSSColor('--semantic-normal'),
      2: getCSSColor('--semantic-normal'),
      3: getCSSColor('--semantic-elevated'),
      4: getCSSColor('--semantic-high'),
      5: getCSSColor('--semantic-critical'),
    };
    const escalationLabels: Record<number, string> = {
      1: t('popups.hotspot.levels.stable'),
      2: t('popups.hotspot.levels.watch'),
      3: t('popups.hotspot.levels.elevated'),
      4: t('popups.hotspot.levels.high'),
      5: t('popups.hotspot.levels.critical')
    };
    const trendIcons: Record<string, string> = { 'escalating': '↑', 'stable': '→', 'de-escalating': '↓' };
    const trendColors: Record<string, string> = { 'escalating': getCSSColor('--semantic-critical'), 'stable': getCSSColor('--semantic-elevated'), 'de-escalating': getCSSColor('--semantic-normal') };

    const displayScore = dynamicScore?.combinedScore ?? hotspot.escalationScore ?? 3;
    const displayScoreInt = Math.round(displayScore);
    const displayTrend = dynamicScore?.trend ?? hotspot.escalationTrend ?? 'stable';

    const escalationSection = `
      <div class="popup-section escalation-section">
        <span class="section-label">${t('popups.hotspot.escalation')}</span>
        <div class="escalation-display">
          <div class="escalation-score" style="background: ${escalationColors[displayScoreInt] || getCSSColor('--text-dim')}">
            <span class="score-value">${displayScore.toFixed(1)}/5</span>
            <span class="score-label">${escalationLabels[displayScoreInt] || t('popups.unknown')}</span>
          </div>
          <div class="escalation-trend" style="color: ${trendColors[displayTrend] || getCSSColor('--text-dim')}">
            <span class="trend-icon">${trendIcons[displayTrend] || ''}</span>
            <span class="trend-label">${escapeHtml(displayTrend.toUpperCase())}</span>
          </div>
        </div>
        ${dynamicScore ? `
          <div class="escalation-breakdown">
            <div class="breakdown-header">
              <span class="baseline-label">${t('popups.hotspot.baseline')}: ${dynamicScore.staticBaseline}/5</span>
              ${change24h ? `
                <span class="change-label ${change24h.change >= 0 ? 'rising' : 'falling'}">
                  24h: ${change24h.change >= 0 ? '+' : ''}${change24h.change}
                </span>
              ` : ''}
            </div>
            <div class="breakdown-components">
              <div class="breakdown-row">
                <span class="component-label">${t('popups.hotspot.components.news')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar news" style="width: ${dynamicScore.components.newsActivity}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.newsActivity)}</span>
              </div>
              <div class="breakdown-row">
                <span class="component-label">${t('popups.hotspot.components.cii')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar cii" style="width: ${dynamicScore.components.ciiContribution}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.ciiContribution)}</span>
              </div>
              <div class="breakdown-row">
                <span class="component-label">${t('popups.hotspot.components.geo')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar geo" style="width: ${dynamicScore.components.geoConvergence}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.geoConvergence)}</span>
              </div>
              <div class="breakdown-row">
                <span class="component-label">${t('popups.hotspot.components.military')}</span>
                <div class="component-bar-bg">
                  <div class="component-bar military" style="width: ${dynamicScore.components.militaryActivity}%"></div>
                </div>
                <span class="component-value">${Math.round(dynamicScore.components.militaryActivity)}</span>
              </div>
            </div>
          </div>
        ` : ''}
        ${hotspot.escalationIndicators && hotspot.escalationIndicators.length > 0 ? `
          <div class="escalation-indicators">
            ${hotspot.escalationIndicators.map(i => `<span class="indicator-tag">• ${escapeHtml(i)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Historical context section
    const historySection = hotspot.history ? `
      <div class="popup-section history-section">
        <span class="section-label">${t('popups.historicalContext')}</span>
        <div class="history-content">
          ${hotspot.history.lastMajorEvent ? `
            <div class="history-event">
              <span class="history-label">${t('popups.lastMajorEvent')}:</span>
              <span class="history-value">${escapeHtml(hotspot.history.lastMajorEvent)} ${hotspot.history.lastMajorEventDate ? `(${escapeHtml(hotspot.history.lastMajorEventDate)})` : ''}</span>
            </div>
          ` : ''}
          ${hotspot.history.precedentDescription ? `
            <div class="history-event">
              <span class="history-label">${t('popups.precedents')}:</span>
              <span class="history-value">${escapeHtml(hotspot.history.precedentDescription)}</span>
            </div>
          ` : ''}
          ${hotspot.history.cyclicalRisk ? `
            <div class="history-event cyclical">
              <span class="history-label">${t('popups.cyclicalPattern')}:</span>
              <span class="history-value">${escapeHtml(hotspot.history.cyclicalRisk)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    ` : '';

    // "Why it matters" section
    const whyItMattersSection = hotspot.whyItMatters ? `
      <div class="popup-section why-matters-section">
        <span class="section-label">${t('popups.whyItMatters')}</span>
        <p class="why-matters-text">${escapeHtml(hotspot.whyItMatters)}</p>
      </div>
    ` : '';

    return `
      <div class="popup-header hotspot">
        <span class="popup-title">${escapeHtml(hotspot.name.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${localizedSubtext ? `<div class="popup-subtitle">${escapeHtml(localizedSubtext)}</div>` : ''}
        ${hotspot.description ? `<p class="popup-description">${escapeHtml(hotspot.description)}</p>` : ''}
        ${escalationSection}
        <div class="popup-stats">
          ${hotspot.location ? `
            <div class="popup-stat">
              <span class="stat-label">${t('popups.location')}</span>
              <span class="stat-value">${escapeHtml(hotspot.location)}</span>
            </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${escapeHtml(`${hotspot.lat.toFixed(2)}°N, ${hotspot.lon.toFixed(2)}°E`)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.status')}</span>
            <span class="stat-value">${escapeHtml(hotspot.status || t('popups.monitoring'))}</span>
          </div>
        </div>
        ${whyItMattersSection}
        ${historySection}
        ${hotspot.agencies && hotspot.agencies.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.keyEntities')}</span>
            <div class="popup-tags">
              ${hotspot.agencies.map(a => `<span class="popup-tag">${escapeHtml(a)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${relatedNews && relatedNews.length > 0 ? `
          <div class="popup-section">
          <div class="popup-section">
            <span class="section-label">${t('popups.relatedHeadlines')}</span>
            <div class="popup-news">
              ${relatedNews.slice(0, 5).map(n => `
                <div class="popup-news-item">
                  <span class="news-source">${escapeHtml(n.source)}</span>
                  <a href="${sanitizeUrl(n.link)}" target="_blank" class="news-title">${escapeHtml(n.title)}</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="hotspot-gdelt-context" data-hotspot-id="${escapeHtml(hotspot.id)}">
          <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
          <div class="hotspot-gdelt-loading">${t('popups.loadingNews')}</div>
        </div>
      </div>
    `;
  }

  public async loadHotspotGdeltContext(hotspot: Hotspot): Promise<void> {
    if (!this.popup) return;

    const container = this.popup.querySelector('.hotspot-gdelt-context');
    if (!container) return;

    try {
      const articles = await fetchHotspotContext(hotspot);

      if (!this.popup || !container.isConnected) return;

      if (articles.length === 0) {
        container.innerHTML = `
          <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
          <div class="hotspot-gdelt-loading">${t('popups.noCoverage')}</div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
        <div class="hotspot-gdelt-articles">
          ${articles.slice(0, 5).map(article => this.renderGdeltArticle(article)).join('')}
        </div>
      `;
    } catch (error) {
      if (container.isConnected) {
        container.innerHTML = `
          <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
          <div class="hotspot-gdelt-loading">${t('common.error')}</div>
        `;
      }
    }
  }

  private renderGdeltArticle(article: GdeltArticle): string {
    const domain = article.source || extractDomain(article.url);
    const timeAgo = formatArticleDate(article.date);

    return `
      <a href="${sanitizeUrl(article.url)}" target="_blank" rel="noopener" class="hotspot-gdelt-article">
        <div class="article-meta">
          <span>${escapeHtml(domain)}</span>
          <span>${escapeHtml(timeAgo)}</span>
        </div>
        <div class="article-title">${escapeHtml(article.title)}</div>
      </a>
    `;
  }

  private renderEarthquakePopup(earthquake: Earthquake): string {
    const severity = earthquake.magnitude >= 6 ? 'high' : earthquake.magnitude >= 5 ? 'medium' : 'low';
    const severityLabel = earthquake.magnitude >= 6 ? t('popups.earthquake.levels.major') : earthquake.magnitude >= 5 ? t('popups.earthquake.levels.moderate') : t('popups.earthquake.levels.minor');

    const timeAgo = this.getTimeAgo(new Date(earthquake.occurredAt));

    return `
      <div class="popup-header earthquake">
        <span class="popup-title magnitude">M${earthquake.magnitude.toFixed(1)}</span>
        <span class="popup-badge ${severity}">${severityLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <p class="popup-location">${escapeHtml(earthquake.place)}</p>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.depth')}</span>
            <span class="stat-value">${earthquake.depthKm.toFixed(1)} km</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${(earthquake.location?.latitude ?? 0).toFixed(2)}°, ${(earthquake.location?.longitude ?? 0).toFixed(2)}°</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.time')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
        </div>
        <a href="${sanitizeUrl(earthquake.sourceUrl)}" target="_blank" class="popup-link">${t('popups.viewUSGS')} →</a>
      </div>
    `;
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return t('popups.timeAgo.s', { count: seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('popups.timeAgo.m', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('popups.timeAgo.h', { count: hours });
    const days = Math.floor(hours / 24);
    return t('popups.timeAgo.d', { count: days });
  }

  private renderWeatherPopup(alert: WeatherAlert): string {
    const severityClass = escapeHtml(alert.severity.toLowerCase());
    const expiresIn = this.getTimeUntil(alert.expires);

    return `
      <div class="popup-header weather ${severityClass}">
        <span class="popup-title">${escapeHtml(alert.event.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${escapeHtml(alert.severity.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <p class="popup-headline">${escapeHtml(alert.headline)}</p>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.area')}</span>
            <span class="stat-value">${escapeHtml(alert.areaDesc)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.expires')}</span>
            <span class="stat-value">${expiresIn}</span>
          </div>
        </div>
        <p class="popup-description">${escapeHtml(alert.description.slice(0, 300))}${alert.description.length > 300 ? '...' : ''}</p>
      </div>
    `;
  }

  private getTimeUntil(date: Date): string {
    const ms = date.getTime() - Date.now();
    if (ms <= 0) return t('popups.expired');
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return `${Math.floor(ms / (1000 * 60))}${t('popups.timeUnits.m')}`;
    if (hours < 24) return `${hours}${t('popups.timeUnits.h')}`;
    return `${Math.floor(hours / 24)}${t('popups.timeUnits.d')}`;
  }

  private renderBasePopup(base: MilitaryBase): string {
    const typeLabels: Record<string, string> = {
      'us-nato': t('popups.base.types.us-nato'),
      'china': t('popups.base.types.china'),
      'russia': t('popups.base.types.russia'),
    };
    const typeColors: Record<string, string> = {
      'us-nato': 'elevated',
      'china': 'high',
      'russia': 'high',
    };

    return `
      <div class="popup-header base">
        <span class="popup-title">${escapeHtml(base.name.toUpperCase())}</span>
        <span class="popup-badge ${typeColors[base.type] || 'low'}">${escapeHtml(typeLabels[base.type] || base.type.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${base.description ? `<p class="popup-description">${escapeHtml(base.description)}</p>` : ''}
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.type')}</span>
            <span class="stat-value">${escapeHtml(typeLabels[base.type] || base.type)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${base.lat.toFixed(2)}°, ${base.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderWaterwayPopup(waterway: StrategicWaterway): string {
    return `
      <div class="popup-header waterway">
        <span class="popup-title">${escapeHtml(waterway.name)}</span>
        <span class="popup-badge elevated">${t('popups.strategic')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${waterway.description ? `<p class="popup-description">${escapeHtml(waterway.description)}</p>` : ''}
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${waterway.lat.toFixed(2)}°, ${waterway.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderAPTPopup(apt: APTGroup): string {
    return `
      <div class="popup-header apt">
        <span class="popup-title">${escapeHtml(apt.name)}</span>
        <span class="popup-badge high">${t('popups.threat')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${t('popups.aka')}: ${escapeHtml(apt.aka)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.sponsor')}</span>
            <span class="stat-value">${escapeHtml(apt.sponsor)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.origin')}</span>
            <span class="stat-value">${apt.lat.toFixed(1)}°, ${apt.lon.toFixed(1)}°</span>
          </div>
        </div>
        <p class="popup-description">${t('popups.apt.description')}</p>
      </div>
    `;
  }


  private renderCyberThreatPopup(threat: CyberThreat): string {
    const severityClass = escapeHtml(threat.severity);
    const sourceLabels: Record<string, string> = {
      feodo: 'Feodo Tracker',
      urlhaus: 'URLhaus',
      c2intel: 'C2 Intel Feeds',
      otx: 'AlienVault OTX',
      abuseipdb: 'AbuseIPDB',
    };
    const sourceLabel = sourceLabels[threat.source] || threat.source;
    const typeLabel = threat.type.replace(/_/g, ' ').toUpperCase();
    const tags = (threat.tags || []).slice(0, 6);

    return `
      <div class="popup-header apt ${severityClass}">
        <span class="popup-title">${t('popups.cyberThreat.title')}</span>
        <span class="popup-badge ${severityClass}">${escapeHtml(threat.severity.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${escapeHtml(typeLabel)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${escapeHtml(threat.indicatorType.toUpperCase())}</span>
            <span class="stat-value">${escapeHtml(threat.indicator)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.country')}</span>
            <span class="stat-value">${escapeHtml(threat.country || t('popups.unknown'))}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.source')}</span>
            <span class="stat-value">${escapeHtml(sourceLabel)}</span>
          </div>
          ${threat.malwareFamily ? `<div class="popup-stat">
            <span class="stat-label">${t('popups.malware')}</span>
            <span class="stat-value">${escapeHtml(threat.malwareFamily)}</span>
          </div>` : ''}
          <div class="popup-stat">
            <span class="stat-label">${t('popups.lastSeen')}</span>
            <span class="stat-value">${escapeHtml(threat.lastSeen ? new Date(threat.lastSeen).toLocaleString() : t('popups.unknown'))}</span>
          </div>
        </div>
        ${tags.length > 0 ? `
        <div class="popup-tags">
          ${tags.map((tag) => `<span class="popup-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>` : ''}
      </div>
    `;
  }

  private renderNuclearPopup(facility: NuclearFacility): string {
    const typeLabels: Record<string, string> = {
      'plant': t('popups.nuclear.types.plant'),
      'enrichment': t('popups.nuclear.types.enrichment'),
      'weapons': t('popups.nuclear.types.weapons'),
      'research': t('popups.nuclear.types.research'),
    };
    const statusColors: Record<string, string> = {
      'active': 'elevated',
      'contested': 'high',
      'decommissioned': 'low',
    };

    return `
      <div class="popup-header nuclear">
        <span class="popup-title">${escapeHtml(facility.name.toUpperCase())}</span>
        <span class="popup-badge ${statusColors[facility.status] || 'low'}">${escapeHtml(facility.status.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.type')}</span>
            <span class="stat-value">${escapeHtml(typeLabels[facility.type] || facility.type.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.status')}</span>
            <span class="stat-value">${escapeHtml(facility.status.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${facility.lat.toFixed(2)}°, ${facility.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${t('popups.nuclear.description')}</p>
      </div>
    `;
  }

  private renderEconomicPopup(center: EconomicCenter): string {
    const typeLabels: Record<string, string> = {
      'exchange': t('popups.economic.types.exchange'),
      'central-bank': t('popups.economic.types.centralBank'),
      'financial-hub': t('popups.economic.types.financialHub'),
    };
    const typeIcons: Record<string, string> = {
      'exchange': '📈',
      'central-bank': '🏛',
      'financial-hub': '💰',
    };

    const marketStatus = center.marketHours ? this.getMarketStatus(center.marketHours) : null;
    const marketStatusLabel = marketStatus
      ? marketStatus === 'open'
        ? t('popups.open')
        : marketStatus === 'closed'
        ? t('popups.economic.closed')
        : t('popups.unknown')
      : '';

    return `
      <div class="popup-header economic ${center.type}">
        <span class="popup-title">${typeIcons[center.type] || ''} ${escapeHtml(center.name.toUpperCase())}</span>
        <span class="popup-badge ${marketStatus === 'open' ? 'elevated' : 'low'}">${escapeHtml(marketStatusLabel || typeLabels[center.type] || '')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        ${center.description ? `<p class="popup-description">${escapeHtml(center.description)}</p>` : ''}
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.type')}</span>
            <span class="stat-value">${escapeHtml(typeLabels[center.type] || center.type.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.country')}</span>
            <span class="stat-value">${escapeHtml(center.country)}</span>
          </div>
          ${center.marketHours ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.tradingHours')}</span>
            <span class="stat-value">${escapeHtml(center.marketHours.open)} - ${escapeHtml(center.marketHours.close)}</span>
          </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${center.lat.toFixed(2)}°, ${center.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    `;
  }


  private renderIrradiatorPopup(irradiator: GammaIrradiator): string {
    return `
      <div class="popup-header irradiator">
        <span class="popup-title">☢ ${escapeHtml(irradiator.city.toUpperCase())}</span>
        <span class="popup-badge elevated">${t('popups.gamma')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${t('popups.irradiator.subtitle')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.country')}</span>
            <span class="stat-value">${escapeHtml(irradiator.country)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.city')}</span>
            <span class="stat-value">${escapeHtml(irradiator.city)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${irradiator.lat.toFixed(2)}°, ${irradiator.lon.toFixed(2)}°</span>
          </div>
        </div>
        <p class="popup-description">${t('popups.irradiator.description')}</p>
      </div>
    `;
  }


  private renderPipelinePopup(pipeline: Pipeline): string {
    const typeLabels: Record<string, string> = {
      'oil': t('popups.pipeline.types.oil'),
      'gas': t('popups.pipeline.types.gas'),
      'products': t('popups.pipeline.types.products'),
    };
    const typeColors: Record<string, string> = {
      'oil': 'high',
      'gas': 'elevated',
      'products': 'low',
    };
    const statusLabels: Record<string, string> = {
      'operating': t('popups.pipeline.status.operating'),
      'construction': t('popups.pipeline.status.construction'),
    };
    const typeIcon = pipeline.type === 'oil' ? '🛢' : pipeline.type === 'gas' ? '🔥' : '⛽';

    return `
      <div class="popup-header pipeline ${pipeline.type}">
        <span class="popup-title">${typeIcon} ${escapeHtml(pipeline.name.toUpperCase())}</span>
        <span class="popup-badge ${typeColors[pipeline.type] || 'low'}">${escapeHtml(pipeline.type.toUpperCase())}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${typeLabels[pipeline.type] || t('popups.pipeline.title')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.status')}</span>
            <span class="stat-value">${escapeHtml(statusLabels[pipeline.status] || pipeline.status.toUpperCase())}</span>
          </div>
          ${pipeline.capacity ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.capacity')}</span>
            <span class="stat-value">${escapeHtml(pipeline.capacity)}</span>
          </div>
          ` : ''}
          ${pipeline.length ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.length')}</span>
            <span class="stat-value">${escapeHtml(pipeline.length)}</span>
          </div>
          ` : ''}
          ${pipeline.operator ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.operator')}</span>
            <span class="stat-value">${escapeHtml(pipeline.operator)}</span>
          </div>
          ` : ''}
        </div>
        ${pipeline.countries && pipeline.countries.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.countries')}</span>
            <div class="popup-tags">
              ${pipeline.countries.map(c => `<span class="popup-tag">${escapeHtml(c)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <p class="popup-description">${t('popups.pipeline.description', { type: pipeline.type, status: pipeline.status === 'operating' ? t('popups.pipelineStatusDesc.operating') : t('popups.pipelineStatusDesc.construction') })}</p>
      </div>
    `;
  }


  private renderCablePopup(cable: UnderseaCable): string {
    const advisory = this.getLatestCableAdvisory(cable.id);
    const repairShip = this.getPriorityRepairShip(cable.id);
    const healthRecord = getCableHealthRecord(cable.id);

    // Health data takes priority over advisory for status display
    let statusLabel: string;
    let statusBadge: string;
    if (healthRecord?.status === 'fault') {
      statusLabel = t('popups.cable.fault');
      statusBadge = 'high';
    } else if (healthRecord?.status === 'degraded') {
      statusLabel = t('popups.cable.degraded');
      statusBadge = 'elevated';
    } else if (advisory) {
      statusLabel = advisory.severity === 'fault' ? t('popups.cable.fault') : t('popups.cable.degraded');
      statusBadge = advisory.severity === 'fault' ? 'high' : 'elevated';
    } else {
      statusLabel = t('popups.cable.active');
      statusBadge = 'low';
    }
    const repairEta = repairShip?.eta || advisory?.repairEta;
    const cableName = escapeHtml(cable.name.toUpperCase());
    const safeStatusLabel = escapeHtml(statusLabel);
    const safeRepairEta = repairEta ? escapeHtml(repairEta) : '';
    const advisoryTitle = advisory ? escapeHtml(advisory.title) : '';
    const advisoryImpact = advisory ? escapeHtml(advisory.impact) : '';
    const advisoryDescription = advisory ? escapeHtml(advisory.description) : '';
    const repairShipName = repairShip ? escapeHtml(repairShip.name) : '';
    const repairShipNote = repairShip ? escapeHtml(repairShip.note || t('popups.repairShip.note')) : '';

    return `
      <div class="popup-header cable">
        <span class="popup-title">🌐 ${cableName}</span>
        <span class="popup-badge ${statusBadge}">${cable.major ? t('popups.cable.major') : t('popups.cable.cable')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${t('popups.cable.subtitle')}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.type')}</span>
            <span class="stat-value">${t('popups.cable.type')}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.waypoints')}</span>
            <span class="stat-value">${cable.points.length}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.status')}</span>
            <span class="stat-value">${safeStatusLabel}</span>
          </div>
          ${repairEta ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.repairEta')}</span>
            <span class="stat-value">${safeRepairEta}</span>
          </div>
          ` : ''}
        </div>
        ${advisory ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.cable.advisory')}</span>
            <div class="popup-tags">
              <span class="popup-tag">${advisoryTitle}</span>
              <span class="popup-tag">${advisoryImpact}</span>
            </div>
            <p class="popup-description">${advisoryDescription}</p>
          </div>
        ` : ''}
        ${repairShip ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.cable.repairDeployment')}</span>
            <div class="popup-tags">
              <span class="popup-tag">${repairShipName}</span>
              <span class="popup-tag">${repairShip.status === 'on-station' ? t('popups.cable.repairStatus.onStation') : t('popups.cable.repairStatus.enRoute')}</span>
            </div>
            <p class="popup-description">${repairShipNote}</p>
          </div>
        ` : ''}
        ${healthRecord?.evidence?.length ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.cable.health.evidence')}</span>
            <ul class="evidence-list">
              ${healthRecord.evidence.map((e) => `<li class="evidence-item"><strong>${escapeHtml(e.source)}</strong>: ${escapeHtml(e.summary)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <p class="popup-description">${t('popups.cable.description')}</p>
      </div>
    `;
  }

  private renderCableAdvisoryPopup(advisory: CableAdvisory): string {
    const cable = UNDERSEA_CABLES.find((item) => item.id === advisory.cableId);
    const timeAgo = this.getTimeAgo(advisory.reported);
    const statusLabel = advisory.severity === 'fault' ? t('popups.cable.fault') : t('popups.cable.degraded');
    const cableName = escapeHtml(cable?.name.toUpperCase() || advisory.cableId.toUpperCase());
    const advisoryTitle = escapeHtml(advisory.title);
    const advisoryImpact = escapeHtml(advisory.impact);
    const advisoryEta = advisory.repairEta ? escapeHtml(advisory.repairEta) : '';
    const advisoryDescription = escapeHtml(advisory.description);

    return `
      <div class="popup-header cable">
        <span class="popup-title">🚨 ${cableName}</span>
        <span class="popup-badge ${advisory.severity === 'fault' ? 'high' : 'elevated'}">${statusLabel}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${advisoryTitle}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.cableAdvisory.reported')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.cableAdvisory.impact')}</span>
            <span class="stat-value">${advisoryImpact}</span>
          </div>
          ${advisory.repairEta ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.cableAdvisory.eta')}</span>
            <span class="stat-value">${advisoryEta}</span>
          </div>
          ` : ''}
        </div>
        <p class="popup-description">${advisoryDescription}</p>
      </div>
    `;
  }

  private renderRepairShipPopup(ship: RepairShip): string {
    const cable = UNDERSEA_CABLES.find((item) => item.id === ship.cableId);
    const shipName = escapeHtml(ship.name.toUpperCase());
    const cableLabel = escapeHtml(cable?.name || ship.cableId);
    const shipEta = escapeHtml(ship.eta);
    const shipOperator = ship.operator ? escapeHtml(ship.operator) : '';
    const shipNote = escapeHtml(ship.note || t('popups.repairShip.description'));

    return `
      <div class="popup-header cable">
        <span class="popup-title">🚢 ${shipName}</span>
        <span class="popup-badge elevated">${t('popups.repairShip.badge')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${cableLabel}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.status')}</span>
            <span class="stat-value">${ship.status === 'on-station' ? t('popups.repairShip.status.onStation') : t('popups.repairShip.status.enRoute')}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.cableAdvisory.eta')}</span>
            <span class="stat-value">${shipEta}</span>
          </div>
          ${ship.operator ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.operator')}</span>
            <span class="stat-value">${shipOperator}</span>
          </div>
          ` : ''}
        </div>
        <p class="popup-description">${shipNote}</p>
      </div>
    `;
  }

  private getLatestCableAdvisory(cableId: string): CableAdvisory | undefined {
    const advisories = this.cableAdvisories.filter((item) => item.cableId === cableId);
    return advisories.reduce<CableAdvisory | undefined>((latest, advisory) => {
      if (!latest) return advisory;
      return advisory.reported.getTime() > latest.reported.getTime() ? advisory : latest;
    }, undefined);
  }

  private getPriorityRepairShip(cableId: string): RepairShip | undefined {
    const ships = this.repairShips.filter((item) => item.cableId === cableId);
    if (ships.length === 0) return undefined;
    const onStation = ships.find((ship) => ship.status === 'on-station');
    return onStation || ships[0];
  }

  private renderOutagePopup(outage: InternetOutage): string {
    const severityColors: Record<string, string> = {
      'total': 'high',
      'major': 'elevated',
      'partial': 'low',
    };
    const severityLabels: Record<string, string> = {
      'total': t('popups.outage.levels.total'),
      'major': t('popups.outage.levels.major'),
      'partial': t('popups.outage.levels.partial'),
    };
    const timeAgo = this.getTimeAgo(outage.pubDate);
    const severityClass = escapeHtml(outage.severity);

    return `
      <div class="popup-header outage ${severityClass}">
        <span class="popup-title">📡 ${escapeHtml(outage.country.toUpperCase())}</span>
        <span class="popup-badge ${severityColors[outage.severity] || 'low'}">${severityLabels[outage.severity] || t('popups.outage.levels.disruption')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${escapeHtml(outage.title)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.severity')}</span>
            <span class="stat-value">${escapeHtml(outage.severity.toUpperCase())}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.outage.reported')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${outage.lat.toFixed(2)}°, ${outage.lon.toFixed(2)}°</span>
          </div>
        </div>
        ${outage.categories && outage.categories.length > 0 ? `
          <div class="popup-section">
            <span class="section-label">${t('popups.outage.categories')}</span>
            <div class="popup-tags">
              ${outage.categories.slice(0, 5).map(c => `<span class="popup-tag">${escapeHtml(c)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <p class="popup-description">${escapeHtml(outage.description.slice(0, 250))}${outage.description.length > 250 ? '...' : ''}</p>
        <a href="${sanitizeUrl(outage.link)}" target="_blank" class="popup-link">${t('popups.outage.readReport')} →</a>
      </div>
    `;
  }

  private renderDatacenterPopup(dc: AIDataCenter): string {
    const statusColors: Record<string, string> = {
      'existing': 'normal',
      'planned': 'elevated',
      'decommissioned': 'low',
    };
    const statusLabels: Record<string, string> = {
      'existing': t('popups.datacenter.status.existing'),
      'planned': t('popups.datacenter.status.planned'),
      'decommissioned': t('popups.datacenter.status.decommissioned'),
    };

    const formatNumber = (n: number) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    };

    return `
      <div class="popup-header datacenter ${dc.status}">
        <span class="popup-title">🖥️ ${escapeHtml(dc.name)}</span>
        <span class="popup-badge ${statusColors[dc.status] || 'normal'}">${statusLabels[dc.status] || t('popups.datacenter.status.unknown')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${escapeHtml(dc.owner)} • ${escapeHtml(dc.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.gpuChipCount')}</span>
            <span class="stat-value">${formatNumber(dc.chipCount)}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.chipType')}</span>
            <span class="stat-value">${escapeHtml(dc.chipType || t('popups.unknown'))}</span>
          </div>
          ${dc.powerMW ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.power')}</span>
            <span class="stat-value">${dc.powerMW.toFixed(0)} MW</span>
          </div>
          ` : ''}
          ${dc.sector ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.sector')}</span>
            <span class="stat-value">${escapeHtml(dc.sector)}</span>
          </div>
          ` : ''}
        </div>
        ${dc.note ? `<p class="popup-description">${escapeHtml(dc.note)}</p>` : ''}
        <div class="popup-attribution">${t('popups.datacenter.attribution')}</div>
      </div>
    `;
  }

  private renderDatacenterClusterPopup(data: DatacenterClusterData): string {
    const totalCount = data.count ?? data.items.length;
    const totalChips = data.totalChips ?? data.items.reduce((sum, dc) => sum + dc.chipCount, 0);
    const totalPower = data.totalPowerMW ?? data.items.reduce((sum, dc) => sum + (dc.powerMW || 0), 0);
    const existingCount = data.existingCount ?? data.items.filter(dc => dc.status === 'existing').length;
    const plannedCount = data.plannedCount ?? data.items.filter(dc => dc.status === 'planned').length;

    const formatNumber = (n: number) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    };

    const dcListHtml = data.items.slice(0, 8).map(dc => `
      <div class="cluster-item">
        <span class="cluster-item-icon">${dc.status === 'planned' ? '🔨' : '🖥️'}</span>
        <div class="cluster-item-info">
          <span class="cluster-item-name">${escapeHtml(dc.name.slice(0, 40))}${dc.name.length > 40 ? '...' : ''}</span>
          <span class="cluster-item-detail">${escapeHtml(dc.owner)} • ${formatNumber(dc.chipCount)} ${t('popups.datacenter.chips')}</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="popup-header datacenter cluster">
        <span class="popup-title">🖥️ ${t('popups.datacenter.cluster.title', { count: String(totalCount) })}</span>
        <span class="popup-badge elevated">${escapeHtml(data.region)}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${escapeHtml(data.country)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.cluster.totalChips')}</span>
            <span class="stat-value">${formatNumber(totalChips)}</span>
          </div>
          ${totalPower > 0 ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.cluster.totalPower')}</span>
            <span class="stat-value">${totalPower.toFixed(0)} MW</span>
          </div>
          ` : ''}
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.cluster.operational')}</span>
            <span class="stat-value">${existingCount}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.datacenter.cluster.planned')}</span>
            <span class="stat-value">${plannedCount}</span>
          </div>
        </div>
        <div class="cluster-list">
          ${dcListHtml}
        </div>
        ${totalCount > 8 ? `<p class="popup-more">${t('popups.datacenter.cluster.moreDataCenters', { count: String(Math.max(0, totalCount - 8)) })}</p>` : ''}
        ${data.sampled ? `<p class="popup-more">${t('popups.datacenter.cluster.sampledSites', { count: String(data.items.length) })}</p>` : ''}
        <div class="popup-attribution">${t('popups.datacenter.attribution')}</div>
      </div>
    `;
  }

  private getMarketStatus(hours: { open: string; close: string; timezone: string }): 'open' | 'closed' | 'unknown' {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: hours.timezone,
      });
      const currentTime = formatter.format(now);
      const [openH = 0, openM = 0] = hours.open.split(':').map(Number);
      const [closeH = 0, closeM = 0] = hours.close.split(':').map(Number);
      const [currH = 0, currM = 0] = currentTime.split(':').map(Number);

      const openMins = openH * 60 + openM;
      const closeMins = closeH * 60 + closeM;
      const currMins = currH * 60 + currM;

      if (currMins >= openMins && currMins < closeMins) {
        return 'open';
      }
      return 'closed';
    } catch {
      return 'unknown';
    }
  }

  private renderNaturalEventPopup(event: NaturalEvent): string {
    const categoryColors: Record<string, string> = {
      severeStorms: 'high',
      wildfires: 'high',
      volcanoes: 'high',
      earthquakes: 'elevated',
      floods: 'elevated',
      landslides: 'elevated',
      drought: 'medium',
      dustHaze: 'low',
      snow: 'low',
      tempExtremes: 'elevated',
      seaLakeIce: 'low',
      waterColor: 'low',
      manmade: 'elevated',
    };
    const icon = getNaturalEventIcon(event.category);
    const severityClass = categoryColors[event.category] || 'low';
    const timeAgo = this.getTimeAgo(event.date);

    return `
      <div class="popup-header nat-event ${event.category}">
        <span class="popup-icon">${icon}</span>
        <span class="popup-title">${escapeHtml(event.categoryTitle.toUpperCase())}</span>
        <span class="popup-badge ${severityClass}">${event.closed ? t('popups.naturalEvent.closed') : t('popups.naturalEvent.active')}</span>
        <button class="popup-close">×</button>
      </div>
      <div class="popup-body">
        <div class="popup-subtitle">${escapeHtml(event.title)}</div>
        <div class="popup-stats">
          <div class="popup-stat">
            <span class="stat-label">${t('popups.naturalEvent.reported')}</span>
            <span class="stat-value">${timeAgo}</span>
          </div>
          <div class="popup-stat">
            <span class="stat-label">${t('popups.coordinates')}</span>
            <span class="stat-value">${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°</span>
          </div>
          ${event.magnitude ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.magnitude')}</span>
            <span class="stat-value">${event.magnitude}${event.magnitudeUnit ? ` ${escapeHtml(event.magnitudeUnit)}` : ''}</span>
          </div>
          ` : ''}
          ${event.sourceName ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.source')}</span>
            <span class="stat-value">${escapeHtml(event.sourceName)}</span>
          </div>
          ` : ''}
        </div>
        ${event.description ? `<p class="popup-description">${escapeHtml(event.description)}</p>` : ''}
        ${event.sourceUrl ? `<a href="${sanitizeUrl(event.sourceUrl)}" target="_blank" class="popup-link">${t('popups.naturalEvent.viewOnSource', { source: escapeHtml(event.sourceName || t('popups.source')) })} →</a>` : ''}
        <div class="popup-attribution">${t('popups.naturalEvent.attribution')}</div>
      </div>
    `;
  }

}
