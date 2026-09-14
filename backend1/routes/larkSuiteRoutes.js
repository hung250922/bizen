require("dotenv").config();
const { Op } = require("sequelize");
const lark = require("@larksuiteoapi/node-sdk");
const axios = require("axios");
var authController = require("../middleware/auth");
const { getTenantToken } = require("../controllers/larksuite");

const BIZEN_CATERING_BASE_ID = "TO6Zw7lxJi1hFtkcCetjcct5pNc";
const DANH_SACH_KHACH_HANG_TABLE_ID = "tbl0d3wT2CgR17j3";
const THUC_DON_TUAN_TABLE_ID = "tblcesBeBMwmAFFn";
const BAO_SO_LUONG_KHACH_HANG_TABLE_ID = "tbl0lvShN6BoqH4k";
const BAO_SO_LUONG_QUAN_LY_SITE_TABLE_ID = "tbleq64gHk5gPEAr";

function fieldText(value) {
    if (value == null || value === "") return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (Array.isArray(value)) return value.map(fieldText).filter(Boolean).join(", ");
    if (typeof value === "object") {
        if (typeof value.text === "string") return value.text.trim();
        if (typeof value.name === "string") return value.name.trim();
        if (typeof value.value === "string") return value.value.trim();
        if (Array.isArray(value.value)) return value.value.map(fieldText).filter(Boolean).join(", ");
        if (Array.isArray(value.values)) return value.values.map(fieldText).filter(Boolean).join(", ");
    }
    return "";
}

function fieldDateMs(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
    if (Array.isArray(value)) return fieldDateMs(value[0]);
    if (typeof value === "object") {
        if (value.value != null) return fieldDateMs(value.value);
        if (value.text != null) return fieldDateMs(value.text);
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
}

function vnDateKey(ms) {
    if (ms == null) return "";
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(ms));
}

function inDateRange(ms, fromDate, toDate) {
    if (!fromDate && !toDate) return true;
    const key = vnDateKey(ms);
    if (!key) return false;
    if (fromDate && key < fromDate) return false;
    if (toDate && key > toDate) return false;
    return true;
}

function siteAnText(value) {
    if (value == null || value === "") return "";
    if (Array.isArray(value)) return value.map(fieldText).filter(Boolean).join(", ");
    return fieldText(value);
}

async function searchBitable(token, tableId, body) {
    const url =
        `https://open.larksuite.com/open-apis/bitable/v1/apps/` +
        `${BIZEN_CATERING_BASE_ID}/tables/${tableId}/records/search`;

    async function run(payload) {
        const items = [];
        let pageToken;
        let guard = 0;

        do {
            const response = await axios.post(
                url,
                { ...payload, page_size: 500, page_token: pageToken },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data?.code && response.data.code !== 0) {
                const err = new Error(response.data.msg || "Lark search thất bại.");
                err.larkCode = response.data.code;
                err.larkMsg = response.data.msg;
                throw err;
            }

            items.push(...(response.data?.data?.items || []));
            pageToken = response.data?.data?.has_more ? response.data?.data?.page_token : undefined;
            guard += 1;
        } while (pageToken && guard < 20);

        return items;
    }

    try {
        return await run(body);
    } catch (err) {
        if (body?.field_names && String(err.larkMsg || err.message || "").includes("FieldNameNotFound")) {
            const { field_names, ...rest } = body;
            return run(rest);
        }
        throw err;
    }
}

function mapThucDonRow(item) {
    const fields = item.fields || {};
    return {
        Ngay: fieldDateMs(fields["Ngày"]) ?? fields["Ngày"] ?? "",
        Thu: fieldText(fields["Thứ"]),
        KhachHang: fieldText(fields["Khách hàng"]),
        SiteAn: siteAnText(fields["Site ăn"]),
        Ca: fieldText(fields["Ca"]),
        CoCauSuatAn: fieldText(fields["Cơ cấu suất ăn"]),
        MonAn: fieldText(fields["Món ăn"]) || fieldText(fields["Món ăn menu"]) || fieldText(fields["Món ăn BOM"]),
    };
}

