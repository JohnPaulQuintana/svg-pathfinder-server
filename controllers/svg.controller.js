const svgParser = require("../services/svgParser");
const svgPathExtractor = require("../services/svgPathExtractor");
const pathService = require("../services/pathService");
const nodePath = require("path");
const fs = require("fs");

exports.testSVG = async (req, res) => {
  try {
    const { filename, startRoomId: userStart, endRoomId: userEnd } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: "No filename provided",
      });
    }

    if (userStart && typeof userStart !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid start room",
      });
    }

    if (userEnd && typeof userEnd !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid end room",
      });
    }

    // Prevent path traversal
    const safeFilename = nodePath.basename(filename);

    const filePath = nodePath.join(__dirname, "../uploads", safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    // Extra file size protection
    const stats = fs.statSync(filePath);

    if (stats.size > 500 * 1024) {
      return res.status(400).json({
        success: false,
        error: "SVG exceeds size limit",
      });
    }

    const svg = fs.readFileSync(filePath, "utf8");

    if (!svg.includes("<svg")) {
      return res.status(400).json({
        success: false,
        error: "Invalid SVG",
      });
    }

    const parsed = await svgParser.parse(svg);
    const result = svgPathExtractor.extract(parsed);

    const { nodes, edges, roomNodes } = result;

    // SVG complexity protection
    if (nodes.length > 5000) {
      return res.status(400).json({
        success: false,
        error: "SVG too complex (nodes)",
      });
    }

    if (edges.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "SVG too complex (edges)",
      });
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // =====================================================
    // WALK CONTINUITY (FIXED)
    // =====================================================
    const grouped = new Map();

    for (const node of nodes) {
      if (node.type !== "WALK" || !node.source?.svgId) continue;

      if (!grouped.has(node.source.svgId)) {
        grouped.set(node.source.svgId, []);
      }

      grouped.get(node.source.svgId).push(node);
    }

    const MAX_CONTINUITY_DISTANCE = 50;

    for (const group of grouped.values()) {
      if (group.length < 2) continue;

      group.sort((a, b) => {
        const da = a.x + a.y;
        const db = b.x + b.y;
        return da - db;
      });

      for (let i = 0; i < group.length - 1; i++) {
        const a = group[i];
        const b = group[i + 1];

        const d = Math.hypot(a.x - b.x, a.y - b.y);

        // Prevent teleports
        if (d > MAX_CONTINUITY_DISTANCE) {
          console.warn(
            "Skipping invalid continuity",
            a.id,
            "->",
            b.id,
            "distance:",
            d,
          );
          continue;
        }

        edges.push({
          from: a.id,
          to: b.id,
          cost: d,
          type: "WALK_CONTINUITY",
        });

        edges.push({
          from: b.id,
          to: a.id,
          cost: d,
          type: "WALK_CONTINUITY",
        });
      }
    }

    // =====================================================
    // ROOM CLUSTER DETECTION
    // =====================================================
    const roomClusters = new Map();
    for (const node of nodes) {
      if (node.type !== "JUNCTION") continue;
      const tag = node.intersectionId || node.source?.svgId || "";
      const match = tag.match(/Room[_\s]?\d+|Entrance/gi);
      if (!match) continue;
      const roomId = match[0];
      if (!roomClusters.has(roomId)) roomClusters.set(roomId, []);
      roomClusters.get(roomId).push(node);
    }

    const roomAnchors = {};
    for (const [roomId, cluster] of roomClusters.entries()) {
      if (!cluster.length) continue;
      const cx = cluster.reduce((s, n) => s + n.x, 0) / cluster.length;
      const cy = cluster.reduce((s, n) => s + n.y, 0) / cluster.length;
      let best = null;
      let bestScore = Infinity;
      for (const n of cluster) {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d < bestScore) {
          bestScore = d;
          best = n;
        }
      }
      roomAnchors[roomId] = best?.id;
    }

    // =====================================================
    // START / END (USER-SELECTED)
    // =====================================================
    const startRoomId = userStart || "Entrance";
    const endRoomId = (userEnd || "Entrance").replace(/\s+/g, "_");

    console.log("--------CONTROLLER------");
    console.log(roomAnchors);
    console.log(roomAnchors[startRoomId]);
    console.log(roomAnchors[endRoomId]);

    const startNavId = roomAnchors[startRoomId];
    const endNavId = roomAnchors[endRoomId];

    if (!startNavId || !endNavId) {
      return res.status(400).json({
        success: false,
        error: "Room anchors not found in node clusters",
      });
    }

    // =====================================================
    // NAV GRAPH
    // =====================================================
    const navNodes = nodes.filter(
      (n) => n.type === "WALK" || n.type === "JUNCTION",
    );
    const navEdges = edges.filter((e) => {
      const from = nodeMap.get(e.from);
      const to = nodeMap.get(e.to);
      return (
        from &&
        to &&
        (from.type === "WALK" || from.type === "JUNCTION") &&
        (to.type === "WALK" || to.type === "JUNCTION")
      );
    });

    // =====================================================
    // PATH (A*)
    // =====================================================
    const path = pathService.findShortestPath(
      navNodes,
      navEdges,
      startNavId,
      endNavId,
    );

    console.log("=== LONG EDGES ===");

    for (const e of navEdges) {
      const from = nodeMap.get(e.from);
      const to = nodeMap.get(e.to);

      if (!from || !to) continue;

      const d = Math.hypot(from.x - to.x, from.y - to.y);

      if (d > 100) {
        console.log({
          from: e.from,
          to: e.to,
          type: e.type,
          distance: Math.round(d),
        });
      }
    }

    // =====================================================
    // ROOM ANCHOR WRAPPING (UI)
    // =====================================================
    if (path.path.length > 0) {
      path.path.unshift(startRoomId);
      path.path.push(endRoomId);

      const startNode = nodeMap.get(startNavId);
      const endNode = nodeMap.get(endNavId);

      path.debug.steps.unshift({
        id: "START_ROOM",
        type: "ROOM",
        roomId: startRoomId,
        navId: startNavId,
        x: startNode?.x,
        y: startNode?.y,
      });

      path.debug.steps.push({
        id: "END_ROOM",
        type: "ROOM",
        roomId: endRoomId,
        navId: endNavId,
        x: endNode?.x,
        y: endNode?.y,
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    return res.json({
      success: true,
      svg,
      roomNodes,
      roomAnchors,
      startRoomId,
      endRoomId,
      path,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.uploadSVG = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "failed",
        error: "No file uploaded",
      });
    }

    const content = fs.readFileSync(req.file.path, "utf8");

    if (!content.includes("<svg")) {
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        status: "failed",
        error: "Invalid SVG file",
      });
    }

    return res.json({
      status: "success",
      filename: req.file.filename,
    });
  } catch (err) {
    return res.status(500).json({
      status: "failed",
      error: err.message,
    });
  }
};
