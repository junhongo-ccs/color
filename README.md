# xy色度図を立体で見る

xy色度図に明るさ（Y）を足すと、画面で出せる色（sRGB）の範囲は立体になります。
その色立体をブラウザで回して眺めながら、色彩検定 UC級で学ぶ混同色線や、等色相面での明るさの違いを確かめるためのサイトです。

**公開ページ：** https://junhongo-ccs.github.io/color/

## ページ

| ページ | ファイル | 内容 |
|---|---|---|
| トップ | `index.html` | 各ページへの入口 |
| このサイトの見方 | `about.html` | 色立体とは何か、xyY と CIELAB で形が違う理由、しくみの解説 |
| 色度図に明るさを足して見る | `color-solid.html` | sRGB の 5,832 色を点として xyY / CIELAB に配置 |
| 色度図の立体を面で見る | `color-solid-mesh.html` | RGB 立方体の6面を写した、色域の正確な境界面 |
| 混同色線を立体で見る | `confusion-lines.html` | 1型・2型・3型の混同色線を xyY 立体の縦の断面として表示し、見え方のシミュレーションと比較 |
| 等色相面を立体で見る | `hue-slices.html` | CIELAB の等色相面で、最も鮮やかな色の明度が色相ごとに違うことを確認 |

## ローカルで動かす

ビルドは不要です。HTML をそのまま配信するだけで動きます。

```sh
python -m http.server 8000
```

ブラウザで http://127.0.0.1:8000/ を開きます。
Three.js を CDN（jsDelivr）から読み込むため、インターネット接続が必要です。

## 構成

- 各ページは HTML 1ファイルで完結しています（CSS とスクリプトもページ内に記述）。
- 3D 描画は [Three.js](https://threejs.org/) r169 と `OrbitControls` を、import map で CDN から読み込んでいます。
- 色の変換やメッシュの生成は、すべてブラウザ内で計算しています。
- 拡大率はページごとに `sessionStorage` に保存し、同じタブの中では再読み込みしても引き継ぎます。

## 色の計算について

- **sRGB ↔ XYZ**：IEC 61966-2-1 の変換式と行列、白色点 D65
- **CIELAB**：D65 を基準白色とする CIE 1976 L\*a\*b\*
- **色域の境界**：RGB→XYZ は線形な1対1の変換なので、RGB 立方体の表面をそのまま写して境界面にしています
- **混同色線**：Smith & Pokorny の錐体分光感度から混同色中心を求めています
  （1型 ≈ (0.747, 0.253)、2型 ≈ (1.40, −0.40)、3型 ≈ (0.175, 0.000)）
- **見え方のシミュレーション**：Viénot ら（1999）の方法による近似です。3型は特に精度が下がります。色の見え方には個人差があり、実際の見え方をそのまま再現するものではありません。
- **等色相面の頂点**：各色相で最も鮮やかな色は、RGB 立方体の「1チャンネルが1・1チャンネルが0」の辺の上にあるので、その辺をたどって求めています

## データの出典とライセンス

xy色度図のスペクトル軌跡（馬蹄形の線）には、CIE が公開しているデータを使っています。

- 出典：CIE (2019). *CIE 1931 chromaticity coordinates of spectrum loci, 2 degree observer.* International Commission on Illumination (CIE), Vienna, Austria. DOI: [10.25039/CIE.DS.mifmy4x4](https://doi.org/10.25039/CIE.DS.mifmy4x4)（CIE 018:2019, Table 6）
- ライセンス：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 変更点：原データ（360〜830 nm、1 nm 刻み）から 380〜780 nm を 5 nm 刻みで抜き出し、JavaScript の配列にしました（値は変えていません）

このデータは [data/cie1931-spectral-locus.js](data/cie1931-spectral-locus.js) にまとめており、このファイルは CC BY-SA 4.0 で提供します。
リポジトリのほかのファイルには、このライセンスは適用されません。

### アイコン

ファビコン（`favicon.png`）と「説明を見る」のアイコンには、Google の [Material Symbols](https://fonts.google.com/icons)（[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)）を使っています。
ファビコンは `deployed_code`（塗りつぶし）の形に、色相が一周するグラデーションを付けて作りました。

## OGP 画像

`ogp.png`（1200×630）は仮の単色画像です。同じファイル名・同じサイズの画像で上書きすると、全ページの OGP 画像が差し替わります。
