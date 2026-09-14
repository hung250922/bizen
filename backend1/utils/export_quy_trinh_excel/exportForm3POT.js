const Excel = require('exceljs');
const path = require('path');
const fs = require('fs');

const { valueToText } = require('./exportQuyTrinhExcel');

const TEMPLATE_PATH = path.join(
	__dirname,
	'../../public/excelTemplates/form_mau_3_POT.xlsx'
);

const SHEET_NAME =
	'3. Kế hoạch đặt hàng (PR - POT)';

const HEADERS = [
	'Mã POT',
	'Trạng thái',
	'',
	'Nguyên vật liệu',
	'Kho nhận hàng',
	'Ngày giờ muốn nhận hàng',
	'Mã PR',
	'Mã SO',
	'Ngày',
	'Ca',
	'Khách hàng',
	'Site ăn',
	'Bếp',
	'Nguyên vật liệu đầy đủ',
	'Món ăn',
	'Chu kỳ đặt hàng (ngày)',
];

const ALIASES = {
	'Mã POT': [
		'Mã POT',
		'POT',
		'Mã pot',
	],

	'Trạng thái': [
		'Trạng thái',
		'Status',
	],

	'Nguyên vật liệu': [
		'Nguyên vật liệu',
	],

	'Kho nhận hàng': [
		'Kho nhận hàng',
	],

	'Ngày giờ muốn nhận hàng': [
		'Ngày giờ muốn nhận hàng',
		'Ngày giờ muốn nhận',
		'Ngày nhận hàng',
	],

	'Mã PR': [
		'Mã PR',
	],

	'Mã SO': [
		'Mã SO',
	],

	'Ngày': [
		'Ngày',
	],

	'Ca': [
		'Ca',
	],

	'Khách hàng': [
		'Khách hàng',
	],

	'Site ăn': [
		'Danh sách các site',
		'Site ăn',
	],

	'Bếp': [
		'Bếp',
	],

	'Nguyên vật liệu đầy đủ': [
		'Nguyên vật liệu đầy đủ',
	],

	'Món ăn': [
		'Món ăn',
		'Món ăn BOM',
	],

	'Chu kỳ đặt hàng (ngày)': [
		'Chu kỳ đặt hàng (ngày)',
	],
};

const DETAIL_COLS = 16;

/* =========================================================
   BASIC
========================================================= */

function toText(value) {
	if (
		value === null ||
		value === undefined
	) {
		return '';
	}

	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return String(value).trim();
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => toText(item))
			.filter(Boolean)
			.join(', ');
	}

	if (typeof value === 'object') {
		/*
			Lark đôi khi trả object / array object.
		*/
		for (const key of [
			'text',
			'value',
			'name',
			'title',
			'code',
			'display_name',
		]) {
			if (
				value[key] !== undefined &&
				value[key] !== null
			) {
				const result =
					toText(value[key]);

				if (result) {
					return result;
				}
			}
		}

		return Object.values(value)
			.map(toText)
			.filter(Boolean)
			.join(', ');
	}

	return String(value).trim();
}

function normalizeFieldName(name) {
	return String(name)
		.normalize('NFD')
		.replace(
			/[\u0300-\u036f]/g,
			''
		)
		.toLowerCase()
		.replace(
			/[^a-z0-9]+/g,
			''
		);
}

/* =========================================================
   FIELD
========================================================= */

function findFieldName(fields, header) {
	const aliases =
		ALIASES[header] || [header];

	/* exact */
	for (const alias of aliases) {
		if (fields[alias] != null) {
			return alias;
		}
	}

	/* normalized */
	const keys =
		Object.keys(fields);

	return keys.find((key) => {
		const normalized =
			normalizeFieldName(key);

		return aliases.some(
			(alias) =>
				normalized ===
				normalizeFieldName(alias)
		);
	});
}

