const dotenv = require("dotenv");

dotenv.config();
if(!process.env.MONGO_URI){
    throw console.error("mongo uri is not present in env");
  
}
if(!process.env.JWT_SECRET){
    throw console.error("JWT secret is not present in env");
  
}

const config={
    MONGO_URI:process.env.MONGO_URI,
    JWT_SECRET:process.env.JWT_SECRET
}

module.exports=config;
