const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const controller = require("../controllers/svg.controller");
const upload = require("../middlewares/upload");

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "failed",
    error: "Upload limit reached. Please try again in 15 minutes.",
  },
});

const testLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "failed",
    error: "Request limit reached. Please try again in 15 minutes.",
  },
});

router.get("/", (req, res) => {
  res.json({
    message: "Hello from NaviLink",
  });
});

router.post("/test", testLimiter, controller.testSVG);

router.post(
  "/upload",
  uploadLimiter,
  upload.single("svg"),
  controller.uploadSVG
);

module.exports = router;