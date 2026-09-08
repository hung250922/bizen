const { addActivity } = require('../mongodb/controllers/activityControllers');

function describeActivity(method, path) {
    if (path.includes('add_nhap_nguyen_vat_lieus') || path.includes('import_nhap_nguyen_vat_lieu')) return { action: 'đã nhập', resource: 'nguyên vật liệu' };
    if (path.includes('delete_nhap_nguyen_vat_lieu')) return { action: 'đã xóa', resource: 'phiếu nhập nguyên vật liệu' };
    if (path.includes('add_don_gia')) return { action: 'đã cập nhật', resource: 'đơn giá' };
    if (path.includes('add_bom') || path.includes('edit_bom')) return { action: 'đã cập nhật', resource: 'BOM món ăn' };
    if (path.includes('add_thuc_don')) return { action: 'đã cập nhật', resource: 'thực đơn tuần' };
    if (path.includes('bao_so_luong_khach_hang')) return { action: 'đã gửi', resource: 'báo số lượng khách hàng' };
    if (path.includes('bao_so_luong_quan_ly_site')) return { action: 'đã gửi', resource: 'báo số lượng quản lý site' };
    if (path.includes('lenh_san_xuat')) return { action: 'đã tra cứu', resource: 'lệnh sản xuất' };
    if (path.includes('kiem_thuc_3_buoc') || path.includes('kiem_thuc_ba_buoc')) return { action: 'đã cập nhật', resource: 'kiểm thực 3 bước' };
    if (path.includes('save_datas')) return { action: 'đã cập nhật', resource: 'dữ liệu món ăn' };
    if (path.includes('/user')) return { action: method === 'DELETE' ? 'đã xóa' : 'đã cập nhật', resource: 'tài khoản' };
    return { action: method === 'DELETE' ? 'đã xóa' : method === 'POST' ? 'đã thực hiện' : 'đã chỉnh sửa', resource: 'thao tác hệ thống' };
}

function activityMiddleware(req, res, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path.includes('/presence')) {
        return next();
    }

    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300 || req.path === '/activities') return;
        const actorName = req.user?.email || req.user?.name || 'Tài khoản chưa xác định';
        const { action, resource } = describeActivity(req.method, req.path);
        addActivity({
            actorId: req.user?._id ? String(req.user._id) : '',
            actorName,
            actorEmail: req.user?.email || '',
            actorPicture: req.user?.picture || '',
            action,
            resource,
            details: `${action} dữ liệu ${resource}`,
            statusCode: res.statusCode,
        }).catch((error) => console.log('-- activity save error', error.message));
    });
    return next();
}

module.exports = activityMiddleware;
