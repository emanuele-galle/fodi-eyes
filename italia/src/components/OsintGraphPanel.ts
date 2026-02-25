import * as d3 from 'd3';

interface Relationship {
  source: string;
  target: string;
  type: string;
  label?: string;
}

interface GraphNode {
  id: string;
  type: 'target' | 'ip' | 'domain' | 'email' | 'service' | 'org' | 'other';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  label?: string;
}

const NODE_COLORS: Record<string, string> = {
  target: '#ff4444',
  ip: '#4488ff',
  domain: '#44ff88',
  email: '#ffaa44',
  service: '#aa44ff',
  org: '#ff44aa',
  other: '#888888',
};

export class OsintGraphPanel {
  private element: HTMLElement;
  private simulation: d3.Simulation<GraphNode, GraphLink> | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'osint-graph-panel';
    this.element.innerHTML = `
      <div class="osint-graph-header">
        <h3>\u{1F578}\uFE0F Grafo Relazioni</h3>
      </div>
      <div class="osint-graph-container" id="osintGraphContainer"></div>
    `;
  }

  setRelationships(relationships: Relationship[], targetValue: string): void {
    if (relationships.length === 0) {
      this.renderEmpty();
      return;
    }
    this.renderGraph(relationships, targetValue);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.simulation?.stop();
    this.simulation = null;
  }

  private renderEmpty(): void {
    const container = this.element.querySelector('#osintGraphContainer');
    if (container) {
      container.innerHTML = '<div class="osint-graph-empty">Nessuna relazione trovata</div>';
    }
  }

  private inferNodeType(id: string, targetValue: string): GraphNode['type'] {
    if (id === targetValue) return 'target';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(id)) return 'ip';
    if (id.includes('@')) return 'email';
    if (/^\d+\/\w+$/.test(id)) return 'service';
    if (id.includes('.') && !id.includes(' ')) return 'domain';
    if (/^[A-Z]/.test(id) && id.includes(' ')) return 'org';
    return 'other';
  }

  private renderGraph(relationships: Relationship[], targetValue: string): void {
    const container = this.element.querySelector('#osintGraphContainer') as HTMLElement;
    if (!container) return;

    container.innerHTML = '';
    this.simulation?.stop();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // Build nodes and links
    const nodeSet = new Set<string>();
    const links: GraphLink[] = [];

    for (const rel of relationships) {
      nodeSet.add(rel.source);
      nodeSet.add(rel.target);
      links.push({ source: rel.source, target: rel.target, type: rel.type, label: rel.label });
    }

    const nodes: GraphNode[] = [...nodeSet].map(id => ({
      id,
      type: this.inferNodeType(id, targetValue),
    }));

    // Create SVG
    const svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // SVG created

    // Zoom
    const g = svg.append('g');
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }) as any);

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#444')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Link labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '8px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.label || d.type);

    // Nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.type === 'target' ? 12 : 8)
      .attr('fill', d => NODE_COLORS[d.type] ?? NODE_COLORS.other ?? '#888888')
      .attr('stroke', '#222')
      .attr('stroke-width', 1.5)
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) this.simulation?.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) this.simulation?.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    // Node labels
    const nodeLabel = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('font-size', '9px')
      .attr('fill', '#ccc')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'target' ? -16 : -12)
      .text(d => d.id.length > 30 ? d.id.slice(0, 27) + '...' : d.id);

    // Tooltip
    node.append('title').text(d => `${d.id} (${d.type})`);

    // Simulation
    this.simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x ?? 0)
          .attr('y1', d => (d.source as GraphNode).y ?? 0)
          .attr('x2', d => (d.target as GraphNode).x ?? 0)
          .attr('y2', d => (d.target as GraphNode).y ?? 0);

        linkLabel
          .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
          .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

        node
          .attr('cx', d => d.x ?? 0)
          .attr('cy', d => d.y ?? 0);

        nodeLabel
          .attr('x', d => d.x ?? 0)
          .attr('y', d => d.y ?? 0);
      });
  }
}
