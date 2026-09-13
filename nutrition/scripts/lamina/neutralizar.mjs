// Quita los resaltados de color (pectoral azul, tríceps naranja) que la
// imagen trae pintados, para que el único color de la figura sea el que
// pinte la app según el rango de cada músculo.
//
// Dos decisiones que costaron varios intentos:
//   - La máscara es una rampa suave, no un umbral. Con un umbral binario
//     el borde corregido deja escalones cuadrados bien visibles.
//   - Lo que se protege no es "lo brillante" sino "lo brillante Y neutro",
//     que es la línea blanca que dibuja cada músculo. El brillo naranja
//     del tríceps también es brillante, y protegerlo dejaba un manchón.
import sharp from "sharp";

const ENTRADA = process.argv[2];
const SALIDA = process.argv[3];

const { data, info } = await sharp(ENTRADA)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;
const raw1 = { raw: { width: w, height: h, channels: 1 } };
const px = w * h;

const sat = new Float32Array(px);
const mascara = Buffer.alloc(px);
for (let p = 0; p < px; p += 1) {
  const i = p * ch;
  const max = Math.max(data[i], data[i + 1], data[i + 2]);
  const min = Math.min(data[i], data[i + 1], data[i + 2]);
  sat[p] = (max - min) / Math.max(1, max);
  // Puerta de brillo: en un píxel casi negro la saturación sale del ruido
  // de compresión, no de un color. Sin esto la máscara se come el fondo.
  const puerta = Math.max(0, Math.min(1, (max - 50) / 25));
  const rampa = Math.max(0, Math.min(1, (sat[p] - 0.1) / 0.12));
  mascara[p] = Math.round(rampa * puerta * 255);
}

// Morfología separable (una pasada horizontal y otra vertical): con un
// kernel cuadrado directo esto serían miles de millones de operaciones.
function morf(src, r, modo) {
  const tmp = Buffer.alloc(px);
  const dst = Buffer.alloc(px);
  const cmp = modo === "dil" ? Math.max : Math.min;
  for (let y = 0; y < h; y += 1) {
    const fila = y * w;
    for (let x = 0; x < w; x += 1) {
      let v = src[fila + x];
      for (let d = -r; d <= r; d += 1) {
        const xx = x + d;
        if (xx >= 0 && xx < w) v = cmp(v, src[fila + xx]);
      }
      tmp[fila + x] = v;
    }
  }
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) {
      let v = tmp[y * w + x];
      for (let d = -r; d <= r; d += 1) {
        const yy = y + d;
        if (yy >= 0 && yy < h) v = cmp(v, tmp[yy * w + x]);
      }
      dst[y * w + x] = v;
    }
  }
  return dst;
}

// El destello del tríceps es casi blanco: no tiene saturación, así que la
// rampa lo deja fuera y queda como una mancha clara en medio de un músculo
// ya corregido. Es un AGUJERO dentro de la mancha de color, y un cierre
// (dilatar y volver a erosionar) lo rellena sin agrandar el contorno.
// Desenfocar no bastaba: el agujero mide más que el radio del desenfoque.
const cerrada = morf(morf(mascara, 22, "dil"), 22, "ero");
// OJO: sharp devuelve el desenfoque en 3 canales aunque la entrada sea de
// uno. Leerlo como si fuera de uno descoloca la imagen entera y el fallo no
// da error — sólo una máscara que no coincide con nada.
const gris1 = async (img, radio) => {
  const r = await sharp(img, raw1).blur(radio).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(px);
  for (let p = 0; p < px; p += 1) out[p] = r.data[p * r.info.channels];
  return out;
};
const suave = await gris1(cerrada, 7);
const ancho = await gris1(mascara, 28);
const alpha = new Float32Array(px);
for (let p = 0; p < px; p += 1) {
  alpha[p] = Math.max(mascara[p], Math.min(cerrada[p], suave[p])) / 255;
}

const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
const mediana = (a) => {
  a.sort((x, y) => x - y);
  return a.length ? a[a.length >> 1] : 1;
};

// Referencia: el músculo sano pegado al resaltado. Comparar contra el
// vecindario y no contra todo el cuerpo evita dejar el pecho más claro
// que lo que tiene justo al lado.
const fuera = [];
for (let p = 0; p < px; p += 1) {
  const l = lum(p * ch);
  if (l < 20 || l > 195) continue;
  if (alpha[p] < 0.04 && ancho[p] > 8) fuera.push(l);
}
const objetivo = mediana(fuera);

// Sólo el núcleo del resaltado sirve para medir: los bordes difuminados
// son mezcla y arrastrarían la mediana hacia el fondo.
const nucleo = [];
for (let p = 0; p < px; p += 1) if (mascara[p] > 200) nucleo.push(p);

const gris = new Float32Array(px);
for (const p of nucleo) gris[p] = lum(p * ch);
for (let p = 0; p < px; p += 1) if (!gris[p]) gris[p] = lum(p * ch);

const salida = new Float32Array(px);
for (let p = 0; p < px; p += 1) salida[p] = lum(p * ch);

// Una línea de contorno es FINA: al desenfocarla se hunde, porque casi
// todo su vecindario es oscuro. El destello del tríceps es una mancha
// ancha y sigue clara al desenfocar. Con sólo "es casi blanco" los dos
// pasaban por línea y el destello se quedaba puesto.
const lumBuf = Buffer.alloc(px);
for (let p = 0; p < px; p += 1) lumBuf[p] = Math.max(0, Math.min(255, Math.round(lum(p * ch))));
const lumAncha = await gris1(lumBuf, 12);

let factor = 1;
for (let it = 0; it < 40; it += 1) {
  const actual = mediana(nucleo.map((p) => salida[p]).filter((l) => l > 15));
  if (Math.abs(actual - objetivo) < 0.6) {
    process.stdout.write(`converge en ${it} pasadas: ${actual.toFixed(1)} vs ${objetivo.toFixed(1)}\n`);
    break;
  }
  factor *= objetivo / actual;
  for (let p = 0; p < px; p += 1) {
    const l = lum(p * ch);
    // Línea de contorno = brillante, neutra y fina. Ésa se deja pasar; el
    // destello del resaltado, no.
    const esLinea = l > 210 && sat[p] < 0.12 && lumAncha[p] < 110;
    const peso = esLinea ? 0.12 : 1;
    salida[p] = l * (1 - peso + peso * factor);
  }
}

for (let p = 0; p < px; p += 1) {
  const a = alpha[p];
  if (a <= 0.002) continue;
  const i = p * ch;
  const v = Math.max(0, Math.min(255, Math.round(salida[p])));
  for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(data[i + c] * (1 - a) + v * a);
}

await sharp(data, { raw: { width: w, height: h, channels: ch } }).png().toFile(SALIDA);
process.stdout.write(`factor ${factor.toFixed(3)} -> ${SALIDA}\n`);
