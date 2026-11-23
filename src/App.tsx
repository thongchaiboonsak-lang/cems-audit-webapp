import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookMarked,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Info,
  PenTool,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { ChecklistCard } from './components/ChecklistCard';
import { ChecklistMasterModal } from './components/ChecklistMasterModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { HelpGuideDrawer } from './components/HelpGuideDrawer';
import { PdfReportPreview } from './components/PdfReportPreview';
import { SignaturePad } from './components/SignaturePad';
import {
  AVAILABLE_PARAMETERS,
  filterChecklistByAuditType,
  STAGES,
  STANDARD_CHECKLIST,
} from './data/checklistData';
import { createDemoAuditRecord, createEmptyAuditRecord } from './data/demoData';
import type {
  AuditRecord,
  AuditResponse,
  AuditType,
  ChecklistItemDef,
  EvidencePhoto,
  GoogleSheetConfig,
  StageNumber,
} from './types';
import { loadRecordsFromDb, saveAllRecordsToDb } from './utils/db';
import {
  downloadAuditCsv,
  downloadRecordBackupJson,
  syncRecordToGoogleSheet,
} from './utils/googleSheets';

const STORAGE_MASTER_KEY = 'cems_checklist_master_v3';
const STORAGE_CONFIG_KEY = 'cems_gsheet_config_v1';

