import type { AuditRecord, ChecklistItemDef } from '../types';

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * CEMS Audit Supervisor - Google Sheets + Google Drive Photo Sync Webhook
 * วิธีติดตั้ง:
 * 1. สร้าง Google Sheet ใหม่ -> เมนู Extensions (ส่วนขยาย) -> Apps Script
 * 2. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้ลงไป กด Save
 * 3. กด Deploy -> New deployment -> เลือก Type เป็น "Web app"
 *    - Execute as: Me
 *    - Who has access: Anyone (หรือ Anyone within your organization)
 * 4. กด Deploy (หาก Google ถามขอสิทธิ์เข้าถึง Drive/Sheets ให้กด Allow)
 * 5. คัดลอก Web App URL มาวางในหน้าตั้งค่าของ Web App แล้วกด "ทดสอบการเชื่อมต่อ"
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = payload.action || 'SYNC_AUDIT';

    if (action === 'SYNC_MASTER') {
      syncChecklistMaster(ss, payload.items || []);
      return jsonResponse({ status: 'ok', message: 'ซิงค์ฐานข้อมูล Checklist Master เรียบร้อยแล้ว' });
    }

    if (action === 'SYNC_AUDIT') {
      var driveUrl = syncAuditRecord(ss, payload.record, payload.checklistItems || [], payload.uploadPhotos === true);
      return jsonResponse({
        status: 'ok',
        message: driveUrl
          ? 'บันทึกข้อมูลลง Google Sheet และเก็บรูปหลักฐานลง Google Drive เรียบร้อยแล้ว!'
          : 'บันทึกข้อมูลรายงานลง Google Sheet เรียบร้อยแล้ว!',
        driveFolderUrl: driveUrl || ''
      });
    }

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doGet() {
  return jsonResponse({
    status: 'ok',
    service: 'CEMS Audit Google Sheets & Drive Webhook Ready',
    spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName()
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateRootPhotoFolder() {
  var name = 'CEMS_Audit_Photos';
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function savePhotoToDrive(folder, fileName, dataUrl) {
  if (!dataUrl || dataUrl.indexOf('base64,') === -1) return '';
  var parts = dataUrl.split('base64,');
  var mimeMatch = parts[0].match(/data:(.*?);/);
  var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  var bytes = Utilities.base64Decode(parts[1]);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var file = folder.createFile(blob);
  return file.getUrl();
}

function syncAuditRecord(ss, record, checklistItems, uploadPhotos) {
  var meta = record.metadata;
  var driveFolderUrl = '';
  var jobFolder = null;

  if (uploadPhotos) {
    var hasAnyPhoto = false;
    Object.keys(record.responses || {}).forEach(function(k) {
      if ((record.responses[k].photos || []).length > 0) hasAnyPhoto = true;
    });
    if (hasAnyPhoto) {
      var rootFolder = getOrCreateRootPhotoFolder();
      var safeStack = (meta.stackName || 'Stack').replace(/[\\\\/:*?"<>|]/g, '_').slice(0, 40);
      var folderName = (meta.docNumber || 'CEMS') + '_' + safeStack;
      jobFolder = rootFolder.createFolder(folderName);
      driveFolderUrl = jobFolder.getUrl();
    }
  }

  var jobSheet = getOrCreateSheet(ss, 'Audit_Jobs', [
    'Synced_At', 'Doc_Number', 'Audit_Date', 'Audit_Type', 'Company', 'Plant',
    'Stack_Name', 'Parameters', 'Subcontractor', 'Subcon_Reg_No', 'Subcon_Lead',
    'Workers_Top', 'Workers_Bottom', 'Total_Workers', 'Vehicle_Count', 'Vehicle_Types',
    'Inspector_Name', 'Inspector_Dept', 'Conclusion', 'Pass_Count', 'Fail_Count',
    'NA_Count', 'Total_Photos', 'Drive_Photo_Folder', 'Summary_Note'
  ]);

  var passCount = 0, failCount = 0, naCount = 0, totalPhotos = 0;
  Object.keys(record.responses || {}).forEach(function(k) {
    var r = record.responses[k];
    if (r.status === 'PASS') passCount++;
    else if (r.status === 'FAIL') failCount++;
    else if (r.status === 'NA') naCount++;
    totalPhotos += (r.photos || []).length;
  });

  var wTop = parseInt(meta.workersTopCount || '0', 10) || 0;
  var wBottom = parseInt(meta.workersBottomCount || '0', 10) || 0;

  jobSheet.appendRow([
    new Date(),
    meta.docNumber,
    meta.auditDate,
    meta.auditType,
    meta.companyName,
    meta.plantName,
    meta.stackName,
    (meta.parameters || []).join(', '),
    meta.subcontractorName,
    meta.subcontractorRegNo,
    meta.subcontractorLead,
    meta.workersTopCount || '',
    meta.workersBottomCount || '',
    wTop + wBottom,
    meta.vehicleCount || '',
    meta.vehicleTypes || '',
    meta.inspectorName,
    meta.inspectorDept,
    meta.overallConclusion,
    passCount,
    failCount,
    naCount,
    totalPhotos,
    driveFolderUrl,
    meta.overallSummaryNote
  ]);

  var resSheet = getOrCreateSheet(ss, 'Checklist_Results', [
    'Synced_At', 'Doc_Number', 'Stack_Name', 'Stage', 'Item_Code', 'Item_Title',
    'Status', 'Measured_Value', 'Remark', 'Photo_Count', 'Photo_Codes', 'Photo_Drive_Links', 'Checked_At'
  ]);

  checklistItems.forEach(function(item) {
    var resp = (record.responses || {})[item.id] || { status: 'PENDING', remark: '', photos: [] };
    var photos = resp.photos || [];
    var photoCodes = photos.map(function(p) { return p.photoCode; }).join(', ');
    var photoLinks = [];

    if (jobFolder && photos.length > 0) {
      photos.forEach(function(p) {
        if (p.dataUrl) {
          var fname = (p.photoCode || 'IMG') + '_' + item.code + '.jpg';
          var url = savePhotoToDrive(jobFolder, fname, p.dataUrl);
          if (url) photoLinks.push(url);
        }
      });
    }

    resSheet.appendRow([
      new Date(),
      meta.docNumber,
      meta.stackName,
      'Stage ' + item.stage,
      item.code,
      item.title,
      resp.status,
      resp.measuredValue || '',
      resp.remark || '',
      photos.length,
      photoCodes,
      photoLinks.join(' | '),
      resp.checkedAt || ''
    ]);
  });

  return driveFolderUrl;
}

function syncChecklistMaster(ss, items) {
  var sheet = ss.getSheetByName('Checklist_Master');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Checklist_Master');
  }
  var headers = [
    'Item_Code', 'Stage', 'Applies_To', 'Title', 'Short_Tooltip',
    'How_To_Check', 'Pass_Criteria', 'Photo_Guide', 'Watch_Out',
    'Require_Photo', 'Reference_Standard'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  items.forEach(function(item) {
    sheet.appendRow([
      item.code,
      'Stage ' + item.stage,
      item.appliesTo,
      item.title,
      item.shortTooltip,
      (item.howToCheck || []).join(' | '),
      item.passCriteria,
      item.photoGuide,
      item.watchOut,
      item.requirePhoto ? 'YES' : 'NO',
      item.referenceStandard
    ]);
  });
}
`;

export async function testGoogleSheetConnection(
  webAppUrl: string
): Promise<{ ok: boolean; message: string }> {
  if (!webAppUrl.trim()) {
    return { ok: false, message: 'กรุณาวาง Google Apps Script Web App URL ก่อนทดสอบ' };
  }
  try {
    const res = await fetch(webAppUrl.trim(), { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (data && data.status === 'ok') {
      return {
        ok: true,
        message: `เชื่อมต่อสำเร็จ! ไฟล์ Sheet: "${data.spreadsheet || 'Connected'}"`,
      };
    }
    return {
      ok: res.ok,
      message: res.ok
        ? 'เชื่อมต่อ Web App URL สำเร็จ!'
        : `เชื่อมต่อไม่สำเร็จ (HTTP ${res.status}) — ตรวจสอบว่าตั้งสิทธิ์เป็น Anyone แล้วหรือไม่`,
    };
  } catch (err) {
    return {
      ok: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function syncRecordToGoogleSheet(
  webAppUrl: string,
  record: AuditRecord,
  checklistItems: ChecklistItemDef[],
  uploadPhotosToDrive = false
): Promise<{ ok: boolean; message: string; driveFolderUrl?: string }> {
  if (!webAppUrl.trim()) {
    return { ok: false, message: 'กรุณาระบุ Google Apps Script Web App URL ในหน้าตั้งค่าก่อน' };
  }

  const preparedResponses: Record<string, unknown> = {};
  Object.entries(record.responses).forEach(([key, resp]) => {
    preparedResponses[key] = {
      ...resp,
      photos: resp.photos.map((p) => ({
        id: p.id,
        photoCode: p.photoCode,
        caption: p.caption,
        capturedAt: p.capturedAt,
        dataUrl: uploadPhotosToDrive ? p.dataUrl : '',
      })),
    };
  });

  const payload = {
    action: 'SYNC_AUDIT',
    uploadPhotos: uploadPhotosToDrive,
    record: {
      ...record,
      responses: preparedResponses,
      inspectorSignature: { ...record.inspectorSignature, dataUrl: '' },
      subcontractorSignature: { ...record.subcontractorSignature, dataUrl: '' },
      approverSignature: undefined,
    },
    checklistItems: checklistItems.map((i) => ({
      id: i.id,
      code: i.code,
      stage: i.stage,
      title: i.title,
    })),
  };

  try {
    const response = await fetch(webAppUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (response.type === 'opaque') {
      return { ok: true, message: 'ส่งข้อมูลไปยัง Google Sheet แล้ว (Opaque Response)' };
    }

    const data = await response.json().catch(() => null);
    if (data && data.status === 'ok') {
      return {
        ok: true,
        message: data.message || 'บันทึกลง Google Sheet สำเร็จ!',
        driveFolderUrl: data.driveFolderUrl || undefined,
      };
    }
    return {
      ok: response.ok,
      message: data?.message || (response.ok ? 'บันทึกลง Google Sheet สำเร็จ!' : `HTTP ${response.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      message: `เชื่อมต่อ Google Sheet ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function syncMasterToGoogleSheet(
  webAppUrl: string,
  items: ChecklistItemDef[]
): Promise<{ ok: boolean; message: string }> {
  if (!webAppUrl.trim()) {
    return { ok: false, message: 'กรุณาระบุ Google Apps Script Web App URL ในหน้าตั้งค่าก่อน' };
  }
  try {
    const response = await fetch(webAppUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'SYNC_MASTER', items }),
    });
    const data = await response.json().catch(() => null);
    if (data && data.status === 'ok') {
      return { ok: true, message: data.message || 'ส่งฐานข้อมูล Checklist Master ขึ้น Google Sheet สำเร็จ!' };
    }
    return {
      ok: response.ok,
      message: data?.message || (response.ok ? 'ซิงค์ Checklist Master สำเร็จ!' : `HTTP ${response.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      message: `เชื่อมต่อ Google Sheet ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function escapeCsvCell(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadAuditCsv(record: AuditRecord, items: ChecklistItemDef[]) {
  const headers = [
    'Doc_Number',
    'Audit_Date',
    'Audit_Type',
    'Stack_Name',
    'Subcontractor',
    'Workers_Top',
    'Workers_Bottom',
    'Vehicle_Count',
    'Vehicle_Types',
    'Inspector',
    'Stage',
    'Item_Code',
    'Item_Title',
    'Status',
    'Measured_Value',
    'Remark',
    'Photo_Count',
    'Photo_Codes',
  ];

  const rows = items.map((item) => {
    const resp = record.responses[item.id];
    const photos = resp?.photos || [];
    return [
      record.metadata.docNumber,
      record.metadata.auditDate,
      record.metadata.auditType,
      record.metadata.stackName,
      record.metadata.subcontractorName,
      record.metadata.workersTopCount || '',
      record.metadata.workersBottomCount || '',
      record.metadata.vehicleCount || '',
      record.metadata.vehicleTypes || '',
      record.metadata.inspectorName,
      `Stage ${item.stage}`,
      item.code,
      item.title,
      resp?.status || 'PENDING',
      resp?.measuredValue || '',
      resp?.remark || '',
      photos.length,
      photos.map((p) => p.photoCode).join(' | '),
    ].map(escapeCsvCell);
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record.metadata.docNumber || 'cems-audit'}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadChecklistMasterCsv(items: ChecklistItemDef[]) {
  const headers = [
    'Item_Code',
    'Stage',
    'Applies_To',
    'Title',
    'Short_Tooltip',
    'How_To_Check',
    'Pass_Criteria',
    'Photo_Guide',
    'Watch_Out',
    'Require_Photo',
    'Reference_Standard',
  ];

  const rows = items.map((item) =>
    [
      item.code,
      `Stage ${item.stage}`,
      item.appliesTo,
      item.title,
      item.shortTooltip,
      item.howToCheck.join(' | '),
      item.passCriteria,
      item.photoGuide,
      item.watchOut,
      item.requirePhoto ? 'YES' : 'NO',
      item.referenceStandard,
    ].map(escapeCsvCell)
  );

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CEMS_Standard_Checklist_Master.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadRecordBackupJson(record: AuditRecord) {
  const json = JSON.stringify(record, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record.metadata.docNumber || 'cems-audit'}_backup.json`;
  a.click();
  URL.revokeObjectURL(url);
}
