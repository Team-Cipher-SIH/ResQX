const mongoose= require("mongoose");

const config=require("./config");

const dns = require("dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

async function connectDB(){
    await mongoose.connect(config.MONGO_URI)

    console.log("connectd to db");
}

module.exports=connectDB;