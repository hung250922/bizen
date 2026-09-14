const axios = require('axios');

const { getTenantToken } = require('../controllers/larksuite');

const {
	createQuyTrinhExcelFile,
	valueToText,
} = require('../utils/export_quy_trinh_excel/exportQuyTrinhExcel');

const {
	createForm2PRFile,
} = require('../utils/export_quy_trinh_excel/exportForm2PR');

const {
	createForm3POTFile,
} = require('../utils/export_quy_trinh_excel/exportForm3POT');

const {
	createForm4POFile,
} = require('../utils/export_quy_trinh_excel/exportForm4PO');

const {
	createForm5POFile,
} = require('../utils/export_quy_trinh_excel/exportForm5PO');

const BASE_ID = 'TO6Zw7lxJi1hFtkcCetjcct5pNc';

const TABLE_IDS = {
	1: 'tbl0DJNU6sWrLGAA',
	2: 'tbl0DJNU6sWrLGAA',
	3: 'tblmDbzHvDxpffhD',
	4: 'tbltXo4LNSuvs2ys',
	5: 'tbltXo4LNSuvs2ys',
};

const OPTION_TABLE_ID = 'tblcesBeBMwmAFFn';
const UNIT_OPTIONS_TABLE_ID = 'tblrH9yxAHbqantC';
const PO_OPTIONS_TABLE_ID = 'tbltXo4LNSuvs2ys';

function parseDateKey(value) {
	const raw = valueToText(value);

	if (!raw) return null;

	if (/^\d{10,}$/.test(raw)) {
		const date = new Date(Number(raw));

		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}

	const trimmed = raw.trim();

	const ddmmyyyy = trimmed.match(
		/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
	);

	if (ddmmyyyy) {
		const [, day, month, year] = ddmmyyyy;

		const date = new Date(
			Number(year),
			Number(month) - 1,
			Number(day)
		);

		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}

	const yyyymmdd = trimmed.match(
		/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/
	);

	if (yyyymmdd) {
		const [, year, month, day] = yyyymmdd;

		const date = new Date(
			Number(year),
			Number(month) - 1,
			Number(day)
		);

		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}

	const date = new Date(trimmed);

	if (!Number.isNaN(date.getTime())) {
		return date;
	}

	return null;
}

function dateKey(value) {
	const date = parseDateKey(value);

	if (!date) return '';

	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Ho_Chi_Minh',
	}).format(date);
}

function normalizeFieldName(name) {
	return String(name)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function getNormalizedField(fields, normalizedName) {
	const fieldName = Object.keys(fields).find(
		(name) => normalizeFieldName(name) === normalizedName
	);

	return fieldName ? fields[fieldName] : undefined;
}

function normalizeClientCode(value) {
	return valueToText(value).trim().toLowerCase();
}

async function getOptionMap(token) {
	const options = new Map();

	for (const tableId of [
		OPTION_TABLE_ID,
		UNIT_OPTIONS_TABLE_ID,
		PO_OPTIONS_TABLE_ID,
	]) {
		const url =
			`https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}` +
			`/tables/${tableId}/fields`;
		const response = await axios.get(url, {
			params: { page_size: 100 },
			headers: { Authorization: `Bearer ${token}` },
		});

		for (const field of response.data?.data?.items || []) {
			for (const option of field.property?.options || []) {
				options.set(option.id, String(option.name).trim());
			}
		}
	}

	return options;
}

function replaceOptionIds(value, optionMap) {
	if (typeof value === 'string') {
		return optionMap.get(value) || value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => replaceOptionIds(item, optionMap));
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				replaceOptionIds(item, optionMap),
			])
		);
	}

	return value;
}

function getForm4ReceivingDate(fields) {
	const dateField = Object.keys(fields).find((name) => {
		const normalized = normalizeFieldName(name);

		return (
			normalized.includes('ngaygiomuonnhanhang') ||
			normalized.includes('ngaygiomuonnhan') ||
			normalized.includes('ngaynhanhang')
		);
	});

	return dateField
		? fields[dateField]
		: undefined;
}

