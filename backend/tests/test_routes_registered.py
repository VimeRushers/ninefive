"""
Verify all stub routes are registered (500 not 404).
404 = router not mounted. 500 = stub raised NotImplementedError as expected.
"""
import pytest


@pytest.mark.parametrize("method,path", [
    ("POST", "/profile"),
    ("GET",  "/search?q=test"),
    ("GET",  "/tenders/some-id/analysis"),
    ("GET",  "/buyers/some-id/profile"),
])
def test_stub_route_is_registered_not_404(client, method, path):
    response = client.request(method, path)
    assert response.status_code != 404, (
        f"{method} {path} returned 404 — router may not be mounted"
    )
