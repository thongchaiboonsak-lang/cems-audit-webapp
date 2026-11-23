import { useEffect, useRef, useState } from 'react';
import {
  Building2,
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

  useEffect(() => {
    if (open) {
      setWebAppUrl(config.webAppUrl);
      setAutoWatermark(config.autoWatermark);
      setUploadPhotosToDrive(config.uploadPhotosToDrive);
      setDefaultCompanyName(config.defaultCompanyName);
      setCompanyLogoDataUrl(config.companyLogoDataUrl || '');
      setStatusMsg(null);
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm no-print animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white overflow-hidden">
          <div className="pointer-events-none absolute inset-0 tech-grid-pattern opacity-50" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  ตั้งค่าบริษัท โลโก้รายงาน & เชื่อมต่อ Google Sheet
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  ปรับแต่งหัวรายงาน PDF และซิงค์ข้อมูล/ภาพถ่ายหลักฐานขึ้น Google Sheets + Drive
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f8fafd]">
          {/* Company Branding & Logo */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 inline-flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </span>
              ข้อมูลบริษัทและโลโก้บนหัวรายงาน PDF
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  ชื่อบริษัทเริ่มต้น
                </label>
                <input
                  type="text"
                  value={defaultCompanyName}
                  onChange={(e) => setDefaultCompanyName(e.target.value)}
                  placeholder="บริษัท ... จำกัด"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
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
                  <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={companyLogoDataUrl}
                      alt="Company Logo"
                      className="h-9 max-w-[110px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setCompanyLogoDataUrl('')}
                      className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="ลบโลโก้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 bg-slate-50/50 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                    อัปโหลดโลโก้
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3.5 border-t border-slate-100">
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-800">
                  ใส่ลายน้ำวัน-เวลา และรหัสหัวข้อบนรูปถ่ายอัตโนมัติ (Auto-Watermark)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ปั๊ม Timestamp + ชื่อปล่อง + รหัสข้อตรวจไว้ด้านล่างรูปถ่ายทุกใบ
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoWatermark}
                onClick={() => setAutoWatermark((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  autoWatermark ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                    autoWatermark ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Google Sheets & Drive URL */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/90 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center shadow-xs">
                  <Database className="w-4 h-4" />
                </span>
                Google Apps Script Web App URL
              </div>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-emerald-200 text-xs font-semibold text-emerald-700 transition"
              >
                สร้าง Google Sheet ใหม่ <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="url"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3.5 py-2.5 text-sm font-mono-code rounded-xl border border-emerald-300/90 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 transition"
            />

            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/85 border border-emerald-200/80">
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  อัปโหลดรูปหลักฐานเข้า Google Drive อัตโนมัติ (โฟลเดอร์ CEMS_Audit_Photos)
                </div>
                <div className="text-[11px] text-emerald-800/80 mt-0.5">
                  เมื่อกดบันทึก ระบบจะสร้างโฟลเดอร์แยกตามเลขที่เอกสารและใส่ลิงก์ Drive ลง Sheet ให้อัตโนมัติ
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={uploadPhotosToDrive}
                onClick={() => setUploadPhotosToDrive((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  uploadPhotosToDrive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                    uploadPhotosToDrive ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={testing || !webAppUrl.trim()}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <PlugZap className="w-3.5 h-3.5 text-amber-400" />
                {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
              </button>

              <button
                type="button"
                disabled={syncingMaster || !webAppUrl.trim()}
                onClick={handleSyncMaster}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                {syncingMaster
                  ? 'กำลังซิงค์...'
                  : `ส่งฐานข้อมูล Checklist Master (${checklistItems.length} ข้อ) ขึ้น Sheet`}
              </button>
            </div>

            {statusMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold animate-fade-in ${
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
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-800">
                วิธีเชื่อมต่อ Google Sheet & Drive ใน 4 ขั้นตอน
              </h4>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Apps Script'}
              </button>
            </div>

            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 leading-relaxed">
              <li>
                เปิดไฟล์ Google Sheet ที่ต้องการใช้เก็บข้อมูล ไปที่เมนู <strong className="text-slate-900">Extensions (ส่วนขยาย) &rarr; Apps Script</strong>
              </li>
              <li>
                ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดที่คัดลอกจากปุ่มด้านบน จากนั้นกด <strong className="text-slate-900">Save (Ctrl+S)</strong>
              </li>
              <li>
                กดปุ่ม <strong className="text-slate-900">Deploy &rarr; New deployment</strong> เลือก Type เป็น <strong className="text-slate-900">Web app</strong> ตั้งค่า{' '}
                <em>Execute as: Me</em> และ <em>Who has access: Anyone</em> แล้วกด Deploy (กด Allow สิทธิ์ Sheets & Drive)
              </li>
              <li>
                คัดลอก <strong className="text-slate-900">Web app URL</strong> ที่ได้มาวางในช่องด้านบน แล้วกด <strong className="text-slate-900">ทดสอบการเชื่อมต่อ</strong>{' '}
                (ระบบจะสร้างแท็บ <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[11px]">Audit_Jobs</code>,{' '}
                <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[11px]">Checklist_Results</code> และ{' '}
                <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[11px]">Checklist_Master</code> พร้อมโฟลเดอร์เก็บรูปใน Google Drive ให้อัตโนมัติ)
              </li>
            </ol>

            <pre className="font-mono-code text-[11px] bg-slate-950 text-slate-200 p-4 rounded-2xl overflow-x-auto max-h-44 leading-relaxed border border-slate-800">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md shadow-blue-600/20 transition active:scale-[0.98] cursor-pointer"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
