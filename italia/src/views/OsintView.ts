import type { ViewController } from './ViewController';
import { OsintScannerPanel } from '@/components/OsintScannerPanel';
import { OsintResultsPanel } from '@/components/OsintResultsPanel';
import { OsintGraphPanel } from '@/components/OsintGraphPanel';

export class OsintView implements ViewController {
  private element: HTMLElement;
  private scannerPanel: OsintScannerPanel;
  private resultsPanel: OsintResultsPanel;
  private graphPanel: OsintGraphPanel;
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view-container osint-view';
    this.element.id = 'osintView';

    // Scanner panel (input form)
    this.scannerPanel = new OsintScannerPanel();

    // Results panel (table)
    this.resultsPanel = new OsintResultsPanel();

    // Graph panel (D3 force graph)
    this.graphPanel = new OsintGraphPanel();

    // Connect scanner to results/graph
    this.scannerPanel.onScanComplete((result) => {
      this.resultsPanel.setResults(result);
      this.graphPanel.setRelationships(result.relationships, result.target.value);
    });

    this.scannerPanel.onScanProgress((partial) => {
      this.resultsPanel.setResults(partial);
      this.graphPanel.setRelationships(partial.relationships, partial.target.value);
    });

    // Layout
    const topRow = document.createElement('div');
    topRow.className = 'osint-top-row';
    topRow.appendChild(this.scannerPanel.getElement());

    const bottomRow = document.createElement('div');
    bottomRow.className = 'osint-bottom-row';
    bottomRow.appendChild(this.resultsPanel.getElement());
    bottomRow.appendChild(this.graphPanel.getElement());

    this.element.appendChild(topRow);
    this.element.appendChild(bottomRow);
  }

  activate(): void {
    // active
    this.element.classList.add('active');
  }

  deactivate(): void {
    // inactive
    this.element.classList.remove('active');
  }

  destroy(): void {
    this.graphPanel.destroy();
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
