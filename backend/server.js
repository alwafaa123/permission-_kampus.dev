const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: __dirname + "/.env" });

const authRoutes = require("./routes/authRoutes").router;
const permissionRoutes = require("./routes/permissionRoutes").router;
const db = require("./config/database");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend")));

app.use("/api/auth", authRoutes);
app.use("/api/permissions", permissionRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "OK",
      message: "Sistem Pengontrolan Mahasiswa API is running.",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "DEGRADED",
      message: "API berjalan, tetapi koneksi database belum tersedia.",
      database: "disconnected",
      details: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server.",
  });
});

const PORT = Number(process.env.PORT || 5001);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Frontend tersedia di http://localhost:" + PORT + "/");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} sudah digunakan oleh proses lain.`);
    console.error(
      "Solusi: tutup server lama atau ubah PORT di file .env menjadi port lain.",
    );
    process.exit(1);
  }

  console.error("Server startup error:", error.message);
  process.exit(1);
});

module.exports = app;