function getField(fields, header) {
	const fieldName =
		findFieldName(
			fields,
			header
		);

	if (!fieldName) {
		return '';
	}

	return toText(
		fields[fieldName]
	);
}

/* =========================================================
   DATE
========================================================= */

function parseDate(value) {
	if (value instanceof Date) {
		return Number.isNaN(
			value.getTime()
		)
			? null
			: new Date(
					value.getTime()
				);
	}

	const raw =
		toText(value);

	if (!raw) {
		return null;
	}

	/* Unix timestamp */
	if (/^\d{10}$/.test(raw)) {
		const date =
			new Date(
				Number(raw) * 1000
			);

		return Number.isNaN(
			date.getTime()
		)
			? null
			: date;
	}

	if (/^\d{13}$/.test(raw)) {
		const date =
			new Date(
				Number(raw)
			);

		return Number.isNaN(
			date.getTime()
		)
			? null
			: date;
	}

	/* YYYY-MM-DD */
	let match = raw.match(
		/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
	);

	if (match) {
		const [
			,
			y,
			m,
			d,
			hh,
			mm,
			ss,
		] = match;

		const date =
			new Date(
				Number(y),
				Number(m) - 1,
				Number(d),
				Number(hh || 0),
				Number(mm || 0),
				Number(ss || 0)
			);

		return Number.isNaN(
			date.getTime()
		)
			? null
			: date;
	}

	/* DD-MM-YYYY */
	match = raw.match(
		/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
	);

	if (match) {
		const [
			,
			d,
			m,
			y,
			hh,
			mm,
			ss,
		] = match;

		const date =
			new Date(
				Number(y),
				Number(m) - 1,
				Number(d),
				Number(hh || 0),
				Number(mm || 0),
				Number(ss || 0)
			);

		return Number.isNaN(
			date.getTime()
		)
			? null
			: date;
	}

	const date =
		new Date(raw);

	return Number.isNaN(
		date.getTime()
	)
		? null
		: date;
}

function formatDate(value) {
	const date =
		parseDate(value);

	if (!date) {
		return toText(value);
	}

	const dd =
		String(
			date.getDate()
		).padStart(2, '0');

	const mm =
		String(
			date.getMonth() + 1
		).padStart(2, '0');

	return `${dd}/${mm}/${date.getFullYear()}`;
}

/* =========================================================
   POT EXTRACTION
========================================================= */

function findPotInValue(value) {
	if (
		value === null ||
		value === undefined
	) {
		return '';
	}

	if (
		typeof value ===
			'string' ||
		typeof value ===
			'number'
	) {
		const text =
			String(value);

		const match =
			text.match(
				/\bPOT\d{1,4}[/-]\d{4}\b/i
			);

		return match
			? match[0]
			: '';
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const result =
				findPotInValue(item);

			if (result) {
				return result;
			}
		}

		return '';
	}

	if (
		typeof value ===
		'object'
	) {
		for (const item of Object.values(value)) {
			const result =
				findPotInValue(item);

			if (result) {
				return result;
			}
		}
	}

	return '';
}

function getPotFromFields(fields) {
	/* Ưu tiên key POT / Mã POT */
	for (const alias of [
		'Mã POT',
		'POT',
	]) {
		if (
			fields[alias] !==
			undefined
		) {
			const result =
				findPotInValue(
					fields[alias]
				);

			if (result) {
				return result;
			}
		}
	}

	/* Quét toàn bộ fields */
	for (const value of Object.values(fields)) {
		const result =
			findPotInValue(value);

		if (result) {
			return result;
		}
	}

	return '';
}

/* =========================================================
   STATUS
========================================================= */

function getRawStatus(fields) {
	return getField(
		fields,
		'Trạng thái'
	);
}

function isCompleted(fields) {
	const status =
		getRawStatus(fields)
			.toLowerCase()
			.trim();

	return (
		status.includes(
			'hoàn thành'
		) ||
		status.includes(
			'giao hàng'
		) ||
		/^\s*5\s*[-–]/.test(
			status
		) ||
		status.startsWith('5')
	);
}

