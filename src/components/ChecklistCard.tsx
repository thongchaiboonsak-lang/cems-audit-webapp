import { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Expand,
  HelpCircle,
  Info,
  Minus,
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

  const borderTone =
    response.status === 'PASS'
      ? 'border-emerald-300 bg-emerald-50/20'
      : response.status === 'FAIL'
        ? 'border-rose-300 bg-rose-50/25'
        : response.status === 'NA'
          ? 'border-slate-300 bg-slate-50/60'
          : 'border-slate-200 bg-white';

  const scopeBadge =
    item.appliesTo === 'RATA'
      ? { text: 'RATA', cls: 'bg-indigo-100 text-indigo-700' }
      : item.appliesTo === 'CORRELATION'
        ? { text: 'PM Correlation', cls: 'bg-amber-100 text-amber-800' }
        : { text: 'Common', cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${borderTone}`}>
      {/* Top Row: Code + Interactive Title with Hover Tooltip + Guide Button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
        <div className="relative flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-white">
              {item.code}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${scopeBadge.cls}`}>
              {scopeBadge.text}
            </span>
            {item.requirePhoto && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                  response.photos.length > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}
              >
                <Camera className="w-3 h-3" />
                {response.photos.length > 0 ? `แนบแล้ว ${response.photos.length} รูป` : 'ควรแนบรูปหลักฐาน'}
              </span>
            )}
          </div>

          {/* Title with Hover Tooltip Trigger */}
          <div
            className="inline-block relative group"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              type="button"
              onClick={() => onOpenGuide(item)}
              className="text-left font-semibold text-slate-900 hover:text-blue-700 transition text-sm sm:text-base leading-snug inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{item.title}</span>
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            </button>

            {/* Desktop Hover Tooltip Popover */}
            {showTooltip && (
              <div className="hidden sm:block absolute left-0 top-full mt-2 z-30 w-96 max-w-[85vw] p-3.5 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 pointer-events-none">
                <div className="text-xs font-bold text-sky-400 mb-1 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  คำอธิบายย่อ (คลิกเพื่อดูขั้นตอนละเอียด)
                </div>
                <p className="text-xs text-slate-100 leading-relaxed mb-2">{item.shortTooltip}</p>
                <div className="pt-2 border-t border-slate-700/80 text-[11px] text-emerald-300 leading-relaxed">
                  <span className="font-semibold">เกณฑ์ผ่าน: </span>
                  {item.passCriteria}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Explicit Help Guide Button (Great for Mobile Tap & Discovery) */}
        <button
          type="button"
          onClick={() => onOpenGuide(item)}
          className="self-start flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          วิธีตรวจ / คำอธิบาย
        </button>
      </div>

      {/* Status Action Buttons */}
      <div className="grid grid-cols-3 gap-2 mt-3.5">
        <button
          type="button"
          onClick={() => setStatus('PASS')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold border transition cursor-pointer ${
            response.status === 'PASS'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
          }`}
        >
          <Check className="w-4 h-4" />
          ผ่าน (Pass)
        </button>

        <button
          type="button"
          onClick={() => setStatus('FAIL')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold border transition cursor-pointer ${
            response.status === 'FAIL'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-rose-400 hover:bg-rose-50/50'
          }`}
        >
          <X className="w-4 h-4" />
          ไม่ผ่าน (Fail)
        </button>

        <button
          type="button"
          onClick={() => setStatus('NA')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold border transition cursor-pointer ${
            response.status === 'NA'
              ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
          }`}
        >
          <Minus className="w-4 h-4" />
          ไม่เกี่ยวข้อง (N/A)
        </button>
      </div>

      {/* Inputs: Measured Value & Remark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            ค่าที่ตรวจวัดได้ / เลขที่อ้างอิง (ถ้ามี)
          </label>
          <input
            type="text"
            value={response.measuredValue || ''}
            onChange={(e) => onChange({ ...response, measuredValue: e.target.value })}
            placeholder="เช่น Leak 0.005 cfm, Max Error 0.8%, เลขถังก๊าซ..."
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            หมายเหตุ / ข้อสังเกตหน้างาน
          </label>
          <input
            type="text"
            value={response.remark || ''}
            onChange={(e) => onChange({ ...response, remark: e.target.value })}
            placeholder="บันทึกเพิ่มเติม หรือรายละเอียดหากพบจุดแก้ไข..."
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Photo Evidence Section */}
      <div className="mt-3 pt-3 border-t border-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>ภาพถ่ายหลักฐาน ({response.photos.length} รูป)</span>
            {autoWatermark && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            {uploading ? 'กำลังประมวลผลรูป...' : '+ ถ่ายรูป / แนบรูป'}
          </button>
        </div>

        {/* Thumbnails Grid */}
        {response.photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
            {response.photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-slate-100 group">
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onPreviewPhoto(photo)}
                  />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">
                    {photo.photoCode}
                  </span>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onPreviewPhoto(photo)}
                      className="p-1 rounded bg-slate-900/75 text-white hover:bg-slate-900 cursor-pointer"
                      title="ขยายดูรูป"
                    >
                      <Expand className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="p-1 rounded bg-rose-600/90 text-white hover:bg-rose-700 cursor-pointer"
                      title="ลบรูป"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                    placeholder="คำอธิบายใต้ภาพ..."
                    className="w-full text-[11px] px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
