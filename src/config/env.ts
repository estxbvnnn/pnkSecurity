import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Falta la variable de entorno ${name} (revisa tu .env)`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3000", 10),

  db: {
    host: required("PGHOST", "127.0.0.1"),
    port: parseInt(process.env.PGPORT ?? "5432", 10),
    database: required("PGDATABASE", "carta_digital"),
    user: required("PGUSER", "carta_app"),
    password: required("PGPASSWORD"),
  },

  session: {
    secret: required("SESSION_SECRET"),
    secureCookie: (process.env.SESSION_SECURE_COOKIE ?? "false") === "true",
  },

  isProd: (process.env.NODE_ENV ?? "development") === "production",
};
