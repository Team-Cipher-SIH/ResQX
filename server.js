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
app.use('/api/entities', require('./routes/entityRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/logs', require('./routes/auditRoutes'));

// Basic Test Route
app.get('/', (req, res) => {
  res.send("ResQX Audit Log & Directory Service is running...");
});

// Dynamic Port Assignment
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));