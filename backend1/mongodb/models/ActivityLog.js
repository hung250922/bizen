const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    actorId: { type: String, default: '' },
    actorName: { type: String, default: '' },
    actorEmail: { type: String, default: '' },
    actorPicture: { type: String, default: '' },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    details: { type: String, default: '' },
    statusCode: { type: Number, default: 200 },
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });

const activityLogDb = mongoose.model('activity_logs', activityLogSchema);

module.exports = { activityLogDb };