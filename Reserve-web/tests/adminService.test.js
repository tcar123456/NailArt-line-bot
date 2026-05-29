/**
 * tests/adminService.test.js
 * adminService.gs — 後台設定資料解析與準備邏輯的 Jest 測試
 *
 * 原始碼位於 rear-end-fire/modular/adminService.gs。
 * handleGetAdminSettings  的行解析邏輯：將試算表 rows 轉為結構化 settings 物件。
 * handleUpdateAdminSettings 的資料準備邏輯：將 settings 物件轉回試算表 rows。
 * 兩段邏輯皆為純計算，無 GAS SpreadsheetApp 依賴，可直接在 Node 環境驗證。
 * 執行方式：npm test
 */

'use strict';

// ==================== 從 adminService.gs 提取的純函式 ====================
// handleGetAdminSettings 的行解析邏輯提取為獨立可測試函式

/**
 * 將試算表行資料解析為結構化設定物件
 * @param {Array<Array>} rows - 試算表行陣列（不含標題列）
 * @returns {{ services, removals, extension }}
 */
function parseAdminSettingsRows(rows) {
  const settings = {
    services: [],
    removals: [],
    extension: {
      enabled:    false,
      quantities: []
    }
  };

  rows.forEach(row => {
    const type    = row[0];
    const id      = row[1];
    const name    = row[2];
    const enabled = row[3] === true || row[3] === 'TRUE';
    const sort    = row[4] || 0;

    const item = { id: String(id), name, enabled, sort };

    switch (type) {
      case 'SERVICE':
        settings.services.push(item);
        break;
      case 'REMOVAL':
        settings.removals.push(item);
        break;
      case 'EXTENSION':
        settings.extension.enabled = enabled;
        settings.extension.id = id;
        break;
      case 'EXTENSION-Q':
        settings.extension.quantities.push(item);
        break;
    }
  });

  settings.services.sort((a, b) => a.sort - b.sort);
  settings.extension.quantities.sort((a, b) => a.sort - b.sort);

  return settings;
}

/**
 * 將結構化設定物件轉換為試算表行陣列（對應 handleUpdateAdminSettings 的 newData 準備邏輯）
 * @param {{ services, removals, extension }} settings
 * @returns {Array<Array>}
 */
function prepareAdminSettingsData(settings) {
  const newData = [];

  if (settings.services && Array.isArray(settings.services)) {
    settings.services.forEach((service, index) => {
      newData.push([
        'SERVICE',
        service.id,
        service.name,
        service.enabled,
        service.sort || (index + 1)
      ]);
    });
  }

  if (settings.removals && Array.isArray(settings.removals)) {
    settings.removals.forEach((removal, index) => {
      newData.push([
        'REMOVAL',
        removal.id,
        removal.name,
        removal.enabled,
        index + 1
      ]);
    });
  }

  if (settings.extension) {
    newData.push([
      'EXTENSION',
      settings.extension.id || 'EXT10001',
      '延甲功能',
      settings.extension.enabled,
      1
    ]);

    if (settings.extension.quantities && Array.isArray(settings.extension.quantities)) {
      settings.extension.quantities.forEach((quantity, index) => {
        newData.push([
          'EXTENSION-Q',
          quantity.id,
          quantity.name,
          quantity.enabled,
          quantity.sort || (index + 1)
        ]);
      });
    }
  }

  return newData;
}

// ==================== parseAdminSettingsRows — SERVICE ====================

