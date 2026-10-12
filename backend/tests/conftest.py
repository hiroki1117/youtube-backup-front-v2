import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from api.dependencies import get_service
from repositories.memory import MemoryJobs, MemoryVideos
from usecases.backup import BackupService


@pytest.fixture
def service():
    return BackupService(MemoryVideos(), MemoryJobs(), clock=lambda: 1791763200)


@pytest.fixture
def client(service, monkeypatch):
    monkeypatch.setenv("BACKEND_LOCAL_TOKEN", "test-local-token")
    app = create_app()
    app.dependency_overrides[get_service] = lambda: service
    with TestClient(app, headers={"Authorization": "Bearer test-local-token"}) as client:
        yield client
