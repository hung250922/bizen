const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');

const TEMPLATE_FILES = {
	1: 'form_mau_1_SO.xlsx',
};

const NORMAL_DATA_FONT = {
	name: 'DengXian',
	size: 11,
	family: 2,
	color: { theme: 1 },
};

function valueToText(value) {
	if (value == null || value === '') return '';
	if (typeof value === 'string') {
		const text = value.trim();
		if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
			try {
				return valueToText(JSON.parse(text));
			} catch {
				return text;
			}
		}
		return text;
	}
	if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
	if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(', ');
	if (typeof value === 'object') {
		if (value.text != null) return valueToText(value.text);
		if (value.name != null) return valueToText(value.name);
		if (value.value != null) return valueToText(value.value);
		if (value.values != null) return valueToText(value.values);
	}
	return '';
}

function parseDateValue(value) {
	const raw = valueToText(value);
	if (!raw) return null;

	if (/^\d{10,}$/.test(raw)) {
		const timestamp = Number(raw);
		const date = new Date(timestamp);
		if (!Number.isNaN(date.getTime())) return date;
	}

	const trimmed = raw.trim();
	const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (ddmmyyyy) {
		const [, day, month, year] = ddmmyyyy;
		const date = new Date(Number(year), Number(month) - 1, Number(day));
		if (!Number.isNaN(date.getTime())) return date;
	}

	const yyyymmdd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
	if (yyyymmdd) {
		const [, year, month, day] = yyyymmdd;
		const date = new Date(Number(year), Number(month) - 1, Number(day));
		if (!Number.isNaN(date.getTime())) return date;
	}

	const date = new Date(trimmed);
	if (!Number.isNaN(date.getTime())) return date;
	return null;
}

function formatDate(value) {
	const date = parseDateValue(value);
	if (!date) return valueToText(value);
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Ho_Chi_Minh',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(date);
}

const aliases = {
	'Mã SO': ['Mã SO'],
	'Mã PR': ['Mã PR'],
	'Trạng thái': ['Trạng thái'],
	'Ngày': ['Ngày'],
	'Bếp': ['Bếp'],
	'Khách hàng': ['Khách hàng'],
	'Ca': ['Ca'],
	'Site ăn': ['Danh sách các site', 'Site ăn'],
	'Cơ cấu suất ăn': ['Cơ cấu suất ăn'],
	'Cơ cấu menu': ['Cơ cấu menu'],
	'Món ăn BOM': ['Món ăn BOM', 'Món ăn'],
	'Số lượng cô Nga duyệt đặt hàng': ['Số lượng cô Nga duyệt đặt hàng'],
	'Nguyên vật liệu BOM': ['Nguyên vật liệu BOM'],
	'Nguyên vật liệu': ['Nguyên vật liệu'],
	'Nguyên vật liệu sản xuất': ['Nguyên vật liệu sản xuất', 'Khối lượng yêu cầu sản xuất'],
	'Mã POT': ['Mã POT'],
	'Kho nhận hàng': ['Kho nhận hàng'],
	'Ngày giờ muốn nhận hàng': ['Ngày giờ muốn nhận hàng'],
	'Mã PR': ['Mã PR'],
	'Mã SO': ['Mã SO'],
	'Nguyên vật liệu đầy đủ': ['Nguyên vật liệu đầy đủ'],
	'Chu kỳ đặt hàng (ngày)': ['Chu kỳ đặt hàng (ngày)'],
};

function composeMaterial(fields, amountField, unitField) {
	const material = valueToText(fields['Nguyên vật liệu']);
	const amount = valueToText(fields[amountField]);
	const unit = valueToText(fields[unitField]);
	return [material, amount, unit].filter(Boolean).join(' ');
}

function getField(fields, header, template) {
	if (template === 1 && header === 'Nguyên vật liệu BOM') {
		return composeMaterial(fields, 'Định mức nguyên liệu', 'Đơn vị tính');
	}
	if (template === 1 && header === 'Nguyên vật liệu') {
		return composeMaterial(fields, 'Khối lượng yêu cầu sản xuất', 'Đơn vị tính mua hàng');
	}
	if (template === 2 && header === 'Nguyên vật liệu') {
		const material = valueToText(fields['Nguyên vật liệu']);
		if (material) return material;
	}
	if (template === 2 && header === 'Nguyên vật liệu BOM') {
		const bom = valueToText(fields['Nguyên vật liệu BOM']);
		if (bom) return bom;
	}
	const fieldName = (aliases[header] || [header]).find((name) => fields[name] != null);
	const value = fieldName ? fields[fieldName] : '';
	if (header === 'Ngày' || header === 'Ngày giờ muốn nhận hàng') return formatDate(value);
	if (header === 'Site ăn') return valueToText(value).replace(/(?:,\s*)+$/, '');
	if (header === 'Món ăn' && !valueToText(value)) {
		const soCode = valueToText(fields['Mã SO']);
		if (soCode.includes('Suất tráng miệng')) return 'Suất tráng miệng';
	}
	return valueToText(value);
}

function copyRowStyle(source, target) {
	target.height = source.height;
	source.eachCell({ includeEmpty: true }, (cell, column) => {
		target.getCell(column).style = { ...cell.style };
		target.getCell(column).numFmt = cell.numFmt;
	});
}

