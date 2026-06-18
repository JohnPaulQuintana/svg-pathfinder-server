const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const svgRoutes = require("./routes/svg.routes");
const dbRoutes = require("./routes/db.routes")

const startCleanupJob = require("./utils/fileCleanup");



const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.disable("x-powered-by");

const allowedOrigins = [
  "http://localhost:5173",
  "https://naviatlas.netlify.app",
];

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

app.use(
  cors({
    origin(origin, callback) {

      // allow Postman, curl, server-to-server
      // NaviAtlas browser-only and reject everything else set it to false
      if (!origin) {
        return callback(null, false);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/svg", svgRoutes);
app.use("/api/svg/analytics", analyticsLimiter, dbRoutes);

startCleanupJob();

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});