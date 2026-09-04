const Excel = require('exceljs');
const { Op } = require('sequelize');
const moment = require("moment");
const dotenv = require("dotenv");
dotenv.config();
const axios = require("axios");
var authController = require('../middleware/auth');
const { encrypt } = require('../utils/crypto');
const dateFormat = require("date-format")
const { createKTB1ExcelFile } = require('../utils/kiem_thuc_3_buoc/kiem_thuc_buoc_1');
const { createKTB23ExcelFile } = require('../utils/kiem_thuc_3_buoc/kiem_thuc_buoc_23');
const { createKTB4ExcelFile } = require('../utils/kiem_thuc_3_buoc/kiem_thuc_buoc_4');
const { createWorkbook } = require('../utils/kiem_thuc_3_buoc/ktb11');
const { createLSXExcelFile, createLSX2ExcelFile } = require('../utils/lenh_san_xuat/lenh_san_xuat');
const { getTenantToken } = require("../controllers/larksuite");
const BIZEN_CATERING_BASE_ID = "TO6Zw7lxJi1hFtkcCetjcct5pNc";
const THUC_DON_TUAN_TABLE_ID = "tblcesBeBMwmAFFn";
const LENH_SAN_XUAT_TABLE_ID = "tbl0DJNU6sWrLGAA";
const KIEM_THUC_BUOC_11_TABLE_ID = "tblTrPB47sd2QqLK";
const KIEM_THUC_BUOC_12_TABLE_ID = "tbllux9AZp7bQ0GM";
const KIEM_THUC_BUOC_23_TABLE_ID = "tblEl4FkZHVnhiOi";
const KIEM_THUC_BUOC_4_TABLE_ID = "tblFw227tdZp0bwK";

const getKTBuoc11Datas = async(TENANT_TOKEN, client_code, date, ca) => {
    console.log("---- getKTBuoc11Datas", TENANT_TOKEN, client_code, date)
    const KIEM_THUC_BUOC_1_URL = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${KIEM_THUC_BUOC_11_TABLE_ID}/records/search`
    const listKTB1Res = await axios.post(KIEM_THUC_BUOC_1_URL,
        {
            "field_names": [
                "Ngày", "Khách hàng", "Ca", "Nguyên vật liệu", "Tổng khối lượng yêu cầu sản xuất",
                "Tên cơ sở", "Địa chỉ", "Điện thoại", "Người giao hàng", "Chứng từ hoá đơn"
            ],
            "filter": {
                "conditions": [
                    {
                        "field_name": "Khách hàng",
                        "operator": "is",
                        "value": [client_code], //[req.body.client_code]
                    },
                    {
                        "field_name": "Ngày",
                        "operator": "is",
                        "value": [
                            "ExactDate",
                            `${new Date(date).getTime()}`,
                        ],
                    },
                    {
                        "field_name": "Ca",
                        "operator": "is",
                        "value": [ca]
                    }
                ],
                "conjunction": "and"
            }
        },
        {
            headers: {
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${TENANT_TOKEN}`
            }
        }
    );  
    
    const datas = listKTB1Res.data.data?.items || [];
    //console.log("---- datas", datas);
    if(datas.length === 0) {
        return [];
    }

    let result = [];

    for(let i = 0; i < datas.length; i++) {
        let Ngay =  dateFormat("dd/MM/yyyy", new Date(datas[i]["fields"]["Ngày"]) || new Date());
        let KhachHang =  datas[i]["fields"]["Khách hàng"]?.[0]?.["text"] || "";
        let NguyenVatLieu =  datas[i]["fields"]["Nguyên vật liệu"]?.[0]?.["text"] || "";
        let TongKhoiLuongYeuCauSanXuat = datas[i]["fields"]["Tổng khối lượng yêu cầu sản xuất"]?.["value"]?.[0] || 0;
        let TenCoSo = datas[i]["fields"]["Tên cơ sở"]?.["value"]?.[0] || "";
        let DiaChi =  datas[i]["fields"]["Địa chỉ"]?.["value"]?.[0]?.["text"] || "";
        let DienThoai = datas[i]["fields"]["Điện thoại"]?.["value"]?.[0] || 0;
        let NguoiGiaoHang = datas[i]["fields"]["Người giao hàng"]?.["value"]?.[0]?.["text"] || "";
        let ChungTuHoaDon = datas[i]["fields"]["Chứng từ hoá đơn"]?.["value"]?.[0]?.["text"] || "";

        result.push({ 
            Ngay, KhachHang, NguyenVatLieu, TongKhoiLuongYeuCauSanXuat, TenCoSo, DiaChi, DienThoai, NguoiGiaoHang, ChungTuHoaDon
        });
    }

    return result;
}

