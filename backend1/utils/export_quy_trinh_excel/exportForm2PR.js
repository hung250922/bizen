const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const { valueToText } = require('./exportQuyTrinhExcel');

const TEMPLATE_FILE = 'form_mau_2_PR.xlsx';
const HEADERS = [
	'Mã SO',
	'Mã PR',
	'Trạng thái',
	'Ngày',
	'Nguyên vật liệu sản xuất',
	'Bếp',
	'Khách hàng',
	'Ca',
	'Site ăn',
	'Cơ cấu suất ăn',
	'Cơ cấu menu',
	'Món ăn BOM',
	'Số lượng cô Nga duyệt đặt hàng',
	'Nguyên vật liệu',
	'Nguyên vật liệu sản xuất',
];

const FIELD_ALIASES = {
	'Mã SO': ['Mã SO'],
	'Mã PR': ['Mã PR'],
	'Trạng thái': ['Trạng thái'],
	'Ngày': ['Ngày'],
	'Nguyên vật liệu sản xuất': ['Nguyên vật liệu sản xuất'],
	'Bếp': ['Bếp'],
	'Khách hàng': ['Khách hàng'],
	'Ca': ['Ca'],
	'Site ăn': ['Danh sách các site', 'Site ăn'],
	'Cơ cấu suất ăn': ['Cơ cấu suất ăn'],
	'Cơ cấu menu': ['Cơ cấu menu'],
	'Món ăn BOM': ['Món ăn BOM', 'Món ăn'],
	'Số lượng cô Nga duyệt đặt hàng': ['Số lượng cô Nga duyệt đặt hàng'],
	'Nguyên vật liệu': ['Nguyên vật liệu', 'Nguyên vật liệu BOM'],
};

function normalizeFieldName(name) {
	return String(name)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function getField(fields, header) {
	if (header === 'Nguyên vật liệu sản xuất') {
		const material = getTextField(fields, ['Nguyên vật liệu sản xuất']);
		if (material && material !== '0') return material;
		return joinParts(
			getTextField(fields, ['Nguyên vật liệu']),
			getTextField(fields, ['Khối lượng yêu cầu sản xuất']),
			getTextField(fields, ['Đơn vị tính mua hàng', 'Đơn vị tính quy đổi']),
		);
	}
	if (header === 'Nguyên vật liệu') {
		return joinParts(
			getTextField(fields, ['Nguyên vật liệu', 'Nguyên vật liệu BOM']),
			getTextField(fields, ['Định mức nguyên liệu']),
			getTextField(fields, ['Đơn vị tính']),
		);
	}

	const aliases = FIELD_ALIASES[header] || [header];
	const fieldName = aliases.find((name) => fields[name] != null)
		|| Object.keys(fields).find((name) => aliases.some((alias) => (
			normalizeFieldName(name) === normalizeFieldName(alias) && fields[name] != null
		)));
	const value = fieldName ? valueToText(fields[fieldName]) : '';
	if (header === 'Nguyên vật liệu sản xuất' && value === '0') return '';
	if (header === 'Site ăn') return value.replace(/(?:,\s*)+$/, '');
	return value;
}

function getTextField(fields, aliases) {
	const fieldName = aliases.find((name) => fields[name] != null)
		|| Object.keys(fields).find((name) => aliases.some((alias) => (
			normalizeFieldName(name) === normalizeFieldName(alias) && fields[name] != null
		)));
	return fieldName ? valueToText(fields[fieldName]) : '';
}

function joinParts(...parts) {
	return parts.filter((part) => part && part !== '0').join(' ').trim();
}

function getGroupName(fields) {
	return getTextField(fields, ['Nguyên vật liệu', 'Nguyên vật liệu BOM'])
		|| getTextField(fields, ['Nguyên vật liệu sản xuất'])
		|| 'Khác';
}

function parseDate(value) {
	const raw = valueToText(value);
	if (!raw) return raw;
	const timestamp = /^\d{10,}$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
	if (Number.isNaN(timestamp.getTime())) return raw;
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Ho_Chi_Minh',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(timestamp);
}

function copyRowStyle(source, target) {
	target.height = source.height;
	source.eachCell({ includeEmpty: true }, (cell, column) => {
		target.getCell(column).style = { ...cell.style };
		target.getCell(column).numFmt = cell.numFmt;
	});
}

function applyTotalRowStyle(row, source, columnCount) {
	copyRowStyle(source, row);
	const totalFill = { ...source.getCell(1).fill };
	for (let column = 1; column <= columnCount; column += 1) {
		row.getCell(column).fill = { ...totalFill };
	}
}

function groupRecords(records) {
	const groups = new Map();
	for (const record of records) {
		const fields = record.fields || record;
		const name = getGroupName(fields);
		if (!groups.has(name)) groups.set(name, []);
		groups.get(name).push(fields);
	}
	return groups;
}

function renderDetailRow(row, fields) {
	HEADERS.forEach((header, index) => {
		const value = header === 'Ngày'
			? parseDate(getField(fields, header))
			: getField(fields, header);
		row.getCell(index + 1).value = value;
	});
}

async function createForm2PRFile(records) {
	const filePath = path.join(__dirname, '../../public/excelTemplates', TEMPLATE_FILE);
	if (!fs.existsSync(filePath)) throw new Error(`Không tìm thấy ${TEMPLATE_FILE}.`);

	const workbook = new Excel.Workbook();
	await workbook.xlsx.readFile(filePath);
	const worksheet = workbook.worksheets[0];
	const data = Array.isArray(records) ? records : [];
	if (data.length === 0) return workbook;

	const originalMerges = [...worksheet.model.merges];
	originalMerges.forEach((merge) => worksheet.unMergeCells(merge));
	const groupStyle = worksheet.getRow(2);
	const detailStyle = worksheet.getRow(3);
	const totalStyle = worksheet.getRow(12);
	const statusFill = { ...worksheet.getCell('C3').fill };

	for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
		worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
	}

	let rowNumber = 2;
	for (const [groupName, fieldsList] of groupRecords(data)) {
		const groupRow = worksheet.getRow(rowNumber);
		copyRowStyle(groupStyle, groupRow);
		groupRow.getCell(1).value = groupName;
		worksheet.mergeCells(`A${rowNumber}:J${rowNumber}`);
		rowNumber += 1;

		for (const fields of fieldsList) {
			const detailRow = worksheet.getRow(rowNumber);
			copyRowStyle(detailStyle, detailRow);
			renderDetailRow(detailRow, fields);
			detailRow.getCell(3).fill = { ...statusFill };
			rowNumber += 1;
		}
	}

	const totalRow = worksheet.getRow(rowNumber);
	applyTotalRowStyle(totalRow, totalStyle, HEADERS.length);
	totalRow.getCell(1).value = 'Tổng: ';
	for (let column = 2; column <= HEADERS.length; column += 1) {
		totalRow.getCell(column).value = null;
	}
	worksheet.autoFilter = { from: 'A1', to: `O${Math.max(1, rowNumber - 1)}` };
	return workbook;
}

module.exports = { createForm2PRFile };
