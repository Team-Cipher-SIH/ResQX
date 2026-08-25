const express=require("express");
const authRouter = require("./routes/auth.route.js");
const incidentRoutes = require("./routes/incident.route.js");
const alertRoutes = require("./routes/alert.route.js");
const app=express();

const cors = require("cors");
app.use(cors());

app.use(express.json());

app.use("/api/auth",authRouter);
app.use("/api/incidents", incidentRoutes);
app.use("/api/alerts", alertRoutes);

app.get("/",(req,res)=>{
    res.send("server is running");
})

module.exports = app;