const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

router.get("/", auth, notificationController.getNotifications);
router.patch("/read", auth, notificationController.markAsRead);
router.patch("/:id/read", auth, notificationController.markOneAsRead);
router.delete("/:id", auth, notificationController.deleteOne);
router.delete("/", auth, notificationController.deleteAll);

module.exports = router;
