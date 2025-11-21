import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import path from "path";

import { authMiddleware, requireAuth /*, requireRole */ } from "@/lib/auth";

// Auth routes
import customerAuth from "@/routes/auth/customer";
import storeAuth from "@/routes/auth/store";
import driverAuth from "@/routes/auth/driver";
import adminAuth from "@/routes/auth/admin";
import universalAuth from "@/routes/auth/login";
import sessionRoute from "@/routes/auth/session";

// Feature routes
import adminDrivers from "@/routes/admin/drivers";
import adminAnnouncements from "@/routes/admin/announcements";
import announcementsRoute from "@/routes/announcements";
import customerProfileRoute from "@/routes/customer/profile";
import driverProfileRoute from "@/routes/driver/profile"; 
import storeProfileRoute from "@/routes/store/profile";

const app = express();

// Hindari ETag supaya /auth/session tidak 304
app.set("etag", false);

// CORS (cookie auth)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Common middlewares
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// Attach req.user bila ada sesi
app.use(authMiddleware);

// Root ping
app.get("/", (_req, res) => {
  res.send("Gokir backend is running. Try GET /health");
});

// Static uploads
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "gokir-backend" }));

// --- Routes ---
// Session (GET /auth/session, POST /auth/logout)
app.use("/auth", sessionRoute);

// Auth per-aktor
app.use("/auth/customer", customerAuth);
app.use("/auth/store", storeAuth);
app.use("/auth/driver", driverAuth);
app.use("/auth/admin", adminAuth);

// Universal username/email login
app.use("/auth", universalAuth);

// Fitur lain
app.use("/admin/drivers", adminDrivers);
app.use("/admin/announcements", adminAnnouncements);
app.use("/announcements", announcementsRoute);

app.use("/store/profile", requireAuth, storeProfileRoute);
app.use("/driver/profile", requireAuth, driverProfileRoute);

app.use("/customer/profile", customerProfileRoute);

// 404 JSON fallback
app.use((req, res) => {
  res
    .status(404)
    .json({ ok: false, error: { message: `Route ${req.method} ${req.path} not found` } });
});

export default app;
