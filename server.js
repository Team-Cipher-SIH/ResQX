const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("DB Connection Error: ", err));

// Routes
app.use('/api/contacts', require('./routes/contactRoutes'));

// Basic Test Route
app.get('/', (req, res) => {
  res.send("Cipher Disaster Management API is running...");
});

// Dynamic Port Assignment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));