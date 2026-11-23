/**
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

  // Optional: Save evidence photos into Google Drive subfolder
  if (uploadPhotos) {
    var hasAnyPhoto = false;
    Object.keys(record.responses || {}).forEach(function(k) {
      if ((record.responses[k].photos || []).length > 0) hasAnyPhoto = true;
    });
    if (hasAnyPhoto) {
      var rootFolder = getOrCreateRootPhotoFolder();
      var safeStack = (meta.stackName || 'Stack').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
      var folderName = (meta.docNumber || 'CEMS') + '_' + safeStack;
      jobFolder = rootFolder.createFolder(folderName);
      driveFolderUrl = jobFolder.getUrl();
    }
  }

  // 1. Sheet: Audit_Jobs
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

  // 2. Sheet: Checklist_Results
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
