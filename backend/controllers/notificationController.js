const Notification = require("../models/Notification");
const { isValidObjectId } = require("../utils/safeObjectId");

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;

    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read — mark a single notification as read.
 * Previous behaviour ("clicking any notification marks all read") was
 * disorienting; this gives the UI a per-row primitive.
 */
exports.markOneAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id — delete a single notification.
 * Owner-scoped: users can only delete their own.
 */
exports.deleteOne = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const result = await Notification.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications — clear all notifications for the user.
 * Optional query `?onlyRead=true` keeps unread ones around.
 */
exports.deleteAll = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const onlyRead = req.query.onlyRead === "true";

    const filter = { userId };
    if (onlyRead) filter.isRead = true;

    const result = await Notification.deleteMany(filter);
    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
