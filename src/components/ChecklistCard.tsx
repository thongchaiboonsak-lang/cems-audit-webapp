import { useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Check,
  Clock,
  Expand,
  Gauge,
  HelpCircle,
  Info,
  MessageSquareText,
  Minus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { AuditResponse, ChecklistItemDef, CheckStatus, EvidencePhoto } from '../types';
import { processEvidenceImage } from '../utils/imageHelper';

interface ChecklistCardProps {
  item: ChecklistItemDef;
  response: AuditResponse;
  stackName: string;
  docNumber: string;
  autoWatermark: boolean;
  nextPhotoNumber: () => string;
  onChange: (updated: AuditResponse) => void;
  onOpenGuide: (item: ChecklistItemDef) => void;
  onPreviewPhoto: (photo: EvidencePhoto) => void;
}

export function ChecklistCard({
  item,
  response,
  stackName,
  docNumber,
  autoWatermark,
  nextPhotoNumber,
  onChange,
  onOpenGuide,
  onPreviewPhoto,
}: ChecklistCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [uploading, setUploading] = useState(false);

  const setStatus = (status: CheckStatus) => {
    onChange({
      ...response,
      status: response.status === status ? 'PENDING' : status,
      checkedAt: new Date().toISOString(),
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newPhotos: EvidencePhoto[] = [];
      for (const file of Array.from(files)) {
        const { dataUrl, capturedAt } = await processEvidenceImage(file, {
          applyWatermark: autoWatermark,
          stackName: stackName || 'Stack',
          itemCode: item.code,
          docNumber,
        });
        newPhotos.push({
          id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          photoCode: nextPhotoNumber(),
          dataUrl,
          caption: item.title.slice(0, 60),
          capturedAt,
          watermarkApplied: autoWatermark,
        });
      }
      onChange({
        ...response,
        photos: [...response.photos, ...newPhotos],
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดรูปภาพ');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updatePhotoCaption = (photoId: string, caption: string) => {
    onChange({
      ...response,
      photos: response.photos.map((p) => (p.id === photoId ? { ...p, caption } : p)),
    });
  };

  const removePhoto = (photoId: string) => {
    onChange({
      ...response,
      photos: response.photos.filter((p) => p.id !== photoId),
    });
  };

  const cardTone =
    response.status === 'PASS'
      ? 'border-emerald-200/90 bg-gradient-to-br from-white via-white to-emerald-50/40 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.12)]'
      : response.status === 'FAIL'
        ? 'border-rose-200/90 bg-gradient-to-br from-white via-white to-rose-50/45 shadow-[0_2px_12px_-4px_rgba(244,63,94,0.14)]'
        : response.status === 'NA'
          ? 'border-slate-200/90 bg-slate-50/75 shadow-xs'
          : 'border-slate-200/80 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)] hover:border-blue-200/90 hover:shadow-[0_6px_20px_-8px_rgba(37,99,235,0.12)]';

  const leftStripe =
    response.status === 'PASS'
      ? 'bg-emerald-500'
      : response.status === 'FAIL'
        ? 'bg-rose-500'
        : response.status === 'NA'
          ? 'bg-slate-400'
          : 'bg-slate-200 group-hover/card:bg-blue-400';

  const scopeBadge =
    item.appliesTo === 'RATA'
      ? { text: 'RATA', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' }
      : item.appliesTo === 'CORRELATION'
        ? { text: 'PM Correlation', cls: 'bg-amber-50 text-amber-800 border-amber-200/80' }
        : { text: 'Common', cls: 'bg-slate-100/90 text-slate-600 border-slate-200/80' };

  return (
    <div
      className={`group/card relative rounded-2xl border transition-all duration-200 overflow-visible ${cardTone}`}
    >
      {/* Left Status Accent Stripe */}
      <div
        className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full transition-colors duration-200 ${leftStripe}`}
      />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        {/* Top Row: Badges + Interactive Title + Guide CTA */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="font-mono-code inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold tracking-tight bg-slate-900 text-white shadow-2xs">
                {item.code}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${scopeBadge.cls}`}
              >
                {scopeBadge.text}
              </span>
              {item.requirePhoto && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                    response.photos.length > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200/80'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  {response.photos.length > 0 ? `แนบแล้ว ${response.photos.length} รูป` : 'ควรแนบรูปหลักฐาน'}
                </span>
              )}
              {response.checkedAt && response.status !== 'PENDING' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 tabular-nums ml-auto sm:ml-1">
                  <Clock className="w-3 h-3" />
                  {new Date(response.checkedAt).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {/* Title with Hover Tooltip Trigger */}
            <div
              className="inline-block relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <button
                type="button"
                onClick={() => onOpenGuide(item)}
                className="text-left font-bold text-slate-900 hover:text-blue-600 transition text-sm sm:text-[15px] leading-snug inline-flex items-start gap-1.5 cursor-pointer"
              >
                <span>{item.title}</span>
                <Info className="w-4 h-4 text-blue-500/80 hover:text-blue-600 flex-shrink-0 mt-0.5" />
              </button>

              {/* Desktop Hover Tooltip Popover */}
              {showTooltip && (
                <div className="hidden sm:block absolute left-0 top-full mt-2.5 z-30 w-[26rem] max-w-[85vw] p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl border border-slate-700/80 pointer-events-none animate-scale-in">
                  <div className="absolute -top-1.5 left-6 w-3 h-3 rotate-45 bg-slate-900 border-l border-t border-slate-700/80" />
                  <div className="text-xs font-bold text-sky-400 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    คำอธิบายย่อ (คลิกเพื่อเปิดคู่มือละเอียด)
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed mb-2.5">{item.shortTooltip}</p>
                  <div className="pt-2.5 border-t border-slate-700/80 text-[11px] text-emerald-300 leading-relaxed">
                    <span className="font-bold text-emerald-200">เกณฑ์ผ่าน: </span>
                    {item.passCriteria}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.referenceStandard}</p>
          </div>

          {/* Explicit Help Guide Button */}
          <button
            type="button"
            onClick={() => onOpenGuide(item)}
            className="self-start flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 text-xs font-semibold transition-all duration-150 shadow-2xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>วิธีตรวจ / คู่มือ</span>
          </button>
        </div>

        {/* Status Segmented Selector */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70">
          <button
            type="button"
            onClick={() => setStatus('PASS')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              response.status === 'PASS'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/50'
                : 'bg-white/90 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70 shadow-2xs'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>ผ่าน (Pass)</span>
          </button>

          <button
            type="button"
            onClick={() => setStatus('FAIL')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              response.status === 'FAIL'
                ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-md shadow-rose-600/25 ring-1 ring-rose-400/50'
                : 'bg-white/90 text-slate-600 hover:text-rose-700 hover:bg-rose-50/70 shadow-2xs'
            }`}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>ไม่ผ่าน (Fail)</span>
          </button>

          <button
            type="button"
            onClick={() => setStatus('NA')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              response.status === 'NA'
                ? 'bg-gradient-to-b from-slate-600 to-slate-700 text-white shadow-md shadow-slate-700/20'
                : 'bg-white/90 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 shadow-2xs'
            }`}
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
            <span>N/A</span>
          </button>
        </div>

        {/* Inputs: Measured Value & Remark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              ค่าที่ตรวจวัดได้ / เลขที่อ้างอิง (ถ้ามี)
            </label>
            <input
              type="text"
              value={response.measuredValue || ''}
              onChange={(e) => onChange({ ...response, measuredValue: e.target.value })}
              placeholder="เช่น Leak 0.005 cfm, Max Error 0.8%, เลขถังก๊าซ..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200/90 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
              หมายเหตุ / ข้อสังเกตหน้างาน
            </label>
            <input
              type="text"
              value={response.remark || ''}
              onChange={(e) => onChange({ ...response, remark: e.target.value })}
              placeholder="บันทึกเพิ่มเติม หรือรายละเอียดหากพบจุดแก้ไข..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200/90 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/12 focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Photo Evidence Section */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 inline-flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" />
              </span>
              <span className="tabular-nums">ภาพถ่ายหลักฐาน ({response.photos.length} รูป)</span>
              {autoWatermark && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  Auto-Timestamp
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              {uploading ? 'กำลังประมวลผลรูป...' : '+ ถ่ายรูป / แนบรูป'}
            </button>
          </div>

          {/* Thumbnails Grid */}
          {response.photos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {response.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group/photo rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover/photo:scale-105"
                      onClick={() => onPreviewPhoto(photo)}
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-950/55 to-transparent" />
                    <span className="font-mono-code absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-sm text-white text-[10px] font-bold border border-white/15">
                      {photo.photoCode}
                    </span>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto(photo)}
                        className="p-1.5 rounded-lg bg-slate-950/70 backdrop-blur-sm text-white hover:bg-blue-600 transition cursor-pointer"
                        title="ขยายดูรูป"
                      >
                        <Expand className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="p-1.5 rounded-lg bg-rose-600/85 backdrop-blur-sm text-white hover:bg-rose-700 transition cursor-pointer"
                        title="ลบรูป"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50/60 border-t border-slate-100">
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                      placeholder="คำอธิบายใต้ภาพ..."
                      className="w-full text-[11px] font-medium text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subtle Help Hint on Mobile if hover tooltip isn't visible */}
      <span className="sr-only">
        <HelpCircle />
      </span>
    </div>
  );
}
