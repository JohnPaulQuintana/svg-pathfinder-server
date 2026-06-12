const express = require("express");
const cors = require("cors");

const svgRoutes = require("./routes/svg.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/svg", svgRoutes);


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});