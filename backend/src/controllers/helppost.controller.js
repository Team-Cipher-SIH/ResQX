const HelpPost = require("../models/helppost.model");

// @desc   Create a help post (offer or request)
// @route  POST /api/help-posts
const createHelpPost = async (req, res) => {
  try {
    const { type, title, description, category, state, district, contactNumber } = req.body;

    if (!type || !title || !description || !state || !district || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "type, title, description, state, district, and contactNumber are required",
      });
    }

    if (!["offer", "request"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be either 'offer' or 'request'",
      });
    }

    const helpPost = await HelpPost.create({
      postedBy: req.user._id,
      type,
      title,
      description,
      category: category || "other",
      state,
      district,
      contactNumber,
    });

    res.status(201).json({ success: true, message: "Help post created successfully", data: helpPost });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create help post", error: err.message });
  }
};

// @desc   Get help posts, filterable by type/category/state/district/status
// @route  GET /api/help-posts?type=&category=&state=&district=&status=
const getHelpPosts = async (req, res) => {
  try {
    const { type, category, state, district, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (state) filter.state = state;
    if (district) filter.district = district;
    filter.status = status || "open";   // default sirf "open" wale dikhao

    const helpPosts = await HelpPost.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: helpPosts.length, data: helpPosts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch help posts", error: err.message });
  }
};

// @desc   Get help posts created by the logged-in user
// @route  GET /api/help-posts/my-posts
const getMyHelpPosts = async (req, res) => {
  try {
    const helpPosts = await HelpPost.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: helpPosts.length, data: helpPosts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch your help posts", error: err.message });
  }
};

// @desc   Mark own help post as fulfilled
// @route  PATCH /api/help-posts/:id/fulfill
const fulfillHelpPost = async (req, res) => {
  try {
    const { id } = req.params;

    const helpPost = await HelpPost.findById(id);
    if (!helpPost) {
      return res.status(404).json({ success: false, message: "Help post not found" });
    }

    // sirf apna hi post fulfill kar sakte ho
    if (helpPost.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only update your own posts" });
    }

    if (helpPost.status === "fulfilled") {
      return res.status(400).json({ success: false, message: "This post is already marked fulfilled" });
    }

    helpPost.status = "fulfilled";
    await helpPost.save();

    res.status(200).json({ success: true, message: "Post marked as fulfilled", data: helpPost });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update help post", error: err.message });
  }
};

module.exports = { createHelpPost, getHelpPosts, getMyHelpPosts, fulfillHelpPost };