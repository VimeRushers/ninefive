"""Strip personal data before any text is sent to an external LLM.

Moldovan public documents (and especially bidder documents) embed personal data:
IDNP numbers, signatures, beneficial-owner names, emails, phones and IBANs.
This scrubs those so only the procurement substance reaches DeepSeek.
"""

from __future__ import annotations

import re

PLACEHOLDER = "[date personale eliminate]"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
IBAN_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")
PHONE_RE = re.compile(r"(?:\+373|(?<![\d.])0)[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}")
ID13_RE = re.compile(r"\b\d{13}\b")

# Lines that typically carry a person's identity or signature are dropped whole
SENSITIVE_LINE_RE = re.compile(
    r"(idnp|semn[ăa]tur|signature|semnat|beneficiar)", re.IGNORECASE
)


def _mask_line(line: str) -> str:
    return PLACEHOLDER if SENSITIVE_LINE_RE.search(line) else line


def redact(text: str | None) -> str:
    if not text:
        return ""

    masked = "\n".join(_mask_line(line) for line in text.splitlines())
    masked = EMAIL_RE.sub(PLACEHOLDER, masked)
    masked = IBAN_RE.sub(PLACEHOLDER, masked)
    masked = PHONE_RE.sub(PLACEHOLDER, masked)
    masked = ID13_RE.sub(PLACEHOLDER, masked)
    return masked
