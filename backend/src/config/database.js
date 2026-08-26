const mongoose= require("mongoose");

const config=require("./config");

async function connectDB(){
    await mongoose.connect(config.MONGO_URI)

    console.log("connectd to db");
}

module.exports=connectDB;