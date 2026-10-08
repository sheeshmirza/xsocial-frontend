from io import BytesIO
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, HTTPServer
from PIL import Image, ImageDraw, ImageFont
import os

W,H = 1080,1350
BG = (16,18,22)
FG = (247,242,232)
MUTED = (185,179,170)
ACCENT = (255,106,61)
BORDER = (45,48,54)

def font(path_candidates, size):
    for p in path_candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

BOLD = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"]
REG = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
       "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"]
MONO = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]

def draw_image(lines):
    im = Image.new("RGB",(W,H),BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((65,95,1015,1255), radius=36, outline=BORDER, width=2)
    d.rectangle((78,150,91,1200), fill=ACCENT)
    d.text((120,135),"SHEESH / UNFILTERED",font=font(MONO,24),fill=(150,154,160))
    title = font(BOLD,67)
    sub = font(REG,34)
    y=425
    for i,line in enumerate(lines):
        if not line:
            y += 34
            continue
        f = title if i < 3 else sub
        fill = FG if i < 3 else MUTED
        maxw=830
        words=line.split()
        cur=""
        chunks=[]
        for w in words:
            test=(cur+" "+w).strip()
            if d.textbbox((0,0),test,font=f)[2] <= maxw:
                cur=test
            else:
                if cur: chunks.append(cur)
                cur=w
        if cur: chunks.append(cur)
        for ch in chunks:
            box=d.textbbox((0,0),ch,font=f)
            tw=box[2]-box[0]
            d.text((540-tw/2,y),ch,font=f,fill=fill)
            y += int(getattr(f,"size",34)*1.18)
        y += 10
    d.text((120,1190),"NO FILTER. JUST SHEESH.",font=font(MONO,24),fill=(125,128,132))
    d.ellipse((930,1167,968,1205),fill=ACCENT)
    return im

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        p=urlparse(self.path)
        if p.path == "/health":
            body=b"ok"
            self.send_response(200); self.send_header("Content-Type","text/plain"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body); return
        if p.path != "/image":
            self.send_response(404); self.end_headers(); return
        raw=parse_qs(p.query).get("text",[""])[0]
        lines=raw.split("\n")
        lines=[x[:140] for x in lines[:8]]
        while not lines: lines=[""]
        img=draw_image(lines)
        b=BytesIO(); img.save(b,format="PNG",optimize=True); body=b.getvalue()
        self.send_response(200)
        self.send_header("Content-Type","image/png")
        self.send_header("Cache-Control","public, max-age=86400")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers(); self.wfile.write(body)

if __name__=="__main__":
    port=int(os.environ.get("PORT","10000"))
    HTTPServer(("0.0.0.0",port),Handler).serve_forever()
