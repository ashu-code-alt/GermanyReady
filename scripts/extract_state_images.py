#!/usr/bin/env python3
"""
Extract state question images from BAMF PDF and generate data/state-images.js
Usage: python3 scripts/extract_state_images.py <path-to-pdf>

The BAMF "Gesamtfragenkatalog" PDF contains state-specific questions.
Aufgabe 1 (coat of arms): 4 images shown as options (t:'o')
Aufgabe 8 (map):          1 Germany map image shown above options (t:'q')

This script extracts those images and generates data/state-images.js.
"""

import sys
import base64
import json
import os
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not found. Install with: pip3 install pymupdf")
    sys.exit(1)

try:
    from PIL import Image as PILImage
    import io as _io
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

# 16 German Bundesländer in the order they appear in the BAMF PDF
STATES = [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen",
]

# The BAMF exam always shows 4 distinct coat-of-arms images per Q1 question.
# Each is labeled Bild 1 through Bild 4.  The "correct" index (0-3) indicates
# which Bild has the right state coat of arms.
Q1_IMG_COUNT = 4


def img_to_data_uri(img_info, doc, max_dim=240, quality=82):
    """
    Extract an image from the PDF and return as a compact JPEG data-URI.
    Resizes to max_dim on the longer side for display-appropriate size.
    """
    xref = img_info[0]
    base_image = doc.extract_image(xref)
    img_bytes = base_image["image"]
    img_ext = base_image["ext"]

    if HAS_PILLOW:
        # Use Pillow for best resize quality and JPEG compression
        pil_img = PILImage.open(_io.BytesIO(img_bytes)).convert("RGB")
        w, h = pil_img.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            pil_img = pil_img.resize((max(1, int(w * scale)), max(1, int(h * scale))),
                                     PILImage.LANCZOS)
        buf = _io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=quality, optimize=True)
        img_bytes = buf.getvalue()
        b64 = base64.b64encode(img_bytes).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"

    # Fallback without Pillow — preserve JPEG, convert PNG to JPEG
    if img_ext.lower() in ("jpeg", "jpg"):
        b64 = base64.b64encode(img_bytes).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"

    pix = fitz.Pixmap(doc, xref)
    if pix.n > 3 or (pix.colorspace and pix.colorspace.name not in ("DeviceRGB", "RGB")):
        pix = fitz.Pixmap(fitz.csRGB, pix)
    img_bytes = pix.tobytes("jpeg", jpg_quality=quality)
    b64 = base64.b64encode(img_bytes).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def find_state_pages(doc):
    """
    Scan the PDF text to find which page each state section starts on,
    and then which pages contain Aufgabe 1 and Aufgabe 8 for each state.

    Returns: dict {state_name: {1: page_index, 8: page_index}}
    """
    state_pages = {}

    # We track current state and current question number while scanning pages
    current_state = None
    current_q = None

    # Scan every page for text markers
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        # Check if this page starts a new state section.
        # Only match PROPER section headers to avoid false positives from answer options.
        # The BAMF PDF uses: "Fragen für das Bundesland <STATE>" or
        #                    "Fragen für den Freistaat <STATE>"
        for state in STATES:
            header_patterns = [
                f"Fragen für das Bundesland {state}",
                f"Fragen für den Freistaat {state}",
                f"Aufgaben für das Bundesland {state}",
                f"Aufgaben für den Freistaat {state}",
                f"Fragen für {state}",
                f"Aufgaben für {state}",
            ]
            for pattern in header_patterns:
                if pattern.lower() in text.lower():
                    current_state = state
                    if state not in state_pages:
                        state_pages[state] = {}
                    print(f"  → Entered section for {state} on page {page_num + 1}")
                    break

        if current_state is None:
            continue

        # Check which question number this page is for
        # Look for "Aufgabe X" patterns
        q1_patterns = ["Aufgabe 1", "aufgabe 1", "1."]
        q8_patterns = ["Aufgabe 8", "aufgabe 8"]

        # Check for coat of arms question (Q1): "Welches Wappen"
        if "Welches Wappen" in text or "Wappen gehört" in text:
            if current_state not in state_pages:
                state_pages[current_state] = {}
            state_pages[current_state][1] = page_num
            print(f"  Found Q1 (coat of arms) for {current_state} on page {page_num + 1}")

        # Check for map question (Q8): "Welches Bundesland ist <state>?"
        # The numeric options (1,2,3,4) may be part of the embedded map image, not page text
        if "Welches Bundesland ist" in text and current_state and current_state in text:
            if current_state not in state_pages:
                state_pages[current_state] = {}
            state_pages[current_state][8] = page_num
            print(f"  Found Q8 (map) for {current_state} on page {page_num + 1}")

    return state_pages