async function searchRecords(token, tableId) {
	const url =
		`https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${tableId}/records`;
	const records = [];
	const recordIds = new Set();
	const pageTokens = new Set();
	let pageToken;

	do {
		if (pageToken && pageTokens.has(pageToken)) break;
		if (pageToken) pageTokens.add(pageToken);

		const response = await axios.get(url, {
			params: {
				page_size: 500,
				...(pageToken ? { page_token: pageToken } : {}),
			},
			headers: { Authorization: `Bearer ${token}` },
		});

		if (response.data?.code && response.data.code !== 0) {
			throw new Error(
				response.data.msg || 'Lark search thất bại.'
			);
		}

		for (const record of response.data?.data?.items || []) {
			if (record.record_id && recordIds.has(record.record_id)) continue;
			if (record.record_id) recordIds.add(record.record_id);
			records.push(record);
		}

		const nextPageToken = response.data?.data?.has_more
			? response.data.data.page_token
			: undefined;
		if (!nextPageToken || nextPageToken === pageToken) break;
		pageToken = nextPageToken;
	} while (pageToken);

	return records;
}

module.exports = (router) => {
	router.post(
		'/export_excel_file/quy_trinh',
		async (req, res) => {
			try {
				const template = Number(
					req.body?.template
				);

				const {
					client_code: clientCode,
					client_codes:
						requestClientCodes,
					all_clients: allClients,
					fromDate,
					toDate,
				} = req.body || {};

				const clientCodes =
					Array.isArray(
						requestClientCodes
					)
						? requestClientCodes.filter(
								Boolean
							)
						: clientCode
							? [clientCode]
							: [];

				const useAllClients =
					allClients === true ||
					allClients === 'true';

				if (!TABLE_IDS[template]) {
					return res.status(400).json({
						error:
							'Hiện chỉ hỗ trợ Form 1, Form 2, Form 3, Form 4 và Form 5.',
					});
				}

				if (
					(!useAllClients &&
						clientCodes.length === 0) ||
					!fromDate ||
					!toDate ||
					fromDate > toDate
				) {
					return res.status(400).json({
						error:
							'Thông tin xuất Excel không hợp lệ.',
					});
				}

				const token =
					await getTenantToken();

				if (!token) {
					return res.status(502).json({
						error:
							'Không lấy được tenant token Lark.',
					});
				}

				const optionMap =
					await getOptionMap(token);

				const records = (
					await searchRecords(
						token,
						TABLE_IDS[template]
					)
				).map((record) => ({
					...record,
					fields: replaceOptionIds(
						record.fields || {},
						optionMap
					),
				}));

				const filtered =
					records.filter((record) => {
						const fields =
							record.fields || {};

						if (
							template !== 4 &&
							template !== 5 &&
							!useAllClients &&
							clientCodes.length > 0 &&
							!clientCodes
								.map(normalizeClientCode)
								.includes(
									normalizeClientCode(
										getNormalizedField(
											fields,
											'khachhang'
										)
									)
								)
						) {
							return false;
						}

						const dateValue =
							template === 4 ||
							template === 5
								? getForm4ReceivingDate(
										fields
									)
								: getNormalizedField(
										fields,
										'ngay'
									);

						if (
							(template === 4 ||
								template === 5) &&
							dateValue == null
						) {
							return true;
						}

						const date =
							dateKey(dateValue);

						if (
							(template === 4 ||
								template === 5) &&
							!date
						) {
							return true;
						}

						return (
							date >= fromDate &&
							date <= toDate
						);
					});

				if (
					(template === 3 ||
						template === 4 ||
						template === 5) &&
					filtered.length === 0
				) {
					return res.status(404).json({
						error:
							`Không có dữ liệu Form ${template} từ Lark trong khoảng ngày đã chọn.`,
					});
				}

				let workbook;

				if (template === 2) {
					workbook =
						await createForm2PRFile(
							filtered
						);
				} else if (template === 3) {
					workbook =
						await createForm3POTFile(
							filtered
						);
				} else if (template === 4) {
					workbook =
						await createForm4POFile(
							filtered
						);
				} else if (template === 5) {
					workbook =
						await createForm5POFile(
							filtered
						);
				} else {
					workbook =
						await createQuyTrinhExcelFile(
							template,
							filtered
						);
				}

				const safeClient =
					String(
						useAllClients
							? 'Tat_ca_cong_ty'
							: clientCodes.join(
									'_'
								)
					).replace(
						/[\\/:*?"<>|]/g,
						'_'
					);

				const fileName =
					`Mau_${template}_${safeClient}_${fromDate}_${toDate}.xlsx`;

				res.setHeader(
					'Content-Type',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				);

				res.setHeader(
					'Content-Disposition',
					`attachment; filename="${fileName}"`
				);

				await workbook.xlsx.write(res);

				return res.end();
			} catch (error) {
				console.error(
					'EXPORT QUY TRINH EXCEL ERROR:',
					error?.response?.data ||
						error
				);

				return res.status(500).json({
					error:
						error.message ||
						'Xuất Excel thất bại.',
				});
			}
		}
	);
};