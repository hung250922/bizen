const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const { valueToText } = require('./exportQuyTrinhExcel');

const TEMPLATE_FILE = 'form_mau_5_PO.xlsx';
const HEADERS = [
	'Mã POT',
	'Khối lượng nguyên vật liệu yêu cầu sản xuất',
	'Kỳ đặt hàng',
	'Số lượng đặt hàng được duyệt',
	'Tên nguyên liệu Misa',
	'Nhóm nguyên liệu Misa',
	'Nhà cung cấp',
	'Đơn giá gần nhất (tham khảo)',
	'Đơn giá được duyệt',
	'Thành tiền',
	'Thuế VAT',
	'Thành tiền sau thuế',
	'Ngày giờ muốn nhận hàng',
	'Kho nhận hàng',
];

const APPROVED_COLUMN_FILL = {
	type: 'pattern',
	pattern: 'solid',
	fgColor: { argb: 'FFE2F0D9' },
};

function normalizeFieldName(name) {
	return String(name)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function getField(fields, header) {
	if (fields[header] != null) return valueToText(fields[header]);
	const normalizedHeader = normalizeFieldName(header);
	const fieldName = Object.keys(fields).find((name) => (
		normalizeFieldName(name) === normalizedHeader && fields[name] != null
	));
	return fieldName ? valueToText(fields[fieldName]) : '';
}

function parseDate(value) {
	const raw = valueToText(value);
	if (!raw) return null;
	if (/^\d{10,}$/.test(raw)) {
		const date = new Date(Number(raw));
		if (!Number.isNaN(date.getTime())) return date;
	}
	const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (ddmmyyyy) {
		const [, day, month, year] = ddmmyyyy;
		return new Date(Number(year), Number(month) - 1, Number(day));
	}
	const date = new Date(raw.replace(' ', 'T'));
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
	const date = parseDate(value);
	if (!date) return valueToText(value);
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(date).reduce((result, part) => {
		result[part.type] = part.value;
		return result;
	}, {});
	return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function copyRowStyle(source, target) {
	target.height = source.height;
	source.eachCell({ includeEmpty: true }, (cell, column) => {
		target.getCell(column).style = { ...cell.style };
		target.getCell(column).numFmt = cell.numFmt;
	});
}

async function createForm5POFile(records) {
	const filePath = path.join(__dirname, '../../public/excelTemplates', TEMPLATE_FILE);
	if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${TEMPLATE_FILE}.`);

	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(filePath);
	const worksheet = workbook.worksheets[0];
	const data = Array.isArray(records) ? records : [];
	if (data.length === 0) return workbook;

	const originalTotalRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
		.find((row) => valueToText(worksheet.getCell(row, 1).value).toLowerCase().startsWith('tổng')) || worksheet.rowCount;
	const detailStyle = worksheet.getRow(2);
	const totalStyle = worksheet.getRow(originalTotalRow);
	worksheet.getCell('D1').fill = { ...APPROVED_COLUMN_FILL };
	worksheet.getCell('I1').fill = { ...APPROVED_COLUMN_FILL };

	for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
		worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
	}

	data.forEach((record, index) => {
		const row = worksheet.getRow(index + 2);
		copyRowStyle(detailStyle, row);
		const fields = record.fields || record;
		HEADERS.forEach((header, columnIndex) => {
			const value = getField(fields, header);
			row.getCell(columnIndex + 1).value = header === 'Ngày giờ muốn nhận hàng'
				? formatDateTime(value)
				: value;
		});
		row.getCell(4).fill = { ...APPROVED_COLUMN_FILL };
		row.getCell(9).fill = { ...APPROVED_COLUMN_FILL };
	});

	const totalRow = worksheet.getRow(data.length + 2);
	copyRowStyle(totalStyle, totalRow);
	for (let column = 1; column <= HEADERS.length; column += 1) {
		totalRow.getCell(column).value = column === 1 ? 'Tổng:' : null;
	}
	worksheet.autoFilter = { from: 'A1', to: `N${data.length + 1}` };
	return workbook;
}

module.exports = { createForm5POFile };
