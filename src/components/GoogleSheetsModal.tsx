import { useRef, useState } from 'react';
import {
  Check,
  CloudUpload,
  Copy,
  Database,
  ExternalLink,
  ImagePlus,
  PlugZap,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import type { ChecklistItemDef, GoogleSheetConfig } from '../types';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  syncMasterToGoogleSheet,
  testGoogleSheetConnection,
} from '../utils/googleSheets';

interface GoogleSheetsModalProps {
  open: boolean;
  config: GoogleSheetConfig;
  checklistItems: ChecklistItemDef[];
  onSaveConfig: (config: GoogleSheetConfig) => void;
  onClose: () => void;
}

export function GoogleSheetsModal({
  open,
  config,
  checklistItems,
  onSaveConfig,
  onClose,
}: GoogleSheetsModalProps) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl);
  const [autoWatermark, setAutoWatermark] = useState(config.autoWatermark);
  const [uploadPhotosToDrive, setUploadPhotosToDrive] = useState(config.uploadPhotosToDrive);
  const [defaultCompanyName, setDefaultCompanyName] = useState(config.defaultCompanyName);
  const [companyLogoDataUrl, setCompanyLogoDataUrl] = useState(config.companyLogoDataUrl || '');

  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingMaster, setSyncingMaster] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; message: string } | null>(null);

  if (!open) return null;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxH = 160;
        const scale = img.height > maxH ? maxH / img.height : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setCompanyLogoDataUrl(canvas.toDataURL('image/png'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const buildConfig = (): GoogleSheetConfig => ({
    webAppUrl,
    autoWatermark,
    uploadPhotosToDrive,
    defaultCompanyName,
    companyLogoDataUrl: companyLogoDataUrl || undefined,
  });

  const handleSave = () => {
    onSaveConfig(buildConfig());
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMsg(null);
    onSaveConfig(buildConfig());
    const res = await testGoogleSheetConnection(webAppUrl);
    setStatusMsg(res);
    setTesting(false);
  };

  const handleSyncMaster = async () => {
    setSyncingMaster(true);
    setStatusMsg(null);
    onSaveConfig(buildConfig());
    const res = await syncMasterToGoogleSheet(webAppUrl, checklistItems);
    setStatusMsg(res);
    setSyncingMaster(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold">ตั้งค่าบริษัท โลโก้รายงาน & เชื่อมต่อ Google Sheet</h3>
              <p className="text-xs text-slate-400">
                ปรับแต่งหัวรายงาน PDF และซิงค์ข้อมูล/ภาพถ่ายหลักฐานขึ้น Google Sheets + Google Drive อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Company Branding & Logo */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-sm font-bold text-slate-800">ข้อมูลบริษัทและโลโก้บนหัวรายงาน PDF</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อบริษัทเริ่มต้น
                </label>
                <input
                  type="text"
                  value={defaultCompanyName}
                  onChange={(e) => setDefaultCompanyName(e.target.value)}
                  placeholder="บริษัท ... จำกัด"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  โลโก้บริษัท (PNG/JPG)
                </label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {companyLogoDataUrl ? (
                  <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-300 bg-white">
                    <img
                      src={companyLogoDataUrl}
                      alt="Company Logo"
                      className="h-9 max-w-[110px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setCompanyLogoDataUrl('')}
                      className="ml-auto p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="ลบโลโก้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-400 hover:border-blue-500 bg-white text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                    อัปโหลดโลโก้
                  </button>
                )}
              </div>
            </div>

            <label className="flex items-center justify-between pt-2 border-t border-slate-200 cursor-pointer">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                  ใส่ลายน้ำวัน-เวลา และรหัสหัวข้อบนรูปถ่ายอัตโนมัติ (Auto-Watermark)
                </div>
                <div className="text-xs text-slate-500">
                  ปั๊ม Timestamp + ชื่อปล่อง + รหัสข้อตรวจไว้ด้านล่างรูปถ่ายทุกใบ
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoWatermark}
                onChange={(e) => setAutoWatermark(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
            </label>
          </div>

          {/* Google Sheets & Drive URL */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700" />
                Google Apps Script Web App URL
              </div>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                สร้าง Google Sheet ใหม่ <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="url"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3 py-2 text-sm rounded-xl border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-emerald-200 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  อัปโหลดรูปหลักฐานเข้า Google Drive อัตโนมัติ (โฟลเดอร์ CEMS_Audit_Photos)
                </div>
                <div className="text-[11px] text-emerald-800">
                  เมื่อกดบันทึก ระบบจะสร้างโฟลเดอร์แยกตามเลขที่เอกสารและใส่ลิงก์ Google Drive ลงใน Google Sheet ให้อัตโนมัติ
                </div>
              </div>
              <input
                type="checkbox"
                checked={uploadPhotosToDrive}
                onChange={(e) => setUploadPhotosToDrive(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded ml-3 flex-shrink-0"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testing || !webAppUrl.trim()}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
              >
                <PlugZap className="w-3.5 h-3.5 text-amber-400" />
                {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
              </button>

              <button
                type="button"
                disabled={syncingMaster || !webAppUrl.trim()}
                onClick={handleSyncMaster}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                {syncingMaster
                  ? 'กำลังซิงค์...'
                  : `ส่งฐานข้อมูล Checklist Master (${checklistItems.length} ข้อ) ขึ้น Sheet`}
              </button>
            </div>

            {statusMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  statusMsg.ok
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {statusMsg.message}
              </div>
            )}
          </div>

          {/* Step-by-step Setup Guide */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                วิธีเชื่อมต่อ Google Sheet & Drive ใน 4 ขั้นตอน (2 นาที)
              </h4>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Apps Script'}
              </button>
            </div>

            <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              <li>
                เปิดไฟล์ Google Sheet ที่ต้องการใช้เก็บข้อมูล ไปที่เมนู <strong>Extensions (ส่วนขยาย) &rarr; Apps Script</strong>
              </li>
              <li>
                ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดที่คัดลอกจากปุ่มด้านบน จากนั้นกด <strong>Save (Ctrl+S)</strong>
              </li>
              <li>
                กดปุ่ม <strong>Deploy &rarr; New deployment</strong> เลือก Type เป็น <strong>Web app</strong> ตั้งค่า{' '}
                <em>Execute as: Me</em> และ <em>Who has access: Anyone</em> แล้วกด Deploy (กด Allow สิทธิ์ Sheets & Drive)
              </li>
              <li>
                คัดลอก <strong>Web app URL</strong> ที่ได้มาวางในช่องด้านบน แล้วกด <strong>ทดสอบการเชื่อมต่อ</strong>{' '}
                (ระบบจะสร้างแท็บ <code>Audit_Jobs</code>, <code>Checklist_Results</code> และ{' '}
                <code>Checklist_Master</code> พร้อมโฟลเดอร์เก็บรูปใน Google Drive ให้อัตโนมัติ)
              </li>
            </ol>

            <pre className="text-[11px] bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto max-h-40 leading-relaxed">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
