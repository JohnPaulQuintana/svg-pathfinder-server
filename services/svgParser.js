const svgson = require("svgson");

function cleanId(id = "") {
  return id
    .replace(/\s+/g, "_") // spaces → _
    .replace(/_and_\d+/g, "") // remove _and_123 patterns
    .replace(/\d+$/g, "") // remove trailing digits
    .replace(/_+/g, "_") // collapse multiple _
    .replace(/^_|_$/g, ""); // trim _
}

exports.parse = async (svgString) => {
  const json = await svgson.parse(svgString);

  if (!json) {
    throw new Error("SVG parse failed: empty result");
  }

  const rooms = [];
  const walkable = [];
  const entrances = [];
  const intersections = [];

  function walk(node) {
    if (!node) return;

    const id = node.attributes?.id || "";
    const name = (node.name || "").toLowerCase();

    // =========================
    // ROOMS
    // =========================
    if (name === "rect") {
      rooms.push({
        // id: cleanId(id),
        id: id,
        x: Number(node.attributes?.x ?? 0),
        y: Number(node.attributes?.y ?? 0),
        width: Number(node.attributes?.width ?? 0),
        height: Number(node.attributes?.height ?? 0),
      });
    }

    // =========================
    // ENTRANCES
    // =========================
    if (name === "rect" && id.toLowerCase().includes("entrance")) {
      entrances.push({
        id: cleanId(id),
        x: Number(node.attributes?.x ?? 0),
        y: Number(node.attributes?.y ?? 0),
        width: Number(node.attributes?.width ?? 0),
        height: Number(node.attributes?.height ?? 0),
      });
    }

    // =========================
    // WALKABLE LINES
    // =========================
    if (name === "line") {
      walkable.push({
        id: cleanId(id),
        x1: Number(node.attributes?.x1 ?? 0),
        y1: Number(node.attributes?.y1 ?? 0),
        x2: Number(node.attributes?.x2 ?? 0),
        y2: Number(node.attributes?.y2 ?? 0),
      });
    }

    // =========================
    // INTERSECTIONS (ELLIPSES)
    // =========================
    if (name === "ellipse" || name === "circle") {
      const cx = Number(node.attributes?.cx ?? 0);
      const cy = Number(node.attributes?.cy ?? 0);

      const rx =
        name === "circle"
          ? Number(node.attributes?.r ?? 0)
          : Number(node.attributes?.rx ?? 0);

      const ry =
        name === "circle"
          ? Number(node.attributes?.r ?? 0)
          : Number(node.attributes?.ry ?? 0);

      if (rx < 2 || ry < 2) return;

      intersections.push({
        id: cleanId(id) || "",
        x: cx,
        y: cy,
        rx,
        ry,
      });
    }

    for (const child of node.children || []) {
      walk(child);
    }
  }

  walk(json);
  console.log("-------------ROOM--------------------");
  console.log(rooms);
  console.log("-------------ROOM END--------------------\n");
  console.log("-------------Walkable--------------------");
  console.log(walkable);
  console.log("-------------Walkable END--------------------\n");
  console.log("-------------intersections--------------------");
  console.log(intersections);
  console.log("-------------intersections END--------------------\n");
  return {
    rooms,
    walkable,
    entrances,
    intersections, // 🔥 NEW
  };
};
