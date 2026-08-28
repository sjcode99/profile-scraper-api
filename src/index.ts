import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import linkedinRoutes from "./routes/linkedin.routes.js";

const app = new Hono();

// Middleware
app.use("*", secureHeaders());
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "LinkedIn Profile API",
  });
});

// Health check (public)
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api", linkedinRoutes);

// Start server
serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
