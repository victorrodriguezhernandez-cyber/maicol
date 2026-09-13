# La lámina del mapa muscular

`public/entreno/cuerpo.webp` y `public/entreno/cuerpo-silueta.png` no se
editan a mano: se generan desde `public/entreno/cuerpo-original.png`, que
es la imagen que aportó el usuario (suya, no hay licencia que respetar).

```bash
node scripts/lamina/neutralizar.mjs public/entreno/cuerpo-original.png /tmp/neutro.png
node -e "require('sharp')('/tmp/neutro.png').extract({left:136,top:12,width:1144,height:1013}).webp({quality:82}).toFile('public/entreno/cuerpo.webp')"
node scripts/lamina/silueta.mjs
```

1. **neutralizar** quita los resaltados de color que la imagen trae
   pintados (pectoral azul, tríceps naranja). Si no se quitan, chocan con
   el color del rango y el pecho parece entrenado cuando no lo está.
2. El **recorte** quita los márgenes vacíos y fija el sistema de
   coordenadas de `BodyMap.tsx`: 1144 × 1013, figura de frente centrada en
   x=283 y de espaldas en x=880. **Si cambias el recorte, cambian todas
   las coordenadas del mapa.**
3. **silueta** saca la máscara que recorta el color contra el fondo. No se
   puede sacar por brillo: el relleno oscuro del músculo y el fondo tienen
   la misma luminancia (mediana 19 los dos). Se saca inundando el fondo
   desde los bordes del lienzo, con la línea blanca del contorno como
   barrera.
