const { getActivities } = require('../mongodb/controllers/activityControllers');

module.exports = (router) => {
    router.get('/activities', async (req, res) => {
        try {
            const activities = await getActivities(req.query);
            return res.json({ data: activities, error: null });
        } catch (error) {
            console.log('-- activity list error', error);
            return res.status(500).json({ data: null, error: 'Không tải được lịch sử hoạt động.' });
        }
    });
};