function getDisplayStatus(
	fields
) {
	return isCompleted(fields)
		? 'Hoàn thành'
		: 'Chưa hoàn thành';
}

/* =========================================================
   MATERIAL
========================================================= */

function parseMaterialAmount(
	value
) {
	const raw =
		toText(value);

	const match =
		raw.match(
			/^(.*?)(?:\s+)(\d+(?:[.,]\d+)?)\s*(kg|g|gr|cái|cai|miếng|mieng|l|ml)\s*$/i
		);

	if (!match) {
		return {
			name: raw,
			amount: null,
			unit: '',
		};
	}

	return {
		name:
			match[1].trim(),

		amount:
			Number(
				match[2].replace(
					',',
					'.'
				)
			),

		unit:
			match[3],
	};
}

function formatAmount(
	amount
) {
	return Number.isInteger(
		amount
	)
		? String(amount)
		: String(
				Number(
					amount.toFixed(2)
				)
			);
}

function summarizeMaterial(
	items
) {
	const map =
		new Map();

	for (const fields of items) {
		const parsed =
			parseMaterialAmount(
				getField(
					fields,
					'Nguyên vật liệu'
				)
			);

		const name =
			parsed.name ||
			'Nguyên vật liệu';

		if (!map.has(name)) {
			map.set(name, {
				amount: 0,
				unit:
					parsed.unit,
			});
		}

		const slot =
			map.get(name);

		if (
			Number.isFinite(
				parsed.amount
			)
		) {
			slot.amount +=
				parsed.amount;
		}

		if (
			!slot.unit &&
			parsed.unit
		) {
			slot.unit =
				parsed.unit;
		}
	}

	return [...map.entries()]
		.map(
			([
				name,
				item,
			]) => {
				if (
					item.amount > 0
				) {
					return (
						`${name}: ` +
						`${formatAmount(item.amount)}` +
						`${item.unit}`
					);
				}

				return name;
			}
		)
		.join(' | ');
}

/* =========================================================
   CLONE STYLE
========================================================= */

function cloneValue(value) {
	if (
		value === null ||
		value === undefined
	) {
		return value;
	}

	if (value instanceof Date) {
		return new Date(
			value.getTime()
		);
	}

	if (
		typeof value ===
		'object'
	) {
		try {
			return JSON.parse(
				JSON.stringify(value)
			);
		} catch {
			return value;
		}
	}

	return value;
}

function snapshotRow(
	worksheet,
	rowNumber
) {
	const row =
		worksheet.getRow(
			rowNumber
		);

	const maxColumn =
		worksheet.columnCount ||
		59;

	return {
		height: row.height,
		hidden: row.hidden,
		outlineLevel:
			row.outlineLevel,

		cells: Array.from(
			{ length: maxColumn },
			(_, i) => {
				const cell =
					row.getCell(
						i + 1
					);

				return {
					font: cloneValue(
						cell.font
					),

					fill: cloneValue(
						cell.fill
					),

					border: cloneValue(
						cell.border
					),

					alignment:
						cloneValue(
							cell.alignment
						),

					protection:
						cloneValue(
							cell.protection
						),

					numFmt:
						cell.numFmt,

					style: cloneValue(
						cell.style
					),
				};
			}
		),
	};
}

function applySnapshot(
	snapshot,
	row
) {
	if (
		snapshot.height !==
			undefined &&
		snapshot.height !==
			null
	) {
		row.height =
			snapshot.height;
	}

	row.hidden =
		snapshot.hidden;

	row.outlineLevel =
		snapshot.outlineLevel;

	snapshot.cells.forEach(
		(source, i) => {
			const cell =
				row.getCell(
					i + 1
				);

			if (source.font) {
				cell.font =
					cloneValue(
						source.font
					);
			}

			if (source.fill) {
				cell.fill =
					cloneValue(
						source.fill
					);
			}

			if (source.border) {
				cell.border =
					cloneValue(
						source.border
					);
			}

			if (
				source.alignment
			) {
				cell.alignment =
					cloneValue(
						source.alignment
					);
			}

			if (
				source.protection
			) {
				cell.protection =
					cloneValue(
						source.protection
					);
			}

			if (
				source.numFmt
			) {
				cell.numFmt =
					source.numFmt;
			}

			if (source.style) {
				try {
					cell.style =
						cloneValue(
							source.style
						);
				} catch {
					/* ignore */
				}
			}
		}
	);
}

