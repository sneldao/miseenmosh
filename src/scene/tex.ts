import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Dark metro tile with grout lines and per-tile value noise. */
export function tileTexture() {
  const c = canvas(256, 256);
  const g = c.getContext("2d")!;
  const tw = 64;
  const th = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const v = 26 + ((x * 7 + y * 13) % 12);
      g.fillStyle = `rgb(${v},${v - 3},${v - 6})`;
      g.fillRect(x * tw, y * th, tw, th);
      g.fillStyle = "rgba(255,235,200,0.04)";
      g.fillRect(x * tw, y * th, tw, 3);
    }
  }
  g.fillStyle = "#151210";
  for (let x = 0; x <= 4; x++) g.fillRect(x * tw - 1, 0, 2, 256);
  for (let y = 0; y <= 8; y++) g.fillRect(0, y * th - 1, 256, 2);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Scuffed dark kitchen floor: big worn squares. */
export function floorTexture() {
  const c = canvas(256, 256);
  const g = c.getContext("2d")!;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const even = (x + y) % 2 === 0;
      const v = even ? 24 : 30;
      g.fillStyle = `rgb(${v},${v - 3},${v - 5})`;
      g.fillRect(x * 64, y * 64, 64, 64);
      if ((x * 5 + y * 3) % 4 === 0) {
        g.fillStyle = "rgba(0,0,0,0.18)";
        g.fillRect(x * 64 + 8, y * 64 + 20, 30, 12);
      }
    }
  }
  g.fillStyle = "#0e0c0a";
  for (let x = 0; x <= 4; x++) g.fillRect(x * 64 - 1, 0, 2, 256);
  for (let y = 0; y <= 4; y++) g.fillRect(0, y * 64 - 1, 256, 2);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Torn-edge band poster: MISE EN MOSH gig bill. */
export function posterTexture() {
  const c = canvas(256, 340);
  const g = c.getContext("2d")!;
  // aged paper
  g.fillStyle = "#e8dcc0";
  g.fillRect(0, 0, 256, 340);
  const grad = g.createLinearGradient(0, 0, 0, 340);
  grad.addColorStop(0, "rgba(120,80,30,0.10)");
  grad.addColorStop(1, "rgba(60,30,10,0.30)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 340);
  // header
  g.fillStyle = "#1a1008";
  g.font = "bold 20px Georgia, serif";
  g.textAlign = "center";
  g.fillText("ONE NIGHT ONLY", 128, 44);
  // main title
  g.font = "italic bold 44px Georgia, serif";
  g.fillStyle = "#8a1c10";
  g.fillText("MISE", 128, 110);
  g.fillText("EN", 128, 152);
  g.fillText("MOSH", 128, 194);
  // band rules
  g.strokeStyle = "#1a1008";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(40, 216); g.lineTo(216, 216);
  g.moveTo(40, 222); g.lineTo(216, 222);
  g.stroke();
  g.fillStyle = "#1a1008";
  g.font = "13px Georgia, serif";
  g.fillText("w/ THE BRIGADE", 128, 246);
  g.fillText("and THE INSPECTOR", 128, 264);
  g.font = "bold 16px Georgia, serif";
  g.fillText("SERVICE 7PM SHARP", 128, 300);
  g.font = "11px Georgia, serif";
  g.fillText("no walkouts · no refunds", 128, 322);
  // torn corner
  g.fillStyle = "#181410";
  g.beginPath();
  g.moveTo(256, 300); g.lineTo(256, 340); g.lineTo(216, 340);
  g.lineTo(230, 326); g.lineTo(222, 316); g.lineTo(240, 306);
  g.closePath();
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
