#!/usr/bin/env python3
"""Turn a folder of player photos into board-ready headshots.

Usage:  python3 scripts/make_photos.py <input_folder> [output_folder]
        python3 scripts/make_photos.py --thumbs [photos_folder]   (rebuild 96px thumbs from the 400px photos)

- Input files are named after the player: "DJ.png", "Soham M.jpeg", ...
- Output is photos/<slug>.jpg (400x400, square, ~30-50 KB) plus photos/thumb/<slug>.jpg (96px, ~3 KB, used by the player pool and captain cards), where the slug is
  the lowercase name with anything not a-z/0-9 turned into "-" ("Soham M" -> soham-m.jpg).
  The slug must match the player's name in the app.
- The square is centred on the face when OpenCV with its face model is available;
  otherwise it is a centred, top-biased square (portrait photos are cropped tighter). ALWAYS look at the results before committing.
"""
import os, re, sys
from PIL import Image, ImageOps

SIZE = 400
THUMB = 96
EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}

def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def find_face(img):
    try:
        import cv2, numpy as np
    except ImportError:
        return None
    gray = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2GRAY)
    det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    if det.empty():
        return None
    faces = det.detectMultiScale(gray, 1.1, 5, minSize=(gray.shape[1] // 8, gray.shape[1] // 8))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return x + w / 2, y + h / 2, max(w, h)

def square(img):
    img = ImageOps.exif_transpose(img).convert('RGB')
    W, H = img.size
    face = find_face(img)
    if face:
        cx, cy, fs = face
        side = min(int(fs * 2.4), W, H)          # face plus some hair and shoulders
        cy = cy + fs * 0.1
    else:
        side = int(min(W, H) * (0.8 if H > W else 1.0))   # portrait: tighter, so the face is not tiny
        cx, cy = W / 2 + W * 0.04, side / 2 + (H - side) * 0.2
    left = int(min(max(cx - side / 2, 0), W - side))
    top = int(min(max(cy - side / 2, 0), H - side))
    return img.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS), bool(face)

def write_thumb(im, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.resize((THUMB, THUMB), Image.LANCZOS).save(dest, quality=80, optimize=True)

def rebuild_thumbs(folder):
    for f in sorted(os.listdir(folder)):
        if f.lower().endswith('.jpg'):
            write_thumb(Image.open(os.path.join(folder, f)).convert('RGB'), os.path.join(folder, 'thumb', f))
            print('thumb', f)

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--thumbs':
        rebuild_thumbs(sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'photos'))
        return
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'photos')
    os.makedirs(out, exist_ok=True)
    for f in sorted(os.listdir(src)):
        base, ext = os.path.splitext(f)
        if ext.lower() not in EXTS:
            continue
        im, found = square(Image.open(os.path.join(src, f)))
        dest = os.path.join(out, slug(base) + '.jpg')
        im.save(dest, quality=82, optimize=True)
        write_thumb(im, os.path.join(out, 'thumb', slug(base) + '.jpg'))
        print('%-30s -> %-24s %5d KB  %s' % (f, os.path.basename(dest), os.path.getsize(dest) // 1024, 'face found' if found else 'NO FACE FOUND, check crop'))

if __name__ == '__main__':
    main()
