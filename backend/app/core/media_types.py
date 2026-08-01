"""Content-based media type detection.

A filename extension and a client-supplied Content-Type are both attacker-controlled.
Trusting either is how an executable arrives named `avatar.jpg` and gets served back
with an image content type. Everything here inspects the actual leading bytes.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class MediaKind:
    content_type: str
    extension: str
    is_video: bool = False


IMAGE_JPEG = MediaKind("image/jpeg", "jpg")
IMAGE_PNG = MediaKind("image/png", "png")
IMAGE_GIF = MediaKind("image/gif", "gif")
IMAGE_WEBP = MediaKind("image/webp", "webp")
VIDEO_MP4 = MediaKind("video/mp4", "mp4", is_video=True)
VIDEO_QUICKTIME = MediaKind("video/quicktime", "mov", is_video=True)

# Longest signature we ever need to inspect.
SNIFF_BYTES = 32


def sniff(head: bytes) -> MediaKind | None:
    """Identify a media type from its leading bytes, or None if unrecognised.

    Only formats we intend to serve are listed. An unknown signature is rejected
    rather than passed through — an allowlist fails closed, a denylist does not.
    """
    if len(head) < 12:
        return None

    # JPEG: FF D8 FF
    if head[:3] == b"\xff\xd8\xff":
        return IMAGE_JPEG

    # PNG: 89 P N G \r \n 1A \n
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return IMAGE_PNG

    # GIF87a / GIF89a
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return IMAGE_GIF

    # WebP: RIFF....WEBP
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return IMAGE_WEBP

    # ISO base media (MP4 / MOV): size, then "ftyp", then a brand.
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand == b"qt  ":
            return VIDEO_QUICKTIME
        # isom, mp42, avc1, iso2, mmp4 and friends are all MP4 containers.
        return VIDEO_MP4

    return None


# What a client may ask to upload. Checked before issuing a URL so an obviously
# unsupported request fails immediately rather than after transferring bytes.
ALLOWED_DECLARED_TYPES = frozenset(
    {
        IMAGE_JPEG.content_type,
        IMAGE_PNG.content_type,
        IMAGE_GIF.content_type,
        IMAGE_WEBP.content_type,
        VIDEO_MP4.content_type,
        VIDEO_QUICKTIME.content_type,
    }
)


def is_allowed_declared_type(content_type: str) -> bool:
    return content_type.split(";")[0].strip().lower() in ALLOWED_DECLARED_TYPES
