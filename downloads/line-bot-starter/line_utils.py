import base64
import hashlib
import hmac


def verify_signature(raw_body: bytes, signature: str | None, secret: str) -> bool:
    """Return whether a LINE webhook signature matches the raw request body."""
    if not isinstance(signature, str):
        return False

    digest = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).digest()
    expected_signature = base64.b64encode(digest).decode("ascii")

    return hmac.compare_digest(expected_signature, signature)
