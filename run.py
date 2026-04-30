"""
Run script - convenience entry point.
Usage:  python run.py
"""
from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    print("\n  Route Optimization System")
    print("  Backend running at http://localhost:5000")
    print("  Frontend served at http://localhost:5000\n")
    app.run(debug=True, port=5000, host='0.0.0.0')
