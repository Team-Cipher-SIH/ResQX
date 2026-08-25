const express=require("express");
const authRouter = require("./routes/auth.route.js");
const incidentRoutes = require("./routes/incident.route.js");
const alertRoutes = require("./routes/alert.route.js");
const shelterRouter = require("./routes/shelter.route");
const helpPostRouter = require("./routes/helppost.route");
const reliefCampRoutes = require("./routes/reliefCampRoutes.js"); 
const app=express();

const cors = require("cors");
app.use(cors());

app.use(express.json());

app.use("/api/auth",authRouter);
app.use("/api/incidents", incidentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/shelters", shelterRouter);
app.use("/api/help-posts", helpPostRouter);
app.use("/api/reliefCamps", reliefCampRoutes);

app.get("/",(req,res)=>{
    res.send("server is running");
})

module.exports = app;