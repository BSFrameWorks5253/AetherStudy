import fitz # PyMuPDF
import os
import glob

QUESTIONS_DIR = os.path.abspath("data/hsc-commerce-papers/Questions")

def clean_pdf_file(pdf_path):
    temp_path = pdf_path + ".tmp.pdf"
    doc = fitz.open(pdf_path)

    # 1. Zero out watermark xref streams
    for xref in range(1, doc.xref_length()):
        try:
            s = doc.xref_stream(xref)
            if s:
                text = s.decode('latin1', errors='ignore')
                if "Target Publications" in text or "WatermarkSettings" in text or "(Target" in text or "Publications)" in text:
                    doc.update_stream(xref, b"q Q\n")
        except:
            pass

    # 2. Redact top header strip and bottom page number strip on every page
    for i, page in enumerate(doc):
        rect = page.rect
        # On Page 1, questions/title start at y >= 75
        top_y = 68.0 if i == 0 else 56.5
        # Redact top header banner & logos
        page.add_redact_annot(fitz.Rect(0, 0, rect.width, top_y), fill=(1, 1, 1))
        # Redact bottom page number box, isolated numbers & registration marks
        page.add_redact_annot(fitz.Rect(0, 761.5, rect.width, rect.height), fill=(1, 1, 1))
        page.apply_redactions()

    # Save to temp and replace original
    doc.save(temp_path, garbage=3, deflate=True)
    doc.close()

    os.replace(temp_path, pdf_path)

def run():
    print("=== Starting PDF Clean & Style Batch Pipeline ===")
    pdf_files = sorted(glob.glob(os.path.join(QUESTIONS_DIR, "**", "*.pdf"), recursive=True))
    total = len(pdf_files)
    print(f"Total PDFs to process: {total}\n")

    cleaned_count = 0
    for idx, pdf_path in enumerate(pdf_files):
        fname = os.path.basename(pdf_path)
        year = os.path.basename(os.path.dirname(pdf_path))
        try:
            clean_pdf_file(pdf_path)
            cleaned_count += 1
            size_kb = os.path.getsize(pdf_path) / 1024
            print(f"[{idx + 1}/{total}] [CLEANED] ({year}) {fname} ({size_kb:.1f} KB)")
        except Exception as e:
            print(f"[{idx + 1}/{total}] [ERROR] ({year}) {fname}: {e}")

    print("\n=================================================")
    print(f"Clean & Style Pipeline Finished! Successfully cleaned: {cleaned_count}/{total} PDFs.")

if __name__ == "__main__":
    run()
