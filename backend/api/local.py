import os

from api.app import create_app as build_app
from api.dependencies import get_service
from repositories.memory import MemoryJobs, MemoryVideos
from usecases.backup import BackupService


def create_app():
    if not os.environ.get("BACKEND_LOCAL_TOKEN"):
        raise RuntimeError("Set BACKEND_LOCAL_TOKEN for the local-only memory server")
    app = build_app()
    service = BackupService(MemoryVideos(), MemoryJobs())
    app.dependency_overrides[get_service] = lambda: service
    return app
