import { createApp } from "./app";
import { env } from "./config/env";
import { pingDb } from "./config/db";

async function main(): Promise<void> {
  try {
    await pingDb();
    console.log("Conexión a PostgreSQL OK.");
  } catch (err) {
    console.error("No se pudo conectar a PostgreSQL:", (err as Error).message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Carta Digital escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

main();
