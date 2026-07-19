#!/usr/bin/env python3
"""build_book.py — chapters/*.md + book.yaml から KDP 入稿用 EPUB3 を生成する。

使い方:
    python3 build_book.py <book_dir>

<book_dir> の構成:
    book.yaml      メタデータ（title, author, description, keywords, ...）
    chapters/      01-xxx.md, 02-xxx.md ... （ファイル名順 = 章順）
    output/        生成物の出力先（cover.png があれば表紙として同梱）

外部依存: PyYAML のみ。EPUB は標準ライブラリで直接組み立てる。
生成後に構造の自己検証（必須ファイル・XHTML パース）まで行う。
"""

import html
import re
import sys
import uuid
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml


# ---------- Markdown → XHTML（EPUB 向け軽量変換） ----------

def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"`([^`]+?)`", r"<code>\1</code>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def md_to_xhtml_body(md: str) -> str:
    lines = md.replace("\r\n", "\n").split("\n")
    out, i = [], 0
    para: list[str] = []

    def flush():
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```"):
            flush()
            i += 1
            code = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(html.escape(lines[i]))
                i += 1
            out.append("<pre><code>" + "\n".join(code) + "</code></pre>")
        elif m := re.match(r"^(#{1,4})\s+(.*)", stripped):
            flush()
            level = len(m.group(1))
            out.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
        elif stripped.startswith(">"):
            flush()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            i -= 1
            out.append("<blockquote><p>" + "<br/>".join(inline(q) for q in quote if q) + "</p></blockquote>")
        elif re.match(r"^[-*]\s+", stripped):
            flush()
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                item_text = re.sub(r"^[-*]\s+", "", lines[i].strip())
                items.append(f"<li>{inline(item_text)}</li>")
                i += 1
            i -= 1
            out.append("<ul>" + "".join(items) + "</ul>")
        elif re.match(r"^\d+\.\s+", stripped):
            flush()
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                item_text = re.sub(r"^\d+\.\s+", "", lines[i].strip())
                items.append(f"<li>{inline(item_text)}</li>")
                i += 1
            i -= 1
            out.append("<ol>" + "".join(items) + "</ol>")
        elif stripped in ("---", "***"):
            flush()
            out.append("<hr/>")
        elif stripped == "":
            flush()
        else:
            para.append(stripped)
        i += 1
    flush()
    return "\n".join(out)


def xhtml_doc(title: str, body: str, lang: str = "ja") -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{lang}" lang="{lang}">
<head>
  <meta charset="UTF-8"/>
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
{body}
</body>
</html>
"""


STYLE_CSS = """body { font-family: serif; line-height: 1.8; margin: 0.5em; }
h1 { font-size: 1.5em; border-bottom: 2px solid #333; padding-bottom: 0.3em; margin-top: 1em; }
h2 { font-size: 1.25em; border-left: 6px solid #333; padding-left: 0.4em; margin-top: 1.2em; }
h3 { font-size: 1.1em; margin-top: 1em; }
blockquote { background: #f4f4f4; border-left: 4px solid #999; margin: 1em 0; padding: 0.6em 0.8em; }
pre { background: #f4f4f4; padding: 0.6em; overflow-x: auto; font-size: 0.85em; }
code { font-family: monospace; }
hr { border: none; border-top: 1px dashed #999; margin: 1.5em 0; }
"""


# ---------- EPUB 組み立て ----------

def build_epub(book_dir: Path) -> Path:
    meta = yaml.safe_load((book_dir / "book.yaml").read_text(encoding="utf-8"))
    title = meta["title"]
    author = meta.get("author", "著者名未設定")
    lang = meta.get("language", "ja")
    slug = meta.get("slug", book_dir.name)
    book_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"ai-content-factory/{slug}"))

    chapter_files = sorted((book_dir / "chapters").glob("*.md"))
    if not chapter_files:
        sys.exit(f"エラー: {book_dir}/chapters/ に .md がありません")

    chapters = []  # (id, filename, 章タイトル, xhtml)
    for n, f in enumerate(chapter_files, 1):
        md = f.read_text(encoding="utf-8")
        m = re.search(r"^#\s+(.+)$", md, re.M)
        ch_title = m.group(1).strip() if m else f"第{n}章"
        chapters.append((f"ch{n:02d}", f"chapter-{n:02d}.xhtml", ch_title, xhtml_doc(ch_title, md_to_xhtml_body(md), lang)))

    output = book_dir / "output"
    output.mkdir(exist_ok=True)
    cover_png = output / "cover.png"
    has_cover = cover_png.exists()

    # 扉ページ
    titlepage = xhtml_doc(title, f"<h1 style='margin-top:30%; text-align:center; border:none;'>{html.escape(title)}</h1>"
                                 f"<p style='text-align:center;'>{html.escape(meta.get('subtitle',''))}</p>"
                                 f"<p style='text-align:center; margin-top:2em;'>{html.escape(author)}</p>", lang)

    # 目次 (nav)
    nav_items = "".join(f'<li><a href="{fn}">{html.escape(t)}</a></li>' for _, fn, t, _ in chapters)
    nav = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{lang}" lang="{lang}">
<head><meta charset="UTF-8"/><title>目次</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
<nav epub:type="toc" id="toc"><h1>目次</h1><ol>
<li><a href="titlepage.xhtml">扉</a></li>
{nav_items}
</ol></nav>
</body></html>
"""

    manifest = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
                '<item id="style" href="style.css" media-type="text/css"/>',
                '<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>']
    spine = ['<itemref idref="titlepage"/>']
    if has_cover:
        manifest.append('<item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>')
        manifest.append('<item id="coverpage" href="cover.xhtml" media-type="application/xhtml+xml"/>')
        spine.insert(0, '<itemref idref="coverpage"/>')
    for cid, fn, _, _ in chapters:
        manifest.append(f'<item id="{cid}" href="{fn}" media-type="application/xhtml+xml"/>')
        spine.append(f'<itemref idref="{cid}"/>')

    opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="{lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:{book_id}</dc:identifier>
    <dc:title>{html.escape(title)}</dc:title>
    <dc:creator>{html.escape(author)}</dc:creator>
    <dc:language>{lang}</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
    {'<meta name="cover" content="cover-image"/>' if has_cover else ''}
  </metadata>
  <manifest>
    {chr(10).join('    ' + m for m in manifest)}
  </manifest>
  <spine>
    {chr(10).join('    ' + s for s in spine)}
  </spine>
</package>
"""

    epub_path = output / f"{slug}.epub"
    with zipfile.ZipFile(epub_path, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
""", compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/content.opf", opf, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/nav.xhtml", nav, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/style.css", STYLE_CSS, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/titlepage.xhtml", titlepage, compress_type=zipfile.ZIP_DEFLATED)
        if has_cover:
            z.write(cover_png, "OEBPS/images/cover.png", compress_type=zipfile.ZIP_DEFLATED)
            z.writestr("OEBPS/cover.xhtml", xhtml_doc("表紙", '<div style="text-align:center;"><img src="images/cover.png" alt="表紙" style="max-width:100%; height:auto;"/></div>', lang),
                       compress_type=zipfile.ZIP_DEFLATED)
        for _, fn, _, x in chapters:
            z.writestr(f"OEBPS/{fn}", x, compress_type=zipfile.ZIP_DEFLATED)
    return epub_path


# ---------- 自己検証 ----------

def validate(epub_path: Path) -> list[str]:
    errors = []
    with zipfile.ZipFile(epub_path) as z:
        names = z.namelist()
        if names[0] != "mimetype":
            errors.append("mimetype が zip の先頭にない")
        elif z.getinfo("mimetype").compress_type != zipfile.ZIP_STORED:
            errors.append("mimetype が無圧縮でない")
        elif z.read("mimetype") != b"application/epub+zip":
            errors.append("mimetype の内容が不正")
        for required in ("META-INF/container.xml", "OEBPS/content.opf", "OEBPS/nav.xhtml"):
            if required not in names:
                errors.append(f"必須ファイルがない: {required}")
        for name in names:
            if name.endswith((".xhtml", ".opf", ".xml")):
                try:
                    ET.fromstring(z.read(name))
                except ET.ParseError as e:
                    errors.append(f"XML パースエラー {name}: {e}")
    return errors


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    book_dir = Path(sys.argv[1]).resolve()
    epub_path = build_epub(book_dir)
    errors = validate(epub_path)
    if errors:
        for e in errors:
            print(f"NG: {e}")
        sys.exit(1)
    size_kb = epub_path.stat().st_size / 1024
    print(f"OK: {epub_path}（{size_kb:.0f} KB、構造検証パス）")
    if not (book_dir / "output" / "cover.png").exists():
        print("注意: output/cover.png が未生成のため表紙なしで作成。make_cover.py 実行後に再ビルドしてください")


if __name__ == "__main__":
    main()
