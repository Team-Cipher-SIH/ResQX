const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");

const {
  register,
  login,
  logout,
  refreshAccessToken,
  updateUserRole,
  getProfile,
  updateProfile,
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});
router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);
router.get(
  "/authority-only",
  protect,
  authorize("authority", "admin"),
  (req, res) => {
    res.json({ message: "Welcome authority!" });
  },
);

router.patch("/users/:userId/role", protect, authorize("admin"), updateUserRole);

router.post("/refresh", refreshAccessToken);
router.post("/logout", protect, logout);

module.exports = router;