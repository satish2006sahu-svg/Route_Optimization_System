# 🚀 Route Optimization System

A production-grade web application for interactive route optimization using graph algorithms. Features Bellman-Ford and Floyd-Warshall shortest path algorithms with real-time traffic simulation and D3.js visualization.

## Features

- **7 Interactive Dashboards**: Home, Route Finder, Graph View, Algorithm Comparison, Traffic Simulation, Manage Cities, Analytics
- **Graph Algorithms**: Bellman-Ford (single-source) & Floyd-Warshall (all-pairs) implemented from scratch
- **D3.js Visualization**: Interactive force-directed graph with zoom, pan, drag, and path animation
- **Traffic Simulation**: Dynamic edge weight modification with real-time route recomputation
- **City/Road Management**: Full CRUD operations with input validation
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, D3.js v7 |
| Backend | Python 3, Flask, Flask-CORS |
| Data | JSON (structured for easy DB migration) |
| Algorithms | Bellman-Ford, Floyd-Warshall (from scratch) |

## Quick Start

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Run the application
python run.py
```

### Access
Open your browser at: **http://localhost:5000**

## Project Structure

```
route-optimizer/
├── backend/
│   ├── app.py              # Flask entry point
│   ├── algorithms/
│   │   ├── bellman_ford.py  # Bellman-Ford algorithm
│   │   └── floyd_warshall.py# Floyd-Warshall algorithm
│   ├── routes/
│   │   └── api.py           # REST API endpoints
│   ├── services/
│   │   └── graph_service.py # Business logic
│   ├── models/
│   │   └── graph_model.py   # Data models
│   └── data/
│       └── cities.json      # Sample dataset
├── frontend/
│   ├── index.html           # SPA shell
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Dashboard pages
│       ├── services/        # API client
│       └── styles/          # CSS design system
├── run.py                   # Convenience runner
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/cities | List all cities |
| GET | /api/graph | Full graph data |
| POST | /api/route | Compute shortest path |
| POST | /api/city | Add a city |
| POST | /api/road | Add a road |
| PUT | /api/traffic | Update traffic multiplier |
| DELETE | /api/city/{id} | Delete a city |
| GET | /api/analytics | Graph statistics |
| POST | /api/compare | Compare both algorithms |

## Algorithms

### Bellman-Ford
- **Complexity**: O(V × E) time, O(V) space
- **Features**: Negative weight support, negative cycle detection
- **Use case**: Single-source shortest path queries

### Floyd-Warshall
- **Complexity**: O(V³) time, O(V²) space
- **Features**: All-pairs shortest paths, path reconstruction matrix
- **Use case**: Dense graphs, precomputed distance tables

## License

MIT
