import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { idValido } from "../utils/validar";

/**
 * Subida de la foto de un producto. Reglas de seguridad:
 *  - Solo se aceptan imágenes (whitelist de MIME type Y de extensión; el MIME
 *    que manda el navegador no es confiable por sí solo, así que se exige
 *    que ambos coincidan).
 *  - Tamaño máximo 5 MB.
 *  - El nombre de archivo en disco NUNCA usa el nombre original (evita path
 *    traversal / sobrescritura): se genera uno aleatorio con crypto.
 *  - Las imágenes se guardan en /imagenes/cod{restauranteId}/, siguiendo la
 *    misma convención que el resto de la app (y del proyecto PHP original).
 */
const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function carpetaImagenes(restauranteId: number): string {
  return path.join(PUBLIC_DIR, "imagenes", `cod${restauranteId}`);
}

function carpetaDestino(req: Request): string {
  const restauranteId = idValido(req.session.restauranteId) ?? 1;
  const dir = carpetaImagenes(restauranteId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Borra una foto de producto del disco (p. ej. la anterior, al reemplazarla
 * o al eliminar el producto). Nunca lanza error si el archivo no existe.
 */
export function borrarFoto(restauranteId: number, nombreArchivo: string | null | undefined): void {
  if (!nombreArchivo) return;
  // Blindaje extra: solo se borra un nombre de archivo plano (el que generamos
  // nosotros mismos), nunca algo con rutas ("../", "/", etc.).
  if (nombreArchivo.includes("/") || nombreArchivo.includes("\\") || nombreArchivo.includes("..")) return;
  const ruta = path.join(carpetaImagenes(restauranteId), nombreArchivo);
  fs.unlink(ruta, () => {
    /* si no existe o falla, no es crítico */
  });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, carpetaDestino(req));
    } catch (err) {
      cb(err as Error, "");
    }
  },
  filename: (_req, file, cb) => {
    const ext = TIPOS_PERMITIDOS[file.mimetype] ?? "";
    const nombreAleatorio = crypto.randomBytes(16).toString("hex");
    cb(null, `${nombreAleatorio}${ext}`);
  },
});

const filtroImagen: multer.Options["fileFilter"] = (_req, file, cb) => {
  const extOk = Object.values(TIPOS_PERMITIDOS).includes(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeOk = Object.prototype.hasOwnProperty.call(TIPOS_PERMITIDOS, file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF."));
  }
};

export const uploadFoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
  fileFilter: filtroImagen,
}).single("foto");

/**
 * Foto del restaurante (logo): se guarda en la MISMA carpeta cod{id} que sus
 * productos, usando el :id de la URL (no la sesión) — el edit siempre trae
 * el id del restaurante que se está editando.
 */
const storageRestaurante = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const restauranteId = idValido(req.params.id);
      if (restauranteId === null) throw new Error("id de restaurante inválido");
      const dir = carpetaImagenes(restauranteId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err as Error, "");
    }
  },
  filename: (_req, file, cb) => {
    const ext = TIPOS_PERMITIDOS[file.mimetype] ?? "";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

export const uploadFotoRestaurante = multer({
  storage: storageRestaurante,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: filtroImagen,
}).single("foto");
