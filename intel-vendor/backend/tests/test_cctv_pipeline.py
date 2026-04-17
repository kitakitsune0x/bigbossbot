"""Regression tests for CCTV ingestion and persistence."""

import threading

from services import cctv_pipeline


class DummyIngestor(cctv_pipeline.BaseCCTVIngestor):
    def __init__(self, cameras):
        self._cameras = cameras

    def fetch_data(self):
        return self._cameras


def test_ingestor_can_run_from_another_thread(tmp_path, monkeypatch):
    db_path = tmp_path / "data" / "cctv.db"
    monkeypatch.setattr(cctv_pipeline, "DB_PATH", db_path)

    ingestor = DummyIngestor(
        [
            {
                "id": "cam-1",
                "source_agency": "Test",
                "lat": 51.5,
                "lon": -0.12,
                "direction_facing": "North",
                "media_url": "https://example.com/camera.jpg",
                "refresh_rate_seconds": 30,
            }
        ]
    )

    thread = threading.Thread(target=ingestor.ingest)
    thread.start()
    thread.join()

    cameras = cctv_pipeline.get_all_cameras()
    assert len(cameras) == 1
    assert cameras[0]["id"] == "cam-1"
    assert cameras[0]["media_type"] == "image"


def test_ingest_updates_existing_rows_in_persistent_data_dir(tmp_path, monkeypatch):
    db_path = tmp_path / "persistent" / "cctv.db"
    monkeypatch.setattr(cctv_pipeline, "DB_PATH", db_path)

    DummyIngestor(
        [
            {
                "id": "cam-2",
                "source_agency": "Test",
                "lat": 40.71,
                "lon": -74.0,
                "direction_facing": "East",
                "media_url": "https://example.com/old.jpg",
                "refresh_rate_seconds": 60,
            }
        ]
    ).ingest()
    DummyIngestor(
        [
            {
                "id": "cam-2",
                "source_agency": "Test",
                "lat": 40.71,
                "lon": -74.0,
                "direction_facing": "East",
                "media_url": "https://example.com/live.m3u8",
                "refresh_rate_seconds": 60,
            }
        ]
    ).ingest()

    cameras = cctv_pipeline.get_all_cameras()
    assert db_path.exists()
    assert len(cameras) == 1
    assert cameras[0]["media_url"] == "https://example.com/live.m3u8"
    assert cameras[0]["media_type"] == "hls"
