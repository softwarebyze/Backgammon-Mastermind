from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
R=Path('raw'); O=Path('out'); O.mkdir(exist_ok=True)
def F(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)
def Fr(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
BG=(20,12,8)
NAMES={'now':'Ours now (PR #389 @ 9e36ee4)','A':'A · XG, cleaner','B':'B · Galaxy-style flat bars + count','C':'C · A + empty slots for all 15'}
DESC={'now':'6px flat slabs, start past cube corner','A':'11px shaded edge-on checkers, flush to outer end, gap every 5','B':'8px flat bars, even gaps, count follows stack','C':'A pieces + faint slot for every checker still to come'}
def tray(style, case):  # 3x board crop: tray + last two points
    im=Image.open(R/f'{style}-{case}-board.png').convert('RGB')
    return im.crop((im.width-300, 0, im.width, im.height))
def text_center(d, box, s, f, fill):
    x0,y0,x1,y1=box; b=d.textbbox((0,0),s,font=f); d.text((x0+(x1-x0-(b[2]-b[0]))/2, y0+(y1-y0-(b[3]-b[1]))/2), s, font=f, fill=fill)
def ref(path, box, h):
    im=Image.open(path).convert('RGB').crop(box); return im.resize((round(im.width*h/im.height), h), Image.LANCZOS)
CASES=[('w1-b1','1 off'),('w7-b7','7 off'),('w15-b15','15 off')]
# --- comparison
S=0.5; tw=round(300*S); th=round(1344*S)
gap=8; ggap=40; top=110; foot=60
refs=[('XG Mobile\n7 + 9 off', ref('refs/xg-mobile-7and9off-appstore.jpg',(1830,0,2000,1125),th)),
      ('Galaxy\n7 off', ref('refs/galaxy-7off-web.jpg',(1290,110,1410,640),th))]
W=4*(3*tw+2*gap)+3*ggap+ggap+sum(r.width for _,r in refs)+ggap*len(refs)+60
H=top+th+foot+70
out=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(out)
d.text((30,18),'Borne-off tray options at iPhone 13 Pro Max portrait (428x926, rendered @3x, shown @1.5x) · real app render, same board size',font=F(26),fill=(245,236,220))
x=30
for st in ['now','A','B','C']:
    bw=3*tw+2*gap
    d.text((x,62),NAMES[st],font=F(20),fill=(240,150,70) if st!='now' else (200,190,175))
    for i,(c,lab) in enumerate(CASES):
        out.paste(tray(st,c).resize((tw,th),Image.LANCZOS),(x+i*(tw+gap),top))
        text_center(d,(x+i*(tw+gap),top+th+6,x+i*(tw+gap)+tw,top+th+30),lab,Fr(16),(220,210,195))
    d.text((x,top+th+36),DESC[st],font=Fr(15),fill=(180,170,155))
    x+=bw+ggap
x+=ggap//2
d.line((x-ggap//2-10,60,x-ggap//2-10,H-20),fill=(90,60,30),width=2)
for lab,im in refs:
    d.multiline_text((x,58),lab,font=F(16),fill=(200,190,175)); out.paste(im,(x,top)); x+=im.width+ggap
d.text((30,H-34),'Cube: unowned stays centred on the hinge (unchanged). In A/B/C an owned cube moves to its owner\'s end of the bar, so neither tray reserves a corner.',font=Fr(16),fill=(180,170,155))
out.save(O/'compare.png',optimize=True); print('compare',out.size)
# --- per option
for st in ['now','A','B','C']:
    crops=[tray(st,c) for c,_ in CASES]
    board=Image.open(R/f'{st}-w7-b7-cube-white-board.png').convert('RGB')
    zack=Image.open(R/f'{st}-w15-b1-board.png').convert('RGB')
    hh=crops[0].height
    W=sum(c.width for c in crops)+board.width+zack.width+60*2+40*3
    out=Image.new('RGB',(W,hh+200),BG); d=ImageDraw.Draw(out)
    d.text((60,30),NAMES[st]+' — '+DESC[st],font=F(40),fill=(245,236,220))
    x=60
    for c,(case,lab) in zip(crops,CASES):
        out.paste(c,(x,120)); text_center(d,(x,120+hh+10,x+c.width,120+hh+60),lab,Fr(32),(220,210,195)); x+=c.width+40
    for im,lab in [(zack,"Zack's state: White 15 off, Black 1 off"),(board,'7 off each, White owns cube at 2')]:
        out.paste(im,(x,120)); text_center(d,(x,120+hh+10,x+im.width,120+hh+60),lab,Fr(32),(220,210,195)); x+=im.width+40
    out.save(O/f'option-{st}.png',optimize=True); print(st,out.size)
