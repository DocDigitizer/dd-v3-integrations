"""Unit tests for exception hierarchy and raise_for_status."""

import pytest

from docdigitizer.exceptions import (
    AuthenticationError,
    DocDigitizerError,
    RateLimitError,
    ServerError,
    ServiceUnavailableError,
    TimeoutError,
    ValidationError,
    raise_for_status,
)


class TestRaiseForStatus:
    def test_200_no_raise(self):
        raise_for_status(200)  # should not raise

    def test_201_no_raise(self):
        raise_for_status(201)

    def test_400_raises_validation(self):
        with pytest.raises(ValidationError) as exc_info:
            raise_for_status(400, messages=["Invalid PDF"])
        assert exc_info.value.status_code == 400
        assert "Invalid PDF" in str(exc_info.value)

    def test_401_raises_authentication(self):
        with pytest.raises(AuthenticationError) as exc_info:
            raise_for_status(401, trace_id="ABC1234")
        assert exc_info.value.status_code == 401
        assert exc_info.value.trace_id == "ABC1234"

    def test_429_raises_rate_limit(self):
        with pytest.raises(RateLimitError):
            raise_for_status(429)

    def test_500_raises_server_error(self):
        with pytest.raises(ServerError):
            raise_for_status(500)

    def test_503_raises_service_unavailable(self):
        with pytest.raises(ServiceUnavailableError):
            raise_for_status(503)

    def test_504_raises_timeout(self):
        with pytest.raises(TimeoutError):
            raise_for_status(504)

    def test_unknown_status_raises_base(self):
        with pytest.raises(DocDigitizerError) as exc_info:
            raise_for_status(418)
        assert exc_info.value.status_code == 418

    def test_exception_carries_messages(self):
        with pytest.raises(ServerError) as exc_info:
            raise_for_status(
                500,
                trace_id="XYZ",
                messages=["Error A", "Error B"],
                timers={"total": 1234.5},
            )
        exc = exc_info.value
        assert exc.trace_id == "XYZ"
        assert exc.messages == ["Error A", "Error B"]
        assert exc.timers == {"total": 1234.5}


class TestExceptionHierarchy:
    def test_all_inherit_from_base(self):
        for cls in [
            AuthenticationError,
            ValidationError,
            RateLimitError,
            ServerError,
            ServiceUnavailableError,
            TimeoutError,
        ]:
            assert issubclass(cls, DocDigitizerError)

    def test_base_inherits_from_exception(self):
        assert issubclass(DocDigitizerError, Exception)
