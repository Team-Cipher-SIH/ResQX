const express=require("express");
const authRouter = require("./routes/auth.route.js");
const incidentRoutes = require("./routes/incident.route.js");
const alertRoutes = require("./routes/alert.route.js");
const shelterRouter = require("./routes/shelter.route");
const supplyRouter = require("./routes/supply.route");
const helpPostRouter = require("./routes/helppost.route");
const app=express();

const cors = require("cors");
app.use(cors());

app.use(express.json());

app.use("/api/auth",authRouter);
app.use("/api/incidents", incidentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/shelters", shelterRouter);
app.use("/api/supplies", supplyRouter);
app.use("/api/help-posts", helpPostRouter);

const teamRoutes = require("./routes/responseteam.route.js");
const dispatchRoutes = require("./routes/dispatch.route.js");
const dashboardRoutes = require("./routes/dashboard.route.js");

app.use("/api/teams", teamRoutes);
app.use("/api/dispatches", dispatchRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/",(req,res)=>{
    res.send("server is running");
})

module.exports = app;