/* =========================================================
   MERGE
========================================================= */

function getMergedRanges(
	worksheet
) {
	if (
		worksheet.model &&
		Array.isArray(
			worksheet.model.merges
		)
	) {
		return [
			...worksheet.model.merges,
		];
	}

	if (
		worksheet._merges &&
		typeof worksheet._merges ===
			'object'
	) {
		return Object.keys(
			worksheet._merges
		);
	}

	return [];
}

function removeAllMerges(
	worksheet
) {
	const ranges =
		getMergedRanges(
			worksheet
		);

	for (const range of ranges) {
		try {
			worksheet.unMergeCells(
				range
			);
		} catch {
			/* ignore */
		}
	}
}

/* =========================================================
   TEMPLATE FALLBACK
========================================================= */

function getTemplatePotCodes(
	worksheet
) {
	const pot1 =
		findPotInValue(
			worksheet
				.getCell('A2')
				.value
		);

	const pot2 =
		findPotInValue(
			worksheet
				.getCell('A7')
				.value
		);

	return [
		pot1 || 'POT03/2026',
		pot2 || 'POT04/2026',
	];
}

function getTemplateDates(
	worksheet
) {
	return {
		pending: [2, 3, 4, 5]
			.map(
				(rowNumber) =>
					parseDate(
						worksheet
							.getCell(
								`F${rowNumber}`
							)
							.value
					)
			),

		completed: [7, 8, 9, 10]
			.map(
				(rowNumber) =>
					parseDate(
						worksheet
							.getCell(
								`F${rowNumber}`
							)
							.value
					)
			),
	};
}

/* =========================================================
   GROUP
========================================================= */

function groupRecords(
	records,
	templatePots
) {
	const prepared =
		records.map(
			(record, index) => {
				const fields =
					record.fields ||
					record;

				return {
					fields,
					pot:
						getPotFromFields(
							fields
						),
					completed:
						isCompleted(
							fields
						),
					index,
				};
			}
		);

	const hasRealPot =
		prepared.some(
			(item) => !!item.pot
		);

	/* =====================================================
	   Có POT thật -> group theo POT
	===================================================== */

	if (hasRealPot) {
		const groups = [];
		const map =
			new Map();

		let currentPot = '';

		for (const item of prepared) {
			if (item.pot) {
				currentPot =
					item.pot;
			}

			const pot =
				item.pot ||
				currentPot ||
				(item.completed
					? templatePots[1]
					: templatePots[0]);

			if (!map.has(pot)) {
				const group = {
					pot,
					completed:
						item.completed,
					items: [],
				};

				map.set(
					pot,
					group
				);

				groups.push(
					group
				);
			}

			map.get(
				pot
			).items.push(
				item.fields
			);
		}

		return groups;
	}

	/* =====================================================
	   Không có POT trong Lark:
	   group theo trạng thái.

	   Pending -> POT03/2026
	   Completed -> POT04/2026
	===================================================== */

	const pending = [];
	const completed = [];

	for (const item of prepared) {
		if (item.completed) {
			completed.push(
				item.fields
			);
		} else {
			pending.push(
				item.fields
			);
		}
	}

	const groups = [];

	if (pending.length) {
		groups.push({
			pot: templatePots[0],
			completed: false,
			items: pending,
		});
	}

	if (completed.length) {
		groups.push({
			pot: templatePots[1],
			completed: true,
			items: completed,
		});
	}

	return groups;
}

