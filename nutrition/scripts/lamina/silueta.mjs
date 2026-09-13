// Genera la máscara de silueta que recorta el color del mapa muscular.
//
// El fondo de la lámina no es negro plano: tiene un degradado que en
// algunas zonas llega al brillo del relleno oscuro del músculo, así que un
// simple umbral no separa cuerpo de fondo. Lo que sí es inequívocamente
// cuerpo es la línea blanca del contorno: se engorda hasta cerrar la
// figura, se inunda el fondo desde los bordes del lienzo, y lo que no se
// moja es el cuerpo.
import sharp from "sharp";

const { data, info } = await sharp(process.argv[2] ?? "public/entreno/cuerpo.webp")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;
const px = w * h;

function morf(src, r, modo) {
  const tmp = Buffer.alloc(px);
  const dst = Buffer.alloc(px);
  const cmp = modo === "dil" ? Math.max : Math.min;
  for (let y = 0; y < h; y += 1) {
    const f = y * w;
    for (let x = 0; x < w; x += 1) {
      let v = src[f + x];
      for (let d = -r; d <= r; d += 1) {
        const xx = x + d;
        if (xx >= 0 && xx < w) v = cmp(v, src[f + xx]);
      }
      tmp[f + x] = v;
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

const lum = (p) => {
  const i = p * ch;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};

// El suelo iluminado de la lámina llega al brillo de un contorno, pero no
// al de la línea blanca que dibuja cada músculo: con el listón alto sólo
// entra el trazo y el suelo se queda fuera, que es lo que permite que el
// relleno del fondo pase por debajo de los pies.
const linea = Buffer.alloc(px);
for (let p = 0; p < px; p += 1) linea[p] = lum(p) > 150 ? 255 : 0;

const cerrado = morf(linea, 7, "dil");
const fondo = new Uint8Array(px);
const pila = [];
for (let x = 0; x < w; x += 1) pila.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y += 1) pila.push(y * w, y * w + w - 1);
while (pila.length) {
  const p = pila.pop();
  if (fondo[p] || cerrado[p]) continue;
  fondo[p] = 1;
  const x = p % w;
  const y = (p - x) / w;
  if (x > 0) pila.push(p - 1);
  if (x < w - 1) pila.push(p + 1);
  if (y > 0) pila.push(p - w);
  if (y < h - 1) pila.push(p + w);
}

const cuerpo = Buffer.alloc(px);
for (let p = 0; p < px; p += 1) cuerpo[p] = fondo[p] ? 0 : 255;

// El hueco entre las piernas (y el de entre brazo y torso, y la banda del
// suelo) queda cercado por el propio contorno: la inundación no llega y se
// marcan como cuerpo. Son trozos de FONDO.
//
// Separarlos por brillo medio no vale — lo intenté y salió al revés: el
// relleno del músculo es tan oscuro que la media del cuerpo entero queda
// por debajo de la del suelo iluminado, y el filtro borraba las figuras y
// dejaba el fondo. Lo que sí es cierto sin depender de ningún umbral: las
// dos regiones más grandes del lienzo son las dos figuras.
const componentes = [];
const visto = new Uint8Array(px);
for (let semilla = 0; semilla < px; semilla += 1) {
  if (!cuerpo[semilla] || visto[semilla]) continue;
  const miembros = [];
  const cola = [semilla];
  visto[semilla] = 1;
  while (cola.length) {
    const p = cola.pop();
    miembros.push(p);
    const x = p % w;
    const y = (p - x) / w;
    const vecinos = [];
    if (x > 0) vecinos.push(p - 1);
    if (x < w - 1) vecinos.push(p + 1);
    if (y > 0) vecinos.push(p - w);
    if (y < h - 1) vecinos.push(p + w);
    for (const q of vecinos) {
      if (cuerpo[q] && !visto[q]) {
        visto[q] = 1;
        cola.push(q);
      }
    }
  }
  componentes.push(miembros);
}
componentes.sort((a, b) => b.length - a.length);
process.stdout.write(
  `regiones: ${componentes.slice(0, 4).map((c) => c.length).join(", ")} …de ${componentes.length}\n`,
);
for (const c of componentes.slice(2)) for (const p of c) cuerpo[p] = 0;

// Engordar el contorno cierra la figura pero también la agranda 11px, y
// deja dentro trozos de fondo cercados (el hueco entre brazo y torso). Se
// erosiona más de lo que se dilató: la máscara acaba POR DENTRO del
// contorno, que es lo que interesa — así el color nunca toca la línea
// blanca del borde y el cuerpo se recorta limpio contra el fondo.
const ajustado = morf(cuerpo, 13, "ero");
// OJO: sharp devuelve el desenfoque en 3 canales aunque la entrada sea de
// uno. Leerlo como si fuera de uno descoloca la imagen entera (sale la
// primera tercera parte estirada), y el fallo no da error: sólo una
// máscara que no coincide con nada.
const borroso = await sharp(ajustado, { raw: { width: w, height: h, channels: 1 } })
  .blur(4)
  .raw()
  .toBuffer({ resolveWithObject: true });
const bc = borroso.info.channels;
const suave = Buffer.alloc(px);
for (let p = 0; p < px; p += 1) suave[p] = borroso.data[p * bc];

let dentro = 0;
for (let p = 0; p < px; p += 1) if (suave[p] > 128) dentro += 1;
process.stdout.write(`silueta: ${((100 * dentro) / px).toFixed(1)}% del lienzo\n`);

await sharp(suave, { raw: { width: w, height: h, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(process.argv[3] ?? "public/entreno/cuerpo-silueta.png");

