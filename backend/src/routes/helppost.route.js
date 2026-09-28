const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { createHelpPost, getHelpPosts, getMyHelpPosts, fulfillHelpPost } = require("../controllers/helppost.controller");

router.post("/", protect, createHelpPost);
router.get("/my-posts", protect, getMyHelpPosts);
router.get("/", getHelpPosts);   // public — koi bhi help board dekh sake, login ke bina bhi
router.patch("/:id/fulfill", protect, fulfillHelpPost);

module.exports = router;