const getKTBuoc12Datas = async(TENANT_TOKEN, client_code, date) => {
    const KIEM_THUC_BUOC_12_URL = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${KIEM_THUC_BUOC_12_TABLE_ID}/records/search`
    const listKTB12Res = await axios.post(KIEM_THUC_BUOC_12_URL,
        {
            "field_names": [
                "Tên thực phẩm", "Tên cơ sở sản xuất", "Địa chỉ sản xuất", "Khối lượng", "Tên cơ sở cung cấp",
                "Tên chủ giao hàng", "Địa chỉ", "Điện thoại", "Hạn sử dụng",
                "Điều kiện bảo quản", "Chứng từ hoá đơn"
            ],
            "filter": {
                "conditions": [
                    // {
                    //     "field_name": "Khách hàng",
                    //     "operator": "is",
                    //     "value": ["LIXIL"], //[req.body.client_code]
                    // },
                    // {
                    //     "field_name": "Ngày",
                    //     "operator": "is",
                    //     "value": [
                    //         "ExactDate",
                    //         `${new Date(req.body.date).getTime()}`,
                    //     ],
                    // }
                ],
                "conjunction": "and"
            }
        },
        {
            headers: {
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${TENANT_TOKEN}`
            }
        }
    );  
    
    const datas = listKTB12Res.data.data?.items || [];
    //console.log("---- datas", datas);
    if(datas.length === 0) {
        return [];
    }

    let result = [];

    for(let i = 0; i < datas.length; i++) {
        let TenThucPham = datas[i]["fields"]["Tên thực phẩm"]?.[0]?.["text"] || "";
        let TenCoSoSanXuat =  datas[i]["fields"]["Tên cơ sở sản xuất"]?.[0]?.["text"] || "";
        let DiaChiSanXuat =  datas[i]["fields"]["Địa chỉ sản xuất"]?.[0]?.["text"] || "";
        let ThoiGianNhap =  dateFormat("dd/MM/yyyy", new Date(date) || new Date());
        let KhoiLuong = datas[i]["fields"]["Khối lượng"]?.[0]?.["text"] || "";
        let TenCoSoCungCap = datas[i]["fields"]["Tên cơ sở cung cấp"]?.[0]?.["text"] || "";
        let TenChuGiaoHang =  datas[i]["fields"]["Tên chủ giao hàng"]?.[0]?.["text"] || "";
        let DiaChi = datas[i]["fields"]["Địa chỉ"]?.[0]?.["text"] || "";
        let DienThoai = datas[i]["fields"]["Điện thoại"];
        let HanSuDung = datas[i]["fields"]["Hạn sử dụng"]?.[0]?.["text"] || "";
        let DieuKienBaoQuan = datas[i]["fields"]["Điều kiện bảo quản"]?.[0]?.["text"] || "";
        let ChungTuHoaDon = datas[i]["fields"]["Chứng từ hoá đơn"]?.[0]?.["text"] || "";

        result.push({ 
            TenThucPham, TenCoSoSanXuat, DiaChiSanXuat, ThoiGianNhap, KhoiLuong, TenCoSoCungCap, TenChuGiaoHang, 
            DiaChi, DienThoai, HanSuDung, DieuKienBaoQuan, ChungTuHoaDon
        });
    }

    return result;
}

