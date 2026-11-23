import { ArrowLeft, CheckCircle2, CloudUpload, Download, Printer, XCircle } from 'lucide-react';
import { STAGES } from '../data/checklistData';
import type { AuditRecord, ChecklistItemDef, EvidencePhoto } from '../types';

interface PdfReportPreviewProps {
  record: AuditRecord;
  items: ChecklistItemDef[];
  companyLogoDataUrl?: string;
  syncing: boolean;
  hasGoogleSheetUrl: boolean;
  onBack: () => void;
  onSyncGoogleSheet: () => void;
  onDownloadCsv: () => void;
}

export function PdfReportPreview({
  record,
  items,
  companyLogoDataUrl,
  syncing,
  hasGoogleSheetUrl,
  onBack,
  onSyncGoogleSheet,
  onDownloadCsv,
}: PdfReportPreviewProps) {
  const { metadata } = record;

  // Compute summary stats
  let passCount = 0;
  let failCount = 0;
  let naCount = 0;
  let pendingCount = 0;

  const allPhotos: Array<{ photo: EvidencePhoto; itemCode: string; itemTitle: string }> = [];

  items.forEach((item) => {
    const resp = record.responses[item.id];
    const st = resp?.status || 'PENDING';
    if (st === 'PASS') passCount++;
    else if (st === 'FAIL') failCount++;
    else if (st === 'NA') naCount++;
    else pendingCount++;

    if (resp?.photos?.length) {
      resp.photos.forEach((photo) => {
        allPhotos.push({ photo, itemCode: item.code, itemTitle: item.title });
      });
    }
  });

  const auditTypeLabel =
    metadata.auditType === 'RATA'
      ? 'RATA (Relative Accuracy Test Audit)'
      : metadata.auditType === 'CORRELATION'
        ? 'Correlation Test (PM CEMS)'
        : 'RATA & Correlation Test (PM CEMS)';

  const conclusionBadge = {
    PASS: { label: 'ผ่านเกณฑ์มาตรฐาน (PASS)', cls: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
    PASS_WITH_CONDITION: {
      label: 'ผ่านแบบมีเงื่อนไข / ข้อสังเกต (PASS WITH CONDITION)',
      cls: 'bg-amber-100 text-amber-900 border-amber-400',
    },
    FAIL: { label: 'ไม่ผ่าน / ต้องแก้ไขซ้ำ (FAIL)', cls: 'bg-rose-100 text-rose-900 border-rose-400' },
    IN_PROGRESS: { label: 'อยู่ระหว่างดำเนินการ (IN PROGRESS)', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
  }[metadata.overallConclusion];

  const handlePrintPdf = () => {
    const originalTitle = document.title;
    document.title = `${metadata.docNumber || 'CEMS-Audit-Report'}_${metadata.stackName || 'Stack'}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-200/80 pb-12">
      {/* Top Action Bar (Hidden in PDF Print) */}
      <div className="no-print sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-700 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปแก้ไข
            </button>
            <div className="hidden sm:block">
              <div className="text-sm font-bold">ตัวอย่างรายงาน PDF (ขนาด A4)</div>
              <div className="text-[11px] text-slate-400">
                กดปุ่ม &ldquo;พิมพ์ / บันทึกเป็น PDF&rdquo; แล้วเลือกปลายทางเป็น Save as PDF เพื่อไฟล์ภาษาไทยคมชัด 100%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ส่งออก CSV
            </button>

            <button
              type="button"
              disabled={syncing}
              onClick={onSyncGoogleSheet}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                hasGoogleSheetUrl
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <CloudUpload className="w-4 h-4" />
              {syncing ? 'กำลังส่งข้อมูล...' : 'บันทึกลง Google Sheet'}
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึกเป็น PDF ทันที
            </button>
          </div>
        </div>
      </div>

      {/* A4 Paper Report Container */}
      <div className="print-container font-report max-w-[210mm] mx-auto my-6 bg-white shadow-xl border border-slate-300 px-8 py-8 sm:px-10 sm:py-10 text-slate-900">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-3.5">
            {companyLogoDataUrl && (
              <img
                src={companyLogoDataUrl}
                alt="Company Logo"
                className="h-14 max-w-[120px] object-contain flex-shrink-0 mt-0.5"
              />
            )}
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-blue-700 mb-0.5">
                CEMS AUDIT SUPERVISION REPORT
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                รายงานการควบคุมตรวจสอบการทำงาน CEMS Audit
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">
                หัวข้อ: {auditTypeLabel}
              </p>
              <p className="text-xs text-slate-500 mt-1">{metadata.companyName || '-'}</p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs border border-slate-300 rounded-lg px-3.5 py-2 bg-slate-50 min-w-[200px]">
            <div>
              <span className="text-slate-500">เลขที่เอกสาร: </span>
              <span className="font-bold text-slate-900">{metadata.docNumber || '-'}</span>
            </div>
            <div className="mt-0.5">
              <span className="text-slate-500">วันที่ตรวจสอบ: </span>
              <span className="font-semibold text-slate-900">{metadata.auditDate || '-'}</span>
            </div>
            <div className="mt-0.5">
              <span className="text-slate-500">เวลาพิมพ์รายงาน: </span>
              <span className="text-slate-700">
                {new Date().toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Info Grid */}
        <div className="avoid-break mb-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
          <div className="bg-slate-800 text-white px-3 py-1.5 font-bold">
            1. ข้อมูลพื้นฐานการตรวจสอบ (Audit Information)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-3 space-y-1.5">
              <div className="flex gap-2">
                <span className="text-slate-500 w-32 flex-shrink-0">โรงงาน / หน่วยผลิต:</span>
                <span className="font-semibold text-slate-900">{metadata.plantName || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 w-32 flex-shrink-0">ชื่อปล่อง (Stack ID):</span>
                <span className="font-semibold text-slate-900">{metadata.stackName || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 w-32 flex-shrink-0">พารามิเตอร์ที่ตรวจ:</span>
                <span className="font-semibold text-slate-900">
                  {metadata.parameters.length > 0 ? metadata.parameters.join(', ') : '-'}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-1.5">
              <div className="flex gap-2">
                <span className="text-slate-500 w-32 flex-shrink-0">บริษัท Sub-contract:</span>
                <span className="font-semibold text-slate-900">{metadata.subcontractorName || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 w-32 flex-shrink-0">ทะเบียนห้องแล็บ / ทีม:</span>
                <span className="font-semibold text-slate-900">
                  {metadata.subcontractorRegNo || '-'} / {metadata.subcontractorLead || '-'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500 w-32 flex-shrink-0">ผู้ควบคุมงาน (บริษัท):</span>
                <span className="font-semibold text-slate-900">
                  {metadata.inspectorName || '-'} ({metadata.inspectorDept || '-'})
                </span>
              </div>
            </div>
          </div>

          {/* Manpower & Vehicles Strip */}
          {(() => {
            const top = parseInt(metadata.workersTopCount || '0', 10) || 0;
            const bottom = parseInt(metadata.workersBottomCount || '0', 10) || 0;
            const totalWorkers =
              metadata.workersTopCount || metadata.workersBottomCount ? `${top + bottom} คน` : '-';
            return (
              <div className="border-t border-slate-200 bg-slate-50/80 px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex gap-2">
                  <span className="text-slate-500 w-32 flex-shrink-0">กำลังพล Sub-contract:</span>
                  <span className="font-semibold text-slate-900">
                    ด้านบน {metadata.workersTopCount || '-'} คน / ด้านล่าง {metadata.workersBottomCount || '-'} คน (รวม{' '}
                    {totalWorkers})
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-32 flex-shrink-0">ยานพาหนะที่นำมาใช้:</span>
                  <span className="font-semibold text-slate-900">
                    {metadata.vehicleCount ? `${metadata.vehicleCount} คัน` : '-'}
                    {metadata.vehicleTypes ? ` (${metadata.vehicleTypes})` : ''}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Executive Summary KPI */}
        <div className="avoid-break mb-6">
          <div className="grid grid-cols-5 gap-2 text-center mb-2.5">
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="text-[11px] text-slate-500">หัวข้อทั้งหมด</div>
              <div className="text-lg font-bold text-slate-900">{items.length}</div>
            </div>
            <div className="border border-emerald-300 rounded-lg p-2 bg-emerald-50">
              <div className="text-[11px] text-emerald-700">ผ่าน (Pass)</div>
              <div className="text-lg font-bold text-emerald-800">{passCount}</div>
            </div>
            <div className="border border-rose-300 rounded-lg p-2 bg-rose-50">
              <div className="text-[11px] text-rose-700">ไม่ผ่าน (Fail)</div>
              <div className="text-lg font-bold text-rose-800">{failCount}</div>
            </div>
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
              <div className="text-[11px] text-slate-500">N/A / รอตรวจ</div>
              <div className="text-lg font-bold text-slate-700">
                {naCount} / {pendingCount}
              </div>
            </div>
            <div className="border border-sky-300 rounded-lg p-2 bg-sky-50">
              <div className="text-[11px] text-sky-700">ภาพหลักฐาน</div>
              <div className="text-lg font-bold text-sky-800">{allPhotos.length} รูป</div>
            </div>
          </div>

          <div
            className={`px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center justify-between ${conclusionBadge.cls}`}
          >
            <span>สรุปผลการควบคุมการตรวจสอบโดยรวม (Overall Result):</span>
            <span className="text-sm">{conclusionBadge.label}</span>
          </div>
        </div>

        {/* Checklist Detail Tables by Stage */}
        <div className="space-y-5 mb-6">
          <div className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1">
            2. รายละเอียดผลการตรวจเช็คตามขั้นตอนการทำงาน (Inspection Checklist Results)
          </div>

          {STAGES.map((stage) => {
            const stageItems = items.filter((i) => i.stage === stage.number);
            if (stageItems.length === 0) return null;

            return (
              <div key={stage.number} className="space-y-1.5">
                <div className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-t-md">
                  {stage.title}
                </div>
                <table className="w-full text-[11px] border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="py-1.5 px-2 text-left border-r border-slate-300 w-14">รหัส</th>
                      <th className="py-1.5 px-2 text-left border-r border-slate-300">หัวข้อตรวจสอบ</th>
                      <th className="py-1.5 px-2 text-center border-r border-slate-300 w-20">ผลตรวจ</th>
                      <th className="py-1.5 px-2 text-left border-r border-slate-300 w-44">ค่าที่วัดได้ / หมายเหตุ</th>
                      <th className="py-1.5 px-2 text-center w-20">อ้างอิงภาพ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stageItems.map((item) => {
                      const resp = record.responses[item.id];
                      const status = resp?.status || 'PENDING';
                      const photoCodes = resp?.photos?.map((p) => p.photoCode).join(', ') || '-';
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="py-1.5 px-2 font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                            {item.code}
                          </td>
                          <td className="py-1.5 px-2 text-slate-900 border-r border-slate-200 leading-snug">
                            <div className="font-semibold">{item.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{item.referenceStandard}</div>
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-200">
                            {status === 'PASS' && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                <CheckCircle2 className="w-3 h-3" /> ผ่าน
                              </span>
                            )}
                            {status === 'FAIL' && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                                <XCircle className="w-3 h-3" /> ไม่ผ่าน
                              </span>
                            )}
                            {status === 'NA' && (
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                N/A
                              </span>
                            )}
                            {status === 'PENDING' && (
                              <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                                รอตรวจ
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-slate-700 leading-snug">
                            {resp?.measuredValue && (
                              <div className="font-semibold text-slate-900">{resp.measuredValue}</div>
                            )}
                            {resp?.remark && <div>{resp.remark}</div>}
                            {!resp?.measuredValue && !resp?.remark && <span className="text-slate-400">-</span>}
                          </td>
                          <td className="py-1.5 px-2 text-center font-semibold text-blue-800">
                            {photoCodes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Overall Summary Note & Signatures */}
        <div className="avoid-break space-y-4">
          <div className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1">
            3. สรุปผลการตรวจสอบและการลงนามรับรอง (Summary & Sign-Off)
          </div>
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70">
            <div className="text-xs font-bold text-slate-800 mb-1">
              ข้อสรุป ข้อสังเกตเพิ่มเติม และข้อเสนอแนะ (Summary Findings & Remarks)
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {metadata.overallSummaryNote || 'ไม่มีข้อสังเกตเพิ่มเติม การปฏิบัติงานเป็นไปตามขั้นตอนมาตรฐาน'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3.5 pt-2">
            {/* Inspector Signature */}
            <div className="border border-slate-300 rounded-lg p-3 text-center">
              <div className="text-[11px] font-bold text-slate-800 mb-2">
                ผู้ควบคุมงาน (Company Supervisor)
              </div>
              <div className="h-18 flex items-center justify-center border-b border-dotted border-slate-400 mb-2">
                {record.inspectorSignature.dataUrl ? (
                  <img
                    src={record.inspectorSignature.dataUrl}
                    alt="Inspector Signature"
                    className="max-h-16 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">(ลายเซ็น)</span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-900">
                ( {record.inspectorSignature.name || metadata.inspectorName || '..................................'} )
              </div>
              <div className="text-[10px] text-slate-600">{record.inspectorSignature.position || 'ผู้ควบคุมงาน'}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                วันที่: {metadata.auditDate || '....../....../......'}
              </div>
            </div>

            {/* Subcontractor Signature */}
            <div className="border border-slate-300 rounded-lg p-3 text-center">
              <div className="text-[11px] font-bold text-slate-800 mb-2">
                ผู้รับทราบ (Sub-contractor Lead)
              </div>
              <div className="h-18 flex items-center justify-center border-b border-dotted border-slate-400 mb-2">
                {record.subcontractorSignature.dataUrl ? (
                  <img
                    src={record.subcontractorSignature.dataUrl}
                    alt="Subcontractor Signature"
                    className="max-h-16 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">(ลายเซ็น)</span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-900">
                ( {record.subcontractorSignature.name || metadata.subcontractorLead || '..................................'} )
              </div>
              <div className="text-[10px] text-slate-600">
                {record.subcontractorSignature.position || 'หัวหน้าทีมตรวจวัด'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {metadata.subcontractorName || 'บริษัทผู้รับเหมาตรวจวัด'}
              </div>
            </div>

            {/* Approver / Manager Review Signature */}
            <div className="border border-slate-300 rounded-lg p-3 text-center">
              <div className="text-[11px] font-bold text-slate-800 mb-2">
                ผู้อนุมัติ / ตรวจสอบ (Approver)
              </div>
              <div className="h-18 flex items-center justify-center border-b border-dotted border-slate-400 mb-2">
                {record.approverSignature?.dataUrl ? (
                  <img
                    src={record.approverSignature.dataUrl}
                    alt="Approver Signature"
                    className="max-h-16 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">(ลายเซ็นผู้อนุมัติ)</span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-900">
                ( {record.approverSignature?.name || '..................................'} )
              </div>
              <div className="text-[10px] text-slate-600">
                {record.approverSignature?.position || 'ผู้จัดการฝ่ายสิ่งแวดล้อม / ผู้อนุมัติ'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                วันที่: ....../....../......
              </div>
            </div>
          </div>
        </div>

        {/* Photo Evidence Appendix on New Page */}
        {allPhotos.length > 0 && (
          <div className="page-break pt-2">
            <div className="border-b-2 border-slate-900 pb-2 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ภาคผนวก: ภาพถ่ายหลักฐานการตรวจสอบ (Photo Evidence Appendix)
                </h2>
                <p className="text-xs text-slate-500">
                  เอกสารเลขที่ {metadata.docNumber} • ปล่อง {metadata.stackName || '-'} • รวม {allPhotos.length} ภาพ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {allPhotos.map(({ photo, itemCode, itemTitle }) => (
                <div
                  key={photo.id}
                  className="avoid-break border border-slate-300 rounded-lg overflow-hidden bg-white"
                >
                  <div className="bg-slate-800 text-white px-2.5 py-1 text-[11px] font-bold flex items-center justify-between">
                    <span>
                      {photo.photoCode} • ข้อ {itemCode}
                    </span>
                    <span className="font-normal text-slate-300 text-[10px]">
                      {new Date(photo.capturedAt).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-[11px] leading-snug">
                    <div className="font-semibold text-slate-900">{photo.caption || itemTitle}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{itemTitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
