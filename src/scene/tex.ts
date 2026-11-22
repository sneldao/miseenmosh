import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Cream metro tile, staggered bond, muted petrol grout, fine ink
 *  crosshatch chips. All detail is deterministic — same wall every frame. */
export function tileTexture() {
  const c = canvas(256, 256);
  const g = c.getContext("2d")!;
  const tw = 64;
  const th = 32;
  g.fillStyle = "#7d9a96"; // muted petrol grout
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) {
    const off = (y % 2) * (tw / 2);
    for (let x = -1; x < 5; x++) {
      const px = x * tw + off;
      const py = y * th;
      const warm = (x * 7 + y * 13) % 3;
      g.fillStyle = warm === 0 ? "#f8ecd2" : warm === 1 ? "#f4e6c6" : "#fbf0d8";
      g.fillRect(px + 1.5, py + 1.5, tw - 3, th - 3);
      // glazed top-edge light
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(px + 1.5, py + 1.5, tw - 3, 3);
      // fine crosshatch chips, fixed pattern
      const chip = (x * 5 + y * 11) % 7;
      if (chip === 0) {
        g.strokeStyle = "rgba(48,44,43,0.35)";
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(px + 12, py + 22); g.lineTo(px + 20, py + 26);
        g.moveTo(px + 14, py + 26); g.lineTo(px + 18, py + 22);
        g.moveTo(px + 44, py + 8); g.lineTo(px + 50, py + 12);
        g.stroke();
      }
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Muted cream/petrol checker floor — worn illustrated tiles. */
export function floorTexture() {
  const c = canvas(256, 256);
  const g = c.getContext("2d")!;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const even = (x + y) % 2 === 0;
      g.fillStyle = even ? "#e9dcc0" : "#9db8b2";
      g.fillRect(x * 64, y * 64, 64, 64);
      // scuff + wear, deterministic
      if ((x * 5 + y * 3) % 4 === 0) {
        g.fillStyle = "rgba(60,50,40,0.12)";
        g.fillRect(x * 64 + 10, y * 64 + 22, 28, 10);
      }
      if ((x * 3 + y * 7) % 5 === 0) {
        g.fillStyle = "rgba(255,255,255,0.10)";
        g.fillRect(x * 64 + 30, y * 64 + 12, 18, 8);
      }
    }
  }
  g.fillStyle = "#6f8a84";
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
