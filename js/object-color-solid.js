// 物体色の立体（最適色立体）の計算。各ページで共通に使う。
//
// 光を反射する物の色は、波長ごとの反射率（0〜1）で決まる。反射率をあらゆる形に変えたときの
// 色を XYZ で集めると、黒（すべて 0）と白（すべて 1）を両端にした凸の立体になる。これが物体色の立体。
// 照明は sRGB の白と同じ D65 にして、白を Y = 1 にそろえる。
//
// 立体の表面に来るのは、反射率が 0 か 1 だけで、切り替わりが2回以下の色（最適色）。
// 波長を輪のようにつなげて（780 nm の次を 380 nm とみなして）、「開始の波長から何本ぶんを反射するか」で
// 表面の点が1つずつ決まる。反射する幅が狭いほど、色度はスペクトル軌跡（幅が両端をまたぐと純紫軌跡）に近づく。
// そのため xyY で真上から見ると、立体の輪郭は馬蹄形になる。

// 等色関数と D65 のデータ（CIE、CC BY-SA 4.0。出典はデータファイルの先頭を参照）
import { CMF_1931 } from "../data/cie1931-cmf.js";
import { D65 } from "../data/cie-d65.js";

// ------------------------------------------------------------
// 1. 波長ごとの成分：その波長の幅だけを反射する物の XYZ（白の Y が 1 になるようにそろえる）
// ------------------------------------------------------------
const raw = CMF_1931.map(([, xb, yb, zb], k) => {
  const s = D65[k][1];
  return [s * xb, s * yb, s * zb];
});
const yTotal = raw.reduce((sum, v) => sum + v[1], 0);
const BANDS = raw.map((v) => v.map((c) => c / yTotal));

export const BAND_COUNT = BANDS.length;

// prefix[k] = 0〜k-1 番目の成分の合計
const prefix = [[0, 0, 0]];
for (const v of BANDS) prefix.push(prefix[prefix.length - 1].map((c, i) => c + v[i]));
export const WHITE_XYZ = prefix[BAND_COUNT];

// 開始 start 番目から length 本ぶんを反射する最適色の XYZ（輪のようにつなげて数える）
export function bandXYZ(start, length) {
  const n = BAND_COUNT;
  const a = ((start % n) + n) % n;
  const b = a + length;
  if (b <= n) return [0, 1, 2].map((i) => prefix[b][i] - prefix[a][i]);
  return [0, 1, 2].map((i) => prefix[n][i] - prefix[a][i] + prefix[b - n][i]);
}

export function chromaticity([X, Y, Z]) {
  const s = X + Y + Z;
  return [X / s, Y / s];
}

// ------------------------------------------------------------
// 2. 表面のメッシュ
//
// 頂点 (s, L) は「開始 s 番目から L 本ぶん」の最適色。L = 0 は黒、L = BAND_COUNT は白。
// 隣り合う4つの最適色 (s, L) (s, L+1) (s+1, L) (s+1, L-1) は平らな平行四辺形の面になる。
// 黒の頂点は、xyY では色度が決まらないので、開始の波長の単色光の色度に置く（床の馬蹄形の縁になる）。
// ------------------------------------------------------------
export function buildSurface() {
  const n = BAND_COUNT;
  const vertices = []; // { xyz, xy }
  const id = (s, L) => (s % n) * (n + 1) + L;
  for (let s = 0; s < n; s++) {
    for (let L = 0; L <= n; L++) {
      const xyz = bandXYZ(s, L);
      const xy = L === 0 ? chromaticity(BANDS[s]) : chromaticity(xyz);
      vertices.push({ xyz, xy });
    }
  }
  const indices = [];
  for (let s = 0; s < n; s++) {
    // 黒の縁：(s, 0) (s, 1) (s+1, 0)
    indices.push(id(s, 0), id(s + 1, 0), id(s, 1));
    for (let L = 1; L < n; L++) {
      const a = id(s, L), b = id(s, L + 1), c = id(s + 1, L), d = id(s + 1, L - 1);
      indices.push(a, c, b, a, d, c);
    }
  }
  return { vertices, indices, bottomRing: [...Array(n).keys()].map((s) => id(s, 0)) };
}