function removeDataRowFill(row, columnCount) {
	for (let column = 1; column <= columnCount; column += 1) {
		row.getCell(column).fill = {
			type: 'pattern',
			pattern: 'none',
		};
	}
}

function applyDataRowFont(row, font, columnCount) {
	for (let column = 1; column <= columnCount; column += 1) {
		row.getCell(column).font = { ...font };
	}
}

function applyDataRowAlignment(row, alignments, columnCount) {
	for (let column = 1; column <= columnCount; column += 1) {
		row.getCell(column).alignment = { ...alignments[column - 1] };
	}
}

function applyDataRowHeight(row, height) {
	if (height != null) {
		row.height = height;
	}
}

function renderForm1Rows(worksheet, records) {
	const groupedBySo = new Map();

	for (const record of records) {
		const fields = record.fields || record;
		const soCode = valueToText(getField(fields, 'Mã SO', 1));
		const key = soCode || `row-${groupedBySo.size}`;
		if (!groupedBySo.has(key)) {
			groupedBySo.set(key, []);
		}
		groupedBySo.get(key).push(fields);
	}

	let rowIndex = 2;
	for (const [, items] of groupedBySo.entries()) {
		for (const [itemIndex, fields] of items.entries()) {
			const row = worksheet.getRow(rowIndex);

			if (itemIndex === 0) {
				row.getCell(1).value = getField(fields, 'Mã SO', 1);
			}

			row.getCell(2).value = getField(fields, 'Mã PR', 1);
			row.getCell(3).value = getField(fields, 'Trạng thái', 1);
			row.getCell(4).value = getField(fields, 'Ngày', 1);
			row.getCell(5).value = '';
			row.getCell(6).value = getField(fields, 'Khách hàng', 1);
			row.getCell(7).value = getField(fields, 'Ca', 1);
			row.getCell(8).value = getField(fields, 'Site ăn', 1);
			row.getCell(9).value = getField(fields, 'Cơ cấu suất ăn', 1);
			row.getCell(10).value = getField(fields, 'Cơ cấu menu', 1);
			row.getCell(11).value = getField(fields, 'Món ăn BOM', 1);
			row.getCell(12).value = getField(fields, 'Số lượng cô Nga duyệt đặt hàng', 1);
			row.getCell(13).value = getField(fields, 'Nguyên vật liệu BOM', 1);
			row.getCell(14).value = getField(fields, 'Nguyên vật liệu', 1);

			rowIndex += 1;
		}
	}
}

async function createQuyTrinhExcelFile(template, records) {
	const fileName = TEMPLATE_FILES[Number(template)];
	if (!fileName) throw new Error('Hiện chỉ hỗ trợ Form 1.');
	const filePath = path.join(__dirname, '../../public/excelTemplates', fileName);
	if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${fileName}.`);

	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(filePath);
	const worksheet = workbook.worksheets[0];
	const originalMerges = [...worksheet.model.merges];
	originalMerges.forEach((merge) => worksheet.unMergeCells(merge));
	const headers = worksheet.getRow(1).values.slice(1);
	const originalTotalRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
		.find((row) => valueToText(worksheet.getCell(row, 1).value).toLowerCase().startsWith('tổng')) || worksheet.rowCount;
	const totalStyle = worksheet.getRow(originalTotalRow);
	const normalDataStyle = worksheet.getRow(Math.min(3, originalTotalRow - 1));
	const totalFonts = Array.from({ length: headers.length }, (_, index) => ({
		...totalStyle.getCell(index + 1).font,
	}));
	const totalAlignments = Array.from({ length: headers.length }, (_, index) => ({
		...totalStyle.getCell(index + 1).alignment,
	}));
	const normalDataAlignments = Array.from({ length: headers.length }, (_, index) => ({
		...normalDataStyle.getCell(index + 1).alignment,
	}));
	const normalDataHeight = normalDataStyle.height;

	for (let row = 2; row <= worksheet.rowCount; row += 1) {
		worksheet.getRow(row).eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
	}

	const data = Array.isArray(records) ? records : [];
	renderForm1Rows(worksheet, data);
	for (let rowNumber = 2; rowNumber < Math.max(originalTotalRow, data.length + 2); rowNumber += 1) {
		const dataRow = worksheet.getRow(rowNumber);
		removeDataRowFill(dataRow, headers.length);
		applyDataRowFont(dataRow, NORMAL_DATA_FONT, headers.length);
		applyDataRowAlignment(dataRow, normalDataAlignments, headers.length);
		applyDataRowHeight(dataRow, normalDataHeight);
	}

	const totalRowNumber = Math.max(originalTotalRow, data.length + 2);
	const totalRow = worksheet.getRow(totalRowNumber);
	copyRowStyle(totalStyle, totalRow);
	for (let column = 1; column <= headers.length; column += 1) {
		totalRow.getCell(column).font = { ...totalFonts[column - 1] };
	}
	applyDataRowAlignment(totalRow, totalAlignments, headers.length);
	totalRow.getCell(1).value = 'Tổng';
	for (let column = 1; column <= headers.length; column += 1) {
		totalRow.getCell(column).value = column === 1 ? 'Tổng' : null;
		totalRow.getCell(column).fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFF4B183' },
		};
	}
	worksheet.autoFilter = { from: 'A1', to: `${worksheet.getColumn(headers.length).letter}${Math.max(1, data.length + 1)}` };

	return workbook;
}

module.exports = { createQuyTrinhExcelFile, valueToText };