/* =========================================================
   WRITE DETAIL
========================================================= */

function writeDetail(
	row,
	fields,
	isFirst,
	fallbackDate
) {
	/* A - POT */
	/*
		Được ghi bên ngoài group merge.
	*/

	row.getCell(1).value =
		isFirst ? null : null;

	/* B - STATUS */

	row.getCell(2).value =
		getDisplayStatus(
			fields
		);

	/* C */

	row.getCell(3).value =
		null;

	/* D */

	row.getCell(4).value =
		getField(
			fields,
			'Nguyên vật liệu'
		) || null;

	/* E */

	row.getCell(5).value =
		getField(
			fields,
			'Kho nhận hàng'
		) || null;

	/* F */

	const receivingDate =
		parseDate(
			getField(
				fields,
				'Ngày giờ muốn nhận hàng'
			)
		);

	row.getCell(6).value =
		receivingDate ||
		fallbackDate ||
		null;

	row.getCell(6).numFmt =
		'm/d/yyyy';

	/* G */

	row.getCell(7).value =
		getField(
			fields,
			'Mã PR'
		) || null;

	/* H */

	row.getCell(8).value =
		getField(
			fields,
			'Mã SO'
		) || null;

	/* I */

	row.getCell(9).value =
		getField(
			fields,
			'Ngày'
		) || null;

	/* J */

	row.getCell(10).value =
		getField(
			fields,
			'Ca'
		) || null;

	/* K */

	row.getCell(11).value =
		getField(
			fields,
			'Khách hàng'
		) || null;

	/* L */

	row.getCell(12).value =
		getField(
			fields,
			'Site ăn'
		) || null;

	/* M */

	row.getCell(13).value =
		getField(
			fields,
			'Bếp'
		) || null;

	/* N */

	row.getCell(14).value =
		getField(
			fields,
			'Nguyên vật liệu đầy đủ'
		) || null;

	/* O */

	row.getCell(15).value =
		getField(
			fields,
			'Món ăn'
		) || null;

	/* P */

	row.getCell(16).value =
		getField(
			fields,
			'Chu kỳ đặt hàng (ngày)'
		) || null;
}

/* =========================================================
   WRITE TOTAL
========================================================= */

function writeTotal(
	row,
	items
) {
	for (
		let col = 1;
		col <= DETAIL_COLS;
		col++
	) {
		row.getCell(col).value =
			null;
	}

	row.getCell(3).value =
		'Tổng';

	row.getCell(4).value =
		summarizeMaterial(
			items
		);
}

/* =========================================================
   MAIN
========================================================= */

