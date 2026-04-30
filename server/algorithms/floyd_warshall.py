"""
Floyd-Warshall Algorithm — All-pairs shortest paths.

Features:
  - Computes shortest paths between every pair of vertices
  - Maintains a path reconstruction (next-hop) matrix
  - Detects negative cycles (diagonal < 0)

Time Complexity: O(V^3)
Space Complexity: O(V^2)
"""

import time


def floyd_warshall(graph, source=None, destination=None):
    """
    Run Floyd-Warshall on the entire graph.

    Parameters
    ----------
    graph : dict
        Adjacency list: { node: [ (neighbor, weight), ... ], ... }
    source : str, optional
        If provided with destination, extract that specific path.
    destination : str, optional
        If provided with source, extract that specific path.

    Returns
    -------
    dict with keys:
        dist_matrix    – 2D dict of shortest distances
        next_matrix    – 2D dict for path reconstruction
        path           – list (if source & destination given)
        distance       – float (if source & destination given)
        has_negative_cycle – bool
        execution_time_ms  – float
    """
    start_time = time.perf_counter()

    # Collect all vertices
    vertices = set(graph.keys())
    for node in graph:
        for neighbor, _ in graph[node]:
            vertices.add(neighbor)
    vertices = sorted(vertices)  # deterministic order
    n = len(vertices)
    idx = {v: i for i, v in enumerate(vertices)}

    INF = float('inf')

    # 1. Initialise distance and next-hop matrices
    dist = [[INF] * n for _ in range(n)]
    nxt = [[None] * n for _ in range(n)]

    for i in range(n):
        dist[i][i] = 0

    for u in graph:
        for v, w in graph[u]:
            ui, vi = idx[u], idx[v]
            if w < dist[ui][vi]:  # keep smallest if parallel edges
                dist[ui][vi] = w
                nxt[ui][vi] = vi

    # 2. Main DP loop
    for k in range(n):
        for i in range(n):
            if dist[i][k] == INF:
                continue
            for j in range(n):
                if dist[k][j] == INF:
                    continue
                new_dist = dist[i][k] + dist[k][j]
                if new_dist < dist[i][j]:
                    dist[i][j] = new_dist
                    nxt[i][j] = nxt[i][k]

    # 3. Detect negative cycles (any diagonal < 0)
    has_negative_cycle = any(dist[i][i] < 0 for i in range(n))

    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000

    # Convert matrices to dicts for JSON serialisation
    dist_matrix = {}
    next_matrix = {}
    for i, u in enumerate(vertices):
        dist_matrix[u] = {}
        next_matrix[u] = {}
        for j, v in enumerate(vertices):
            d = dist[i][j]
            dist_matrix[u][v] = d if d != INF else None
            next_matrix[u][v] = vertices[nxt[i][j]] if nxt[i][j] is not None else None

    result = {
        'dist_matrix': dist_matrix,
        'next_matrix': next_matrix,
        'has_negative_cycle': has_negative_cycle,
        'execution_time_ms': round(execution_time_ms, 4),
        'algorithm': 'floyd-warshall',
    }

    # Optional: extract specific path
    if source is not None and destination is not None:
        path = _reconstruct_path(nxt, idx, vertices, source, destination)
        d = dist_matrix.get(source, {}).get(destination)
        result['path'] = path
        result['distance'] = d

    return result


def _reconstruct_path(nxt, idx, vertices, source, destination):
    """Reconstruct path from source to destination using next-hop matrix."""
    if source not in idx or destination not in idx:
        return []
    si, di = idx[source], idx[destination]
    if nxt[si][di] is None:
        return []

    path = [source]
    current = si
    visited = set()
    while current != di:
        if current in visited:
            return []  # cycle
        visited.add(current)
        current = nxt[current][di]
        if current is None:
            return []
        path.append(vertices[current])

    return path
