require("dotenv").config()
var jwt = require('jsonwebtoken');
const { models: { userDb } } = require('../mongodb');

const getJwtSecret = () => process.env.JWT_SECRET || 'bizen-development-secret-change-me';

exports.isSuperAdminEmail = (email) => {
    const configuredEmails = String(process.env.SUPER_ADMIN_EMAIL || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    return configuredEmails.includes(String(email || '').trim().toLowerCase());
};

function isAdminUser(user) {
    if (!user) return false;
    if (user.isSuperAdmin === true || user.is_admin === true || user.scope === 'admin') return true;
    if (Array.isArray(user.scope)) return user.scope.includes('admin');
    return user.scope?.name === 'admin' || user.scope?.role === 'admin';
}

exports.isAdminUser = isAdminUser;

exports.createAccessToken = (user) => jwt.sign({ userId: String(user._id) }, getJwtSecret(), { expiresIn: '7d' });

exports.requireUser = async function(req, res, next) {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
        return res.status(401).json({ data: null, error: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.' });
    }
    try {
        const payload = jwt.verify(authorization.slice(7), getJwtSecret());
        const user = await userDb.findById(payload.userId);
        if (!user || user.isAuthenticated === false) {
            return res.status(401).json({ data: null, error: 'Tài khoản không hợp lệ.' });
        }
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ data: null, error: 'Phiên đăng nhập không hợp lệ.' });
    }
};

exports.requireAdmin = function(req, res, next) {
    if (!isAdminUser(req.user)) {
        return res.status(403).json({ data: null, error: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này.' });
    }
    return next();
};

exports.requireSelfOrAdmin = function(req, res, next) {
    if (isAdminUser(req.user) || String(req.user?._id) === String(req.params.id)) return next();
    return res.status(403).json({ data: null, error: 'Bạn không có quyền truy cập tài khoản này.' });
};

exports.requirePermission = function(permission) {
    return function(req, res, next) {
        if (isAdminUser(req.user) || (Array.isArray(req.user?.permissions) && req.user.permissions.includes(permission))) {
            return next();
        }
        return res.status(403).json({ data: null, error: 'Bạn không có quyền sử dụng tính năng này.' });
    };
};

exports.requireAnyPermission = function(permissions) {
    return function(req, res, next) {
        if (isAdminUser(req.user) || permissions.some((permission) => req.user?.permissions?.includes(permission))) {
            return next();
        }
        return res.status(403).json({ data: null, error: 'Bạn không có quyền sử dụng tính năng này.' });
    };
};

const permissionRules = [
    [/\/activities/, 'dashboard'],
    [/\/catering\/list|\/catering\/save_datas/, 'lamthucdontuan'],
    [/\/larksuite\/thuc_don_tuan|\/larksuite\/add_thuc_don_tuan/, ['lamthucdontuan', 'thucdontuan', 'menuthucdontuanzamil']],
    [/\/catering\/mon_an_theo_muas?|\/catering\/(add|edit)_mon_an_theo_mua/, 'monantheomua'],
    [/\/catering\/bom_mon_ans?|\/catering\/(add|edit)_bom_mon_an/, 'bommonan'],
    [/\/catering\/(add|edit)_don_gia_nguyen_vat_lieu/, 'dongianguyenvatlieu'],
    [/\/catering\/don_gia_nguyen_vat_lieus?/, ['dongianguyenvatlieu', 'bommonan']],
    [/\/catering\/nhap_nguyen_vat_lieus?|\/catering\/(add|delete|import)_nhap_nguyen_vat_lieu/, 'nhapnguyenvatlieu'],
    [/\/catering\/don_gia_san_phams?|\/catering\/(add|edit)_don_gia_san_pham/, 'dongiasanpham'],
    [/\/catering\/cau_hinh_tinh_diems?|\/catering\/(add|edit)_cau_hinh_tinh_diem/, 'cauhinhtinhdiem'],
    [/\/catering\/phoi_hop_combos?|\/catering\/(add|edit)_phoi_hop_combo/, 'phoihopcombo'],
    [/\/kiem_thuc_3_buoc|\/export_excel_file\/kiem_thuc_ba_buoc/, 'kiemthucbabuoc'],
    [/\/larksuite\/bao_so_luong_khach_hang/, 'baosoluongkhachhang'],
    [/\/larksuite\/bao_so_luong_quan_ly_site/, 'baosoluongquanlysite'],
    [/\/larksuite\/lenh_san_xuat|\/export_excel_file\/lenh_san_xuat/, 'lenhsanxuat'],
    [/\/users|\/user/, 'admin'],
];

exports.requireAppPermission = async function(req, res, next) {
    await exports.requireUser(req, res, () => {
        if (/\/user\/[^/]+\/presence$/.test(req.path)) return next();
        const rule = permissionRules.find(([pattern]) => pattern.test(req.path));
        if (!rule) return next();
        return Array.isArray(rule[1])
            ? exports.requireAnyPermission(rule[1])(req, res, next)
            : exports.requirePermission(rule[1])(req, res, next);
    });
};


exports.isAuthenticated = function(req, res, next) {
    console.log('--- isAuthenticated', req.headers.authorization)
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('--- ip', ip);

    if(req.headers && req.headers.authorization) {
        var jwtToken = req.headers.authorization.replace("Bearer ", "");
        console.log("jwtToken", jwtToken, process.env.JWT_SECRET)
        jwt.verify(jwtToken, process.env.JWT_SECRET, async(err, payload) => {
            console.log('err', err)
            if(err) {
                res.status(401).json({ message: "Unauthorized user!" });
            } else {
                console.log('decoded: ', payload.username);

                next();
            }
        })
    } else {
        res.status(401).json({ message: 'Unauthorized user!' });
    }
}

exports.isBasicAuthAuthenticated = function(req, res, next) {
    next();
    // const authorization = req.headers.authorization;
    // //console.log("authorization", authorization)

    // if(!authorization || authorization.indexOf('Basic ') === -1) {
    //     return res.status(401).json({
    //         msg: "Unauthorized user!"
    //     })
    // }

    // // verify auth credentials
    // const base64Credentials = authorization.split(' ')[1];
    // const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    // const [username, password] = credentials.split(':');

    // if(username === process.env.BASIC_AUTH_USERNAME && password === process.env.BASIC_AUTH_PASSWORD) {
    //     //saveUserActivityLog(req);
    //     next();
    // } else {
    //     return res.status(401).json({
    //         msg: "Unauthorized user!"
    //     })
    // }
}

// const saveUserActivityLog = (req) => {
//     if(req.method === "POST" || req.method === "PUT") {
//         const { company_id, user_id } = req.body;
//         if(company_id) {
//             var newUserLog = UserLog.build({
//                 company_id,
//                 user_id,
//                 original_url: req.originalUrl,
//                 method: req.method,
//                 body_datas: req.body,
//                 param_datas: req.params,
//                 query_datas: req.query
//             });
//             newUserLog.save();
//         }
//     }
// }