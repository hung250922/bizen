const { Op } = require('sequelize');
const { 
    getUsers, getUser, addUser, updateUser, deleteUser, updatePresence
} = require('../mongodb/controllers/userControllers');
var bcrypt = require("bcryptjs");
const saltRounds = 10;
var authController = require('../middleware/auth');
const { models: { userDb } } = require('../mongodb');

function isAdminRecord(user) {
    return authController.isAdminUser(user);
}

function isProtectedAdmin(user) {
    return user?.isSuperAdmin === true || authController.isSuperAdminEmail(user?.email);
}

async function preventAdminLockout(req, targetUser, nextRole, isLocking) {
    if (isProtectedAdmin(targetUser)) return 'Tài khoản quản trị viên gốc không thể bị hạ quyền hoặc xóa.';
    if (String(req.user?._id) === String(targetUser._id) && nextRole !== undefined && nextRole !== 'admin') {
        return 'Bạn không thể tự hạ quyền quản trị viên của chính mình.';
    }
    if (nextRole !== undefined && nextRole !== 'admin' && isAdminRecord(targetUser)) {
        const adminUsers = await userDb.find({}).select('scope isSuperAdmin is_admin');
        const adminCount = adminUsers.filter((user) => isAdminRecord(user)).length;
        if (adminCount <= 1) return 'Không thể hạ quyền quản trị viên cuối cùng.';
    }
    if (isLocking && isAdminRecord(targetUser)) {
        const adminUsers = await userDb.find({}).select('scope isSuperAdmin is_admin');
        const adminCount = adminUsers.filter((user) => isAdminRecord(user)).length;
        if (adminCount <= 1) return 'Không thể khóa quản trị viên cuối cùng.';
    }
    return null;
}