async function createForm3POTFile(
	records
) {
	if (
		!fs.existsSync(
			TEMPLATE_PATH
		)
	) {
		throw new Error(
			`Không tìm thấy file mẫu Form 3:\n${TEMPLATE_PATH}`
		);
	}

	const workbook =
		new Excel.Workbook();

	await workbook.xlsx.readFile(
		TEMPLATE_PATH
	);

	const worksheet =
		workbook.getWorksheet(
			SHEET_NAME
		);

	if (!worksheet) {
		throw new Error(
			`Không tìm thấy sheet "${SHEET_NAME}".`
		);
	}

	/* =====================================================
	   ĐỌC STYLE + GIÁ TRỊ FALLBACK CỦA TEMPLATE
	===================================================== */

	const headerStyle =
		snapshotRow(
			worksheet,
			1
		);

	const pendingFirstStyle =
		snapshotRow(
			worksheet,
			2
		);

	const pendingDetailStyle =
		snapshotRow(
			worksheet,
			3
		);

	const pendingTotalStyle =
		snapshotRow(
			worksheet,
			6
		);

	const completedFirstStyle =
		snapshotRow(
			worksheet,
			7
		);

	const completedDetailStyle =
		snapshotRow(
			worksheet,
			8
		);

	const completedTotalStyle =
		snapshotRow(
			worksheet,
			11
		);

	const templatePots =
		getTemplatePotCodes(
			worksheet
		);

	const templateDates =
		getTemplateDates(
			worksheet
		);

	/* =====================================================
	   HEADER
	===================================================== */

	for (
		let col = 1;
		col <= HEADERS.length;
		col++
	) {
		worksheet
			.getRow(1)
			.getCell(col)
			.value =
			HEADERS[col - 1] ||
			null;
	}

	/* =====================================================
	   QUAN TRỌNG:
	   XÓA TOÀN BỘ MERGE CŨ
	===================================================== */

	removeAllMerges(
		worksheet
	);

	/* =====================================================
	   QUAN TRỌNG:
	   XÓA TOÀN BỘ ROW CŨ SAU HEADER

	   Chính lỗi này làm output trước đó
	   còn rows 16-27 của template.
	===================================================== */

	const oldRowCount =
		worksheet.rowCount;

	if (oldRowCount > 1) {
		worksheet.spliceRows(
			2,
			oldRowCount - 1
		);
	}

	/* =====================================================
	   GROUP DATA
	===================================================== */

	const data =
		Array.isArray(records)
			? records
			: [];

	const groups =
		groupRecords(
			data,
			templatePots
		);

	/* =====================================================
	   WRITE
	===================================================== */

	let rowNumber = 2;

	for (const group of groups) {
		const {
			pot,
			completed,
			items,
		} = group;

		const detailStart =
			rowNumber;

		/* ================================================
		   DETAIL
		================================================ */

		items.forEach(
			(fields, index) => {
				const row =
					worksheet.getRow(
						rowNumber
					);

				const style =
					completed
						? index === 0
							? completedFirstStyle
							: completedDetailStyle
						: index === 0
							? pendingFirstStyle
							: pendingDetailStyle;

				applySnapshot(
					style,
					row
				);

				const fallbackDates =
					completed
						? templateDates.completed
						: templateDates.pending;

				const fallbackDate =
					fallbackDates[
						index
					] || null;

				writeDetail(
					row,
					fields,
					index === 0,
					fallbackDate
				);

				rowNumber++;
			}
		);

		/* ================================================
		   GHI MÃ POT Ở Ô TOP-LEFT
		================================================ */

		const detailEnd =
			rowNumber - 1;

		if (pot) {
			const potCell =
				worksheet
					.getRow(
						detailStart
					)
					.getCell(1);

			potCell.value =
				pot;

			/*
				Chỉ merge A của detail.
			*/

			if (
				detailEnd >
				detailStart
			) {
				worksheet.mergeCells(
					`A${detailStart}:A${detailEnd}`
				);
			}

			potCell.alignment = {
				...(potCell.alignment ||
					{}),
				horizontal:
					'center',
				vertical:
					'middle',
				wrapText: true,
			};
		}

		/* ================================================
		   TOTAL
		================================================ */

		const totalRow =
			worksheet.getRow(
				rowNumber
			);

		applySnapshot(
			completed
				? completedTotalStyle
				: pendingTotalStyle,
			totalRow
		);

		writeTotal(
			totalRow,
			items
		);

		/*
			Không merge A vào total.
		*/

		rowNumber++;
	}

	/* =====================================================
	   HEADER STYLE LẠI
	===================================================== */

	applySnapshot(
		headerStyle,
		worksheet.getRow(1)
	);

	/* =====================================================
	   AUTOFILTER
	===================================================== */

	worksheet.autoFilter = {
		from: {
			row: 1,
			column: 1,
		},

		to: {
			row: Math.max(
				1,
				rowNumber - 1
			),

			column:
				DETAIL_COLS,
		},
	};

	/* =====================================================
	   CỘT N ẨN
	===================================================== */

	worksheet.getColumn(14).hidden =
		true;

	return workbook;
}

module.exports = {
	createForm3POTFile,
};