"""
Bellman-Ford Algorithm — Single-source shortest path.

Features:
  - Handles negative edge weights
  - Detects negative-weight cycles
  - Returns shortest distances and reconstructed paths
  
Time Complexity: O(V * E)
Space Complexity: O(V)
"""

import time


def bellman_ford(graph, source, destination=None):
    """
    Run Bellman-Ford from `source`.

    Parameters
    ----------
    graph : dict
        Adjacency list: { node: [ (neighbor, weight), ... ], ... }
    source : str
        Starting node id/name.
    destination : str, optional
        If provided, only reconstruct the path to this node.

    Returns
    -------
    dict with keys:
        distances    – dict of shortest distances from source
        previous     – dict used for path reconstruction
        path         – list of nodes from source → destination (if destination given)
        distance     – shortest distance to destination (if destination given)
        has_negative_cycle – bool
        execution_time_ms  – float
    """
    start_time = time.perf_counter()

    # Collect all vertices
    vertices = set(graph.keys())
    for node in list(graph.keys()):
        for neighbor, _ in graph[node]:
            vertices.add(neighbor)

    # 1. Initialise distances and predecessor map
    dist = {v: float('inf') for v in vertices}
    prev = {v: None for v in vertices}
    dist[source] = 0

    # Collect all edges once
    edges = []
    for u in graph:
        for v, w in graph[u]:
            edges.append((u, v, w))

    # 2. Relax edges |V| - 1 times
    num_vertices = len(vertices)
    for _ in range(num_vertices - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                updated = True
        # Early exit if no update occurred
        if not updated:
            break

    # 3. Check for negative-weight cycles
    has_negative_cycle = False
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            has_negative_cycle = True
            break

    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000

    result = {
        'distances': {k: v if v != float('inf') else None for k, v in dist.items()},
        'previous': prev,
        'has_negative_cycle': has_negative_cycle,
        'execution_time_ms': round(execution_time_ms, 4),
        'algorithm': 'bellman-ford',
    }

    # Path reconstruction to a specific destination
    if destination is not None:
        path = _reconstruct_path(prev, source, destination)
        result['path'] = path
        result['distance'] = dist.get(destination, float('inf'))
        if result['distance'] == float('inf'):
            result['distance'] = None
            result['path'] = []

    return result


def _reconstruct_path(prev, source, destination):
    """Walk backwards through `prev` to build the path list."""
    path = []
    current = destination
    visited = set()
    while current is not None:
        if current in visited:
            return []  # cycle detected during reconstruction
        visited.add(current)
        path.append(current)
        if current == source:
            break
        current = prev.get(current)
    else:
        return []  # no path found

    path.reverse()
    return path if path and path[0] == source else []
