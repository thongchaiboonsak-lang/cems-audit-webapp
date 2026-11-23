import { useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  FileBadge2,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ChecklistItemDef } from '../types';

interface HelpGuideDrawerProps {
  item: ChecklistItemDef | null;
  onClose: () => void;
}

export function HelpGuideDrawer({ item, onClose }: HelpGuideDrawerProps) {
  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const scopeBadge =
    item.appliesTo === 'RATA'
      ? { label: 'RATA (Gas/Flow)', cls: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' }
      : item.appliesTo === 'CORRELATION'
        ? { label: 'Correlation Test (PM)', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/30' }
        : { label: 'ใช้ร่วมกัน (Common)', cls: 'bg-white/10 text-slate-200 border-white/20' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end bg-slate-950/60 backdrop-blur-sm no-print animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] sm:max-h-screen sm:h-full bg-white rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white overflow-hidden">
          <div className="pointer-events-none absolute inset-0 tech-grid-pattern opacity-60" />
          <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono-code px-2.5 py-0.5 text-xs font-bold rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm">
                  {item.code}
                </span>
                <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-lg border ${scopeBadge.cls}`}>
                  {scopeBadge.label}
                </span>
                <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-lg">
                  Stage {item.stage}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold leading-snug tracking-tight">{item.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex-shrink-0"
              aria-label="ปิดหน้าต่างคำอธิบาย"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#f8fafd]">
          {/* Quick summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50/70 border border-sky-200/80 text-sky-950 text-sm leading-relaxed shadow-2xs">
            <div className="font-bold text-sky-900 mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wide">
              <span className="w-6 h-6 rounded-lg bg-sky-500 text-white inline-flex items-center justify-center shadow-xs">
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              สรุปสิ่งที่ต้องทำ (Quick Guide)
            </div>
            <p className="text-slate-700 leading-relaxed">{item.shortTooltip}</p>
          </div>

          {/* Step-by-step How to Check */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              ขั้นตอนการตรวจสอบหน้างาน (How to Check)
            </h4>
            <ol className="space-y-2.5">
              {item.howToCheck.map((step, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-700 leading-relaxed shadow-2xs"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5 shadow-xs tabular-nums">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Pass Criteria */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900 mb-1.5 flex items-center gap-1.5 pl-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              เกณฑ์การผ่านมาตรฐาน (Acceptance Criteria)
            </h4>
            <p className="text-sm text-emerald-950/90 leading-relaxed pl-1">{item.passCriteria}</p>
          </div>

          {/* Photo Guide */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-indigo-50/75 border border-indigo-200/80">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-1.5 flex items-center gap-1.5 pl-1">
              <Camera className="w-4 h-4 text-indigo-600" />
              คำแนะนำการถ่ายภาพหลักฐาน
              {item.requirePhoto && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  แนะนำให้แนบรูป
                </span>
              )}
            </h4>
            <p className="text-sm text-indigo-950/90 leading-relaxed pl-1">{item.photoGuide}</p>
          </div>

          {/* Watch out */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-amber-50/85 border border-amber-200/90">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1.5 flex items-center gap-1.5 pl-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ข้อควรระวัง / จุดที่ Sub-contractor มักพลาด
            </h4>
            <p className="text-sm text-amber-950/90 leading-relaxed pl-1">{item.watchOut}</p>
          </div>

          {/* Reference Standard */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-500 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
              <FileBadge2 className="w-4 h-4 text-slate-400" />
              มาตรฐานอ้างอิง
            </span>
            <span className="font-semibold text-slate-800 text-right">{item.referenceStandard}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white border-t border-slate-200/80">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer"
          >
            เข้าใจแล้ว กลับไปตรวจเช็คต่อ
          </button>
        </div>
      </div>
    </div>
  );
}