type AppView = 'DASHBOARD' | 'WORKSPACE' | 'PDF_PREVIEW';
type WorkspaceTab = 'SETUP' | 'STAGE_1' | 'STAGE_2' | 'STAGE_3' | 'STAGE_4' | 'SIGNOFF';
type ItemFilter = 'ALL' | 'PENDING' | 'FAIL' | 'HAS_PHOTO';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [masterItems, setMasterItems] = useState<ChecklistItemDef[]>(() =>
    loadFromStorage<ChecklistItemDef[]>(STORAGE_MASTER_KEY, STANDARD_CHECKLIST)
  );
  const [config, setConfig] = useState<GoogleSheetConfig>(() =>
    loadFromStorage<GoogleSheetConfig>(STORAGE_CONFIG_KEY, {
      webAppUrl: '',
      autoWatermark: true,
      uploadPhotosToDrive: true,
      defaultCompanyName: 'บริษัท ตัวอย่าง อินดัสเทรียล จำกัด (มหาชน)',
    })
  );

  const [view, setView] = useState<AppView>('DASHBOARD');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('STAGE_1');
  const [itemFilter, setItemFilter] = useState<ItemFilter>('ALL');

  const [guideItem, setGuideItem] = useState<ChecklistItemDef | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<EvidencePhoto | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Track online/offline status for field PWA UX
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load records from IndexedDB (auto-migrating from legacy localStorage)
  useEffect(() => {
    loadRecordsFromDb().then((loaded) => {
      setRecords(loaded);
      setDbLoaded(true);
    });
  }, []);

  // Persist records to IndexedDB whenever changed after initial load
  useEffect(() => {
    if (!dbLoaded) return;
    saveAllRecordsToDb(records).catch(() => {
      showToast('error', 'ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลในเครื่องได้');
    });
  }, [records, dbLoaded]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MASTER_KEY, JSON.stringify(masterItems));
  }, [masterItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const activeRecord = useMemo(
    () => records.find((r) => r.id === activeRecordId) || null,
    [records, activeRecordId]
  );

  const applicableItems = useMemo(() => {
    if (!activeRecord) return [];
    return filterChecklistByAuditType(masterItems, activeRecord.metadata.auditType);
  }, [activeRecord, masterItems]);

  const updateActiveRecord = (updater: (rec: AuditRecord) => AuditRecord) => {
    if (!activeRecordId) return;
    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === activeRecordId
          ? { ...updater(rec), updatedAt: new Date().toISOString() }
          : rec
      )
    );
  };

  const handleCreateNewJob = (type: AuditType) => {
    const newRec = createEmptyAuditRecord(type, config.defaultCompanyName);
    setRecords((prev) => [newRec, ...prev]);
    setActiveRecordId(newRec.id);
    setActiveTab('SETUP');
    setView('WORKSPACE');
    showToast('info', `สร้างงานตรวจใหม่ (${newRec.metadata.docNumber}) เรียบร้อยแล้ว`);
  };

  const handleLoadDemoJob = () => {
    const demo = createDemoAuditRecord();
    setRecords((prev) => [demo, ...prev]);
    setActiveRecordId(demo.id);
    setActiveTab('STAGE_1');
    setView('WORKSPACE');
    showToast('success', 'โหลดข้อมูลตัวอย่างครบทั้ง RATA & Correlation แล้ว ทดลองกดดูคำอธิบายหรือออก PDF ได้เลย!');
  };

  const handleDeleteJob = (id: string) => {
    if (!confirm('ต้องการลบรายการตรวจสอบนี้ใช่หรือไม่?')) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (activeRecordId === id) {
      setActiveRecordId(null);
      setView('DASHBOARD');
    }
  };

  const getNextPhotoCode = () => {
    if (!activeRecord) return 'IMG-01';
    let maxNum = 0;
    Object.values(activeRecord.responses).forEach((resp) => {
      resp.photos.forEach((p) => {
        const match = p.photoCode.match(/\d+/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[0], 10));
      });
    });
    return `IMG-${String(maxNum + 1).padStart(2, '0')}`;
  };

  const handleSyncToGoogleSheet = async () => {
    if (!activeRecord) return;
    if (!config.webAppUrl.trim()) {
      setShowSettingsModal(true);
      showToast('info', 'กรุณาเชื่อมต่อ Google Apps Script URL ก่อนส่งข้อมูลครับ');
      return;
    }
    setSyncing(true);
    const result = await syncRecordToGoogleSheet(
      config.webAppUrl,
      activeRecord,
      applicableItems,
      config.uploadPhotosToDrive
    );
    setSyncing(false);
    if (result.ok) {
      updateActiveRecord((rec) => ({
        ...rec,
        syncedAt: new Date().toISOString(),
        driveFolderUrl: result.driveFolderUrl || rec.driveFolderUrl,
      }));
      showToast('success', result.message);
    } else {
      showToast('error', result.message);
    }
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AuditRecord;
        if (!parsed || !parsed.metadata || !parsed.responses) {
          throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง');
        }
        const imported: AuditRecord = {
          ...parsed,
          id: `imp-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        };
        setRecords((prev) => [imported, ...prev]);
        setActiveRecordId(imported.id);
        setActiveTab('STAGE_1');
        setView('WORKSPACE');
        showToast('success', `นำเข้าใบงาน "${imported.metadata.docNumber}" เรียบร้อยแล้ว!`);
      } catch {
        showToast('error', 'ไม่สามารถนำเข้าไฟล์ได้ กรุณาเลือกไฟล์สำรอง .json ที่ส่งออกจากระบบนี้');
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const computeRecordStats = (rec: AuditRecord) => {
    const items = filterChecklistByAuditType(masterItems, rec.metadata.auditType);
    let pass = 0;
    let fail = 0;
    let na = 0;
    let photos = 0;
    items.forEach((i) => {
      const r = rec.responses[i.id];
      if (r?.status === 'PASS') pass++;
      else if (r?.status === 'FAIL') fail++;
      else if (r?.status === 'NA') na++;
      photos += r?.photos?.length || 0;
    });
    const checked = pass + fail + na;
    const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
    return { total: items.length, checked, pass, fail, na, photos, pct };
  };

  // ==================== PDF PREVIEW MODE ====================
  if (view === 'PDF_PREVIEW' && activeRecord) {
    return (
      <>
        <PdfReportPreview
          record={activeRecord}
          items={applicableItems}
          companyLogoDataUrl={config.companyLogoDataUrl}
          syncing={syncing}
          hasGoogleSheetUrl={Boolean(config.webAppUrl.trim())}
          onBack={() => setView('WORKSPACE')}
          onSyncGoogleSheet={handleSyncToGoogleSheet}
          onDownloadCsv={() => downloadAuditCsv(activeRecord, applicableItems)}
        />
        <GoogleSheetsModal
          open={showSettingsModal}
          config={config}
          checklistItems={masterItems}
          onSaveConfig={setConfig}
          onClose={() => setShowSettingsModal(false)}
        />
        {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ==================== MAIN LAYOUT (DASHBOARD / WORKSPACE) ====================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {view === 'WORKSPACE' ? (
              <button
                type="button"
                onClick={() => setView('DASHBOARD')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                title="กลับหน้าหลัก"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-inner flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base tracking-tight truncate">
                {view === 'WORKSPACE' && activeRecord
                  ? `${activeRecord.metadata.docNumber} • ${activeRecord.metadata.stackName || 'ยังไม่ระบุชื่อปล่อง'}`
                  : 'CEMS Audit Supervisor'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {view === 'WORKSPACE' && activeRecord
                  ? `โหมดตรวจวัด: ${activeRecord.metadata.auditType} • บันทึกอัตโนมัติในเครื่อง`
                  : 'ระบบควบคุมการตรวจสอบ CEMS (RATA & Correlation Test) + รายงาน PDF & Google Sheet'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
              title={isOnline ? 'ออนไลน์ • พร้อมซิงค์ข้อมูล' : 'ออฟไลน์ • ข้อมูลถูกบันทึกในเครื่อง (IndexedDB)'}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline Safe'}
            </span>

            <button
              type="button"
              onClick={() => setShowMasterModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5 text-sky-400" />
              ฐานข้อมูล Checklist ({masterItems.length})
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              title="ตั้งค่าและเชื่อมต่อ Google Sheet"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Google Sheet</span>
              {config.webAppUrl.trim() && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="เชื่อมต่อแล้ว" />
              )}
            </button>

            {view === 'WORKSPACE' && activeRecord && (
              <button
                type="button"
                onClick={() => setView('PDF_PREVIEW')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                ออกรายงาน PDF
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================== DASHBOARD VIEW ==================== */}
      {view === 'DASHBOARD' && (
        <main className="max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1">
          {/* Hero Action Section */}
          <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-8 shadow-lg">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-sky-300">
                <Activity className="w-3.5 h-3.5" />
                มาตรฐาน US EPA PS-2 / PS-11 / Method 5 & 7E • พร้อมคำอธิบายหน้างานทุกข้อ
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                ควบคุมงาน Sub-contract ตรวจวัด CEMS ได้ง่าย รวดเร็ว และออกรายงาน PDF ทันที
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                ตรวจเช็คครบทุกขั้นตอนตั้งแต่ก่อนเริ่มงาน ระหว่างเก็บตัวอย่าง ไปจนถึงยืนยันข้อมูลดิบ CEMS
                แนบภาพถ่ายหลักฐานพร้อมประทับวัน-เวลาอัตโนมัติ ชี้ดูคำอธิบายวิธีตรวจได้ทุกข้อ และบันทึกประวัติลง Google Sheet
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateNewJob('BOTH')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เริ่มงานตรวจใหม่ (RATA + Correlation)
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewJob('RATA')}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/15 transition cursor-pointer"
                >
                  + เฉพาะ RATA
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewJob('CORRELATION')}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/15 transition cursor-pointer"
                >
                  + เฉพาะ Correlation Test (PM)
                </button>
              </div>
            </div>
          </section>

          {/* Quick Utility Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={handleLoadDemoJob}
              className="text-left p-5 rounded-2xl bg-white border border-blue-200 hover:border-blue-400 hover:shadow-md transition flex items-start gap-4 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">ทดลองใช้ด้วยข้อมูลตัวอย่าง (Demo)</div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  โหลดใบงานตัวอย่างที่มีผลตรวจและรูปถ่ายหลักฐานครบ เพื่อลองดู Tooltip และทดลองสร้างไฟล์ PDF ทันที
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowMasterModal(true)}
              className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md transition flex items-start gap-4 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                <BookMarked className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  ฐานข้อมูล Checklist มาตรฐาน ({masterItems.length} ข้อ)
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ดูหรือเพิ่มหัวข้อตรวจเช็ค แก้ไขคำอธิบาย/เกณฑ์ผ่าน และส่งออกไฟล์ Master CSV เพื่อนำไปเก็บเป็นฐานข้อมูลบริษัท
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition flex items-start gap-4 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  เชื่อมต่อ Google Sheet
                  {config.webAppUrl.trim() ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      เชื่อมต่อแล้ว
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      ยังไม่ตั้งค่า
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  วางลิงก์ Google Apps Script เพื่อซิงค์ประวัติการตรวจ ผลรายข้อ และฐานข้อมูล Checklist ลง Google Sheet
                </p>
              </div>
            </button>
          </section>

          {/* Saved Audit Jobs List */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                รายการงานตรวจสอบในเครื่อง ({records.length} งาน)
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  IndexedDB Offline Storage
                </span>
              </h2>
              <div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportBackupJson}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  นำเข้าไฟล์สำรอง (.json)
                </button>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white py-12 px-6 text-center">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <div className="font-bold text-slate-700 text-base">ยังไม่มีรายการงานตรวจสอบ</div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  กดปุ่ม &ldquo;เริ่มงานตรวจใหม่&rdquo; ด้านบนเพื่อเริ่มควบคุมงานหน้างาน หรือกด &ldquo;ทดลองใช้ด้วยข้อมูลตัวอย่าง (Demo)&rdquo; เพื่อทดสอบระบบและการออกไฟล์ PDF ได้เลย
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {records.map((rec) => {
                  const st = computeRecordStats(rec);
                  return (
                    <div
                      key={rec.id}
                      className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-xs font-bold">
                                {rec.metadata.docNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                                {rec.metadata.auditType}
                              </span>
                              {rec.syncedAt && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                  ซิงค์ Sheet แล้ว
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mt-1.5">
                              {rec.metadata.stackName || 'ยังไม่ระบุชื่อปล่อง (Stack)'}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Sub-contract: {rec.metadata.subcontractorName || '-'} • วันที่ {rec.metadata.auditDate}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteJob(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="ลบงานนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">
                              ตรวจแล้ว {st.checked} / {st.total} ข้อ ({st.pct}%)
                            </span>
                            <span className="flex items-center gap-2 text-[11px]">
                              <span className="text-emerald-700 font-semibold">ผ่าน {st.pass}</span>
                              {st.fail > 0 && <span className="text-rose-600 font-semibold">ไม่ผ่าน {st.fail}</span>}
                              <span className="text-sky-700 font-semibold">📷 {st.photos}</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${st.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRecordId(rec.id);
                            setActiveTab('STAGE_1');
                            setView('WORKSPACE');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          เปิดตรวจเช็คต่อ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRecordId(rec.id);
                            setView('PDF_PREVIEW');
                          }}
                          className="py-2 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          ดูรายงาน PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ==================== WORKSPACE VIEW ==================== */}
      {view === 'WORKSPACE' && activeRecord && (() => {
        const stats = computeRecordStats(activeRecord);

        const updateResponse = (itemId: string, updated: AuditResponse) => {
          updateActiveRecord((rec) => ({
            ...rec,
            responses: { ...rec.responses, [itemId]: updated },
          }));
        };

        const renderStageTab = (stageNum: StageNumber) => {
          const stageMeta = STAGES.find((s) => s.number === stageNum)!;
          const stageItems = applicableItems.filter((i) => i.stage === stageNum);

          const filtered = stageItems.filter((item) => {
            const resp = activeRecord.responses[item.id];
            const status = resp?.status || 'PENDING';
            if (itemFilter === 'PENDING') return status === 'PENDING';
            if (itemFilter === 'FAIL') return status === 'FAIL';
            if (itemFilter === 'HAS_PHOTO') return (resp?.photos?.length || 0) > 0;
            return true;
          });

          return (
            <div className="space-y-4">
              {/* Stage Header & Guidance Hint */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">{stageMeta.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{stageMeta.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: `ทั้งหมด (${stageItems.length})` },
                        { id: 'PENDING', label: 'ยังไม่ตรวจ' },
                        { id: 'FAIL', label: 'ไม่ผ่าน' },
                        { id: 'HAS_PHOTO', label: 'มีรูปแล้ว' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setItemFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          itemFilter === f.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    <strong>ไม่เข้าใจข้อไหน?</strong> เอาเมาส์ชี้ที่ชื่อหัวข้อเพื่อดูคำอธิบายย่อ หรือกดปุ่ม{' '}
                    <strong>&ldquo;วิธีตรวจ / คำอธิบาย&rdquo;</strong> เพื่อเปิดคู่มือขั้นตอน เกณฑ์มาตรฐาน และคำแนะนำมุมถ่ายรูป
                  </span>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 py-10 text-center text-sm text-slate-500">
                  ไม่พบหัวข้อตามตัวกรองที่เลือกในระยะนี้
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filtered.map((item) => {
                    const resp: AuditResponse = activeRecord.responses[item.id] || {
                      itemId: item.id,
                      status: 'PENDING',
                      remark: '',
                      measuredValue: '',
                      photos: [],
                    };
                    return (
                      <ChecklistCard
                        key={item.id}
                        item={item}
                        response={resp}
                        stackName={activeRecord.metadata.stackName}
                        docNumber={activeRecord.metadata.docNumber}
                        autoWatermark={config.autoWatermark}
                        nextPhotoNumber={getNextPhotoCode}
                        onChange={(updated) => updateResponse(item.id, updated)}
                        onOpenGuide={setGuideItem}
                        onPreviewPhoto={setLightboxPhoto}
                      />
                    );
                  })}
                </div>
              )}

              {/* Bottom Stage Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (stageNum === 1) setActiveTab('SETUP');
                    else setActiveTab(`STAGE_${stageNum - 1}` as WorkspaceTab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  &larr; ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (stageNum < 4) setActiveTab(`STAGE_${stageNum + 1}` as WorkspaceTab);
                    else setActiveTab('SIGNOFF');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow cursor-pointer"
                >
                  {stageNum < 4 ? `ไปต่อ Stage ${stageNum + 1} →` : 'ไปหน้าสรุปผล & ลงนาม →'}
                </button>
              </div>
            </div>
          );
        };

        return (
          <main className="max-w-5xl w-full mx-auto px-4 py-5 space-y-5 flex-1">
            {/* Live Progress Summary Bar */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="font-bold text-slate-800">
                  ความคืบหน้าการตรวจเช็ค: {stats.checked} / {stats.total} ข้อ ({stats.pct}%)
                </div>
                <div className="flex flex-wrap items-center gap-3 font-semibold">
                  <span className="text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน {stats.pass}
                  </span>
                  <span className="text-rose-600 inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> ไม่ผ่าน {stats.fail}
                  </span>
                  <span className="text-slate-500">N/A {stats.na}</span>
                  <span className="text-sky-700 inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> รูป {stats.photos}
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>

            {/* Stage / Section Navigation Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-print">
              {(
                [
                  { id: 'SETUP', label: 'ข้อมูลงาน' },
                  { id: 'STAGE_1', label: 'Stage 1: เตรียมพร้อม', stage: 1 },
                  { id: 'STAGE_2', label: 'Stage 2: Pre-Test', stage: 2 },
                  { id: 'STAGE_3', label: 'Stage 3: ระหว่างตรวจ', stage: 3 },
                  { id: 'STAGE_4', label: 'Stage 4: หลังตรวจ', stage: 4 },
                  { id: 'SIGNOFF', label: 'สรุปผล & ลงนาม' },
                ] as Array<{ id: WorkspaceTab; label: string; stage?: StageNumber }>
              ).map((tab) => {
                let badge = '';
                if (tab.stage) {
                  const sItems = applicableItems.filter((i) => i.stage === tab.stage);
                  const sDone = sItems.filter(
                    (i) => (activeRecord.responses[i.id]?.status || 'PENDING') !== 'PENDING'
                  ).length;
                  badge = `${sDone}/${sItems.length}`;
                }
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setItemFilter('ALL');
                    }}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB: JOB SETUP */}
            {activeTab === 'SETUP' && (
              <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    ข้อมูลพื้นฐานงานตรวจสอบ CEMS Audit
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ข้อมูลส่วนนี้จะแสดงบนหัวรายงาน PDF และใช้ในการปั๊มลายน้ำบนรูปถ่ายหลักฐาน
                  </p>
                </div>

                {/* Audit Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    ประเภทการ Audit (ระบบจะคัดเลือกหัวข้อ Checklist ให้ตรงตามที่เลือกโดยอัตโนมัติ)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        { id: 'RATA', title: 'RATA', desc: 'Gas / Flow CEMS (PS-2, PS-3, PS-4)' },
                        { id: 'CORRELATION', title: 'Correlation Test', desc: 'PM / Dust CEMS (PS-11, Method 5/17)' },
                        { id: 'BOTH', title: 'RATA + Correlation', desc: 'ทำทั้งก๊าซและฝุ่นในงานเดียวกัน' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateActiveRecord((rec) => ({
                            ...rec,
                            metadata: { ...rec.metadata, auditType: opt.id },
                          }))
                        }
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          activeRecord.metadata.auditType === opt.id
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-sm text-slate-900">{opt.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่เอกสาร</label>
                    <input
                      type="text"
                      value={activeRecord.metadata.docNumber}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, docNumber: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่ดำเนินการตรวจวัด</label>
                    <input
                      type="date"
                      value={activeRecord.metadata.auditDate}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, auditDate: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบริษัทเจ้าของโรงงาน</label>
                    <input
                      type="text"
                      value={activeRecord.metadata.companyName}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, companyName: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">โรงงาน / หน่วยผลิต (Unit)</label>
                    <input
                      type="text"
                      value={activeRecord.metadata.plantName}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, plantName: e.target.value },
                        }))
                      }
                      placeholder="เช่น โรงไฟฟ้า SPP-1 / Unit 2"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อปล่องระบายอากาศ (Stack Name / ID) *
                    </label>
                    <input
                      type="text"
                      value={activeRecord.metadata.stackName}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, stackName: e.target.value },
                        }))
                      }
                      placeholder="เช่น Boiler Stack #1 (Main Stack)"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                {/* Parameters */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">พารามิเตอร์ที่ทำการ Audit</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_PARAMETERS.map((param) => {
                      const selected = activeRecord.metadata.parameters.includes(param);
                      return (
                        <button
                          key={param}
                          type="button"
                          onClick={() =>
                            updateActiveRecord((r) => ({
                              ...r,
                              metadata: {
                                ...r.metadata,
                                parameters: selected
                                  ? r.metadata.parameters.filter((p) => p !== param)
                                  : [...r.metadata.parameters, param],
                              },
                            }))
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {param}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-contractor & Inspector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อบริษัท Sub-contractor
                    </label>
                    <input
                      type="text"
                      value={activeRecord.metadata.subcontractorName}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, subcontractorName: e.target.value },
                        }))
                      }
                      placeholder="บริษัทผู้รับเหมาตรวจวัด..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ทะเบียน ว. (กรอ.)</label>
                      <input
                        type="text"
                        value={activeRecord.metadata.subcontractorRegNo}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, subcontractorRegNo: e.target.value },
                          }))
                        }
                        placeholder="เช่น ว-248"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">หัวหน้าทีม Sub-con</label>
                      <input
                        type="text"
                        value={activeRecord.metadata.subcontractorLead}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, subcontractorLead: e.target.value },
                          }))
                        }
                        placeholder="ชื่อ-สกุล"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อพนักงานผู้ควบคุมงาน (บริษัท)
                    </label>
                    <input
                      type="text"
                      value={activeRecord.metadata.inspectorName}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, inspectorName: e.target.value },
                        }))
                      }
                      placeholder="ชื่อ-สกุล ผู้ควบคุมงาน"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">แผนก / ฝ่าย</label>
                    <input
                      type="text"
                      value={activeRecord.metadata.inspectorDept}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, inspectorDept: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                {/* Manpower & Vehicles Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      กำลังพลและยานพาหนะของ Sub-contractor หน้างาน
                    </div>
                    {(() => {
                      const top = parseInt(activeRecord.metadata.workersTopCount || '0', 10) || 0;
                      const bottom = parseInt(activeRecord.metadata.workersBottomCount || '0', 10) || 0;
                      const total = top + bottom;
                      return (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                          รวมผู้ปฏิบัติงานทั้งหมด: {total} คน
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        จำนวนผู้ปฏิบัติงานด้านบน (คน)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeRecord.metadata.workersTopCount || ''}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, workersTopCount: e.target.value },
                          }))
                        }
                        placeholder="บนปล่อง / Platform"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        จำนวนผู้ปฏิบัติงานด้านล่าง (คน)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeRecord.metadata.workersBottomCount || ''}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, workersBottomCount: e.target.value },
                          }))
                        }
                        placeholder="ภาคพื้น / รถตรวจวัด / Shelter"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        จำนวนรถยนต์ที่นำมาใช้งาน (คัน)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeRecord.metadata.vehicleCount || ''}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, vehicleCount: e.target.value },
                          }))
                        }
                        placeholder="เช่น 2"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      ชนิดรถยนต์ที่นำมาใช้งาน (ระบุชนิดและจำนวน หรือกดปุ่มเพิ่มด่วนด้านล่าง)
                    </label>
                    <input
                      type="text"
                      value={activeRecord.metadata.vehicleTypes || ''}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, vehicleTypes: e.target.value },
                        }))
                      }
                      placeholder="เช่น รถตู้ตรวจวัดเคลื่อนที่ (Mobile Lab) 1 คัน, รถกระบะขนอุปกรณ์ 1 คัน"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        'รถตู้ตรวจวัดเคลื่อนที่ (Mobile Lab)',
                        'รถกระบะขนอุปกรณ์',
                        'รถตู้โดยสาร',
                        'รถเก๋ง/SUV',
                        'รถบรรทุก 6 ล้อ',
                      ].map((vType) => (
                        <button
                          key={vType}
                          type="button"
                          onClick={() =>
                            updateActiveRecord((r) => {
                              const current = (r.metadata.vehicleTypes || '').trim();
                              const nextVal = current ? `${current}, ${vType} 1 คัน` : `${vType} 1 คัน`;
                              return {
                                ...r,
                                metadata: { ...r.metadata, vehicleTypes: nextVal },
                              };
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-medium transition cursor-pointer"
                        >
                          + {vType}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('STAGE_1');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow cursor-pointer"
                  >
                    เริ่มตรวจเช็ค Stage 1 &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* TABS: STAGES 1 - 4 */}
            {activeTab === 'STAGE_1' && renderStageTab(1)}
            {activeTab === 'STAGE_2' && renderStageTab(2)}
            {activeTab === 'STAGE_3' && renderStageTab(3)}
            {activeTab === 'STAGE_4' && renderStageTab(4)}

            {/* TAB: SUMMARY & SIGN-OFF */}
            {activeTab === 'SIGNOFF' && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-blue-600" />
                    สรุปผลการตรวจสอบและลงนามรับรองทั้ง 2 ฝ่าย
                  </h2>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      ผลการประเมินภาพรวมการปฏิบัติงานของ Sub-contractor
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(
                        [
                          { id: 'PASS', label: '✓ ผ่านเกณฑ์มาตรฐาน', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
                          {
                            id: 'PASS_WITH_CONDITION',
                            label: '⚠ ผ่านแบบมีเงื่อนไข / ข้อสังเกต',
                            activeCls: 'bg-amber-500 text-white border-amber-500',
                          },
                          { id: 'FAIL', label: '✕ ไม่ผ่าน / ต้องทดสอบซ้ำ', activeCls: 'bg-rose-600 text-white border-rose-600' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            updateActiveRecord((r) => ({
                              ...r,
                              metadata: { ...r.metadata, overallConclusion: opt.id },
                            }))
                          }
                          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                            activeRecord.metadata.overallConclusion === opt.id
                              ? opt.activeCls
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      บันทึกสรุป / ข้อสังเกต / รายการที่ต้องแก้ไข (Findings & Remarks)
                    </label>
                    <textarea
                      rows={4}
                      value={activeRecord.metadata.overallSummaryNote}
                      onChange={(e) =>
                        updateActiveRecord((r) => ({
                          ...r,
                          metadata: { ...r.metadata, overallSummaryNote: e.target.value },
                        }))
                      }
                      placeholder="สรุปเหตุการณ์สำคัญระหว่างการทดสอบ เช่น จำนวน Valid Runs, เหตุการณ์ที่ต้องเก็บซ้ำ หรือข้อเสนอแนะ..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                    />
                  </div>

                  {/* Dual Signature Pads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-200">
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <SignaturePad
                        label="ลายเซ็นผู้ควบคุมงาน (Company Supervisor)"
                        dataUrl={activeRecord.inspectorSignature.dataUrl}
                        onChange={(dataUrl) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            inspectorSignature: {
                              ...r.inspectorSignature,
                              dataUrl,
                              signedAt: new Date().toISOString(),
                            },
                          }))
                        }
                      />
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          value={activeRecord.inspectorSignature.name || activeRecord.metadata.inspectorName}
                          onChange={(e) =>
                            updateActiveRecord((r) => ({
                              ...r,
                              inspectorSignature: { ...r.inspectorSignature, name: e.target.value },
                            }))
                          }
                          placeholder="ชื่อ-สกุล ผู้ควบคุมงาน"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="text"
                          value={activeRecord.inspectorSignature.position}
                          onChange={(e) =>
                            updateActiveRecord((r) => ({
                              ...r,
                              inspectorSignature: { ...r.inspectorSignature, position: e.target.value },
                            }))
                          }
                          placeholder="ตำแหน่ง"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <SignaturePad
                        label="ลายเซ็นหัวหน้าทีม Sub-contractor"
                        dataUrl={activeRecord.subcontractorSignature.dataUrl}
                        onChange={(dataUrl) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            subcontractorSignature: {
                              ...r.subcontractorSignature,
                              dataUrl,
                              signedAt: new Date().toISOString(),
                            },
                          }))
                        }
                      />
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          value={
                            activeRecord.subcontractorSignature.name ||
                            activeRecord.metadata.subcontractorLead
                          }
                          onChange={(e) =>
                            updateActiveRecord((r) => ({
                              ...r,
                              subcontractorSignature: { ...r.subcontractorSignature, name: e.target.value },
                            }))
                          }
                          placeholder="ชื่อ-สกุล หัวหน้าทีมตรวจวัด"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="text"
                          value={activeRecord.subcontractorSignature.position}
                          onChange={(e) =>
                            updateActiveRecord((r) => ({
                              ...r,
                              subcontractorSignature: { ...r.subcontractorSignature, position: e.target.value },
                            }))
                          }
                          placeholder="ตำแหน่ง"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional Approver Info for PDF Sign-Off */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-700">
                      ข้อมูลผู้อนุมัติ / ผู้ตรวจสอบรายงาน (ช่องลงนามที่ 3 บนรายงาน PDF — ไม่บังคับกรอก)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={activeRecord.approverSignature?.name || ''}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            approverSignature: {
                              name: e.target.value,
                              position: r.approverSignature?.position || 'ผู้จัดการฝ่ายสิ่งแวดล้อม / ผู้อนุมัติ',
                              company: r.metadata.companyName,
                              dataUrl: r.approverSignature?.dataUrl || '',
                            },
                          }))
                        }
                        placeholder="ชื่อ-สกุล ผู้อนุมัติ (เช่น นายวิชัย ผู้จัดการฝ่ายสิ่งแวดล้อม)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        value={activeRecord.approverSignature?.position || ''}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            approverSignature: {
                              name: r.approverSignature?.name || '',
                              position: e.target.value,
                              company: r.metadata.companyName,
                              dataUrl: r.approverSignature?.dataUrl || '',
                            },
                          }))
                        }
                        placeholder="ตำแหน่งผู้อนุมัติ (เช่น ผู้จัดการฝ่าย EHS)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  {/* Final Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSyncToGoogleSheet}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
                      >
                        <CloudUpload className="w-4 h-4" />
                        {syncing ? 'กำลังบันทึกลง Google Sheet...' : 'บันทึกลง Google Sheet'}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAuditCsv(activeRecord, applicableItems)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadRecordBackupJson(activeRecord)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                        title="ดาวน์โหลดไฟล์สำรองพร้อมรูปถ่ายทั้งหมด"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        Backup JSON
                      </button>
                      {activeRecord.driveFolderUrl && (
                        <a
                          href={activeRecord.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold"
                        >
                          โฟลเดอร์รูป Drive <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setView('PDF_PREVIEW')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      ดูตัวอย่างและสร้างไฟล์ PDF ทันที
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        );
      })()}

      {/* Help Guide Slide-over / Bottom Sheet */}
      <HelpGuideDrawer item={guideItem} onClose={() => setGuideItem(null)} />

      {/* Google Sheets Settings Modal */}
      <GoogleSheetsModal
        open={showSettingsModal}
        config={config}
        checklistItems={masterItems}
        onSaveConfig={setConfig}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Checklist Master Database Modal */}
      <ChecklistMasterModal
        open={showMasterModal}
        items={masterItems}
        onSaveItems={setMasterItems}
        onResetDefault={() => setMasterItems(STANDARD_CHECKLIST)}
        onClose={() => setShowMasterModal(false)}
      />

      {/* Fullscreen Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 no-print"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
              <div className="text-sm font-bold">
                {lightboxPhoto.photoCode} — {lightboxPhoto.caption}
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxPhoto.dataUrl}
              alt={lightboxPhoto.caption}
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            <div className="px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ถ่ายเมื่อ: {new Date(lightboxPhoto.capturedAt).toLocaleString('th-TH')}
              </span>
              <span>{lightboxPhoto.watermarkApplied ? 'ประทับลายน้ำ Timestamp แล้ว' : 'ไม่มีลายน้ำ'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function ToastBanner({
  toast,
  onClose,
}: {
  toast: { type: 'success' | 'error' | 'info'; text: string };
  onClose: () => void;
}) {
  const cls =
    toast.type === 'success'
      ? 'bg-emerald-700 text-white'
      : toast.type === 'error'
        ? 'bg-rose-700 text-white'
        : 'bg-slate-900 text-white';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md no-print">
      <div className={`px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-3 ${cls}`}>
        <span>{toast.text}</span>
        <button type="button" onClick={onClose} className="opacity-80 hover:opacity-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
