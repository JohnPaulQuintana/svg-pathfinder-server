const pool = require("../config/db");

exports.registerVisitor = async (req, res) => {
  try {
    const {
      visitor_id,
      language,
      platform,
      screen_width,
      screen_height,
      timezone,
    } = req.body;

    await pool.query(
      `
      INSERT INTO visitors (
        visitor_id,
        ip_address,
        user_agent,
        language,
        platform,
        screen_width,
        screen_height,
        timezone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (visitor_id)
      DO NOTHING
      `,
      [
        visitor_id,
        req.ip,
        req.headers["user-agent"],
        language,
        platform,
        screen_width,
        screen_height,
        timezone,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.trackVisit = async (req, res) => {
  try {
    const {
      visitor_id,
      session_id,
      page,
      referrer,
    } = req.body;

    await pool.query(
      `
      INSERT INTO page_visits
      (
        visitor_id,
        session_id,
        page,
        referrer
      )
      VALUES ($1,$2,$3,$4)
      ON CONFLICT DO NOTHING
      `,
      [
        visitor_id,
        session_id,
        page,
        referrer,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.trackEvent = async (req, res) => {
  try {
    const {
      visitor_id,
      session_id,
      event_name,
      page,
      metadata,
    } = req.body;

    await pool.query(
      `
      INSERT INTO events
      (
        visitor_id,
        session_id,
        event_name,
        page,
        metadata
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        visitor_id,
        session_id,
        event_name,
        page,
        metadata || {},
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [
      visitors,
      visits,
      events,
      sessions,
      todayVisitors,
      todayVisits,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM visitors"),
      pool.query("SELECT COUNT(*) FROM page_visits"),
      pool.query("SELECT COUNT(*) FROM events"),
      pool.query(`
        SELECT COUNT(DISTINCT session_id)
        FROM page_visits
      `),
      pool.query(`
        SELECT COUNT(DISTINCT visitor_id)
        FROM page_visits
        WHERE DATE(created_at) = CURRENT_DATE
      `),
      pool.query(`
        SELECT COUNT(*)
        FROM page_visits
        WHERE DATE(created_at) = CURRENT_DATE
      `),
    ]);

    res.json({
      visitors: Number(visitors.rows[0].count),
      visits: Number(visits.rows[0].count),
      events: Number(events.rows[0].count),
      sessions: Number(sessions.rows[0].count),
      todayVisitors: Number(
        todayVisitors.rows[0].count
      ),
      todayVisits: Number(
        todayVisits.rows[0].count
      ),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};