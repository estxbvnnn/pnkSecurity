import express, { Express } from "express";
import path from "path";
import { sessionMiddleware } from "./middlewares/session";
import { securityHeaders } from "./middlewares/security";
import { csrfToken } from "./middlewares/csrf";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { router } from "./routes";
import { adminRouter } from "./routes/admin";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by"); // no filtrar la tecnología/versión del servidor

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(securityHeaders);
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(csrfToken);

  app.use(express.static(path.join(__dirname, "public")));

  // Usado por Docker/Jenkins para verificar que la app está viva.
  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  app.use("/admin", adminRouter);
  app.use(router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
