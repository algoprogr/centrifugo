import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve client environment config
app.post("/api/config", (req, res) => {
  const { wsUrl, allowedOrigins, userId, secretKey } = req.body;

  if (!wsUrl || !userId || !secretKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const token = jwt.sign(
      {
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
      },
      secretKey
    );

    res.json({
      url: wsUrl,
      token,
      user: userId,
      allowedOrigins: allowedOrigins || "",
    });
  } catch (err) {
    console.error("JWT sign error:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.listen(PORT, () => {
  console.log(`Dev server running: http://localhost:${PORT}`);
});
