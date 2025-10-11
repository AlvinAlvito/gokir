import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { authMiddleware } from "@/lib/auth";
import customerAuth from "@/routes/auth/customer";
import storeAuth from "@/routes/auth/store";
import driverAuth from "@/routes/auth/driver";
import adminDrivers from "@/routes/admin/drivers";
import adminAuth from "@/routes/auth/admin";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use(authMiddleware);

app.get("/", (_req, res) => {
  res.send("Gokir backend is running. Try GET /health");
});



// health
app.get("/health", (_req, res) => res.json({ ok: true, service: "gokir-backend" }));

// routes
app.use("/auth/customer", customerAuth);
app.use("/auth/store", storeAuth);
app.use("/auth/driver", driverAuth);
app.use("/admin/drivers", adminDrivers);
app.use("/auth/admin", adminAuth);
// 404 JSON fallback
app.use((req, res) => {
  res.status(404).json({ ok: false, error: { message: `Route ${req.method} ${req.path} not found` } });
});
export default app;
