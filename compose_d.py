from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
R=Path('raw'); O=Path('out')
def F(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)
def Fr(n): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
BG=(20,12,8)
NAMES={'B':'B · flat bars + count','A':'A · XG shaded','D1':'D1 · soft shading, even 2px gaps, count','D2':'D2 · soft shading, gap every 5, count'}
DESC={'B':'8px, 2px even gaps, flat','A':'11px, 4px gap every 5, full shading','D1':'9px, 2px even gaps, half-contrast shading','D2':'9px, 4px gap every 5, half-contrast shading'}
ORDER=['B','A','D1','D2']
CASES=[('w1-b1','1 off'),('w7-b7','7 off'),('w15-b15','15 off')]
def board(st,c): return Image.open(R/f'{st}-{c}-board.png').convert('RGB')
def tray(st,c):
    im=board(st,c); return im.crop((im.width-300,0,im.width,im.height))
def tc(d,box,s,f,fill):
    x0,y0,x1,y1=box; b=d.textbbox((0,0),s,font=f); d.text((x0+(x1-x0-(b[2]-b[0]))/2,y0+(y1-y0-(b[3]-b[1]))/2),s,font=f,fill=fill)
S=0.5; tw=150; th=672; gap=8; ggap=40; top=110
W=30+4*(3*tw+2*gap)+3*ggap+30; H=top+th+110
out=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(out)
d.text((30,18),'B | A | D1 | D2 at iPhone 13 Pro Max portrait (428x926 @3x, shown @1.5x) · real app render, board 428x448 in all',font=F(24),fill=(245,236,220))
x=30
for st in ORDER:
    d.text((x,62),NAMES[st],font=F(18),fill=(240,150,70) if st.startswith('D') else (200,190,175))
    for i,(c,lab) in enumerate(CASES):
        out.paste(tray(st,c).resize((tw,th),Image.LANCZOS),(x+i*(tw+gap),top))
        tc(d,(x+i*(tw+gap),top+th+6,x+i*(tw+gap)+tw,top+th+30),lab,Fr(16),(220,210,195))
    d.text((x,top+th+36),DESC[st],font=Fr(15),fill=(180,170,155)); x+=3*tw+2*gap+ggap
d.text((30,H-34),'Cube: unowned stays centred on the hinge; an owned cube moves to its owner\'s end of the centre bar. No empty slots.',font=Fr(16),fill=(180,170,155))
out.save(O/'compare-D.png',optimize=True); print('compare-D',out.size)
# close-up: tray column only, 3x native pixels, x2 nearest => 6 device px per CSS px
cl=[]
for st in ORDER:
    im=board(st,'w7-b7'); tx=im.width-3*36  # tray ~32 css px + frame
    topc=im.crop((tx,0,im.width,400)); botc=im.crop((tx,im.height-400,im.width,im.height))
    col=Image.new('RGB',(topc.width,topc.height*2+20),BG); col.paste(topc,(0,0)); col.paste(botc,(0,topc.height+20))
    cl.append((st,col.resize((col.width*2,col.height*2),Image.NEAREST)))
cw=cl[0][1].width; ch=cl[0][1].height
out=Image.new('RGB',(40+len(cl)*(cw+60),ch+160),BG); d=ImageDraw.Draw(out)
d.text((30,16),'7 off, tray close-up: 3x render enlarged 2x (Black top, White bottom)',font=F(26),fill=(245,236,220))
x=40
for st,im in cl:
    tc(d,(x-30,64,x+cw+30,100),st,F(26),(240,150,70) if st.startswith('D') else (200,190,175)); out.paste(im,(x,110)); x+=cw+60
out.save(O/'closeup-D.png',optimize=True); print('closeup',out.size)
