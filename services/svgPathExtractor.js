const extract = (data) => {
  console.log(data.intersections);
  const rooms = data.rooms || [];
  const entrances = data.entrances || [];
  const walkable = data.walkable || [];
  const intersections = data.intersections || [];

  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const getNode = (x, y, type, meta = {}, source = null) => {
    if (x == null || y == null || isNaN(x) || isNaN(y)) return null;

    const key = `${type}_${Math.round(x)},${Math.round(y)}`;

    if (nodeMap.has(key)) return nodeMap.get(key);

    const node = {
      id: key,
      type,
      x,
      y,
      ...meta,
      source,
    };

    nodeMap.set(key, node);
    nodes.push(node);

    return node;
  };

  // =========================
  // 1. WALKABLE NODES
  // =========================
  for (const w of walkable) {
    const a = getNode(
      w.x1,
      w.y1,
      "WALK",
      {},
      { svgId: w.id, type: "line-endpoint-a" },
    );

    const b = getNode(
      w.x2,
      w.y2,
      "WALK",
      {},
      { svgId: w.id, type: "line-endpoint-b" },
    );

    if (!a || !b) continue;

    const d = dist(a, b);

    edges.push({
      from: a.id,
      to: b.id,
      cost: d,
      type: "WALKABLE",
    });

    edges.push({
      from: b.id,
      to: a.id,
      cost: d,
      type: "WALKABLE",
    });
  }

  // =========================
  // 2. INTERSECTIONS
  // =========================
  for (const i of intersections) {
    const node = getNode(
      i.x,
      i.y,
      "JUNCTION",
      {
        intersectionId: i.id,
        radius: Math.max(i.rx, i.ry),
      },
      {
        svgId: i.id,
        type: "intersection",
      },
    );
  }

  // =========================
  // 3. CONNECT INTERSECTIONS
  // =========================

  const TOUCH_DISTANCE = 15;

  for (const i of intersections) {
    const iNode = nodes.find(
      (n) =>
        n.type === "JUNCTION" &&
        Math.round(n.x) === Math.round(i.x) &&
        Math.round(n.y) === Math.round(i.y),
    );

    if (!iNode) continue;

    const candidates = nodes.filter((n) => {
      if (n.type !== "WALK") return false;

      const d = dist(n, iNode);

      return d <= TOUCH_DISTANCE;
    });

    for (const walkNode of candidates) {
      const d = dist(iNode, walkNode);

      edges.push({
        from: iNode.id,
        to: walkNode.id,
        cost: d,
        type: "JUNCTION",
      });

      edges.push({
        from: walkNode.id,
        to: iNode.id,
        cost: d,
        type: "JUNCTION",
      });
    }
  }

  // =========================
  // 4. ROOMS (❌ NO LONGER NODES)
  // =========================
  const roomNodes = {};

  for (const r of rooms) {
    roomNodes[r.id] = {
      id: r.id,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
    };
  }

  // =========================
  // 5. ENTRANCES (STILL NODES)
  // =========================
  const entranceNodes = {};

  for (const e of entrances) {
    const node = getNode(
      e.x,
      e.y,
      "ENTRANCE",
      {
        entranceId: e.id,
        width: e.width,
        height: e.height,
      },
      {
        svgId: e.id,
        type: "entrance",
      },
    );

    if (node) entranceNodes[e.id] = node.id;
  }

  return {
    nodes,
    edges,
    roomNodes, // now metadata only
    entranceNodes,
    intersections,
  };
};

module.exports = { extract };