module.exports = (router) => {
    router.get(`/users`, authController.isBasicAuthAuthenticated, authController.requireUser, authController.requireAdmin, async(req, res) => {
        console.log("--- get users query:", req.query);
        try {
            // var filter = {};
            const users = await getUsers(req.query);
            return res.json({ data: users, error: null });
        } catch(error) {
            console.log("-- error", error)
            return res.json({ data: null, error: "get users is failed" });
        }
    });

    // router.get(`/users`, authController.isBasicAuthAuthenticated, async(req, res) => {
    //     try {
    //         var filter = {};
    //         let order_by = "id";  
    //         let order_dir = "desc";

    //         filter =  {
    //             [Op.and]: [
    //                 { is_active: true },
    //                 filter
    //             ],
    //         }

    //         if(req.query.company_id) {
    //             filter = {
    //                 [Op.and]: [
    //                     filter,
    //                     {
    //                         company_id: req.query.company_id
    //                     }
    //                 ]
    //             }
    //         }

    //         if(req.query.searchText) {
    //             filter = {
    //                 [Op.and]: [
    //                     filter,
    //                     {
    //                         [Op.or]: [
    //                             {
    //                                 phone: {
    //                                     [Op.like] : '%' + req.query.searchText + '%'
    //                                 }
    //                             },
    //                             {
    //                                 full_name: {
    //                                     [Op.like] : '%' + req.query.searchText + '%'
    //                                 }
    //                             },
    //                             {
    //                                 email: {
    //                                     [Op.like] : '%' + req.query.searchText + '%'
    //                                 }
    //                             }
    //                         ]
    //                     }
    //                 ]
    //             }
    //         }

    //         if(req.query.order_by) {
    //             order_by = req.query.order_by;
    //         }

    //         if(req.query.order_dir) {
    //             order_dir = req.query.order_dir;
    //         }

    //         var findUsers = await User.findAll({
    //             where: filter,
    //             limit: parseInt(req.query.limit || 25),
    //             offset: parseInt(req.query.offset || 0),
    //             order: [
    //                 [order_by, order_dir]
    //             ],
    //             include: [
    //                 {
    //                     model: Company,
    //                     as: 'companyDetail'
    //                 },
    //             ]
    //         });

    //         const totalCount = await User.count({where: filter});

    //         return res.json({      
    //             data: {
    //                 records: findUsers,
    //                 totalCount
    //             }, 
    //             error: null 
    //         });
    //     } catch(error) {
    //         console.log("-- error", error)
    //         return res.json({ data: null, error: "get users is failed" });
    //     }
    // });

    router.get(`/users/:id`, authController.isBasicAuthAuthenticated, authController.requireUser, authController.requireSelfOrAdmin, async(req, res) => {
        try {
            const findUser = await User.findOne({
                where: {
                    [Op.and]: [
                        {
                            is_active: true
                        },
                        {
                            id: req.params.id
                        }
                    ]
                },
                include: [
                    {
                        model: Company,
                        as: 'companyDetail'
                    },
                ]
            });

            return res.json({ data: findUser, error: null });
        } catch(error) {
            console.log("-- error", error)
            return res.json({ data: null, error: "get users by id is failed" });
        }
    })

    router.post(`/user`, authController.isBasicAuthAuthenticated, authController.requireUser, authController.requireAdmin, async(req, res) => {
        try {
            const newUser = await addUser(req.body);
            return res.json({ data: newUser, error: null });
        } catch(error) {
            console.log("-- error", error)
            return res.json({ data: null, error: "post users is failed" });
        }
    });

    router.put(`/user/:id`, authController.isBasicAuthAuthenticated, authController.requireUser, authController.requireAdmin, async(req, res) => {
        console.log("--- update user req.body", req.body);
        try {
            if (req.body.scope !== undefined && !['admin', 'staff'].includes(req.body.scope)) {
                return res.status(400).json({ data: null, error: "Vai trò chỉ được là admin hoặc staff." });
            }
            if (req.body.permissions !== undefined && !Array.isArray(req.body.permissions)) {
                return res.status(400).json({ data: null, error: "Danh sách quyền không hợp lệ." });
            }
            const findUser = await getUser({ _id: req.params.id });
            if(findUser) {
                const protectionError = await preventAdminLockout(req, findUser, req.body.scope, req.body.isAuthenticated === false);
                if (protectionError) return res.status(403).json({ data: null, error: protectionError });
                const updatedUser = await updateUser({
                    _id: req.params.id,
                    ...req.body,
                    ...(req.body.isAuthenticated === false ? { isOnline: false, lastSeen: new Date() } : {}),
                });
                return res.json({ data: updatedUser, error: null });
            } else {
                return res.json({ data: null, error: "Không tìm thấy user id!"});
            }
        } catch(error) {
            console.log("-- error", error)
            return res.json({ data: null, error: "post users is failed" });
        }
    });

    router.delete(`/user/:id`, authController.isBasicAuthAuthenticated, authController.requireUser, authController.requireAdmin, async(req, res) => {
        try {
            const targetUser = await getUser({ _id: req.params.id });
            if (!targetUser) return res.status(404).json({ data: null, error: "Không tìm thấy user id!" });
            const protectionError = await preventAdminLockout(req, targetUser, 'staff');
            if (protectionError) return res.status(403).json({ data: null, error: protectionError });
            const deletedUser = await deleteUser(req.params.id);
            if (!deletedUser) return res.status(404).json({ data: null, error: "Không tìm thấy user id!" });
            return res.json({ data: deletedUser, error: null });
        } catch(error) {
            console.log("-- error", error);
            return res.status(500).json({ data: null, error: "delete user is failed" });
        }
    });

    router.post(`/user/:id/presence`, authController.isBasicAuthAuthenticated, authController.requireUser, authController.requireSelfOrAdmin, async(req, res) => {
        try {
            const user = await updatePresence(req.params.id, req.body.isOnline !== false);
            if (!user) return res.status(404).json({ data: null, error: "Không tìm thấy user id!" });
            return res.json({ data: user, error: null });
        } catch(error) {
            console.log("-- presence error", error);
            return res.status(500).json({ data: null, error: "update presence is failed" });
        }
    });
}