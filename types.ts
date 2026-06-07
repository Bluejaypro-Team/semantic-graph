export interface GraphNode {
  id: string;
  level: number;
  label?: string; // If different from ID
  description?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  relatedConcepts: string[];
}

export interface GenerationStatus {
  step: 'idle' | 'searching' | 'thinking' | 'rendering' | 'error' | 'complete';
  message?: string;
}

export enum HierarchyLevel {
  CORE = 0,
  PARENT = 1,
  CHILD = 2,
  LEAF = 3
}