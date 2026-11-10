import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.environ["SF_DATA_DIR"] = tempfile.mkdtemp(prefix="sf-test-")
os.environ["GEMINI_API_KEY"] = ""
os.environ["EDITOR_TOKEN"] = ""
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def samples(tmp_path_factory):
    import make_samples
    return make_samples.make(tmp_path_factory.mktemp("samples"))


@pytest.fixture(scope="session")
def public():
    from app.api import create_app
    return TestClient(create_app(False))


@pytest.fixture(scope="session")
def editor():
    from app.api import create_app
    return TestClient(create_app(True))