describe('parseAdminSettingsRows — SERVICE 類型', () => {
  it('單筆 SERVICE 行加入 services 陣列', () => {
    const rows   = [['SERVICE', 'SVC001', '單色', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('單色');
  });

  it('SERVICE 的 id 轉為字串', () => {
    const rows   = [['SERVICE', 1001, '單色', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(typeof result.services[0].id).toBe('string');
    expect(result.services[0].id).toBe('1001');
  });

  it('enabled = true（布林）視為啟用', () => {
    const rows   = [['SERVICE', 'SVC001', '單色', true, 1]];
    expect(parseAdminSettingsRows(rows).services[0].enabled).toBe(true);
  });

  it('enabled = "TRUE"（字串）也視為啟用', () => {
    const rows   = [['SERVICE', 'SVC002', '貓眼', 'TRUE', 2]];
    expect(parseAdminSettingsRows(rows).services[0].enabled).toBe(true);
  });

  it('enabled = false 視為停用', () => {
    const rows   = [['SERVICE', 'SVC003', '暈染', false, 3]];
    expect(parseAdminSettingsRows(rows).services[0].enabled).toBe(false);
  });

  it('enabled = "FALSE"（字串）視為停用', () => {
    const rows   = [['SERVICE', 'SVC003', '暈染', 'FALSE', 3]];
    expect(parseAdminSettingsRows(rows).services[0].enabled).toBe(false);
  });

  it('多筆 SERVICE 依 sort 升冪排序', () => {
    const rows = [
      ['SERVICE', 'SVC003', '暈染', true, 3],
      ['SERVICE', 'SVC001', '單色', true, 1],
      ['SERVICE', 'SVC002', '貓眼', true, 2]
    ];
    const sorts = parseAdminSettingsRows(rows).services.map(s => s.sort);
    expect(sorts).toEqual([1, 2, 3]);
  });

  it('SERVICE 不加入 removals', () => {
    const rows = [['SERVICE', 'SVC001', '單色', true, 1]];
    expect(parseAdminSettingsRows(rows).removals).toHaveLength(0);
  });
});

// ==================== parseAdminSettingsRows — REMOVAL ====================

describe('parseAdminSettingsRows — REMOVAL 類型', () => {
  it('單筆 REMOVAL 行加入 removals 陣列', () => {
    const rows   = [['REMOVAL', 'RMV001', '需要', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(result.removals).toHaveLength(1);
    expect(result.removals[0].name).toBe('需要');
  });

  it('REMOVAL 不加入 services', () => {
    const rows = [['REMOVAL', 'RMV001', '需要', true, 1]];
    expect(parseAdminSettingsRows(rows).services).toHaveLength(0);
  });

  it('多筆 REMOVAL 均加入 removals', () => {
    const rows = [
      ['REMOVAL', 'RMV001', '需要', true,  1],
      ['REMOVAL', 'RMV002', '不用', false, 2]
    ];
    expect(parseAdminSettingsRows(rows).removals).toHaveLength(2);
  });
});

// ==================== parseAdminSettingsRows — EXTENSION ====================

describe('parseAdminSettingsRows — EXTENSION 類型', () => {
  it('EXTENSION 行設定 extension.enabled = true', () => {
    const rows = [['EXTENSION', 'EXT10001', '延甲功能', true, 1]];
    expect(parseAdminSettingsRows(rows).extension.enabled).toBe(true);
  });

  it('EXTENSION 行設定 extension.id', () => {
    const rows = [['EXTENSION', 'EXT10001', '延甲功能', true, 1]];
    expect(parseAdminSettingsRows(rows).extension.id).toBe('EXT10001');
  });

  it('EXTENSION enabled = false → extension.enabled = false', () => {
    const rows = [['EXTENSION', 'EXT10001', '延甲功能', false, 1]];
    expect(parseAdminSettingsRows(rows).extension.enabled).toBe(false);
  });

  it('EXTENSION 不加入 services / removals', () => {
    const rows   = [['EXTENSION', 'EXT10001', '延甲功能', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(result.services).toHaveLength(0);
    expect(result.removals).toHaveLength(0);
  });
});

// ==================== parseAdminSettingsRows — EXTENSION-Q ====================

describe('parseAdminSettingsRows — EXTENSION-Q 類型', () => {
  it('EXTENSION-Q 行加入 extension.quantities', () => {
    const rows   = [['EXTENSION-Q', 'EQ001', '1-3 支', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(result.extension.quantities).toHaveLength(1);
    expect(result.extension.quantities[0].name).toBe('1-3 支');
  });

  it('多筆 EXTENSION-Q 依 sort 升冪排序', () => {
    const rows = [
      ['EXTENSION-Q', 'EQ003', '全部',   true, 3],
      ['EXTENSION-Q', 'EQ001', '1-3 支', true, 1],
      ['EXTENSION-Q', 'EQ002', '4-6 支', true, 2]
    ];
    const sorts = parseAdminSettingsRows(rows).extension.quantities.map(q => q.sort);
    expect(sorts).toEqual([1, 2, 3]);
  });

  it('EXTENSION-Q 不加入 services 或 removals', () => {
    const rows   = [['EXTENSION-Q', 'EQ001', '1-3 支', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(result.services).toHaveLength(0);
    expect(result.removals).toHaveLength(0);
  });
});

// ==================== parseAdminSettingsRows — 混合類型 ====================

describe('parseAdminSettingsRows — 混合類型整合', () => {
  const FULL_ROWS = [
    ['SERVICE',     'SVC001', '單色',   true,  1],
    ['SERVICE',     'SVC002', '貓眼',   true,  2],
    ['REMOVAL',     'RMV001', '需要',   true,  1],
    ['REMOVAL',     'RMV002', '不用',   false, 2],
    ['EXTENSION',   'EXT001', '延甲功能', true, 1],
    ['EXTENSION-Q', 'EQ001',  '1-3 支',  true, 1],
    ['EXTENSION-Q', 'EQ002',  '4-6 支',  true, 2]
  ];

  it('services 數量為 2', () => {
    expect(parseAdminSettingsRows(FULL_ROWS).services).toHaveLength(2);
  });

  it('removals 數量為 2', () => {
    expect(parseAdminSettingsRows(FULL_ROWS).removals).toHaveLength(2);
  });

  it('extension.quantities 數量為 2', () => {
    expect(parseAdminSettingsRows(FULL_ROWS).extension.quantities).toHaveLength(2);
  });

  it('extension.enabled 為 true', () => {
    expect(parseAdminSettingsRows(FULL_ROWS).extension.enabled).toBe(true);
  });

  it('未知類型的行被忽略（不影響其他分類）', () => {
    const rows   = [['UNKNOWN', 'X001', '未知', true, 1]];
    const result = parseAdminSettingsRows(rows);
    expect(result.services).toHaveLength(0);
    expect(result.removals).toHaveLength(0);
  });

  it('空行陣列回傳預設空設定', () => {
    const result = parseAdminSettingsRows([]);
    expect(result.services).toHaveLength(0);
    expect(result.removals).toHaveLength(0);
    expect(result.extension.enabled).toBe(false);
    expect(result.extension.quantities).toHaveLength(0);
  });
});

// ==================== parseAdminSettingsRows — sort 缺省值 ====================

describe('parseAdminSettingsRows — sort 缺省值處理', () => {
  it('sort 為空字串時預設為 0', () => {
    const rows = [['SERVICE', 'SVC001', '單色', true, '']];
    expect(parseAdminSettingsRows(rows).services[0].sort).toBe(0);
  });

  it('sort 為 null 時預設為 0', () => {
    const rows = [['SERVICE', 'SVC001', '單色', true, null]];
    expect(parseAdminSettingsRows(rows).services[0].sort).toBe(0);
  });

  it('sort 為 undefined 時預設為 0', () => {
    const rows = [['SERVICE', 'SVC001', '單色', true, undefined]];
    expect(parseAdminSettingsRows(rows).services[0].sort).toBe(0);
  });
});

// ==================== prepareAdminSettingsData — 行數量 ====================

describe('prepareAdminSettingsData — 行數量', () => {
  const SETTINGS = {
    services: [
      { id: 'SVC001', name: '單色', enabled: true,  sort: 1 },
      { id: 'SVC002', name: '貓眼', enabled: false, sort: 2 }
    ],
    removals: [
      { id: 'RMV001', name: '需要', enabled: true, sort: 1 }
    ],
    extension: {
      id:         'EXT001',
      enabled:    true,
      quantities: [
        { id: 'EQ001', name: '1-3 支', enabled: true, sort: 1 },
        { id: 'EQ002', name: '4-6 支', enabled: true, sort: 2 }
      ]
    }
  };

  it('SERVICE 行數量符合 services 陣列長度', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    expect(data.filter(r => r[0] === 'SERVICE')).toHaveLength(2);
  });

  it('REMOVAL 行數量符合 removals 陣列長度', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    expect(data.filter(r => r[0] === 'REMOVAL')).toHaveLength(1);
  });

  it('恰好一列 EXTENSION 行', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    expect(data.filter(r => r[0] === 'EXTENSION')).toHaveLength(1);
  });

  it('EXTENSION-Q 行數量符合 quantities 陣列長度', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    expect(data.filter(r => r[0] === 'EXTENSION-Q')).toHaveLength(2);
  });

  it('總行數 = services + removals + 1(EXTENSION) + quantities', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    expect(data).toHaveLength(2 + 1 + 1 + 2);
  });
});

// ==================== prepareAdminSettingsData — 欄位值 ====================

describe('prepareAdminSettingsData — 欄位值正確性', () => {
  const SETTINGS = {
    services: [{ id: 'SVC001', name: '單色', enabled: true, sort: 1 }],
    removals: [{ id: 'RMV001', name: '需要', enabled: true, sort: 1 }],
    extension: { id: 'EXT001', enabled: true, quantities: [] }
  };

  it('SERVICE 行包含正確的 id', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    const row  = data.find(r => r[0] === 'SERVICE');
    expect(row[1]).toBe('SVC001');
  });

  it('SERVICE 行包含正確的 name', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    const row  = data.find(r => r[0] === 'SERVICE');
    expect(row[2]).toBe('單色');
  });

  it('SERVICE 行包含正確的 enabled', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    const row  = data.find(r => r[0] === 'SERVICE');
    expect(row[3]).toBe(true);
  });

  it('EXTENSION 行包含正確的 id', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    const row  = data.find(r => r[0] === 'EXTENSION');
    expect(row[1]).toBe('EXT001');
  });

  it('EXTENSION 無 id 時使用預設值 EXT10001', () => {
    const settings = { services: [], removals: [], extension: { enabled: false, quantities: [] } };
    const data     = prepareAdminSettingsData(settings);
    const row      = data.find(r => r[0] === 'EXTENSION');
    expect(row[1]).toBe('EXT10001');
  });

  it('EXTENSION 行的 name 固定為「延甲功能」', () => {
    const data = prepareAdminSettingsData(SETTINGS);
    const row  = data.find(r => r[0] === 'EXTENSION');
    expect(row[2]).toBe('延甲功能');
  });
});

// ==================== prepareAdminSettingsData — 邊界情況 ====================

describe('prepareAdminSettingsData — 邊界情況', () => {
  it('空 services 和 removals 時只有 EXTENSION 行', () => {
    const settings = {
      services:  [],
      removals:  [],
      extension: { id: 'EXT001', enabled: false, quantities: [] }
    };
    const data = prepareAdminSettingsData(settings);
    expect(data).toHaveLength(1);
    expect(data[0][0]).toBe('EXTENSION');
  });

  it('無 extension 時不產生 EXTENSION / EXTENSION-Q 行', () => {
    const settings = { services: [], removals: [] };
    const data     = prepareAdminSettingsData(settings);
    expect(data.some(r => r[0] === 'EXTENSION')).toBe(false);
    expect(data.some(r => r[0] === 'EXTENSION-Q')).toBe(false);
  });

  it('service 缺 sort 時使用 index+1 作為排序值', () => {
    const settings = {
      services:  [{ id: 'S1', name: '服務A', enabled: true, sort: 0 }],
      removals:  [],
      extension: { id: 'EXT001', enabled: false, quantities: [] }
    };
    const data = prepareAdminSettingsData(settings);
    const row  = data.find(r => r[0] === 'SERVICE');
    // sort=0（falsy）→ index+1 = 1
    expect(row[4]).toBe(1);
  });
});
