require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// const publicRoutes = require("./routes/publicRoutes"); // TODO: add back once public dashboard routes are built
const incidentRoutes = require("./routes/incidentRoutes");
const alertRoutes = require("./routes/alertRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());


// Routes
// app.use("/api/public", publicRoutes); // TODO: uncomment when publicRoutes.js exists
app.use("/api/incidents", incidentRoutes);

app.use("/api/alerts", alertRoutes);

app.get("/", (req, res) => {
  res.send("ResQX backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));