const build = (data) => {
  const nodes = [];
  const edges = [];

  const walkable = data.walkable || [];
  const rooms = data.rooms || [];
  const entrances = data.entrances || [];

  const nodeMap = new Map();
  const roomNodeMap = {};

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // =========================
  // NODE FACTORY (DEDUP SAFE)
  // =========================
  const getNode = (x, y, prefix = "N") => {
    if (x == null || y == null || isNaN(x) || isNaN(y)) return null;

    const key = `${Math.round(x)},${Math.round(y)}`;
    const id = `${prefix}_${key}`;

    if (nodeMap.has(id)) return nodeMap.get(id);

    const node = { id, x, y };
    nodeMap.set(id, node);
    nodes.push(node);

    return node;
  };

  // =========================
  // INTERSECTION
  // =========================
  const getIntersection = (a1, a2, b1, b2) => {
    const denom = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);

    if (denom === 0) return null;

    const t =
      ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / denom;

    const u =
      -((a1.x - a2.x) * (a1.y - b1.y) - (a1.y - a2.y) * (a1.x - b1.x)) / denom;

    if (t < 0 || t > 1 || u < 0 || u > 1) return null;

    return {
      x: a1.x + t * (a2.x - a1.x),
      y: a1.y + t * (a2.y - a1.y),
    };
  };

  // =========================
  // SEGMENTS
  // =========================
  const segments = walkable.map((w) => ({
    id: w.id,
    a: { x: w.x1, y: w.y1 },
    b: { x: w.x2, y: w.y2 },
  }));

  // =========================
  // CREATE HALLWAY NODES ONLY ONCE
  // =========================
  const segmentNodes = new Map();
  // key: segmentId -> {aNode, bNode}

  for (const s of segments) {
    const a = getNode(s.a.x, s.a.y, "H");
    const b = getNode(s.b.x, s.b.y, "H");

    if (!a || !b) continue;

    segmentNodes.set(s.id, { a, b });

    edges.push({
      from: a.id,
      to: b.id,
      cost: dist(a, b),
    });
  }

  // =========================
  // INTERSECTIONS (CLEAN SPLIT)
  // =========================
  const intersectionMap = new Map();

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];

      const inter = getIntersection(s1.a, s1.b, s2.a, s2.b);
      if (!inter) continue;

      const key = `${Math.round(inter.x)},${Math.round(inter.y)}`;

      if (intersectionMap.has(key)) continue;

      const iNode = getNode(inter.x, inter.y, "I");
      if (!iNode) continue;

      intersectionMap.set(key, iNode.id);

      const n1 = segmentNodes.get(s1.id);
      const n2 = segmentNodes.get(s2.id);

      if (!n1 || !n2) continue;

      edges.push(
        { from: n1.a.id, to: iNode.id, cost: dist(n1.a, iNode) },
        { from: iNode.id, to: n1.b.id, cost: dist(iNode, n1.b) },

        { from: n2.a.id, to: iNode.id, cost: dist(n2.a, iNode) },
        { from: iNode.id, to: n2.b.id, cost: dist(iNode, n2.b) },
      );
    }
  }

  // =========================
  // CONNECT FUNCTION (NO DUPLICATES)
  // =========================
  const connectToNetwork = (node, count = 3) => {
    const candidates = nodes
      .filter((n) => n.id.startsWith("H") || n.id.startsWith("I"))
      .map((n) => ({
        node: n,
        d: Math.hypot(node.x - n.x, node.y - n.y),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, count);

    for (const c of candidates) {
      edges.push(
        { from: node.id, to: c.node.id, cost: c.d },
        { from: c.node.id, to: node.id, cost: c.d },
      );
    }
  };

  // =========================
  // ROOMS
  // =========================
  for (const r of rooms) {
    const node = getNode(r.x, r.y, "R");
    if (!node) continue;

    roomNodeMap[r.id] = node.id;
    connectToNetwork(node);
  }

  // =========================
  // ENTRANCES
  // =========================
  for (const e of entrances) {
    const node = getNode(e.x, e.y, "E");
    if (!node) continue;

    connectToNetwork(node);
  }

  return { nodes, edges, roomNodeMap };
};

const buildAdjacency = (nodes, edges) => {
  const graph = {};

  for (const n of nodes) {
    graph[n.id] = [];
  }

  for (const e of edges) {
    if (!graph[e.from]) graph[e.from] = [];
    if (!graph[e.to]) graph[e.to] = [];

    graph[e.from].push({
      node: e.to,
      cost: e.cost,
    });

    graph[e.to].push({
      node: e.from,
      cost: e.cost,
    });
  }

  return graph;
};

module.exports = { build, buildAdjacency };
