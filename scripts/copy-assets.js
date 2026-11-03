// tsc solo compila .ts -> .js; las vistas EJS y los estáticos (css/img/vendors,
// y el JS de cliente ya compilado dentro de src/public/js/dist) no son
// TypeScript, así que hay que copiarlos a dist/ como parte del build de
// producción. Debe ejecutarse DESPUÉS de compilar backend y cliente.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function copiar(nombre) {
  const src = path.join(root, "src", nombre);
  const dest = path.join(root, "dist", nombre);
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copiado: src/${nombre} -> dist/${nombre}`);
}

copiar("views");
copiar("public");
