"""
Route Optimization System — Flask Application Entry Point.

Configures CORS, registers API blueprint, and serves the frontend.
"""

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.routes.api import api_bp, init_routes
from backend.services.graph_service import GraphService

# ------------------------------------------------------------------ #
#  Application factory
# ------------------------------------------------------------------ #

def create_app():
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'),
        static_url_path='',
    )

    # Enable CORS for all origins during development
    CORS(app)

    # Initialise the service layer (singleton for this process)
    service = GraphService()
    init_routes(service)

    # Register API blueprint
    app.register_blueprint(api_bp)

    # ---- Serve frontend SPA ---- #
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>')
    def serve_static(path):
        # Try to serve static file; fall back to index.html for SPA routing
        full_path = os.path.join(app.static_folder, path)
        if os.path.isfile(full_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # ---- Global error handlers ---- #
    @app.errorhandler(404)
    def not_found(e):
        return {'success': False, 'data': None, 'error': 'Not found'}, 404

    @app.errorhandler(500)
    def internal_error(e):
        return {'success': False, 'data': None, 'error': 'Internal server error'}, 500

    return app


# ------------------------------------------------------------------ #
#  Direct execution
# ------------------------------------------------------------------ #

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
