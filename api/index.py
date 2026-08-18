import os
import sys

# Añadir el directorio backend al PATH para que los imports de 'app' funcionen en Vercel Serverless
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(parent_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
