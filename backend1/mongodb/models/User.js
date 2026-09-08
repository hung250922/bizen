const mongoose = require('mongoose');

 const userSchema = new mongoose.Schema({
    email: { type: String },
    name: { type: String },
    picture: { type: String },
    googleId: { type: String },
    scope: { type: mongoose.Schema.Types.Mixed },
    permissions: { type: [String], default: [] },
    isAuthenticated: { type: Boolean },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'approved' },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
});

const userDb = mongoose.model("users", userSchema);

module.exports = { userDb };