const getKTBuoc23Datas = async(TENANT_TOKEN, client_code, date, ca) => {
    console.log("---- getKTBuoc23Datas", TENANT_TOKEN, client_code, date)
    const KIEM_THUC_BUOC_23_URL = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${KIEM_THUC_BUOC_23_TABLE_ID}/records/search`
    const listKTB23Res = await axios.post(KIEM_THUC_BUOC_23_URL,
        {
            "field_names": [
                "Ngày", "Giờ ăn", "Khách hàng", "Ca", "Tên món ăn", "Nguyên liệu chính", "Số lượng suất ăn",
                "Thời gian sơ chế xong", "Thời gian chế biến xong", "Thời gian chia món ăn xong", "Thời gian bắt đầu ăn"
            ],
            "filter": {
                "conditions": [
                    {
                        "field_name": "Khách hàng",
                        "operator": "is",
                        "value": [client_code]
                    },
                    {
                        "field_name": "Ngày",
                        "operator": "is",
                        "value": [
                            "ExactDate",
                            `${new Date(date).getTime()}`,
                        ],
                    },
                    {
                        "field_name": "Ca",
                        "operator": "is",
                        "value": [ca]
                    }
                ],
                "conjunction": "and"
            }
        },
        {
            headers: {
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${TENANT_TOKEN}`
            }
        }
    );  
    
    const datas = listKTB23Res.data.data?.items || [];
    if(datas.length === 0) {
        return [];
    }

    let result = [];

    for(let i = 0; i < datas.length; i++) {
        let Ngay =  dateFormat("dd/MM/yyyy", new Date(datas[i]["fields"]["Ngày"]) || new Date());
        let GioAn =  datas[i]["fields"]["Giờ ăn"]?.[0]?.["text"] || "";
        let KhachHang =  datas[i]["fields"]["Khách hàng"]?.[0]?.["text"] || "";
        let Ca =  datas[i]["fields"]["Ca"]?.[0]?.["text"] || "";
        let TenMonAn = datas[i]["fields"]["Tên món ăn"]?.[0]?.["text"] || "";
        let NguyenLieuChinh = datas[i]["fields"]["Nguyên liệu chính"]?.["value"]?.[0]?.["text"] || "";
        let SoLuongSuatAn =  datas[i]["fields"]["Số lượng suất ăn"]?.["value"]?.[0] || 0;
        let ThoiGianSoCheXong = datas[i]["fields"]["Thời gian sơ chế xong"]?.[0]?.["text"] || "";
        let ThoiGianCheBienXong = datas[i]["fields"]["Thời gian chế biến xong"]?.[0]?.["text"] || "";
        let ThoiGianChiaMonAnXong = datas[i]["fields"]["Thời gian chia món ăn xong"]?.[0]?.["text"] || "";
        let ThoiGianBatDauAn =  datas[i]["fields"]["Thời gian bắt đầu ăn"]?.[0]?.["text"] || "";

        result.push({ 
            Ngay, GioAn, KhachHang, Ca, TenMonAn, NguyenLieuChinh, SoLuongSuatAn, 
            ThoiGianSoCheXong, ThoiGianCheBienXong, ThoiGianChiaMonAnXong, ThoiGianBatDauAn
        });
    }

    return result;
}