module.exports = (router) => {
    router.post(`/larksuite/list_client`, async (req, res) => {
        try {
            const tenantToken = await getTenantToken();
            if (!tenantToken) {
                return res.json({ data: null, error: "Không lấy được tenant token Lark." });
            }

            const items = await searchBitable(tenantToken, DANH_SACH_KHACH_HANG_TABLE_ID, {
                field_names: ["Mã khách hàng", "Tên khách hàng"],
            });

            const result = [];
            for (let i = 0; i < items.length; i++) {
                const maKhachHang = fieldText(items[i]["fields"]["Mã khách hàng"]);
                if (maKhachHang) result.push(maKhachHang);
            }

            return res.json({ data: result, error: null });
        } catch (err) {
            console.log("-- list_client error", err?.response?.data || err);
            return res.json({ data: null, error: err?.response?.data?.msg || err.message || err });
        }
    });

    router.post(`/larksuite/thuc_don_tuan`, async (req, res) => {
        try {
            const { client_code, fromDate, toDate } = req.body || {};
            if (!client_code) {
                return res.json({ data: null, error: "Thiếu mã khách hàng." });
            }

            const tenantToken = await getTenantToken();
            if (!tenantToken) {
                return res.json({ data: null, error: "Không lấy được tenant token Lark." });
            }

            const items = await searchBitable(tenantToken, THUC_DON_TUAN_TABLE_ID, {
                field_names: ["Ngày", "Thứ", "Khách hàng", "Site ăn", "Ca", "Món ăn", "Cơ cấu suất ăn"],
                filter: {
                    conditions: [
                        {
                            field_name: "Khách hàng",
                            operator: "is",
                            value: [client_code],
                        },
                    ],
                    conjunction: "and",
                },
            });
            console.log("-- thuc_don_tuan items.length", items);

            const result = items
                .map(mapThucDonRow)
                .filter((row) => inDateRange(row.Ngay, fromDate, toDate));

            return res.json({ data: result, error: null });
        } catch (err) {
            console.log("-- thuc_don_tuan error", err?.response?.data || err);
            return res.json({
                data: null,
                error: err?.response?.data?.msg || err.message || err,
            });
        }
    });

    router.post(`/larksuite/bao_so_luong_khach_hang`, async (req, res) => {
        try {
            const records = req.body?.data;
            if (!Array.isArray(records) || records.length === 0) {
                return res.json({ data: null, error: "Không có dữ liệu báo số lượng để lưu." });
            }

            const tenantToken = await getTenantToken();
            if (!tenantToken) {
                return res.json({ data: null, error: "Không lấy được tenant token Lark." });
            }

            const createRecordsUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${BAO_SO_LUONG_KHACH_HANG_TABLE_ID}/records/batch_create`;
            const createRecordsRes = await axios.post(
                createRecordsUrl,
                { records },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tenantToken}`,
                    },
                }
            );

            if (createRecordsRes.data.code === 0) {
                return res.json({
                    data: "Thêm thành công " + records.length + " bản ghi",
                    error: null,
                });
            }

            return res.json({
                data: null,
                error: createRecordsRes.data.msg || JSON.stringify(createRecordsRes.data),
            });
        } catch (err) {
            console.log("-- bao_so_luong_khach_hang error", err?.response?.data || err);
            return res.json({ data: null, error: err?.response?.data?.msg || err.message || err });
        }
    });

    router.post(`/larksuite/bao_so_luong_quan_ly_site`, async (req, res) => {
        try {
            const tenantToken = await getTenantToken();
            if (!tenantToken) {
                return res.json({ data: null, error: "Không lấy được tenant token Lark." });
            }

            const createRecordsUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${BAO_SO_LUONG_QUAN_LY_SITE_TABLE_ID}/records/batch_create`;
            const createRecordsRes = await axios.post(
                createRecordsUrl,
                { records: req.body.data },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tenantToken}`,
                    },
                }
            );

            if (createRecordsRes.data.code === 0) {
                return res.json({
                    data: "Thêm thành công " + req.body.data.length + " bản ghi",
                    error: null,
                });
            }

            return res.json({
                data: null,
                error: createRecordsRes.data.msg || JSON.stringify(createRecordsRes.data),
            });
        } catch (err) {
            console.log("-- bao_so_luong_quan_ly_site error", err?.response?.data || err);
            return res.json({ data: null, error: err?.response?.data?.msg || err.message || err });
        }
    });

    router.post(`/larksuite/lenh_san_xuat`, async (req, res) => {
        try {
            const { client_code, date } = req.body || {};
            const client = client_code || "ODSV";
            const dateTimestamp = date
                ? new Date(`${date}T00:00:00+07:00`).getTime()
                : Date.now();

            const tenantToken = await getTenantToken();
            const items = await searchBitable(tenantToken, THUC_DON_TUAN_TABLE_ID, {
                field_names: [
                    "Ngày",
                    "Thứ",
                    "Khách hàng",
                    "Site ăn",
                    "Ca",
                    "Món ăn BOM",
                    "Cơ cấu suất ăn",
                    "Số lượng cô Nga duyệt đặt hàng",
                    "Nguyên liệu cho Kiểm thực bước 2",
                    "BOM món ăn",
                ],
                filter: {
                    conditions: [
                        {
                            field_name: "Khách hàng",
                            operator: "is",
                            value: [client],
                        },
                        {
                            field_name: "Ngày",
                            operator: "is",
                            value: ["ExactDate", `${dateTimestamp}`],
                        },
                    ],
                    conjunction: "and",
                },
            });

            if (!items.length) {
                return res.json({
                    data: [],
                    msg: "export lenh san xuat excel file success",
                });
            }

            const result = items.map((row) => {
                const fields = row.fields || {};
                return {
                    Ngay: fieldDateMs(fields["Ngày"]),
                    Thu: fieldText(fields["Thứ"]),
                    KhachHang: fieldText(fields["Khách hàng"]),
                    SiteAn: siteAnText(fields["Site ăn"]),
                    Ca: fieldText(fields["Ca"]),
                    MonAn: fieldText(fields["Món ăn BOM"]),
                    CoCauSuatAn: fieldText(fields["Cơ cấu suất ăn"]),
                    SoLuongCoNgaDuyetDatHang: fieldText(fields["Số lượng cô Nga duyệt đặt hàng"]) || 0,
                    NguyenLieuChoKiemThucBuoc2: fieldText(fields["Nguyên liệu cho Kiểm thực bước 2"]),
                    BOMMonAn: fieldText(fields["BOM món ăn"]),
                };
            });

            return res.json({ data: result, error: null });
        } catch (err) {
            console.log("-- lenh_san_xuat error", err?.response?.data || err);
            return res.json({ data: null, error: err?.response?.data?.msg || err.message || err });
        }
    });
};
