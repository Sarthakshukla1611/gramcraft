import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Enable CORS
    cors_origins = os.getenv("CORS_ORIGIN", "*").split(",")
    CORS(app, origins=cors_origins)

    from .routes import api_bp
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return {
            "name": "GramCraft ML Intelligence Service",
            "version": "1.0.0",
            "endpoints": [
                "/health",
                "/score",
                "/score/batch",
                "/recommend",
                "/forecast",
                "/peers",
                "/optimize-budget",
                "/simulate",
                "/anomalies"
            ]
        }

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
