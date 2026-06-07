import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode } from '../types';
import { NODE_COLORS, NODE_RADIUS } from '../constants';

interface GraphVisualizerProps {
  data: GraphData;
}

// Internal types for D3 simulation nodes/links (D3 mutates these)
interface D3Node extends GraphNode {
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  type: string;
}

const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);

  useEffect(() => {
    // Defensive checks for data structure
    const nodesRaw = data?.nodes || [];
    const edgesRaw = data?.edges || [];

    if (!nodesRaw.length || !svgRef.current || !containerRef.current) return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Deep copy data to avoid React strict mode double-invocation mutation issues
    const nodes: D3Node[] = nodesRaw.map(d => ({ ...d }));
    const links: D3Link[] = edgesRaw.map(d => ({ ...d }));

    const svg = d3.select(svgRef.current)
      .attr("id", "graph-svg") // Add ID for export selection
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font-family: sans-serif;"); // Default font

    // Container for zooming
    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Forces
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => {
         const r = NODE_RADIUS[d.level as keyof typeof NODE_RADIUS] || NODE_RADIUS.default;
         return r * 1.5; 
      }));

    // Arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Adjust based on node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#6b7280")
      .attr("d", "M0,-5L10,0L0,5");

    // Links
    const link = g.append("g")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow-end)");

    // Link Labels
    const linkLabel = g.append("g")
        .attr("class", "link-labels")
        .selectAll("text")
        .data(links)
        .join("text")
        .attr("fill", "#71717a") // Zinc 500
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .attr("text-anchor", "middle")
        .attr("dy", -5)
        .text(d => d.type);


    // Nodes
    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "grab")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Circles
    node.append("circle")
      .attr("r", d => NODE_RADIUS[d.level as keyof typeof NODE_RADIUS] || NODE_RADIUS.default)
      .attr("fill", d => NODE_COLORS[d.level as keyof typeof NODE_COLORS] || NODE_COLORS.default)
      .on("mouseover", (event, d) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null));

    // Node Labels
    const labels = node.append("text")
      .attr("x", d => (NODE_RADIUS[d.level as keyof typeof NODE_RADIUS] || NODE_RADIUS.default) + 5)
      .attr("y", 4)
      .text(d => d.label || d.id)
      .attr("font-family", "sans-serif")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("pointer-events", "none");

    // Create outline for readability (stroke effect)
    labels.clone(true).lower()
      .attr("fill", "none")
      .attr("stroke", "#09090b")
      .attr("stroke-width", 3);
      
    // Set fill for the main text
    labels.attr("fill", "#e4e4e7"); // Zinc 200

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as D3Node).x!)
        .attr("y1", d => (d.source as D3Node).y!)
        .attr("x2", d => (d.target as D3Node).x!)
        .attr("y2", d => (d.target as D3Node).y!);

      linkLabel
        .attr("x", d => ((d.source as D3Node).x! + (d.target as D3Node).x!) / 2)
        .attr("y", d => ((d.source as D3Node).y! + (d.target as D3Node).y!) / 2);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="relative w-full h-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl" ref={containerRef}>
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-sm p-3 rounded-lg border border-zinc-700 text-xs pointer-events-none select-none">
         <h4 className="font-bold mb-2 text-zinc-300">Hierarchy Levels</h4>
         <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: NODE_COLORS[0]}}></div>
                <span>Core Topic</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: NODE_COLORS[1]}}></div>
                <span>Parent Domain</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: NODE_COLORS[2]}}></div>
                <span>Child Concept</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: NODE_COLORS[3]}}></div>
                <span>Leaf / Example</span>
            </div>
         </div>
         {data.relatedConcepts && data.relatedConcepts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
                <h4 className="font-bold mb-2 text-zinc-300">Related Concepts</h4>
                <div className="flex flex-wrap gap-1.5">
                    {data.relatedConcepts.map(concept => (
                        <span key={concept} className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-xs">
                            {concept}
                        </span>
                    ))}
                </div>
            </div>
         )}
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur p-4 rounded-lg border border-zinc-700 max-w-sm shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
              <h3 className="font-bold text-lg text-white mb-1">{hoveredNode.label}</h3>
              <div className="text-zinc-400 text-sm mb-2">ID: {hoveredNode.id}</div>
              {hoveredNode.description && (
                  <p className="text-zinc-300 text-sm leading-relaxed border-t border-zinc-800 pt-2 mt-2">
                      {hoveredNode.description}
                  </p>
              )}
          </div>
      )}
    </div>
  );
};

export default GraphVisualizer;