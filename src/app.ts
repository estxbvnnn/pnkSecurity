import express, { Express } from "express";
import { securityHeaders } from "./middlewares/security";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by"); // no filtrar la tecnología/versión del servidor

  app.use(securityHeaders);

  return app;
}