// ------------------------------------------------------------
// 3. ある色度で、物体色として出せる最も明るい Y
//
// xyY の縦の線は、XYZ では黒から伸びる光線になる。立体は凸なので、光線が表面から出る点が求める明るさ。
// 立体（帯の和）の面の向きは、2つの成分の外積で表せる。面の向き n ごとに「n 方向にどこまで出られるか」
// h(n) = Σ max(0, n·成分) が決まり、光線 t·c が立体の中にある条件は、すべての n で t (n·c) ≤ h(n)。
// ------------------------------------------------------------
// 何度も呼ぶので、面の向きと h を1本の配列に [nx, ny, nz, h, nx, ny, nz, h, ...] と並べておく
const HALF_SPACES = (() => {
  const list = [];
  for (let a = 0; a < BAND_COUNT; a++) {
    for (let b = a + 1; b < BAND_COUNT; b++) {
      const [p, q] = [BANDS[a], BANDS[b]];
      const nrm = [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
      const len = Math.hypot(...nrm);
      if (len < 1e-12) continue; // 色度が同じ成分どうし（長い波長の端など）は面を作らない
      for (const sign of [1, -1]) {
        const v = nrm.map((c) => (sign * c) / len);
        const h = BANDS.reduce((sum, w) => sum + Math.max(0, v[0] * w[0] + v[1] * w[1] + v[2] * w[2]), 0);
        list.push(v[0], v[1], v[2], h);
      }
    }
  }
  return Float64Array.from(list);
})();

export function maxY(x, y) {
  if (y <= 0) return 0;
  const cx = x / y, cz = (1 - x - y) / y;
  const hs = HALF_SPACES;
  let t = Infinity;
  for (let i = 0; i < hs.length; i += 4) {
    const d = hs[i] * cx + hs[i + 1] + hs[i + 2] * cz;
    if (d > 1e-12 && hs[i + 3] < t * d) t = hs[i + 3] / d;
  }
  return Math.max(0, Math.min(1, t));
}

// ------------------------------------------------------------
// 4. 画面に出す色
//
// sRGB の画面で出せない色は、同じ明るさの灰色に向かって鮮やかさを下げ、出せる範囲に入れる。
// xy色度図の上では、白色点から外へ向かう線の上を、三角形の縁まで戻すことになる。
// 返すのは three.js の頂点色に渡す線形 RGB（0〜1）。
// ------------------------------------------------------------
const M_INV = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.9692660, 1.8760108, 0.0415560],
  [0.0556434, -0.2040259, 1.0572252]
];

export function xyzToLinearRGB([X, Y, Z]) {
  return M_INV.map((row) => row[0] * X + row[1] * Y + row[2] * Z);
}

export function displayLinear(xyz) {
  const rgb = xyzToLinearRGB(xyz);
  const g = Math.min(1, Math.max(0, xyz[1]));
  let t = 1;
  for (let i = 0; i < 3; i++) {
    const d = rgb[i] - g;
    if (d > 1e-12) t = Math.min(t, (1 - g) / d);
    else if (d < -1e-12) t = Math.min(t, g / -d);
  }
  if (t < 1) for (let i = 0; i < 3; i++) rgb[i] = g + (rgb[i] - g) * t;
  return rgb;
}

// ------------------------------------------------------------
// 5. CIELAB（白は立体の白 = D65）
// ------------------------------------------------------------
const DELTA = 6 / 29;
const labF = (t) => (t > DELTA ** 3 ? Math.cbrt(t) : t / (3 * DELTA * DELTA) + 4 / 29);

export function xyzToLab([X, Y, Z]) {
  const fx = labF(X / WHITE_XYZ[0]);
  const fy = labF(Y / WHITE_XYZ[1]);
  const fz = labF(Z / WHITE_XYZ[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
