import { AlertTriangle, BookOpen, Camera, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import type { ChecklistItemDef } from '../types';

interface HelpGuideDrawerProps {
  item: ChecklistItemDef | null;
  onClose: () => void;
}

export function HelpGuideDrawer({ item, onClose }: HelpGuideDrawerProps) {
  if (!item) return null;

  const scopeBadge =
    item.appliesTo === 'RATA'
      ? { label: 'RATA (Gas/Flow)', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
      : item.appliesTo === 'CORRELATION'
        ? { label: 'Correlation Test (PM)', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
        : { label: 'ใช้ร่วมกัน (Common)', cls: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end bg-slate-900/50 backdrop-blur-xs no-print"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] sm:max-h-screen sm:h-full bg-white rounded-t-2xl sm:rounded-none shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-500 text-white">
                {item.code}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${scopeBadge.cls}`}>
                {scopeBadge.label}
              </span>
              <span className="text-xs text-slate-300">Stage {item.stage}</span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold leading-snug">{item.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="ปิดหน้าต่างคำอธิบาย"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick summary */}
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-sm leading-relaxed">
            <div className="font-semibold text-sky-900 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-600" />
              สรุปสิ่งที่ต้องทำ (Quick Guide)
            </div>
            <p>{item.shortTooltip}</p>
          </div>

          {/* Step-by-step How to Check */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              ขั้นตอนการตรวจสอบหน้างาน (How to Check)
            </h4>
            <ol className="space-y-2">
              {item.howToCheck.map((step, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Pass Criteria */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <h4 className="text-sm font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              เกณฑ์การผ่านมาตรฐาน (Acceptance Criteria)
            </h4>
            <p className="text-sm text-emerald-950 leading-relaxed">{item.passCriteria}</p>
          </div>

          {/* Photo Guide */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            <h4 className="text-sm font-bold text-indigo-900 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-indigo-600" />
              คำแนะนำการถ่ายภาพหลักฐาน (Photo Guide)
              {item.requirePhoto && (
                <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  แนะนำให้แนบรูป
                </span>
              )}
            </h4>
            <p className="text-sm text-indigo-950 leading-relaxed">{item.photoGuide}</p>
          </div>

          {/* Watch out */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <h4 className="text-sm font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ข้อควรระวัง / จุดที่ Sub-contractor มักพลาด
            </h4>
            <p className="text-sm text-amber-950 leading-relaxed">{item.watchOut}</p>
          </div>

          {/* Reference Standard */}
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 flex items-center justify-between">
            <span>มาตรฐานอ้างอิง:</span>
            <span className="font-medium text-slate-700">{item.referenceStandard}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition cursor-pointer"
          >
            เข้าใจแล้ว กลับไปตรวจเช็คต่อ
          </button>
        </div>
      </div>
    </div>
  );
}
