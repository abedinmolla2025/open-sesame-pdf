/**
 * Lightweight, fully client-side face detection used to pre-position the
 * passport photo alignment guide.
 *
 * Strategy:
 *  1. Use the browser's native `FaceDetector` API when available (Chrome/Edge).
 *  2. Otherwise fall back to a skin-tone segmentation heuristic that finds the
 *     dominant face-like region of the photo.
 *
 * Results are returned in *image pixel* coordinates so they can be fed straight
 * into the crop/snap maths.
 */

export interface FaceAnchor {
  /** Horizontal centre of the face */
  u: number;
  /** Top of the head (crown), including hair */
  crownV: number;
  /** Bottom of the chin */
  chinV: number;
  /** Approximate eye line */
  eyeV: number;
  /** How the anchor was obtained */
  source: "native" | "heuristic";
  /** 0–1 rough confidence in the detection */
  confidence: number;

}

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<
    { boundingBox: { x: number; y: number; width: number; height: number } }[]
  >;
};

async function detectNative(img: HTMLImageElement): Promise<FaceAnchor | null> {
  const Ctor = (window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike }).FaceDetector;
  if (!Ctor) return null;
  try {
    const detector = new Ctor({ fastMode: false, maxDetectedFaces: 5 });
    const faces = await detector.detect(img);
    if (!faces?.length) return null;
    // Largest face wins
    const box = faces
      .map((f) => f.boundingBox)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
    // Native boxes roughly span brow -> chin; extend upwards for hair/crown.
    const chinV = box.y + box.height * 1.02;
    const crownV = box.y - box.height * 0.42;
    const areaFrac = (box.width * box.height) / (img.width * img.height);
    let confidence = 0.95;
    if (faces.length > 1) confidence -= 0.1;
    if (areaFrac < 0.02) confidence -= 0.2;
    else if (areaFrac < 0.05) confidence -= 0.08;
    return {
      u: box.x + box.width / 2,
      crownV: Math.max(0, crownV),
      chinV: Math.min(img.height, chinV),
      eyeV: box.y + box.height * 0.42,
      source: "native",
      confidence: Math.min(0.98, Math.max(0.5, confidence)),
    };

  } catch {
    return null;
  }
}

function isSkin(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const rule1 = r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
  // YCbCr rule catches darker and cooler-lit skin tones
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const rule2 = cb >= 77 && cb <= 135 && cr >= 133 && cr <= 180 && r > 50;
  return rule1 || rule2;
}

function detectHeuristic(img: HTMLImageElement): FaceAnchor | null {
  const W = 180;
  const H = Math.max(1, Math.round((img.height / img.width) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null;
  }

  const mask = new Uint8Array(W * H);
  const rows = new Float32Array(H);
  const cols = new Float32Array(W);
  let total = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        mask[y * W + x] = 1;
        rows[y]++;
        cols[x]++;
        total++;
      }
    }
  }
  if (total < W * H * 0.01) return null;

  // Column band around the strongest skin column (the face)
  let peakX = 0;
  for (let x = 1; x < W; x++) if (cols[x] > cols[peakX]) peakX = x;
  const colThresh = cols[peakX] * 0.25;
  let x0 = peakX;
  let x1 = peakX;
  while (x0 > 0 && cols[x0 - 1] >= colThresh) x0--;
  while (x1 < W - 1 && cols[x1 + 1] >= colThresh) x1++;

  // Row band restricted to that column window
  let peakY = 0;
  const bandRows = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    let c = 0;
    for (let x = x0; x <= x1; x++) c += mask[y * W + x];
    bandRows[y] = c;
    if (c > bandRows[peakY]) peakY = y;
  }
  const rowThresh = bandRows[peakY] * 0.25;
  let y0 = peakY;
  let y1 = peakY;
  while (y0 > 0 && bandRows[y0 - 1] >= rowThresh) y0--;
  while (y1 < H - 1 && bandRows[y1 + 1] >= rowThresh) y1++;

  const faceW = x1 - x0 + 1;
  const faceH = y1 - y0 + 1;
  if (faceW < W * 0.06 || faceH < H * 0.06) return null;
  // A face region should not be absurdly wide/short (likely bare skin / background)
  if (faceW / faceH > 2.2) return null;

  const sx = img.width / W;
  const sy = img.height / H;
  // Skin band spans roughly hairline -> chin; head (crown->chin) is ~1.38x that.
  const chin = (y1 + 1) * sy;
  const skinTop = y0 * sy;
  const crown = chin - (chin - skinTop) * 1.38;
  return {
    u: ((x0 + x1 + 1) / 2) * sx,
    crownV: Math.max(0, crown),
    chinV: Math.min(img.height, chin),
    eyeV: skinTop + (chin - skinTop) * 0.35,
    source: "heuristic",
  };
}

export async function detectFace(img: HTMLImageElement): Promise<FaceAnchor | null> {
  const native = await detectNative(img);
  if (native && native.chinV > native.crownV) return native;
  const h = detectHeuristic(img);
  if (h && h.chinV > h.crownV) return h;
  return null;
}
