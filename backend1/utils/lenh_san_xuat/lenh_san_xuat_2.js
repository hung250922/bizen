const Excel = require('exceljs');
const dateFormat = require("date-format");

const setBorder = (cell) => {
    cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
    };
}

const setBackground = (cell) => {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
            argb: 'FF4169E1'
        }
    };
}

const setPosition = (cell) => {
    cell.alignment = {
        wrapText: true,
        vertical: 'middle',
        horizontal: 'center'
    };
}

async function createLSX2ExcelFile(payloadTitle, lsx2Datas){
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.addRow(["LỆNH SẢN XUẤT " + (payloadTitle.kitchen?.toUpperCase() || "")]);
    worksheet.getCell("A1").alignment = { vertical: 'middle', horizontal: 'center' };
    
    // tô màu
    worksheet.getCell("A1").font = { bold: true, size: 20 };

    worksheet.getCell("H2").value = {
        richText: [
            {
                text: 'NGÀY: ' + payloadTitle.date,
                font: {
                    color: { argb: 'FF000000' },
                    bold: true,
                }
            }
        ]
    };

    // const [day, month, year] = payloadTitle.date.split('/').map(Number);
    // const newDate = new Date(year, month - 1, day);

    // ************ Bảng
    worksheet.getCell("A3").value = {
        richText: [
            {
                text: 'Cty',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("A3"));
    setBorder(worksheet.getCell("A3"));
    setBackground(worksheet.getCell("A3"));

    worksheet.getCell("B3").value = {
        richText: [
            {
                text: 'Ca',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("B3"));
    setBorder(worksheet.getCell("B3"));
    setBackground(worksheet.getCell("B3"));
    
    worksheet.getCell("C3").value = {
        richText: [
            {
                text: 'Site',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("C3"));
    setBorder(worksheet.getCell("C3"));
    setBackground(worksheet.getCell("C3"));

    worksheet.getCell("H3").value = {
        richText: [
            {
                text: 'Tổng suất ăn',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("H3"));
    setBorder(worksheet.getCell("H3"));
    setBackground(worksheet.getCell("H3"));

    worksheet.getCell("I3").value = {
        richText: [
            {
                text: 'Cơ cấu suất ăn',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("I3"));
    setBorder(worksheet.getCell("I3"));
    setBackground(worksheet.getCell("I3"));

    worksheet.getCell("J3").value = {
        richText: [
            {
                text: 'Món ăn',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("J3"));
    setBorder(worksheet.getCell("J3"));
    setBackground(worksheet.getCell("J3"));

    worksheet.getCell("K3").value = {
        richText: [
            {
                text: 'BOM MÓN ĂN',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("K3"));
    setBorder(worksheet.getCell("K3"));
    setBackground(worksheet.getCell("K3"));

    worksheet.getCell("L3").value = {
        richText: [
            {
                text: 'KHỐI LƯỢNG YÊU CẦU SẢN XUẤT',
                font: {
                    color: { argb: 'FFFFFFFF' },
                }
            }
        ]
    };
    setPosition(worksheet.getCell("L3"));
    setBorder(worksheet.getCell("L3"));
    setBackground(worksheet.getCell("L3"));


    // chỗ này cần lấy data đưa vào
    let previousKhachHang = null, previousCa = null, previousCoCauSuatAn = null, previousSoLuongCoNgaDuyetDatHang = null;
    if(lsx2Datas && lsx2Datas.length > 0) {
        lsx2Datas.forEach((data, index) => {
            const BOMMonAnSplitted = data.BOMMonAn.replace(/,/g, "\n");
            const KhoiLuongSanXuatSite1Splitted = data.KhoiLuongSanXuatSite1.replace(/,/g, "\n");
            const KhoiLuongSanXuatSite2Splitted = data.KhoiLuongSanXuatSite2.replace(/,/g, "\n");
            const KhoiLuongSanXuatSite3Splitted = data.KhoiLuongSanXuatSite3.replace(/,/g, "\n");
            const KhoiLuongSanXuatSite4Splitted = data.KhoiLuongSanXuatSite4.replace(/,/g, "\n");
            const KhoiLuongSanXuatSite5Splitted = data.KhoiLuongSanXuatSite5.replace(/,/g, "\n");
            const NguyenLieuChoKiemThucBuoc2Splitted = data.NguyenLieuChoKiemThucBuoc2.replace(/,/g, "\n");

            const newRow = worksheet.addRow([
                data.KhachHang,
                data.Ca,
                data.SoLuongCoNgaDuyetSite1 > 0 ? (data.Site1 + ":\n" + data.SoLuongCoNgaDuyetSite1) : "", 
                data.SoLuongCoNgaDuyetSite2 > 0 ? (data.Site2 + ":\n" + data.SoLuongCoNgaDuyetSite2) : "", 
                data.SoLuongCoNgaDuyetSite3 > 0 ? (data.Site3 + ":\n" + data.SoLuongCoNgaDuyetSite3) : "",
                data.SoLuongCoNgaDuyetSite4 > 0 ? (data.Site4 + ":\n" + data.SoLuongCoNgaDuyetSite4) : "",
                data.SoLuongCoNgaDuyetSite5 > 0 ? (data.Site5 + ":\n" + data.SoLuongCoNgaDuyetSite5) : "",
                data.SoLuongCoNgaDuyetDatHang,
                data.CoCauSuatAn,
                data.MonAn,
                BOMMonAnSplitted,
                data.SoLuongCoNgaDuyetSite1 > 0 ? (data.Site1 + ":\n" + KhoiLuongSanXuatSite1Splitted) : "",
                data.SoLuongCoNgaDuyetSite2 > 0 ? (data.Site2 + ":\n" + KhoiLuongSanXuatSite2Splitted) : "",
                data.SoLuongCoNgaDuyetSite3 > 0 ? (data.Site3 + ":\n" + KhoiLuongSanXuatSite3Splitted) : "",
                data.SoLuongCoNgaDuyetSite4 > 0 ? (data.Site4 + ":\n" + KhoiLuongSanXuatSite4Splitted) : "",
                data.SoLuongCoNgaDuyetSite5 > 0 ? (data.Site5 + ":\n" + KhoiLuongSanXuatSite5Splitted) : "",
                "TỔNG:\n" + NguyenLieuChoKiemThucBuoc2Splitted
            ]);

            for(let i = 1; i <= 17; i++) {
                setBorder(worksheet.getCell(`${String.fromCharCode(64 + i)}${newRow.number}`));
            }

            // ** xuống dòng cho BOM MÓN ĂN & NGUYÊN LIỆU CHO KIỂM THỰC BƯỚC 2
            ["C", "D", "E", "F", "G", "K", "L", "M", "N", "O", "P", "Q"].forEach(col => {
                worksheet.getCell(`${col}${newRow.number}`).alignment = {
                    wrapText: true,
                    vertical: 'middle',
                    horizontal: 'center'
                };
            });
            worksheet.getCell(`K${newRow.number}`).alignment = {
                wrapText: true,
                vertical: 'middle',
                horizontal: 'center'
            };

            worksheet.getCell(`J${newRow.number}`).alignment = {
                wrapText: true,
                vertical: 'middle',
                horizontal: 'center'
            };

            // tính toán merge cho từng loại
            // ** merge cho Khách Hàng
            if (previousKhachHang === null) {
                previousKhachHang = { value: data.KhachHang, startRow: newRow.number };
            } else if (previousKhachHang.value !== data.KhachHang) {
                if (previousKhachHang.startRow !== newRow.number - 1) {
                    worksheet.mergeCells(`A${previousKhachHang.startRow}:A${newRow.number - 1}`);
                    worksheet.getCell(`A${previousKhachHang.startRow}`).alignment = {
                        wrapText: true,
                        vertical: 'middle',
                        horizontal: 'center'
                    };
                }
                previousKhachHang = { value: data.KhachHang, startRow: newRow.number };
            }

            // merge the last group
            if (index === lsx2Datas.length - 1 && previousKhachHang.startRow !== newRow.number) {
                worksheet.mergeCells(`A${previousKhachHang.startRow}:A${newRow.number}`);
                worksheet.getCell(`A${previousKhachHang.startRow}`).alignment = {
                    wrapText: true,
                    vertical: 'middle',
                    horizontal: 'center'
                };
            }

            // ** merge cho Ca
            if (previousCa === null) {
                previousCa = { value: data.Ca, startRow: newRow.number };
            } else if (previousCa.value !== data.Ca) {
                if (previousCa.startRow !== newRow.number - 1) {
                    worksheet.mergeCells(`B${previousCa.startRow}:B${newRow.number - 1}`);
                    worksheet.getCell(`B${previousCa.startRow}`).alignment = {
                        wrapText: true,
                        vertical: 'middle'
                    };
                }
                previousCa = { value: data.Ca, startRow: newRow.number };
            }

            // merge the last group
            if (index === lsx2Datas.length - 1 && previousCa.startRow !== newRow.number) {
                worksheet.mergeCells(`B${previousCa.startRow}:B${newRow.number}`);
                worksheet.getCell(`B${previousCa.startRow}`).alignment = {
                    wrapText: true,
                    vertical: 'middle'
                };
            }

            // ** merge cho Cơ Cấu Suất Ăn
            if (previousCoCauSuatAn === null) {
                previousCoCauSuatAn = { value: data.CoCauSuatAn, startRow: newRow.number };
            } else if (previousCoCauSuatAn.value !== data.CoCauSuatAn) {
                if (previousCoCauSuatAn.startRow !== newRow.number - 1) {
                    worksheet.mergeCells(`I${previousCoCauSuatAn.startRow}:I${newRow.number - 1}`);
                    worksheet.getCell(`I${previousCoCauSuatAn.startRow}`).alignment = {
                        wrapText: true,
                        vertical: 'middle'
                    };
                }
                previousCoCauSuatAn = { value: data.CoCauSuatAn, startRow: newRow.number };
            }

            // merge the last group
            if (index === lsx2Datas.length - 1 && previousCoCauSuatAn.startRow !== newRow.number) {
                worksheet.mergeCells(`I${previousCoCauSuatAn.startRow}:I${newRow.number}`);
                worksheet.getCell(`I${previousCoCauSuatAn.startRow}`).alignment = {
                    wrapText: true,
                    vertical: 'middle'
                };
            }

            // // ** merge cho Số Lượng Có Ngày Duyệt Đặt Hàng
            // if (previousSoLuongCoNgaDuyetDatHang === null) {
            //     previousSoLuongCoNgaDuyetDatHang = { value: data.SoLuongCoNgaDuyetDatHang, startRow: newRow.number };
            // } else if (previousSoLuongCoNgaDuyetDatHang.value !== data.SoLuongCoNgaDuyetDatHang) {
            //     if (previousSoLuongCoNgaDuyetDatHang.startRow !== newRow.number - 1) {
            //         worksheet.mergeCells(`F${previousSoLuongCoNgaDuyetDatHang.startRow}:F${newRow.number - 1}`);
            //         worksheet.getCell(`F${previousSoLuongCoNgaDuyetDatHang.startRow}`).alignment = {
            //             wrapText: true,
            //             vertical: 'middle',
            //             ///horizontal: 'center'
            //         };
            //     }
            //     previousSoLuongCoNgaDuyetDatHang = { value: data.SoLuongCoNgaDuyetDatHang, startRow: newRow.number };
            // }

            // // merge the last group
            // if (index === lsx2Datas.length - 1 && previousSoLuongCoNgaDuyetDatHang.startRow !== newRow.number) {
            //     worksheet.mergeCells(`F${previousSoLuongCoNgaDuyetDatHang.startRow}:F${newRow.number}`);
            //     worksheet.getCell(`F${previousSoLuongCoNgaDuyetDatHang.startRow}`).alignment = {
            //         wrapText: true,
            //         vertical: 'middle',
            //         //horizontal: 'center'
            //     };
            // }
        });
    }

    worksheet.getColumn('A').width = 10;
    worksheet.getColumn('B').width = 10;
    worksheet.getColumn('C').width = 15;
    worksheet.getColumn('D').width = 15;
    worksheet.getColumn('E').width = 15;
    worksheet.getColumn('F').width = 15;
    worksheet.getColumn('G').width = 15;
    worksheet.getColumn('H').width = 20;
    worksheet.getColumn('I').width = 30;
    worksheet.getColumn('J').width = 25;
    worksheet.getColumn('K').width = 25;
    worksheet.getColumn('L').width = 25;
    worksheet.getColumn('M').width = 25;
    worksheet.getColumn('N').width = 25;
    worksheet.getColumn('O').width = 25;
    worksheet.getColumn('P').width = 25;
    worksheet.getColumn('Q').width = 25;

    worksheet.getRow(3).height = 80;

    worksheet.mergeCells(`A1:Q1`);
    worksheet.mergeCells(`C3:G3`);
    worksheet.mergeCells(`L3:Q3`);

    return workbook;

    //await workbook.xlsx.writeFile(`exported_file${Date.now().toLocaleString().replace(/[:\/]/g, '-')}.xlsx`);
}

module.exports = {
    createLSX2ExcelFile
};