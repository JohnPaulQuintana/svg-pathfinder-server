const router = require("express").Router();
const controller = require("../controllers/svg.controller");
const upload = require("../middlewares/upload"); // <--- import it

router.get("/", (req, res) => {
  res.json({
    message: "Hello from Vercel",
  });
});

// test route
router.post("/test", controller.testSVG);

// upload svg route
router.post("/upload", upload.single("svg"), controller.uploadSVG);

module.exports = router;