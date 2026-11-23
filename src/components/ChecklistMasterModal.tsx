import { useEffect, useState } from 'react';
import { BookMarked, Download, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import type { ChecklistItemDef, ItemScope, StageNumber } from '../types';
import { downloadChecklistMasterCsv } from '../utils/googleSheets';

interface ChecklistMasterModalProps {
  open: boolean;
  items: ChecklistItemDef[];
  onSaveItems: (items: ChecklistItemDef[]) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export function ChecklistMasterModal({
  open,
  items,
  onSaveItems,
  onResetDefault,
  onClose,
}: ChecklistMasterModalProps) {
  const [formMode, setFormMode] = useState<'NONE' | 'ADD' | 'EDIT'>('NONE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [stageFilter, setStageFilter] = useState<StageNumber | 'ALL'>('ALL');

  const [code, setCode] = useState('');
  const [stage, setStage] = useState<StageNumber>(2);
  const [appliesTo, setAppliesTo] = useState<ItemScope>('COMMON');
  const [title, setTitle] = useState('');
  const [shortTooltip, setShortTooltip] = useState('');
  const [howToCheckText, setHowToCheckText] = useState('');
  const [passCriteria, setPassCriteria] = useState('');
  const [photoGuide, setPhotoGuide] = useState('');
  const [watchOut, setWatchOut] = useState('');
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [referenceStandard, setReferenceStandard] = useState('ข้อกำหนดมาตรฐานบริษัท');

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const resetForm = () => {
    setFormMode('NONE');
    setEditingId(null);
    setCode('');
    setStage(2);
    setAppliesTo('COMMON');
    setTitle('');
    setShortTooltip('');
    setHowToCheckText('');
    setPassCriteria('');
    setPhotoGuide('');
    setWatchOut('');
    setRequirePhoto(true);
    setReferenceStandard('ข้อกำหนดมาตรฐานบริษัท');
  };

  const openAddForm = () => {
    resetForm();
    setFormMode('ADD');
  };

  const openEditForm = (item: ChecklistItemDef) => {
    setFormMode('EDIT');
    setEditingId(item.id);
    setCode(item.code);
    setStage(item.stage);
    setAppliesTo(item.appliesTo);
    setTitle(item.title);
    setShortTooltip(item.shortTooltip);
    setHowToCheckText(item.howToCheck.join('\n'));
    setPassCriteria(item.passCriteria);
    setPhotoGuide(item.photoGuide);
    setWatchOut(item.watchOut);
    setRequirePhoto(item.requirePhoto);
    setReferenceStandard(item.referenceStandard);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;

    const steps = howToCheckText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: ChecklistItemDef = {
      id: editingId || `custom-${Date.now()}`,
      code: code.trim().toUpperCase(),
      stage,
      appliesTo,
      title: title.trim(),
      shortTooltip: shortTooltip.trim() || title.trim(),
      howToCheck: steps.length > 0 ? steps : ['ตรวจสอบตามมาตรฐานที่กำหนด'],
      passCriteria: passCriteria.trim() || 'เป็นไปตามเกณฑ์มาตรฐานที่กำหนด',
      photoGuide: photoGuide.trim() || 'ถ่ายรูปหลักฐานหน้างานให้ชัดเจน',
      watchOut: watchOut.trim() || 'ตรวจสอบความถูกต้องและครบถ้วนก่อนลงนาม',
      requirePhoto,
      referenceStandard: referenceStandard.trim() || 'มาตรฐานภายในบริษัท',
      isCustom: formMode === 'ADD' ? true : undefined,
    };

    if (formMode === 'EDIT' && editingId) {
      onSaveItems(items.map((i) => (i.id === editingId ? { ...i, ...payload } : i)));
    } else {
      onSaveItems([...items, payload]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm('ต้องการลบหัวข้อ Checklist นี้ออกจากฐานข้อมูลใช่หรือไม่?')) return;
    onSaveItems(items.filter((i) => i.id !== id));
    if (editingId === id) resetForm();
  };

  const filteredItems = items.filter((item) => {
    if (stageFilter !== 'ALL' && item.stage !== stageFilter) return false;
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.shortTooltip.toLowerCase().includes(q) ||
      item.appliesTo.toLowerCase().includes(q)
    );
  });

  const inputCls =
    'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm no-print animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white overflow-hidden">
          <div className="pointer-events-none absolute inset-0 tech-grid-pattern opacity-50" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 flex-shrink-0">
                <BookMarked className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight tabular-nums">
                  จัดการฐานข้อมูล Checklist มาตรฐาน ({items.length} หัวข้อ)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  เพิ่ม แก้ไขคำอธิบาย/เกณฑ์ผ่าน ลบ หรือส่งออกเป็น Master CSV สำหรับ RATA & Correlation Test
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

        {/* Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => (formMode === 'NONE' ? openAddForm() : resetForm())}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {formMode === 'NONE' ? 'เพิ่มหัวข้อตรวจใหม่' : 'ปิดแบบฟอร์ม'}
              </button>
              <button
                type="button"
                onClick={() => downloadChecklistMasterCsv(items)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                ส่งออก Master CSV
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="ค้นหารหัสหรือชื่อหัวข้อ..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('คืนค่าหัวข้อ Checklist กลับเป็นชุดมาตรฐานเริ่มต้นทั้งหมด?')) {
                    onResetDefault();
                    resetForm();
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                คืนค่าเริ่มต้น
              </button>
            </div>
          </div>

          {/* Stage Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 1, 2, 3, 4] as const).map((st) => (
              <button
                key={String(st)}
                type="button"
                onClick={() => setStageFilter(st)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  stageFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? `ทั้งหมด (${items.length})` : `Stage ${st}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafd]">
          {formMode !== 'NONE' && (
            <form
              onSubmit={handleSubmit}
              className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200/90 space-y-3.5 shadow-xs animate-slide-up"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-blue-950">
                  {formMode === 'EDIT' ? `แก้ไขหัวข้อตรวจ (${code})` : 'เพิ่มหัวข้อตรวจใหม่เข้าฐานข้อมูล'}
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสข้อ *</label>
                  <input
                    required
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="เช่น S2-R6"
                    className={`${inputCls} font-mono-code`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ระยะ (Stage)</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(Number(e.target.value) as StageNumber)}
                    className={inputCls}
                  >
                    <option value={1}>Stage 1: เตรียมพร้อม</option>
                    <option value={2}>Stage 2: ติดตั้ง & Pre-Test</option>
                    <option value={3}>Stage 3: ระหว่างตรวจวัด</option>
                    <option value={4}>Stage 4: หลังตรวจ & ข้อมูล</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทที่ใช้</label>
                  <select
                    value={appliesTo}
                    onChange={(e) => setAppliesTo(e.target.value as ItemScope)}
                    className={inputCls}
                  >
                    <option value="COMMON">ใช้ร่วมกัน (Common)</option>
                    <option value="RATA">เฉพาะ RATA</option>
                    <option value="CORRELATION">เฉพาะ Correlation Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">มาตรฐานอ้างอิง</label>
                  <input
                    type="text"
                    value={referenceStandard}
                    onChange={(e) => setReferenceStandard(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อหัวข้อตรวจสอบ *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ชื่อหัวข้อที่จะแสดงในหน้าตรวจเช็คและรายงาน PDF"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบายย่อ (แสดงเมื่อ Hover เมาส์ชี้ที่หัวข้อ)
                </label>
                <input
                  type="text"
                  value={shortTooltip}
                  onChange={(e) => setShortTooltip(e.target.value)}
                  placeholder="สรุปสั้นๆ 1-2 บรรทัดว่าข้อนี้ต้องตรวจอะไร"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ขั้นตอนวิธีตรวจ (ขึ้นบรรทัดใหม่เพื่อแบ่งเป็นข้อ 1, 2, 3)
                  </label>
                  <textarea
                    rows={4}
                    value={howToCheckText}
                    onChange={(e) => setHowToCheckText(e.target.value)}
                    placeholder={'ขั้นตอนที่ 1...\nขั้นตอนที่ 2...'}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เกณฑ์การผ่าน</label>
                    <input
                      type="text"
                      value={passCriteria}
                      onChange={(e) => setPassCriteria(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">คำแนะนำการถ่ายรูป</label>
                    <input
                      type="text"
                      value={photoGuide}
                      onChange={(e) => setPhotoGuide(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ข้อควรระวัง / จุดที่มักพลาด</label>
                    <input
                      type="text"
                      value={watchOut}
                      onChange={(e) => setWatchOut(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePhoto}
                    onChange={(e) => setRequirePhoto(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  แนะนำให้แนบภาพถ่ายหลักฐาน
                </label>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  {formMode === 'EDIT' ? 'บันทึกการแก้ไข' : 'บันทึกหัวข้อใหม่'}
                </button>
              </div>
            </form>
          )}

          {/* List of Master Items */}
          <div className="divide-y divide-slate-200/80 border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
            {filteredItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                ไม่พบหัวข้อตรวจสอบที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 hover:bg-slate-50/90 transition flex items-start justify-between gap-3 ${
                    editingId === item.id ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono-code px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
                        {item.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        Stage {item.stage}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          item.appliesTo === 'RATA'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                            : item.appliesTo === 'CORRELATION'
                              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        }`}
                      >
                        {item.appliesTo}
                      </span>
                      <span className="text-[11px] text-slate-400">{item.referenceStandard}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{item.shortTooltip}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      title="แก้ไขหัวข้อและคำอธิบาย"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="ลบหัวข้อ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
