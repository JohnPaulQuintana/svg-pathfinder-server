
require("dotenv").config();
const router = require("express").Router();
const pool = require("../config/db");
const analyticsController = require("../controllers/analytics.controller")

router.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

router.post("/visitor", analyticsController.registerVisitor);
router.post("/visit", analyticsController.trackVisit);
router.post("/event", analyticsController.trackEvent);

router.get("/stats", analyticsController.getStats);



module.exports = router;