window.REC_DRIVE = window.REC_DRIVE || {};
window.REC_DRIVE.hero112 = '1bl1tu5iIVPjFW5DaBWQTlWPDVBHaM_1n';
window.REC_DRIVE.catalogPdf = 'https://drive.google.com/file/d/1BJ4-k3gZoV2afEyI7_rsECTKT8bNIt9p/view';
const rec256Views = {
  'Black/White': { view1: '1Isu2X-bLFyCfIxApIWePmYwA433vDUL6', view2: '1GJziifcr1QsTsIE0Nx58b_Ygoo1REcby', view3: '15H3mh6OQy0MRWgP8ce6HlMzESF7D5so0' },
  'Dark Mocha/Desert': { view1: '1U5ZhH7beyUhdNPrkglM9uYN_Mn60NMty', view2: '1ecPJ3aOxQgYhgDgWUpb9hkLFxjwBdNkE', view3: '1VzY6dbXBPSv7nVCUk8VBSXVadDynKGXo' },
  'Midnight Navy/White': { view1: '1rbXaAeehjaEJwbCjxb9_PGq1wqVfRkxh', view2: '16cKUdIvcPYoGJ6BDSLl_46_AHJo9CKEp', view3: '1qhW2-lJgb65Ebsaadg328kXgjGz4TeeT' },
  'Dusty Red/White': { view1: '19f7qgmOeSOe2wz5lVXpiMUcpKHqDXu9g', view2: '12ME32-6yBAuFIuc6BbRfWRKvIXZDA-uu', view3: '1Qg-aMZI0CacPljosuybqyZzNyS-0gamu' },
  'Dusty Blue/White': { view1: '1neJfIgWTEobYub3W1v-Wtnj9kdK_HdAD', view2: '1--xrCeGQBeuWxx43zKYhYlqxXb7tSULd', view3: '1a5r_CU4PCQWnZKLmElnmYQ63kWgRR3xs' },
  'Red/White': { view1: '1q2mMO-bWFhowjIiEFuncU5UMMHXIk-xN', view3: '13j7Rcl9G4mYn6a41XlofVeAx-0AtzX1C' },
  'Navy/White': { view1: '1YXsIMhLZLUjcR94hncAfS8oWRXsMeGLV', view3: '1H9819oitkX8fiNzYQ6itdiWyF8w_yPVD' },
  'Pale Peach/Maroon': { view1: '1rIgbq7Nan8Tb9n6yMbIzoKRfGWGv8Cd0', view3: '1UfWe8MGBNXVXCONZcL1xVTD-zlcAqQjD' },
  'Birch/Black': { view1: '1PjQzK3QZEM-RBUtPucHoWmEC8U05G9LX', view3: '1ZtN8c2sNpe-FiBgzun-F3MsRJWbQuOdE' },
  'Dark Orange/Black': { view1: '1B0r5QLr83z5tjuvAYto8SwuwEF457BNg', view3: '19cvjnKFmKMP8qXWrHKmCGPFfGHdHlDrv' },
  'Navy/Red': { view1: '1BfU8sCdvWs-Q-CU3pzDmmC3PFCmQjCma', view3: '1vKBcHKTe3Ez5sHCXlX_XoqVOrIa5WF7N' },
  'Charcoal/White': { view1: '1nzoBTyGeX27G2fGIZ1ARv_ZvqaisciBX', view3: '1_ci4dcGIV3o0U0g0yUEilWDUGgHwdYwi' },
  'Loden/Gold': { view1: '1joZVoNfyK2RDBjt20KQaZFvialQyrosw', view3: '11GESU5YQR2blM7Gn4yvC3fBLVwyz6lBc' },
  'Black/Black': { view1: '10-ZzBJnCwwtEVoUTGka0joyJ_MLfuiZ5', view3: '1WSOgf8EMKif8kqW35G4-X6eCpPN4eKQ4' },
  'Cardinal/White': { view1: '1l9qUbfBOLKGbLr1FNbbn0prwDfhxrgv-', view3: '1vnBdtyMqijBmZjemtlLzCXQnelfrITK1' },
  'Biscuit/Black': { view1: '1ZdUOnXneHNvtgv_9XWWjw9IIptnVXdMR', view3: '1KQja1MY7SfcWFY5pRPVzf2qdaPhXUVdt' }
};
if (Array.isArray(window.REC_DRIVE.assets256)) {
  window.REC_DRIVE.assets256 = window.REC_DRIVE.assets256.map(item => ({ ...item, ...(rec256Views[item.name] || {}) }));
}