def extract_page_images_sorted(page, doc, skip_header=True, max_dim=240):
    """
    Extract content images from a page, sorted by position (top-to-bottom, left-to-right).
    Skips the small BAMF header image that appears at the very top of every page (y0 < 100).
    Returns list of data URIs sorted by position.
    """
    img_list = page.get_images(full=True)
    result = []

    for img_info in img_list:
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        if rects:
            rect = rects[0]
            # Skip the small page-header image (y0 < 100 px from top)
            if skip_header and rect.y0 < 100:
                continue
            try:
                data_uri = img_to_data_uri(img_info, doc, max_dim=max_dim)
                result.append((rect.y0, rect.x0, data_uri))
            except Exception as e:
                print(f"    Warning: could not extract image xref={xref}: {e}")

    # Sort by vertical then horizontal position
    result.sort(key=lambda x: (x[0], x[1]))
    return [r[2] for r in result]


def process_pdf(pdf_path):
    """Main extraction function. Returns STATEIMGS dict."""
    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    print(f"PDF has {len(doc)} pages")

    print("\nScanning for state sections...")
    state_pages = find_state_pages(doc)

    print(f"\nFound pages for {len(state_pages)} states: {list(state_pages.keys())}")

    stateimgs = {}

    for state in STATES:
        if state not in state_pages:
            print(f"\nWARNING: No pages found for {state}, skipping")
            continue

        pages_info = state_pages[state]
        print(f"\nProcessing {state}:")
        stateimgs[state] = {}

        # Q1: coat of arms — always 4 images (Bild 1 through Bild 4), sorted left-to-right
        if 1 in pages_info:
            page_num = pages_info[1]
            page = doc[page_num]
            images = extract_page_images_sorted(page, doc, max_dim=180)
            print(f"  Q1 page {page_num+1}: found {len(images)} content images")

            if len(images) >= Q1_IMG_COUNT:
                imgs_list = images[:Q1_IMG_COUNT]
                stateimgs[state][1] = {"t": "o", "imgs": imgs_list}
                print(f"  Q1 OK: {Q1_IMG_COUNT} coat of arms images extracted")
            elif len(images) > 0:
                print(f"  Q1 WARNING: only {len(images)} images found, expected {Q1_IMG_COUNT}")
                stateimgs[state][1] = {"t": "o", "imgs": images}
            else:
                print(f"  Q1 WARNING: no images found on page {page_num+1}")
        else:
            print(f"  Q1: page not found for {state}")

        # Q8: map — one Germany map image shown above the 1-4 options
        if 8 in pages_info:
            page_num = pages_info[8]
            page = doc[page_num]
            images = extract_page_images_sorted(page, doc, max_dim=420)
            print(f"  Q8 page {page_num+1}: found {len(images)} content images")

            if len(images) >= 1:
                stateimgs[state][8] = {"t": "q", "img": images[0]}
                print(f"  Q8 OK: Germany map image extracted")
            else:
                print(f"  Q8 WARNING: no images found on page {page_num+1}")
        else:
            print(f"  Q8: page not found for {state}")

    doc.close()
    return stateimgs


def generate_js(stateimgs, output_path):
    """Generate the state-images.js file."""
    lines = ["// Auto-generated by scripts/extract_state_images.py",
             "// Contains coat-of-arms (Q1) and map (Q8) images for all 16 Bundesländer",
             "// t:'o' = option images (array indexed by Bild number)",
             "// t:'q' = question image (single map image)",
             "const STATEIMGS = {"]

    states = list(stateimgs.keys())
    for i, state in enumerate(states):
        q_data = stateimgs[state]
        comma = "," if i < len(states) - 1 else ""

        state_parts = []

        if 1 in q_data:
            q1 = q_data[1]
            imgs_json = json.dumps(q1["imgs"])
            state_parts.append(f'    1: {{t:"o",imgs:{imgs_json}}}')

        if 8 in q_data:
            q8 = q_data[8]
            img_json = json.dumps(q8["img"])
            state_parts.append(f'    8: {{t:"q",img:{img_json}}}')

        state_json = json.dumps(state)
        if state_parts:
            lines.append(f'  {state_json}: {{')
            for j, part in enumerate(state_parts):
                lines.append(part + ("," if j < len(state_parts) - 1 else ""))
            lines.append(f'  }}{comma}')
        else:
            lines.append(f'  {state_json}: {{}}{comma}')

    lines.append("};")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    size_kb = os.path.getsize(output_path) / 1024
    print(f"\nGenerated: {output_path} ({size_kb:.0f} KB)")


def main():
    if len(sys.argv) < 2:
        # Try default location
        default = os.path.expanduser("~/Downloads/gesamtfragenkatalog-lebenindeutschland.pdf")
        if os.path.exists(default):
            pdf_path = default
            print(f"Using default PDF: {pdf_path}")
        else:
            print("Usage: python3 scripts/extract_state_images.py <path-to-bamf-pdf>")
            print(f"  or place PDF at: {default}")
            sys.exit(1)
    else:
        pdf_path = sys.argv[1]

    if not os.path.exists(pdf_path):
        print(f"ERROR: PDF not found: {pdf_path}")
        sys.exit(1)

    # Output path relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_path = os.path.join(project_dir, "data", "state-images.js")

    stateimgs = process_pdf(pdf_path)

    if not stateimgs:
        print("ERROR: No state images extracted. Check PDF structure.")
        sys.exit(1)

    generate_js(stateimgs, output_path)
    print("\nDone! Reload the app to see images.")


if __name__ == "__main__":
    main()
