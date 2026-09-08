const { models: { activityLogDb } } = require('../index');

const getActivities = async (params = {}) => {
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 20, 1), 100);
    return activityLogDb.find({}).sort({ createdAt: -1 }).limit(limit).lean();
};

const addActivity = async (payload) => activityLogDb.create(payload);

module.exports = { getActivities, addActivity };