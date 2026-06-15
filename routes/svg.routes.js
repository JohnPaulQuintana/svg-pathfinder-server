// const router = require("express").Router();
// const controller = require("../controllers/svg.controller");
// const upload = require("../middlewares/upload"); // <--- import it

// router.get("/", (req, res) => {
//   res.json({
//     message: "Hello from Vercel",
//   });
// });

// // test route
// router.post("/test", controller.testSVG);

// // upload svg route
// router.post("/upload", upload.single("svg"), controller.uploadSVG);

// module.exports = router;
const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const controller = require("../controllers/svg.controller");
const upload = require("../middlewares/upload");

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Too many uploads. Please try again later.",
  },
});

const testLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

router.get("/", (req, res) => {
  res.json({
    message: "Hello from API",
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