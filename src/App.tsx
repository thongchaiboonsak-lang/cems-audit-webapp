import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CloudUpload,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Flame,
  FolderOpen,
  Gauge,
  Info,
  Layers,
  Lock,
  LogOut,
  PenTool,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Users,
  Wifi,
  WifiOff,
  Wind,
  X,
  XCircle,
} from 'lucide-react';
import { AdminLoginModal } from './components/AdminLoginModal';
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
import { downloadAuditCsv, syncRecordToGoogleSheet } from './utils/googleSheets';

const STORAGE_MASTER_KEY = 'cems_checklist_master_v3';
const STORAGE_CONFIG_KEY = 'cems_gsheet_config_v1';
const SESSION_ADMIN_KEY = 'cems_admin_authenticated_v1';

const DEFAULT_GOOGLE_SHEET_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbyJV_VpRim_yygWfC4-fBcHxCncCDAParyghgufWAKltinKKL9nO2YUgj896ilo-lsO/exec';

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
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_ADMIN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);

  const [masterItems, setMasterItems] = useState<ChecklistItemDef[]>(() =>
    loadFromStorage<ChecklistItemDef[]>(STORAGE_MASTER_KEY, STANDARD_CHECKLIST)
  );
  const [config, setConfig] = useState<GoogleSheetConfig>(() => {
    const saved = loadFromStorage<Partial<GoogleSheetConfig>>(STORAGE_CONFIG_KEY, {});
    return {
      webAppUrl: saved.webAppUrl?.trim() ? saved.webAppUrl : DEFAULT_GOOGLE_SHEET_WEBAPP_URL,
      autoWatermark: saved.autoWatermark ?? true,
      uploadPhotosToDrive: saved.uploadPhotosToDrive ?? true,
      defaultCompanyName: saved.defaultCompanyName || 'บริษัท ตัวอย่าง อินดัสเทรียล จำกัด (มหาชน)',
      companyLogoDataUrl: saved.companyLogoDataUrl,
    };
  });

  const [view, setView] = useState<AppView>('DASHBOARD');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('STAGE_1');
  const [itemFilter, setItemFilter] = useState<ItemFilter>('ALL');
  const [stageSearch, setStageSearch] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState<'ALL' | AuditType>('ALL');

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

  // ESC key to close photo lightbox
  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxPhoto(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxPhoto]);

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
    setItemFilter('ALL');
    setStageSearch('');
    setView('WORKSPACE');
    showToast('info', `สร้างงานตรวจใหม่ (${newRec.metadata.docNumber}) เรียบร้อยแล้ว`);
  };

  const handleLoadDemoJob = () => {
    const demo = createDemoAuditRecord();
    setRecords((prev) => [demo, ...prev]);
    setActiveRecordId(demo.id);
    setActiveTab('STAGE_1');
    setItemFilter('ALL');
    setStageSearch('');
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

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem(SESSION_ADMIN_KEY, '1');
    } catch {
      // ignore sessionStorage error
    }
    setShowAdminLoginModal(false);
    showToast('success', 'เข้าสู่โหมดผู้ดูแลระบบ (Admin) เรียบร้อยแล้ว');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem(SESSION_ADMIN_KEY);
    } catch {
      // ignore sessionStorage error
    }
    setShowSettingsModal(false);
    setShowMasterModal(false);
    showToast('info', 'ออกจากโหมดผู้ดูแลระบบแล้ว');
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
    const pending = Math.max(0, items.length - checked);
    const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
    return { total: items.length, checked, pending, pass, fail, na, photos, pct };
  };

  // Global Dashboard KPIs
  const dashboardOverview = useMemo(() => {
    let totalPhotos = 0;
    let syncedCount = 0;
    let pctSum = 0;
    records.forEach((rec) => {
      const st = computeRecordStats(rec);
      totalPhotos += st.photos;
      pctSum += st.pct;
      if (rec.syncedAt) syncedCount++;
    });
    const avgPct = records.length > 0 ? Math.round(pctSum / records.length) : 0;
    return {
      totalJobs: records.length,
      avgPct,
      totalPhotos,
      syncedCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, masterItems]);

  const filteredDashboardRecords = useMemo(() => {
    return records.filter((rec) => {
      if (dashboardTypeFilter !== 'ALL' && rec.metadata.auditType !== dashboardTypeFilter) {
        return false;
      }
      if (!dashboardSearch.trim()) return true;
      const q = dashboardSearch.toLowerCase();
      return (
        rec.metadata.docNumber.toLowerCase().includes(q) ||
        rec.metadata.stackName.toLowerCase().includes(q) ||
        rec.metadata.plantName.toLowerCase().includes(q) ||
        rec.metadata.subcontractorName.toLowerCase().includes(q)
      );
    });
  }, [records, dashboardSearch, dashboardTypeFilter]);

  const formInputCls =
    'w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition';

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
          open={isAdmin && showSettingsModal}
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
    <div className="min-h-screen app-surface-bg text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl text-white border-b border-white/10 shadow-lg shadow-slate-950/10 no-print">
        <div className="h-[2.5px] w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {view === 'WORKSPACE' ? (
              <button
                type="button"
                onClick={() => setView('DASHBOARD')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-100 transition active:scale-95 cursor-pointer flex-shrink-0"
                title="กลับหน้าหลัก"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20 flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base tracking-tight truncate flex items-center gap-2">
                {view === 'WORKSPACE' && activeRecord ? (
                  <>
                    <span className="font-mono-code text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-sky-300 border border-blue-400/30">
                      {activeRecord.metadata.docNumber}
                    </span>
                    <span className="truncate">
                      {activeRecord.metadata.stackName || 'ยังไม่ระบุชื่อปล่อง'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>CEMS Audit Supervisor</span>
                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-sky-300 border border-blue-400/25">
                      EPA Field Suite
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {view === 'WORKSPACE' && activeRecord
                  ? `โหมดตรวจวัด: ${activeRecord.metadata.auditType} • บันทึกอัตโนมัติในเครื่อง (IndexedDB)`
                  : 'ระบบควบคุมการตรวจสอบ CEMS (RATA & Correlation Test) + รายงาน PDF & Google Sheet'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title={isOnline ? 'ออนไลน์ • พร้อมซิงค์ข้อมูล' : 'ออฟไลน์ • ข้อมูลถูกบันทึกในเครื่อง (IndexedDB)'}
            >
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </span>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline Safe'}
            </span>

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowMasterModal(true)}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  <BookMarked className="w-3.5 h-3.5 text-sky-400" />
                  <span>Checklist ({masterItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
                  title="ตั้งค่าและเชื่อมต่อ Google Sheet"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Google Sheet</span>
                  {config.webAppUrl.trim() && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="เชื่อมต่อแล้ว" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/35 text-xs font-bold transition cursor-pointer"
                  title="ออกจากโหมดผู้ดูแลระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 border border-white/10 text-xs font-semibold transition cursor-pointer"
                title="เข้าสู่ระบบผู้ดูแลเพื่อจัดการฐานข้อมูล"
              >
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>ผู้ดูแลระบบ</span>
              </button>
            )}

            {view === 'WORKSPACE' && activeRecord && (
              <button
                type="button"
                onClick={() => setView('PDF_PREVIEW')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition active:scale-[0.98] cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>ออกรายงาน PDF</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================== DASHBOARD VIEW ==================== */}
      {view === 'DASHBOARD' && (
        <main className="max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-7 flex-1 animate-fade-in">
          {/* Hero Action Section */}
          <section className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 lg:p-9 shadow-2xl shadow-slate-900/20 border border-white/10 overflow-hidden">
            {/* Ambient decorative lighting & grid */}
            <div className="pointer-events-none absolute inset-0 tech-grid-pattern opacity-70" />
            <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-cyan-400/15 blur-3xl" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-sky-300">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>มาตรฐาน US EPA PS-2 / PS-11 / Method 5 &amp; 7E • คู่มือหน้างานครบทุกข้อ</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold leading-[1.22] tracking-tight">
                  ควบคุมงาน Sub-contract{' '}
                  <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                    ตรวจวัด CEMS
                  </span>{' '}
                  ได้แม่นยำและออก PDF ทันที
                </h1>

                <p className="text-sm text-slate-300/95 leading-relaxed max-w-2xl">
                  เช็คลิสต์ครบ 4 ระยะตั้งแต่ก่อนเริ่มงาน ระหว่างเก็บตัวอย่าง จนถึงยืนยันข้อมูลดิบ CEMS
                  แนบภาพถ่ายหลักฐานประทับวัน-เวลาอัตโนมัติ มีคู่มืออธิบายทุกหัวข้อ พร้อมซิงค์ประวัติลง Google Sheet
                </p>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateNewJob('BOTH')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-blue-600/30 ring-1 ring-white/20 transition-all duration-150 active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>เริ่มงานตรวจใหม่ (RATA + Correlation)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateNewJob('RATA')}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/18 backdrop-blur-md text-white text-sm font-semibold border border-white/15 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-sky-300" />
                    <span>เฉพาะ RATA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateNewJob('CORRELATION')}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/18 backdrop-blur-md text-white text-sm font-semibold border border-white/15 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Wind className="w-4 h-4 text-amber-300" />
                    <span>เฉพาะ Correlation (PM)</span>
                  </button>
                </div>
              </div>

              {/* Right Telemetry Bento Stats */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 hover:bg-white/[0.1] transition">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span>งานตรวจทั้งหมด</span>
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight">
                    {dashboardOverview.totalJobs}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">บันทึกในเครื่อง (Offline Safe)</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 hover:bg-white/[0.1] transition">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span>ความคืบหน้าเฉลี่ย</span>
                    <Gauge className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-emerald-300">
                    {dashboardOverview.avgPct}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">จาก Checklist มาตรฐาน</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 hover:bg-white/[0.1] transition">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span>ภาพหลักฐานรวม</span>
                    <Camera className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight">
                    {dashboardOverview.totalPhotos}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">ประทับลายน้ำอัตโนมัติ</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 hover:bg-white/[0.1] transition">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span>ซิงค์ Google Sheet</span>
                    <CloudUpload className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-sky-300">
                    {dashboardOverview.syncedCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {config.webAppUrl.trim() ? 'เชื่อมต่อ Cloud แล้ว' : 'รอตั้งค่า URL'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Admin-Only Management Cards */}
          {isAdmin ? (
            <section className="space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  ส่วนจัดการข้อมูลผู้ดูแลระบบ (Admin Mode)
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ล็อก / ออกจากระบบผู้ดูแล
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={handleLoadDemoJob}
                  className="group text-left p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/8 hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/25">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition">
                      ทดลองใช้ด้วยข้อมูลตัวอย่าง (Demo)
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      โหลดใบงานตัวอย่างพร้อมผลตรวจและรูปหลักฐาน เพื่อทดลองดูคู่มือและออกรายงาน PDF ทันที
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMasterModal(true)}
                  className="group text-left p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/8 hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/25">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition tabular-nums">
                      ฐานข้อมูล Checklist ({masterItems.length} ข้อ)
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      เพิ่ม/แก้ไขหัวข้อตรวจเช็ค คำอธิบาย เกณฑ์มาตรฐาน และส่งออกไฟล์ Master CSV
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="group text-left p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/8 hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/25">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 group-hover:text-emerald-700 transition">
                      <span>เชื่อมต่อ Google Sheet</span>
                      {config.webAppUrl.trim() ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          เชื่อมต่อแล้ว
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          ยังไม่ตั้งค่า
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ตั้งค่าโลโก้บริษัท และลิงก์ Apps Script เพื่อซิงค์ประวัติการตรวจและภาพถ่ายลง Cloud
                    </p>
                  </div>
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 border border-slate-200/80">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800">
                    ส่วนจัดการข้อมูลระบบ (Checklist มาตรฐาน / ตั้งค่า Google Sheet / โหมดทดลอง Demo)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    สงวนสิทธิ์เฉพาะผู้ดูแลระบบ — เข้าสู่ระบบเพื่อจัดการฐานข้อมูลหัวข้อตรวจหรือเชื่อมต่อ Cloud
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                เข้าสู่ระบบผู้ดูแล
              </button>
            </section>
          )}

          {/* Saved Audit Jobs List */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 inline-flex items-center justify-center">
                    <FolderOpen className="w-4 h-4" />
                  </span>
                  <span>รายการงานตรวจสอบในเครื่อง</span>
                </h2>
                <span className="tabular-nums text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                  {records.length} งาน
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Auto-Save (IndexedDB)
                </span>
              </div>

              {records.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dashboardSearch}
                      onChange={(e) => setDashboardSearch(e.target.value)}
                      placeholder="ค้นหาเลขที่เอกสาร, ปล่อง, Sub-con..."
                      className="w-full sm:w-60 pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90">
                    {(
                      [
                        { id: 'ALL', label: 'ทั้งหมด' },
                        { id: 'BOTH', label: 'RATA+PM' },
                        { id: 'RATA', label: 'RATA' },
                        { id: 'CORRELATION', label: 'PM' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDashboardTypeFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          dashboardTypeFilter === f.id
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {records.length === 0 ? (
              <div className="relative rounded-3xl border-2 border-dashed border-slate-300/90 bg-white/80 backdrop-blur-sm py-14 px-6 text-center overflow-hidden">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 border border-blue-200/70 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <div className="font-extrabold text-slate-800 text-base sm:text-lg">
                  ยังไม่มีรายการงานตรวจสอบในเครื่อง
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                  เริ่มต้นสร้างใบงานตรวจสอบ CEMS ใหม่ได้ทันที ข้อมูลและภาพถ่ายทั้งหมดจะถูกบันทึกอัตโนมัติแม้อยู่ในพื้นที่ไม่มีสัญญาณอินเทอร์เน็ต
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCreateNewJob('BOTH')}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    สร้างงานตรวจใหม่ (RATA + Correlation)
                  </button>
                </div>
              </div>
            ) : filteredDashboardRecords.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200/80 py-10 text-center text-sm text-slate-500">
                ไม่พบงานตรวจสอบที่ตรงกับคำค้นหาหรือตัวกรอง
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDashboardRecords.map((rec) => {
                  const st = computeRecordStats(rec);
                  const passWidth = st.total > 0 ? (st.pass / st.total) * 100 : 0;
                  const failWidth = st.total > 0 ? (st.fail / st.total) * 100 : 0;
                  const naWidth = st.total > 0 ? (st.na / st.total) * 100 : 0;

                  const conclusionMeta = {
                    PASS: {
                      bar: 'from-emerald-500 to-teal-400',
                      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      label: 'ผ่านเกณฑ์',
                    },
                    PASS_WITH_CONDITION: {
                      bar: 'from-amber-400 to-orange-400',
                      badge: 'bg-amber-50 text-amber-800 border-amber-200',
                      label: 'ผ่านแบบมีเงื่อนไข',
                    },
                    FAIL: {
                      bar: 'from-rose-500 to-pink-500',
                      badge: 'bg-rose-50 text-rose-700 border-rose-200',
                      label: 'ไม่ผ่าน',
                    },
                    IN_PROGRESS: {
                      bar: 'from-blue-500 to-cyan-400',
                      badge: 'bg-blue-50 text-blue-700 border-blue-200',
                      label: 'กำลังตรวจวัด',
                    },
                  }[rec.metadata.overallConclusion];

                  return (
                    <div
                      key={rec.id}
                      className="group relative rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:shadow-slate-900/6 hover:border-blue-300/80 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Top Status Gradient Strip */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${conclusionMeta.bar}`} />

                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono-code px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
                                  {rec.metadata.docNumber}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold">
                                  {rec.metadata.auditType}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${conclusionMeta.badge}`}
                                >
                                  {conclusionMeta.label}
                                </span>
                                {rec.syncedAt && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                                    <CloudUpload className="w-3 h-3" />
                                    ซิงค์แล้ว
                                  </span>
                                )}
                              </div>
                              <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-blue-700 transition truncate">
                                {rec.metadata.stackName || 'ยังไม่ระบุชื่อปล่อง (Stack)'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  {rec.metadata.subcontractorName || 'ยังไม่ระบุ Sub-contract'}
                                </span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  {rec.metadata.auditDate}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(rec.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
                              title="ลบงานนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Multi-segment Progress Bar */}
                          <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-700 font-bold tabular-nums">
                                ตรวจแล้ว {st.checked} / {st.total} ข้อ ({st.pct}%)
                              </span>
                              <span className="flex items-center gap-2.5 text-[11px] font-bold tabular-nums">
                                <span className="text-emerald-600">ผ่าน {st.pass}</span>
                                {st.fail > 0 && <span className="text-rose-600">ไม่ผ่าน {st.fail}</span>}
                                <span className="text-sky-600 inline-flex items-center gap-0.5">
                                  <Camera className="w-3 h-3" /> {st.photos}
                                </span>
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden flex">
                              {passWidth > 0 && (
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300"
                                  style={{ width: `${passWidth}%` }}
                                />
                              )}
                              {failWidth > 0 && (
                                <div
                                  className="h-full bg-rose-500 transition-all duration-300"
                                  style={{ width: `${failWidth}%` }}
                                />
                              )}
                              {naWidth > 0 && (
                                <div
                                  className="h-full bg-slate-400 transition-all duration-300"
                                  style={{ width: `${naWidth}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRecordId(rec.id);
                              setActiveTab('STAGE_1');
                              setItemFilter('ALL');
                              setStageSearch('');
                              setView('WORKSPACE');
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all duration-150 cursor-pointer"
                          >
                            <span>เปิดตรวจเช็คต่อ</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRecordId(rec.id);
                              setView('PDF_PREVIEW');
                            }}
                            className="py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>รายงาน PDF</span>
                          </button>
                        </div>
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
        const passPct = stats.total > 0 ? (stats.pass / stats.total) * 100 : 0;
        const failPct = stats.total > 0 ? (stats.fail / stats.total) * 100 : 0;
        const naPct = stats.total > 0 ? (stats.na / stats.total) * 100 : 0;

        const updateResponse = (itemId: string, updated: AuditResponse) => {
          updateActiveRecord((rec) => ({
            ...rec,
            responses: { ...rec.responses, [itemId]: updated },
          }));
        };

        const renderStageTab = (stageNum: StageNumber) => {
          const stageMeta = STAGES.find((s) => s.number === stageNum)!;
          const stageItems = applicableItems.filter((i) => i.stage === stageNum);

          const pendingInStage = stageItems.filter(
            (i) => (activeRecord.responses[i.id]?.status || 'PENDING') === 'PENDING'
          ).length;
          const failInStage = stageItems.filter(
            (i) => activeRecord.responses[i.id]?.status === 'FAIL'
          ).length;
          const photoInStage = stageItems.filter(
            (i) => (activeRecord.responses[i.id]?.photos?.length || 0) > 0
          ).length;

          const filtered = stageItems.filter((item) => {
            const resp = activeRecord.responses[item.id];
            const status = resp?.status || 'PENDING';
            if (itemFilter === 'PENDING' && status !== 'PENDING') return false;
            if (itemFilter === 'FAIL' && status !== 'FAIL') return false;
            if (itemFilter === 'HAS_PHOTO' && (resp?.photos?.length || 0) === 0) return false;
            if (stageSearch.trim()) {
              const q = stageSearch.toLowerCase();
              return (
                item.code.toLowerCase().includes(q) ||
                item.title.toLowerCase().includes(q) ||
                item.shortTooltip.toLowerCase().includes(q)
              );
            }
            return true;
          });

          return (
            <div className="space-y-4 animate-fade-in">
              {/* Stage Header & Smart Filters */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-blue-600/20 flex-shrink-0 tabular-nums">
                      0{stageNum}
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        {stageMeta.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{stageMeta.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Filter Chips + Quick Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: 'ทั้งหมด', count: stageItems.length },
                        { id: 'PENDING', label: 'ยังไม่ตรวจ', count: pendingInStage },
                        { id: 'FAIL', label: 'ไม่ผ่าน', count: failInStage },
                        { id: 'HAS_PHOTO', label: 'มีรูปแล้ว', count: photoInStage },
                      ] as const
                    ).map((f) => {
                      const active = itemFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setItemFilter(f.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            active
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`tabular-nums px-1.5 py-0.2 rounded-md text-[10px] ${
                              active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                            }`}
                          >
                            {f.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stageSearch}
                      onChange={(e) => setStageSearch(e.target.value)}
                      placeholder="ค้นหาข้อตรวจในระยะนี้..."
                      className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50/70 border border-blue-100 text-xs text-blue-950">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="leading-relaxed">
                    <strong>ไม่เข้าใจข้อไหน?</strong> ชี้เมาส์ที่ชื่อหัวข้อเพื่อดูสรุปย่อ หรือกดปุ่ม{' '}
                    <strong>&ldquo;วิธีตรวจ / คู่มือ&rdquo;</strong> เพื่อเปิดขั้นตอนละเอียด เกณฑ์ผ่าน และมุมถ่ายรูปหลักฐาน
                  </span>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200/80 py-12 text-center space-y-2">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-600">ไม่พบหัวข้อตามตัวกรองที่เลือกในระยะนี้</div>
                  {(itemFilter !== 'ALL' || stageSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemFilter('ALL');
                        setStageSearch('');
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      แสดงหัวข้อทั้งหมดใน Stage {stageNum}
                    </button>
                  )}
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
              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (stageNum === 1) setActiveTab('SETUP');
                    else setActiveTab(`STAGE_${stageNum - 1}` as WorkspaceTab);
                    setItemFilter('ALL');
                    setStageSearch('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (stageNum < 4) setActiveTab(`STAGE_${stageNum + 1}` as WorkspaceTab);
                    else setActiveTab('SIGNOFF');
                    setItemFilter('ALL');
                    setStageSearch('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition active:scale-[0.98] cursor-pointer"
                >
                  <span>{stageNum < 4 ? `ไปต่อ Stage ${stageNum + 1}` : 'ไปหน้าสรุปผล & ลงนาม'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        };

        return (
          <main className="max-w-5xl w-full mx-auto px-4 py-5 space-y-5 flex-1">
            {/* Live Progress Telemetry Card */}
            <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    ความคืบหน้าการตรวจเช็ค
                  </span>
                  <span className="tabular-nums px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-extrabold">
                    {stats.checked} / {stats.total} ข้อ ({stats.pct}%)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน {stats.pass}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70 inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> ไม่ผ่าน {stats.fail}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                    N/A {stats.na}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/70 inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> {stats.photos} รูป
                  </span>
                </div>
              </div>

              {/* Multi-segment color-coded bar */}
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex p-0.5 gap-0.5">
                {passPct > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${passPct}%` }}
                  />
                )}
                {failPct > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${failPct}%` }}
                  />
                )}
                {naPct > 0 && (
                  <div
                    className="h-full bg-slate-400 rounded-full transition-all duration-300"
                    style={{ width: `${naPct}%` }}
                  />
                )}
              </div>
            </div>

            {/* 6-Step Interactive Workflow Stepper */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar no-print">
              {(
                [
                  { id: 'SETUP', label: 'ข้อมูลงาน', icon: Layers },
                  { id: 'STAGE_1', label: 'Stage 1: เตรียมพร้อม', stage: 1 },
                  { id: 'STAGE_2', label: 'Stage 2: Pre-Test', stage: 2 },
                  { id: 'STAGE_3', label: 'Stage 3: ระหว่างตรวจ', stage: 3 },
                  { id: 'STAGE_4', label: 'Stage 4: หลังตรวจ', stage: 4 },
                  { id: 'SIGNOFF', label: 'สรุปผล & ลงนาม', icon: PenTool },
                ] as Array<{
                  id: WorkspaceTab;
                  label: string;
                  stage?: StageNumber;
                  icon?: typeof Layers;
                }>
              ).map((tab) => {
                let badge = '';
                let stageComplete = false;
                let stageHasFail = false;
                if (tab.stage) {
                  const sItems = applicableItems.filter((i) => i.stage === tab.stage);
                  const sDone = sItems.filter(
                    (i) => (activeRecord.responses[i.id]?.status || 'PENDING') !== 'PENDING'
                  ).length;
                  stageHasFail = sItems.some(
                    (i) => activeRecord.responses[i.id]?.status === 'FAIL'
                  );
                  stageComplete = sItems.length > 0 && sDone === sItems.length;
                  badge = `${sDone}/${sItems.length}`;
                }
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setItemFilter('ALL');
                      setStageSearch('');
                    }}
                    className={`relative flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/15'
                        : 'bg-white text-slate-600 border-slate-200/90 hover:border-blue-300 hover:text-slate-900 hover:bg-blue-50/40'
                    }`}
                  >
                    {TabIcon ? (
                      <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    ) : stageComplete ? (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          stageHasFail
                            ? 'text-rose-400'
                            : isActive
                              ? 'text-emerald-400'
                              : 'text-emerald-500'
                        }`}
                      />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          stageHasFail
                            ? 'bg-rose-500'
                            : isActive
                              ? 'bg-sky-400'
                              : 'bg-slate-300'
                        }`}
                      />
                    )}
                    <span>{tab.label}</span>
                    {badge && (
                      <span
                        className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/15 text-white'
                            : stageComplete
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
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
              <div className="space-y-5 animate-fade-in">
                <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
                  <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 flex-shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        ข้อมูลพื้นฐานงานตรวจสอบ CEMS Audit
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ข้อมูลส่วนนี้จะแสดงบนหัวรายงาน PDF และใช้ในการปั๊มลายน้ำบนรูปถ่ายหลักฐานทุกใบ
                      </p>
                    </div>
                  </div>

                  {/* Audit Type Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2.5">
                      ประเภทการ Audit (ระบบคัดเลือกหัวข้อ Checklist ให้ตรงตามมาตรฐานโดยอัตโนมัติ)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          {
                            id: 'RATA',
                            title: 'RATA',
                            desc: 'Gas / Flow CEMS (PS-2, PS-3, PS-4)',
                            icon: Flame,
                            accent: 'text-indigo-600 bg-indigo-50',
                          },
                          {
                            id: 'CORRELATION',
                            title: 'Correlation Test',
                            desc: 'PM / Dust CEMS (PS-11, Method 5/17)',
                            icon: Wind,
                            accent: 'text-amber-600 bg-amber-50',
                          },
                          {
                            id: 'BOTH',
                            title: 'RATA + Correlation',
                            desc: 'ทำทั้งก๊าซและฝุ่นในงานเดียวกัน',
                            icon: ShieldCheck,
                            accent: 'text-blue-600 bg-blue-50',
                          },
                        ] as const
                      ).map((opt) => {
                        const selected = activeRecord.metadata.auditType === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateActiveRecord((rec) => ({
                                ...rec,
                                metadata: { ...rec.metadata, auditType: opt.id },
                              }))
                            }
                            className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer ${
                              selected
                                ? 'bg-blue-50/70 border-blue-500 shadow-sm shadow-blue-500/10'
                                : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                            }`}
                          >
                            {selected && (
                              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white inline-flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                            <div
                              className={`w-9 h-9 rounded-xl ${opt.accent} inline-flex items-center justify-center mb-2.5`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="font-extrabold text-sm text-slate-900">{opt.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">เลขที่เอกสาร</label>
                      <input
                        type="text"
                        value={activeRecord.metadata.docNumber}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, docNumber: e.target.value },
                          }))
                        }
                        className={`${formInputCls} font-mono-code font-semibold`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">วันที่ดำเนินการตรวจวัด</label>
                      <input
                        type="date"
                        value={activeRecord.metadata.auditDate}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, auditDate: e.target.value },
                          }))
                        }
                        className={formInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อบริษัทเจ้าของโรงงาน</label>
                      <input
                        type="text"
                        value={activeRecord.metadata.companyName}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, companyName: e.target.value },
                          }))
                        }
                        className={formInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">โรงงาน / หน่วยผลิต (Unit)</label>
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
                        className={formInputCls}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        ชื่อปล่องระบายอากาศ (Stack Name / ID) <span className="text-rose-500">*</span>
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
                        className={formInputCls}
                      />
                    </div>
                  </div>

                  {/* Parameters */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-2.5">
                      พารามิเตอร์ที่ทำการ Audit ({activeRecord.metadata.parameters.length} รายการ)
                    </label>
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
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 cursor-pointer ${
                              selected
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                            }`}
                          >
                            {selected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            <span>{param}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-contractor & Inspector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                        className={formInputCls}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">ทะเบียน ว. (กรอ.)</label>
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
                          className={formInputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">หัวหน้าทีม Sub-con</label>
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
                          className={formInputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                        className={formInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">แผนก / ฝ่าย</label>
                      <input
                        type="text"
                        value={activeRecord.metadata.inspectorDept}
                        onChange={(e) =>
                          updateActiveRecord((r) => ({
                            ...r,
                            metadata: { ...r.metadata, inspectorDept: e.target.value },
                          }))
                        }
                        className={formInputCls}
                      />
                    </div>
                  </div>

                  {/* Manpower & Vehicles Section */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/35 border border-slate-200/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-blue-600 text-white inline-flex items-center justify-center shadow-xs">
                          <Users className="w-4 h-4" />
                        </span>
                        กำลังพลและยานพาหนะของ Sub-contractor หน้างาน
                      </div>
                      {(() => {
                        const top = parseInt(activeRecord.metadata.workersTopCount || '0', 10) || 0;
                        const bottom = parseInt(activeRecord.metadata.workersBottomCount || '0', 10) || 0;
                        const total = top + bottom;
                        return (
                          <span className="tabular-nums px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                            รวมผู้ปฏิบัติงานทั้งหมด: {total} คน
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          ผู้ปฏิบัติงานด้านบน (คน)
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
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          ผู้ปฏิบัติงานด้านล่าง (คน)
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
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          จำนวนรถยนต์ (คัน)
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
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        ชนิดรถยนต์ที่นำมาใช้งาน (พิมพ์เองหรือกดเพิ่มด่วนด้านล่าง)
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
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
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
                            className="px-3 py-1 rounded-xl bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 text-[11px] font-semibold shadow-2xs transition cursor-pointer"
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
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition active:scale-[0.98] cursor-pointer"
                    >
                      <span>เริ่มตรวจเช็ค Stage 1</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
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
              <div className="space-y-5 animate-fade-in">
                <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
                  <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 flex-shrink-0">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        สรุปผลการตรวจสอบและลงนามรับรองทั้ง 2 ฝ่าย
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ตรวจสอบสรุปยอดผลตรวจ ประเมินภาพรวม และเซ็นรับรองก่อนออกรายงาน PDF หรือซิงค์ขึ้น Google Sheet
                      </p>
                    </div>
                  </div>

                  {/* Executive Readiness Mini KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                      <div className="text-[11px] font-bold text-emerald-700">ผ่านมาตรฐาน (Pass)</div>
                      <div className="text-2xl font-extrabold text-emerald-800 tabular-nums mt-0.5">
                        {stats.pass}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80">
                      <div className="text-[11px] font-bold text-rose-700">ไม่ผ่าน (Fail)</div>
                      <div className="text-2xl font-extrabold text-rose-800 tabular-nums mt-0.5">
                        {stats.fail}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                      <div className="text-[11px] font-bold text-amber-800">รอตรวจ (Pending)</div>
                      <div className="text-2xl font-extrabold text-amber-900 tabular-nums mt-0.5">
                        {stats.pending}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200/80">
                      <div className="text-[11px] font-bold text-sky-700">ภาพหลักฐานรวม</div>
                      <div className="text-2xl font-extrabold text-sky-900 tabular-nums mt-0.5">
                        {stats.photos} <span className="text-xs font-bold">รูป</span>
                      </div>
                    </div>
                  </div>

                  {/* Overall Conclusion Cards */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2.5">
                      ผลการประเมินภาพรวมการปฏิบัติงานของ Sub-contractor
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          {
                            id: 'PASS',
                            label: 'ผ่านเกณฑ์มาตรฐาน',
                            sub: 'ปฏิบัติครบถ้วนตามมาตรฐาน EPA',
                            icon: CheckCircle2,
                            activeCls:
                              'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25',
                            idleIcon: 'text-emerald-600',
                          },
                          {
                            id: 'PASS_WITH_CONDITION',
                            label: 'ผ่านแบบมีเงื่อนไข',
                            sub: 'มีข้อสังเกตหรือจุดติดตามแก้ไข',
                            icon: AlertTriangle,
                            activeCls:
                              'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-500 shadow-lg shadow-amber-500/25',
                            idleIcon: 'text-amber-500',
                          },
                          {
                            id: 'FAIL',
                            label: 'ไม่ผ่าน / ทดสอบซ้ำ',
                            sub: 'พบข้อบกพร่องสำคัญต้องแก้ไข',
                            icon: XCircle,
                            activeCls:
                              'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/25',
                            idleIcon: 'text-rose-500',
                          },
                        ] as const
                      ).map((opt) => {
                        const isSelected = activeRecord.metadata.overallConclusion === opt.id;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateActiveRecord((r) => ({
                                ...r,
                                metadata: { ...r.metadata, overallConclusion: opt.id },
                              }))
                            }
                            className={`p-4 rounded-2xl text-left border-2 transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              isSelected
                                ? opt.activeCls
                                : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 mb-2 ${isSelected ? 'text-white' : opt.idleIcon}`}
                            />
                            <div className="text-sm font-extrabold">{opt.label}</div>
                            <div
                              className={`text-[11px] mt-0.5 ${
                                isSelected ? 'text-white/85' : 'text-slate-500'
                              }`}
                            >
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      บันทึกสรุป / ข้อสังเกต / รายการที่ต้องแก้ไข (Findings &amp; Remarks)
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
                      className={formInputCls}
                    />
                  </div>

                  {/* Dual Signature Pads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                      <SignaturePad
                        label="ผู้ควบคุมงาน (Company Supervisor)"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                      <SignaturePad
                        label="หัวหน้าทีม Sub-contractor"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional Approver Info for PDF Sign-Off */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
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
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                  </div>

                  {/* Final Action Dock */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSyncToGoogleSheet}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/20 transition active:scale-[0.98] cursor-pointer"
                      >
                        <CloudUpload className="w-4 h-4" />
                        {syncing ? 'กำลังบันทึกลง Google Sheet...' : 'บันทึกลง Google Sheet'}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAuditCsv(activeRecord, applicableItems)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        ดาวน์โหลด CSV
                      </button>
                      {activeRecord.driveFolderUrl && (
                        <a
                          href={activeRecord.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition"
                        >
                          โฟลเดอร์รูป Drive <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setView('PDF_PREVIEW')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-blue-600/25 transition active:scale-[0.98] cursor-pointer"
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

      {/* Subtle Footer */}
      <footer className="mt-auto py-5 text-center text-[11px] text-slate-400 no-print">
        CEMS Audit Supervisor • US EPA PS-2 / PS-11 Field Control System • ข้อมูลจัดเก็บปลอดภัยในเครื่อง (IndexedDB)
      </footer>

      {/* Help Guide Slide-over / Bottom Sheet */}
      <HelpGuideDrawer item={guideItem} onClose={() => setGuideItem(null)} />

      {/* Admin Login Modal */}
      <AdminLoginModal
        open={showAdminLoginModal}
        onSuccess={handleAdminLoginSuccess}
        onClose={() => setShowAdminLoginModal(false)}
      />

      {/* Google Sheets Settings Modal (Admin Only) */}
      <GoogleSheetsModal
        open={isAdmin && showSettingsModal}
        config={config}
        checklistItems={masterItems}
        onSaveConfig={setConfig}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Checklist Master Database Modal (Admin Only) */}
      <ChecklistMasterModal
        open={isAdmin && showMasterModal}
        items={masterItems}
        onSaveItems={setMasterItems}
        onResetDefault={() => setMasterItems(STANDARD_CHECKLIST)}
        onClose={() => setShowMasterModal(false)}
      />

      {/* Fullscreen Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 no-print animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/15 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 flex items-center justify-between text-white border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono-code px-2 py-0.5 rounded-md bg-blue-500/20 text-sky-300 border border-blue-400/30 text-xs font-bold flex-shrink-0">
                  {lightboxPhoto.photoCode}
                </span>
                <span className="text-sm font-bold truncate">{lightboxPhoto.caption}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxPhoto.dataUrl}
              alt={lightboxPhoto.caption}
              className="w-full max-h-[74vh] object-contain bg-black"
            />
            <div className="px-5 py-3 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                ถ่ายเมื่อ: {new Date(lightboxPhoto.capturedAt).toLocaleString('th-TH')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-medium">
                {lightboxPhoto.watermarkApplied ? '✓ ประทับลายน้ำ Timestamp แล้ว' : 'ไม่มีลายน้ำ'}
              </span>
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
  const cfg =
    toast.type === 'success'
      ? {
          cls: 'bg-emerald-950/95 text-emerald-50 border-emerald-500/40',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
        }
      : toast.type === 'error'
        ? {
            cls: 'bg-rose-950/95 text-rose-50 border-rose-500/40',
            icon: <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
          }
        : {
            cls: 'bg-slate-900/95 text-slate-50 border-white/15',
            icon: <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />,
          };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md no-print animate-slide-up">
      <div
        className={`px-4 py-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 ${cfg.cls}`}
      >
        {cfg.icon}
        <span className="leading-snug">{toast.text}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
