export const NODE_COLORS = {
  0: '#ef4444', // Red-500 (Core)
  1: '#f97316', // Orange-500 (Parent)
  2: '#3b82f6', // Blue-500 (Child)
  3: '#10b981', // Emerald-500 (Leaf)
  default: '#6b7280' // Gray-500
};

export const NODE_RADIUS = {
  0: 30,
  1: 20,
  2: 12,
  3: 8,
  default: 8
};

export const GRAPH_CONFIG = {
  width: 1200,
  height: 800,
  strength: -400, // Charge strength
  distance: 100, // Link distance
};