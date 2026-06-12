const findShortestPath = (nodes, edges, startId, endId) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // =========================
  // 🧹 REMOVE DUPLICATE EDGES
  // =========================
  const edgeSet = new Set();
  const cleanEdges = [];

  for (const e of edges) {
    const key = `${e.from}->${e.to}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    cleanEdges.push(e);
  }

  // =========================
  // GRAPH BUILD
  // =========================
  const graph = {};
  for (const n of nodes) graph[n.id] = [];

  for (const e of cleanEdges) {
    graph[e.from].push({
      node: e.to,
      cost: e.cost,
      type: e.type,
      corridorId: e.corridorId || null,
    });
  }

  // =========================
  // HEURISTIC
  // =========================
  const heuristic = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * 0.6;

  // =========================
  // A* DATA STRUCTURES
  // =========================
  const openSet = new Set([startId]);
  const closedSet = new Set();
  const cameFrom = {};

  const gScore = {};
  const fScore = {};

  for (const n of nodes) {
    gScore[n.id] = Infinity;
    fScore[n.id] = Infinity;
  }

  gScore[startId] = 0;
  fScore[startId] = heuristic(nodeMap.get(startId), nodeMap.get(endId));

  // =========================
  // A* LOOP
  // =========================
  while (openSet.size > 0) {
    let current = null;

    for (const id of openSet) {
      if (current === null || fScore[id] < fScore[current]) {
        current = id;
      }
    }

    if (current === endId) break;

    openSet.delete(current);
    closedSet.add(current);

    const currentNode = nodeMap.get(current);

    for (const neighbor of graph[current] || []) {
      const neighborNode = nodeMap.get(neighbor.node);
      if (!neighborNode) continue;
      if (closedSet.has(neighbor.node)) continue;

      const isCorridor =
        neighbor.type === "CORRIDOR" || neighbor.type === "WALK_CONTINUITY";

      // =========================
      // COST MODEL
      // =========================
      let cost = neighbor.cost;

      if (isCorridor) cost *= 0.85;
      if (neighbor.type === "JUNCTION") cost *= 2.5;

      if (cameFrom[current] === neighbor.node) {
        cost *= 1.25;
      }

      const tentativeG = gScore[current] + cost;

      if (tentativeG < gScore[neighbor.node]) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentativeG;

        fScore[neighbor.node] =
          tentativeG + heuristic(neighborNode, nodeMap.get(endId));

        openSet.add(neighbor.node);
      }
    }
  }

  // =========================
  // REBUILD PATH (🔥 FIX DUPLICATES HERE)
  // =========================
  const path = [];
  const visited = new Set(); // 👈 KEY FIX
  let current = endId;

  while (current) {
    // prevent loops
    if (visited.has(current)) break;
    visited.add(current);

    path.unshift(current);
    current = cameFrom[current];
  }

  // validation
  if (path[0] !== startId) {
    return {
      path: [],
      debug: { error: "No valid corridor-safe path found" },
    };
  }

  // =========================
  // FINAL CLEAN PASS (extra safety)
  // =========================
  const cleanedPath = [];
  let last = null;

  for (const id of path) {
    if (id !== last) {
      cleanedPath.push(id);
      last = id;
    }
  }

  // =========================
  // DEBUG OUTPUT (DEDUPED STEPS)
  // =========================
  const steps = [];
  let totalCost = 0;

  const seen = new Set(); // 👈 KEY FIX

  for (let i = 0; i < cleanedPath.length; i++) {
    const node = nodeMap.get(cleanedPath[i]);

    // 🔥 skip duplicate consecutive nodes
    if (seen.has(node.id)) continue;
    seen.add(node.id);

    const step = {
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      svgId: node?.source?.svgId || null,
      svgType: node?.source?.type || null,
    };

    if (i > 0) {
      const prev = nodeMap.get(cleanedPath[i - 1]);

      const cost = Math.hypot(node.x - prev.x, node.y - prev.y);

      step.from = cleanedPath[i - 1];
      step.costFromPrev = cost;

      totalCost += cost;
    }

    steps.push(step);
  }

  return {
    path: cleanedPath,
    debug: {
      totalCost,
      steps,
    },
  };
};

module.exports = { findShortestPath };
