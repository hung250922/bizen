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

function getForm4ReceivingDate(fields) {
	const exactNames = [
		'Ngày giờ muốn nhận hàng',
		'Ngày giờ muốn nhận',
		'Ngày nhận hàng',
	];

	for (const name of exactNames) {
		if (fields[name] != null) {
			return fields[name];
		}
	}

	const dateField = Object.keys(fields).find((name) => {
		const normalized = normalizeFieldName(name);

		return (
			normalized.includes('ngaygiomuonnhanhang') ||
			normalized.includes('ngaynhanhang')
		);
	});

	return dateField
		? fields[dateField]
		: undefined;
}

async function searchRecords(
	token,
	tableId,
	clientCodes,
	filterByClient = true
) {
	const url =
		`https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${tableId}/records/search`;

	const records = [];
	let pageToken;

	do {
		const body = {
			page_size: 500,

			...(pageToken
				? {
						page_token: pageToken,
					}
				: {}),

			...(filterByClient &&
			clientCodes.length > 0
				? {
						filter: {
							conditions: clientCodes.map(
								(clientCode) => ({
									field_name: 'Khách hàng',
									operator: 'is',
									value: [clientCode],
								})
							),
							conjunction: 'or',
						},
					}
				: {}),
		};

		const response = await axios.post(
			url,
			body,
			{
				headers: {
					Authorization:
						`Bearer ${token}`,
					'Content-Type':
						'application/json',
				},
			}
		);

		if (
			response.data?.code &&
			response.data.code !== 0
		) {
			throw new Error(
				response.data.msg ||
					'Lark search thất bại.'
			);
		}

		records.push(
			...(response.data?.data?.items || [])
		);

		pageToken =
			response.data?.data?.has_more
				? response.data.data.page_token
				: undefined;
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

				const records =
					await searchRecords(
						token,
						TABLE_IDS[template],
						clientCodes,
						!useAllClients &&
							template !== 4 &&
							template !== 5
					);

				const filtered =
					records.filter((record) => {
						const fields =
							record.fields || {};

						const dateValue =
							template === 4 ||
							template === 5
								? getForm4ReceivingDate(
										fields
									)
								: fields['Ngày'];

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