const getKTBuoc4Datas = async(TENANT_TOKEN, client_code, date, ca) => {
    console.log("---- getKTBuoc4Datas", TENANT_TOKEN, client_code, date)
    const KIEM_THUC_BUOC_4_URL = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${KIEM_THUC_BUOC_4_TABLE_ID}/records/search`
    const listKTB4Res = await axios.post(KIEM_THUC_BUOC_4_URL,
        {
            "field_names": [
                "Ngày", "Giờ ăn", "Khách hàng", "Ca", "Tên món ăn", "Cơ cấu suất ăn", "Số lượng suất ăn",
                "Khối lượng thể tích mẫu", "Dụng cụ chứa mẫu thức ăn lưu", "Nhiệt độ bảo quản mẫu",
                "Thời gian lấy mẫu", "Thời gian huỷ mẫu"
            ],
            "filter": {
                "conditions": [
                    {
                        "field_name": "Khách hàng",
                        "operator": "is",
                        "value": [client_code]
                    },
                    {
                        "field_name": "Ngày",
                        "operator": "is",
                        "value": [
                            "ExactDate",
                            `${new Date(date).getTime()}`,
                        ],
                    },
                    {
                        "field_name": "Ca",
                        "operator": "is",
                        "value": [ca]
                    }
                ],
                "conjunction": "and"
            }
        },
        {
            headers: {
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${TENANT_TOKEN}`
            }
        }
    );  
    
    const datas = listKTB4Res.data.data?.items || [];
    if(datas.length === 0) {
        return [];
    }

    let result = [];

    for(let i = 0; i < datas.length; i++) {
        let Ngay =  dateFormat("dd/MM/yyyy", new Date(datas[i]["fields"]["Ngày"]) || new Date());
        let NextNgay = dateFormat("dd/MM/yyyy", moment(datas[i]["fields"]["Ngày"]).add(1, 'days').toDate() || new Date());
        let GioAn =  datas[i]["fields"]["Giờ ăn"]?.[0]?.["text"] || "";
        let KhachHang =  datas[i]["fields"]["Khách hàng"]?.[0]?.["text"] || "";
        let Ca =  datas[i]["fields"]["Ca"]?.[0]?.["text"] || "";
        let TenMonAn = datas[i]["fields"]["Tên món ăn"]?.[0]?.["text"] || "";

        let CoCauSuatAn = datas[i]["fields"]["Cơ cấu suất ăn"]?.[0]?.["text"] || "";
        let SoLuongSuatAn =  datas[i]["fields"]["Số lượng suất ăn"]?.["value"]?.[0] || 0;
        let KhoiLuongTheTichMau = datas[i]["fields"]["Khối lượng thể tích mẫu"]?.["value"]?.[0]?.["text"] || "";
        let DungCuChuaMauThucAnLuu = datas[i]["fields"]["Dụng cụ chứa mẫu thức ăn lưu"]?.[0]?.["text"] || "";
        let NhietDoBaoQuanMau = datas[i]["fields"]["Nhiệt độ bảo quản mẫu"]?.[0]?.["text"] || "";
        let ThoiGianLayMau =  datas[i]["fields"]["Thời gian lấy mẫu"]?.[0]?.["text"] || "";
        let ThoiGianHuyMau =  datas[i]["fields"]["Thời gian huỷ mẫu"]?.[0]?.["text"] || "";

        result.push({ 
            Ngay, NextNgay, GioAn, KhachHang, Ca, TenMonAn, CoCauSuatAn, SoLuongSuatAn, 
            KhoiLuongTheTichMau, DungCuChuaMauThucAnLuu, NhietDoBaoQuanMau, ThoiGianLayMau, ThoiGianHuyMau
        });
    }

    return result;
}

