const SuspiciousActivity = require("../models/SuspiciousActivity");

const serializeActivity = (doc) => {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    type: o.type,
    severity: o.severity,
    ip: o.ip,
    userId: o.userId ? o.userId.toString() : null,
    userEmail: o.userEmail || null,
    reason: o.reason || null,
    status: o.status || "new",
    meta: o.meta || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const listFraudActivities = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const { type, status, search } = req.query;

    const query = {};
    if (type) query.type = type;
    if (status) {
      if (status === "new") {
        query.$or = [{ status: "new" }, { status: { $exists: false } }];
      } else {
        query.status = status;
      }
    }
    if (search) {
      const term = String(search).trim();
      const searchCond = {
        $or: [
          { userEmail: { $regex: term, $options: "i" } },
          { ip: { $regex: term, $options: "i" } },
        ],
      };
      if (query.$or) {
        Object.assign(query, { $and: [{ $or: query.$or }, searchCond] });
        delete query.$or;
      } else {
        Object.assign(query, searchCond);
      }
    }

    const [items, total] = await Promise.all([
      SuspiciousActivity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SuspiciousActivity.countDocuments(query),
    ]);

    res.json({
      items: items.map(serializeActivity),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error("[listFraudActivities]", err);
    res.status(500).json({ msg: err.message || "Failed to load suspicious activities" });
  }
};

const updateFraudActivity = async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ["new", "reviewed", "ignored", "escalated"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }
    const updates = {};
    if (status) updates.status = status;
    if (req.body.meta) updates.meta = req.body.meta;

    const doc = await SuspiciousActivity.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!doc) return res.status(404).json({ msg: "Activity not found" });
    res.json({ item: serializeActivity(doc) });
  } catch (err) {
    console.error("[updateFraudActivity]", err);
    res.status(500).json({ msg: err.message || "Failed to update activity" });
  }
};

const getFraudActivityStats = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [byStatus, byType, recent] = await Promise.all([
      SuspiciousActivity.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      SuspiciousActivity.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      SuspiciousActivity.find({ createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    res.json({
      byStatus: byStatus.map((x) => ({ status: x._id || "new", count: x.count })),
      byType: byType.map((x) => ({ type: x._id || "unknown", count: x.count })),
      recent: recent.map(serializeActivity),
    });
  } catch (err) {
    console.error("[getFraudActivityStats]", err);
    res.status(500).json({ msg: err.message || "Failed to load stats" });
  }
};

module.exports = {
  listFraudActivities,
  updateFraudActivity,
  getFraudActivityStats,
};
