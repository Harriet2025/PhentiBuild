"""
Exact scale from a printed marker (OpenCV ArUco) - free, offline, no AI.

A photo has no scale. The PhentiBuild reference card and A4 sheet carry an
ArUco marker: a black-and-white square of a KNOWN printed size. OpenCV finds
its four corners to sub-pixel precision; from those we compute a
"homography" - the exact mapping from photo pixels to real millimetres on
the plane the marker lies on. It also undoes the camera angle (perspective).

Any two points the person taps on that same surface (the two ends of a piece
of timber the card lies on, the edges of the wall the sheet is taped to) can
then be converted to a real distance. Typical error is a few percent when
the marker is flat on the measured surface and reasonably large in the photo.

Which marker is which is encoded in the marker itself (its ID), so the
person never has to say which reference they used.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

DICTIONARY = cv2.aruco.DICT_4X4_50

# Marker ID -> (reference id, label, printed side length of the black square in mm)
KNOWN_MARKERS = {
    7: ('card', 'PhentiBuild reference card', 36.0),
    9: ('a4', 'PhentiBuild A4 marker sheet', 150.0),
}

MIN_SIDE_PX = 40          # below this the corners are too imprecise to trust
GOOD_SIDE_PX = 90         # at or above this, corner error is negligible
MAX_SKEW = 0.55           # shortest/longest edge ratio below this = shot too steeply


@dataclass(frozen=True)
class Calibration:
    found: bool
    message: str
    marker_id: int | None = None
    reference: str | None = None
    label: str | None = None
    marker_size_mm: float | None = None
    corners: list | None = None          # 4 x [x, y] image pixels: TL, TR, BR, BL
    homography: list | None = None       # 3x3, image px -> mm on the marker plane
    image_width: int | None = None
    image_height: int | None = None
    side_px: float | None = None
    quality: str | None = None           # good | fair | poor

    def to_dict(self) -> dict:
        return {
            'found': self.found, 'message': self.message, 'markerId': self.marker_id, 'reference': self.reference,
            'label': self.label, 'markerSizeMm': self.marker_size_mm, 'corners': self.corners,
            'homography': self.homography, 'imageWidth': self.image_width, 'imageHeight': self.image_height,
            'sidePx': self.side_px, 'quality': self.quality,
        }


def _detector() -> cv2.aruco.ArucoDetector:
    params = cv2.aruco.DetectorParameters()
    params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX  # sub-pixel corners = better scale
    return cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(DICTIONARY), params)


def _border_is_black(gray: np.ndarray, pts: np.ndarray) -> bool:
    """
    Safety check against a false detection on the paper's edge: warp the
    candidate to a square and require its outer ring of cells (the marker's
    black border) to be clearly darker than the area just outside it.
    """
    size = 120  # 6 cells of 20 px, plus a 20 px margin each side
    dst = np.float32([[20, 20], [140, 20], [140, 140], [20, 140]])
    warp = cv2.getPerspectiveTransform(pts.astype(np.float32), dst)
    square = cv2.warpPerspective(gray, warp, (size + 40, size + 40), borderMode=cv2.BORDER_REPLICATE)
    inner = np.concatenate([square[24:36, 24:136].ravel(), square[124:136, 24:136].ravel(),
                            square[36:124, 24:36].ravel(), square[36:124, 124:136].ravel()])
    outer = np.concatenate([square[4:16, 4:156].ravel(), square[144:156, 4:156].ravel(),
                            square[16:144, 4:16].ravel(), square[16:144, 144:156].ravel()])
    return float(np.median(inner)) + 40 < float(np.median(outer))


def decode(raw: bytes) -> np.ndarray | None:
    buf = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(buf, cv2.IMREAD_GRAYSCALE)


def calibrate_image(gray: np.ndarray) -> Calibration:
    height, width = gray.shape[:2]
    corners_list, ids, _ = _detector().detectMarkers(gray)
    if ids is None or len(ids) == 0:
        return Calibration(found=False, image_width=width, image_height=height,
                           message='No PhentiBuild marker was found. Put the printed reference card (or A4 marker sheet) '
                                   'flat on the object, fully in the photo and in good light, then retake.')

    # Use the largest recognised PhentiBuild marker (the biggest gives the best precision).
    best = None
    for c, marker_id in zip(corners_list, ids.ravel().tolist()):
        if marker_id not in KNOWN_MARKERS:
            continue
        pts = c.reshape(4, 2).astype(np.float64)
        if not _border_is_black(gray, pts):
            continue
        edges = [float(np.linalg.norm(pts[i] - pts[(i + 1) % 4])) for i in range(4)]
        side = sum(edges) / 4
        if best is None or side > best[2]:
            best = (marker_id, pts, side, edges)
    if best is None:
        return Calibration(found=False, image_width=width, image_height=height,
                           message='A marker was found, but it is not a PhentiBuild marker. Print the card from the scanner page.')

    marker_id, pts, side, edges = best
    reference, label, size_mm = KNOWN_MARKERS[marker_id]
    plane = np.array([[0, 0], [size_mm, 0], [size_mm, size_mm], [0, size_mm]], dtype=np.float64)
    homography, _ = cv2.findHomography(pts, plane)
    if homography is None:
        return Calibration(found=False, image_width=width, image_height=height,
                           message='The marker could not be measured. Retake the photo straight on.')

    skew = min(edges) / max(edges)
    if side < MIN_SIDE_PX or skew < MAX_SKEW:
        quality = 'poor'
    elif side < GOOD_SIDE_PX:
        quality = 'fair'
    else:
        quality = 'good'
    notes = {
        'good': f'{label} found. Tap the points to measure.',
        'fair': f'{label} found, but it is small in the photo; measurements may be a little less precise. Move closer if you can.',
        'poor': f'{label} found, but it is too small or seen at too steep an angle for a reliable measurement. '
                'Move closer and shoot more straight on.',
    }
    return Calibration(
        found=True, message=notes[quality], marker_id=marker_id, reference=reference, label=label,
        marker_size_mm=size_mm, corners=[[round(float(x), 2), round(float(y), 2)] for x, y in pts],
        homography=[[float(v) for v in row] for row in homography], image_width=width, image_height=height,
        side_px=round(side, 1), quality=quality,
    )


def to_mm(homography: list, point: tuple[float, float]) -> tuple[float, float]:
    h = np.array(homography, dtype=np.float64)
    v = h @ np.array([point[0], point[1], 1.0])
    return float(v[0] / v[2]), float(v[1] / v[2])


def distance_m(homography: list, a: tuple[float, float], b: tuple[float, float]) -> float:
    """Real distance in metres between two image points on the marker's plane."""
    ax, ay = to_mm(homography, a)
    bx, by = to_mm(homography, b)
    return float(np.hypot(ax - bx, ay - by)) / 1000.0


def marker_svg(marker_id: int, size_mm: float) -> str:
    """The exact marker as an SVG (used to build the printable reference card)."""
    bits = cv2.aruco.getPredefinedDictionary(DICTIONARY).generateImageMarker(marker_id, 6)  # 6x6 cells incl. border
    cell = size_mm / 6
    rects = ''.join(
        f'<rect x="{c * cell:.4f}" y="{r * cell:.4f}" width="{cell:.4f}" height="{cell:.4f}"/>'
        for r in range(6) for c in range(6) if bits[r, c] == 0
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size_mm} {size_mm}" '
            f'width="{size_mm}mm" height="{size_mm}mm" shape-rendering="crispEdges">'
            f'<rect width="{size_mm}" height="{size_mm}" fill="#fff"/><g fill="#000">{rects}</g></svg>')