module.exports = (router) => {
    router.post(`/export_excel_file/kiem_thuc_ba_buoc`, authController.isBasicAuthAuthenticated, async(req, res) => {
        try {
            const { kiemThucType, client_code, ca, date } = req.body;
            console.log("---- export_excel_file/kiem_thuc_ba_buoc req.body", req.body)
            const TENANT_TOKEN = await getTenantToken();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader("Content-Disposition", "attachment; filename=" + `${kiemThucType}_${date}_${client_code}.xlsx`);

            if(kiemThucType === "kiem_thuc_buoc_1") {
                const ktBuoc11Datas = await getKTBuoc11Datas(TENANT_TOKEN, client_code, date, ca);
                const ktBuoc12Datas = await getKTBuoc12Datas(TENANT_TOKEN, client_code, date);
                const workbook = await createKTB1ExcelFile({date: dateFormat("dd/MM/yyyy", new Date(date))}, ktBuoc11Datas, ktBuoc12Datas);
                workbook.xlsx.write(res).then(function (data) {
                    res.end();
                });
            } else if(kiemThucType === "kiem_thuc_buoc_23") {
                const ktBuoc23Datas = await getKTBuoc23Datas(TENANT_TOKEN, client_code, date, ca);
                const workbook = await createKTB23ExcelFile({ ca: ca, client_code: client_code, date: dateFormat("dd/MM/yyyy", new Date(date))}, ktBuoc23Datas);
                workbook.xlsx.write(res).then(function (data) {
                    res.end();
                });
            } else if(kiemThucType === "kiem_thuc_buoc_4") {
                const ktBuoc4Datas = await getKTBuoc4Datas(TENANT_TOKEN, client_code, date, ca);
                const workbook = await createKTB4ExcelFile({ ca: ca, client_code: client_code, date: dateFormat("dd/MM/yyyy", new Date(date))}, ktBuoc4Datas);
                workbook.xlsx.write(res).then(function (data) {
                    res.end();
                });
            }
            //console.log("---- ktBuoc11Datas:", ktBuoc11Datas)



            // //
            // //await createKTB23ExcelFile({ ca: "Ca 1", client_code: "LIXIL", date: dateFormat("dd/MM/yyyy", new Date(date))}, ktBuoc23Datas);
            // await createKTB4ExcelFile({ ca: "Ca 1", client_code: "LIXIL", date: dateFormat("dd/MM/yyyy", new Date(date))}, ktBuoc4Datas);
        

            // return res.json({
            //     data: ktBuoc4Datas,
            //     msg: "export kiem thuc ba buoc excel file success",
            // });
        } catch(error) {
            console.log("---- error", error)
            return res.json({
                data: null,
                msg: "export kiem thuc ba buoc excel file failed",
            });
        }
    });


    router.post(`/export_excel_file/lenh_san_xuat`, async(req, res) => {
        try {
            console.log("---- export excel req.body", new Date(req.body.date).getTime())
            const TENANT_TOKEN = await getTenantToken();
            // console.log("---- TENANT_TOKEN", TENANT_TOKEN, (new Date()).getTime())
            const THUC_DON_TUAN_URL = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${THUC_DON_TUAN_TABLE_ID}/records/search`
            const listClientRes = await axios.post(THUC_DON_TUAN_URL,
                {
                    "field_names": [
                        "Ngày", "Thứ", "Khách hàng", "Site ăn", "Ca", "Món ăn BOM", "Cơ cấu suất ăn",
                        "Số lượng cô Nga duyệt đặt hàng", "Nguyên liệu cho Kiểm thực bước 2", "BOM món ăn"
                    ],
                    "filter": {
                        "conditions": [
                            {
                                "field_name": "Khách hàng",
                                "operator": "is",
                                "value": [req.body.client_code]
                            },
                            {
                                "field_name": "Ngày",
                                "operator": "is",
                                "value": [
                                    "ExactDate",
                                    `${new Date(req.body.date).getTime()}`,
                                    // `${(new Date()).getTime()}`
                                ], //[(new Date()).getTime()],  //[]
                            }
                        ],
                        "conjunction": "and"
                    }
                },
                {
                    headers: {
                        "Content-Type": "application/json", 
                        "Authorization": `Bearer ${TENANT_TOKEN}`
                    }
                }
            );  
            
            const datas = listClientRes.data.data?.items || [];
            if(datas.length === 0) {
                return res.json({
                    data: [],
                    msg: "export lenh san xuat excel file success",
                })
            }

            let result = [];
            for(let i = 0; i < datas.length; i++) {
                let Ngay = datas[i]["fields"]["Ngày"];
                let Thu = datas[i]["fields"]["Thứ"]?.["value"][0]?.["text"] || "";
                let KhachHang =  datas[i]["fields"]["Khách hàng"];
                let SiteAn = Array.isArray(datas[i]["fields"]["Site ăn"]) ? datas[i]["fields"]["Site ăn"].join(", ") : "";
                let Ca = datas[i]["fields"]["Ca"];
                let MonAn = datas[i]["fields"]["Món ăn BOM"];
                let CoCauSuatAn =  datas[i]["fields"]["Cơ cấu suất ăn"];
                let SoLuongCoNgaDuyetDatHang = datas[i]["fields"]["Số lượng cô Nga duyệt đặt hàng"]?.["value"][0] || 0;
                let NguyenLieuChoKiemThucBuoc2 = datas[i]["fields"]["Nguyên liệu cho Kiểm thực bước 2"]?.["value"][0]?.["text"] || "";
                let BOMMonAn = datas[i]["fields"]["BOM món ăn"]?.["value"][0]?.["text"] || "";

                result.push({ 
                    Ngay, Thu, KhachHang, SiteAn, Ca, MonAn, CoCauSuatAn, 
                    SoLuongCoNgaDuyetDatHang, NguyenLieuChoKiemThucBuoc2, BOMMonAn 
                });
            }

            //console.log("---- result:", result)

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader("Content-Disposition", "attachment; filename=" + "patientListExcel.xlsx");

            const workbook = await createLSXExcelFile({ thu: result[0]?.Thu || "", date: new Date(result[0]?.Ngay) || "" }, result);

            workbook.xlsx.write(res).then(function (data) {
                res.end();
            });
        } catch(error) {
            console.log("---- error", error)
            return res.json({
                data: null,
            });
        }
    });

    router.post(`/export_excel_file/lenh_san_xuat_2`, async(req, res) => {
        try {
            console.log("---- export excel req.body", new Date(req.body.date).getTime())
            const TENANT_TOKEN = await getTenantToken();
            const LENH_SAN_XUAT_URL = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BIZEN_CATERING_BASE_ID}/tables/${LENH_SAN_XUAT_TABLE_ID}/records/search`
            const listLSXRes = await axios.post(LENH_SAN_XUAT_URL,
                {
                    "field_names": [
                        "Ngày", "Thứ", "Khách hàng", 
                        // "Site ăn", "Ca", 
                        // "Món ăn BOM", "Cơ cấu suất ăn",
                        // "Số lượng cô Nga duyệt đặt hàng", "Nguyên vật liệu", "Định mức nguyên liệu", "Đơn vị tính",
                        // "Khối lượng yêu cầu sản xuất"
                    ],
                    "filter": {
                        "conditions": [
                            {
                                "field_name": "Khách hàng",
                                "operator": "is",
                                "value": ["LIXIL"], //[req.body.client_code]
                            },
                            {
                                "field_name": "Ngày",
                                "operator": "is",
                                "value": [
                                    "ExactDate",
                                    `${new Date().getTime()}`
                                    // `${new Date(req.body.date).getTime()}`
                                ],
                            }
                        ],
                        "conjunction": "and"
                    }
                },
                {
                    headers: {
                        "Content-Type": "application/json", 
                        "Authorization": `Bearer ${TENANT_TOKEN}`
                    }
                }
            );  

            console.log("---- listLSXRes", listLSXRes.data)
            
            const datas = listLSXRes.data.data?.items || [];
            if(datas.length === 0) {
                return res.json({
                    data: [],
                    msg: "export lenh san xuat excel file success",
                })
            }

            let result = [];
            for(let i = 0; i < datas.length; i++) {
                let Ngay = datas[i]["fields"]["Ngày"];
                let Thu = datas[i]["fields"]["Thứ"]?.["value"][0]?.["text"] || "";
                let KhachHang =  datas[i]["fields"]["Khách hàng"];
                let SiteAn = Array.isArray(datas[i]["fields"]["Site ăn"]) ? datas[i]["fields"]["Site ăn"].join(", ") : "";
                let Ca = datas[i]["fields"]["Ca"];
                let MonAn = datas[i]["fields"]["Món ăn BOM"];
                let CoCauSuatAn =  datas[i]["fields"]["Cơ cấu suất ăn"];
                let SoLuongCoNgaDuyetDatHang = datas[i]["fields"]["Số lượng cô Nga duyệt đặt hàng"]?.["value"][0] || 0;
                let NguyenVatLieu = datas[i]["fields"]["Nguyên vật liệu"]?.["value"][0]?.["text"] || "";
                let BOMMonAn = datas[i]["fields"]["Định mức nguyên liệu"]?.["value"][0]?.["text"] || "";
                let DonViTinh = datas[i]["fields"]["Đơn vị tính"]?.["value"][0]?.["text"] || "";
                let KhoiLuongYeuCauSanXuat = datas[i]["fields"]["Khối lượng yêu cầu sản xuất"]?.["value"][0]?.["text"] || "";

                result.push({ 
                    Ngay, Thu, KhachHang, SiteAn, Ca, MonAn, CoCauSuatAn, 
                    SoLuongCoNgaDuyetDatHang, NguyenVatLieu, BOMMonAn, DonViTinh, KhoiLuongYeuCauSanXuat
                });
            }

            console.log("---- result:", result)

            return res.json({
                data: datas,
                msg: "export lenh san xuat excel file success",
            })

            // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            // res.setHeader("Content-Disposition", "attachment; filename=" + "lenhSanXuatExcel.xlsx");

            // const workbook = await createLSXExcelFile({ thu: result[0]?.Thu || "", date: new Date(result[0]?.Ngay) || "" }, result);

            // workbook.xlsx.write(res).then(function (data) {
            //     res.end();
            // });
        } catch(error) {
            console.log("---- error", error)
            return res.json({
                data: null,
            });
        }
    });

    router.post(`/export_excel_file/test_lenh_san_xuat`, authController.isBasicAuthAuthenticated, async(req, res) => {
        try {
            return res.json({
                data: null,
                msg: "export lenh san xuat excel file success",
            });
        } catch(error) {
            console.log("---- error", error)
            return res.json({
                data: null,
                msg: "export lenh san xuat excel file failed",
            });
        }
    });

    // router.get("/export", async (req, res) => {
    //     try {
    //         const { date, customer = "ALL", shift = "CA 1" } = req.query;

    //         if (!date) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: "Tham số 'date' (YYYY-MM-DD) là bắt buộc",
    //             });
    //         }

    //         const selectedDate = String(date).trim();
    //         const selectedCustomer = String(customer).trim().toUpperCase();
    //         const selectedShift = String(shift).trim().toUpperCase();

    //         // Bước 1: Tải dữ liệu từ 2 bảng Lark
    //         const [freshRecords, dryRecords] = await Promise.all([
    //         getFreshGoodsRecords(),
    //         getDryGoodsRecords(),
    //         ]);

    //         // Bước 2: Kiểm tra trường hợp xuất tất cả khách hàng (Export All -> ZIP)
    //         if (selectedCustomer === "ALL" || selectedCustomer === "") {
    //         const groups = extractCustomersAndShiftsForDate(freshRecords, selectedDate);

    //         if (groups.length === 0) {
    //             return res.status(404).json({
    //             success: false,
    //             message: `Không có dữ liệu kiểm thực nào trong ngày ${selectedDate}`,
    //             });
    //         }

    //         // Thiết lập header trả về file ZIP
    //         const zipFileName = `KiemThuc_${selectedDate}_ALL.zip`;
    //         res.setHeader("Content-Type", "application/zip");
    //         res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(zipFileName)}"`);

    //         const archive = archiver("zip", { zlib: { level: 9 } });
    //         archive.pipe(res);

    //         // Tạo từng file Excel cho mỗi công ty / ca và đưa vào file nén
    //         for (const grp of groups) {
    //             const singleReport = buildInspectionReportData({
    //             freshRecords,
    //             dryRecords,
    //             selectedDate,
    //             customer: grp.customer,
    //             shift: grp.shift,
    //             });

    //             const fileBuffer = await generateExcelBuffer(singleReport);
    //             const fileNameInZip = `${grp.shift} - B1 ${grp.customer}.xlsx`;
    //             archive.append(fileBuffer, { name: fileNameInZip });
    //         }

    //         await archive.finalize();
    //         return;
    //         }

    //         // Bước 3: Xuất 1 file Excel duy nhất cho Khách hàng & Ca được chỉ định
    //         const reportData = buildInspectionReportData({
    //         freshRecords,
    //         dryRecords,
    //         selectedDate,
    //         customer: selectedCustomer,
    //         shift: selectedShift,
    //         });

    //         const fileBuffer = await generateExcelBuffer(reportData);
    //         const fileName = `${selectedShift} - B1 ${selectedCustomer}.xlsx`;

    //         res.setHeader(
    //         "Content-Type",
    //         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    //         );
    //         res.setHeader(
    //         "Content-Disposition",
    //         `attachment; filename="${encodeURIComponent(fileName)}"`
    //         );
    //         res.setHeader("Content-Length", fileBuffer.length);

    //         return res.send(fileBuffer);
    //     } catch (error) {
    //         console.error("[API Error] /export:", error);
    //         return res.status(500).json({
    //         success: false,
    //         message: "Lỗi khi xuất file Excel",
    //         error: error.message,
    //         });
    //     }
    //     });
}