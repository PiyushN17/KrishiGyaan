from pathlib import Path
import fitz
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
PDF = ROOT / "deliverables" / "KrishiGyaan_BCA_Final_Year_Project_Report.pdf"
OUT = ROOT / "qa-report"
OUT.mkdir(parents=True, exist_ok=True)

doc = fitz.open(PDF)
stats = []
thumbs = []
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.15, 1.15), alpha=False)
    path = OUT / f"page-{index + 1:03d}.png"
    pix.save(path)
    words = page.get_text("words")
    if words:
        min_y = min(word[1] for word in words)
        max_y = max(word[3] for word in words)
        coverage = (max_y - min_y) / page.rect.height
    else:
        coverage = 0
    stats.append((index + 1, len(words), round(coverage, 3)))
    image = Image.open(path)
    image.thumbnail((210, 297))
    thumbs.append(image.copy())

for start in range(0, len(thumbs), 20):
    subset = thumbs[start:start + 20]
    sheet = Image.new("RGB", (5 * 230, 4 * 325), "white")
    draw = ImageDraw.Draw(sheet)
    for offset, image in enumerate(subset):
        x = (offset % 5) * 230 + 10
        y = (offset // 5) * 325 + 20
        sheet.paste(image, (x, y))
        draw.text((x, 4 + (offset // 5) * 325), f"Page {start + offset + 1}", fill="black")
    sheet.save(OUT / f"contact-{start + 1:03d}-{start + len(subset):03d}.png")

sparse = [entry for entry in stats if entry[1] < 180 or entry[2] < .60]
print(f"pages={len(doc)}")
print(f"sparse_count={len(sparse)}")
print("sparse=" + repr(sparse[:80]))
