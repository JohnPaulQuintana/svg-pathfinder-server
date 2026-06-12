function heuristic(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// MIN-HEAP priority queue (important fix)
class MinHeap {
  constructor() {
    this.data = [];
  }

  push(item) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 1) return this.data.pop();
    const top = this.data[0];
    this.data[0] = this.data.pop();
    this.bubbleDown(0);
    return top;
  }

  bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p].f <= this.data[i].f) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  bubbleDown(i) {
    while (true) {
      let l = i * 2 + 1;
      let r = i * 2 + 2;
      let smallest = i;

      if (l < this.data.length && this.data[l].f < this.data[smallest].f) {
        smallest = l;
      }

      if (r < this.data.length && this.data[r].f < this.data[smallest].f) {
        smallest = r;
      }

      if (smallest === i) break;

      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }

  isEmpty() {
    return this.data.length === 0;
  }
}

exports.aStar = (startId, goalId, graph, nodeMap) => {
  if (!nodeMap[startId] || !nodeMap[goalId]) return null;

  const open = new MinHeap();

  const cameFrom = {};
  const gScore = {};
  const fScore = {};
  const closed = new Set();

  for (const id in nodeMap) {
    gScore[id] = Infinity;
    fScore[id] = Infinity;
  }

  gScore[startId] = 0;
  fScore[startId] = heuristic(nodeMap[startId], nodeMap[goalId]);

  open.push({ id: startId, f: fScore[startId] });

  while (!open.isEmpty()) {
    const current = open.pop().id;

    if (current === goalId) {
      const path = [];
      let temp = current;

      while (temp) {
        path.push(temp);
        temp = cameFrom[temp];
      }

      return path.reverse();
    }

    if (closed.has(current)) continue;
    closed.add(current);

    for (const neighbor of graph[current] || []) {
      const neighborId = neighbor.node;
      const cost = neighbor.cost;

      const tentativeG = gScore[current] + cost;

      if (tentativeG < (gScore[neighborId] ?? Infinity)) {
        cameFrom[neighborId] = current;
        gScore[neighborId] = tentativeG;

        const h = heuristic(nodeMap[neighborId], nodeMap[goalId]);
        fScore[neighborId] = tentativeG + h;

        open.push({
          id: neighborId,
          f: fScore[neighborId],
        });
      }
    }
  }

  return null;
};