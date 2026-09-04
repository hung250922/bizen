const Excel = require('exceljs');
const moment = require("moment");

const adjustColumnWidth = (worksheet) => {
    worksheet.columns.forEach(column => {
        const lengths = column.values.map(v => v.toString().length);
        const maxLength = Math.max(...lengths.filter(v => typeof v === 'number'));
        column.width = maxLength;
    });
};

async function createLSXExcelFile(payloadTitle, excelDatas) {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.addRow([payloadTitle.thu, payloadTitle.date]);
    worksheet.addRow([
        "Công ty",
        "Số phần",
        "Ca",
        "Cơ cấu suất ăn",
        "Món ăn",
        "BOM món ăn",
        "Số lượng nhập"
    ]);

    // chỗ này cần lấy data đưa vào
    for(let i = 0; i < excelDatas.length; i++) {
        let data = excelDatas[i];

        worksheet.addRow([
            data.KhachHang,
            data.SoLuongCoNgaDuyetDatHang,
            data.Ca,
            data.CoCauSuatAn,
            data.MonAn,
            data.BOMMonAn,
            data.NguyenLieuChoKiemThucBuoc2,
        ]);
    }
    // worksheet.addRows([
    //     ["WATABE", 145, "Ca 1", "Cơ cấu suất ăn 1", "Món ăn 1", "100k thịt heo vai"],
    //     ["WATABE 2", 145, "Ca 1", "Cơ cấu suất ăn 1", "Món ăn 1", "100k thịt heo vai"],
    // ]);

    // *** Format cell
    ["A", "B", "C", "D", "E", "F", "G"].forEach((col) => {
    worksheet.getCell(`${col}2`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF87CEEB' } // Sky Blue
        };
    });
    adjustColumnWidth(worksheet);

    return workbook;
    // worksheet.getCell('A8').alignment = {
    //     wrapText: true,
    //     vertical: 'top',
    // };
    // const fileName = `lenh_san_xuat_${moment(Date.now()).format("DD-MM-YYYY")}_${Math.random(0, 1000)}.xlsx`;
    // await workbook.xlsx.writeFile(`./public/excelFiles/${fileName}`);
    // workbook.xlsx.write(res).then(function (data) {
    //     res.end();
    // });
}

async function createLSX2ExcelFile(payloadTitle, excelDatas) {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.addRow([
        "Ngày",
        "Khách hàng",
        "Ca",
        "Site ăn",
        "Món ăn BOM",
        "Số lượng cô Nga duyệt",
        "Nguyên vật liệu",
        "Định lượng nguyên liệu",
        "Khối lượng yêu cầu sản xuất"
    ]);

    // chỗ này cần lấy data đưa vào
    for(let i = 0; i < excelDatas.length; i++) {
        let data = excelDatas[i];
        const { Ngay, KhachHang, Ca, SiteAn, MonAn, SoLuongCoNgaDuyetDatHang, NguyenVatLieu, DinhLuongNguyenLieu, KhoiLuongYeuCauSanXuat } = data;

        worksheet.addRow([
            Ngay,
            KhachHang,
            Ca,
            SiteAn,
            MonAn,
            SoLuongCoNgaDuyetDatHang,
            NguyenVatLieu,
            DinhLuongNguyenLieu,
            KhoiLuongYeuCauSanXuat,
        ]);
    }

    // *** Format cell
    ["A", "B", "C", "D", "E", "F", "G", "H", "I"].forEach((col) => {
        worksheet.getCell(`${col}1`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF87CEEB' } // Sky Blue
        };
    });
    adjustColumnWidth(worksheet);

    return workbook;
}

module.exports = {
    createLSXExcelFile,
    createLSX2ExcelFile
};