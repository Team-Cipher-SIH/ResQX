const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("DB Connection Error: ", err));

// Routes
app.use('/api/reports', require('./routes/reportRoutes'));

// Dynamic Port Assignment
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`PWA Sync Server running on port ${PORT}`));