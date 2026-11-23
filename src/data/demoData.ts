import type { AuditRecord, AuditType } from '../types';
import { createDemoEvidencePhoto } from '../utils/imageHelper';

export function generateDocNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 90) + 10);
  return `CEMS-${y}${m}${d}-${seq}`;
}

export function createEmptyAuditRecord(
  auditType: AuditType = 'BOTH',
  defaultCompanyName = 'บริษัท ตัวอย่าง อินดัสเทรียล จำกัด (มหาชน)'
): AuditRecord {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    metadata: {
      docNumber: generateDocNumber(),
      companyName: defaultCompanyName,
      plantName: 'โรงไฟฟ้า / หน่วยผลิตที่ 1',
      stackName: '',
      auditType,
      parameters:
        auditType === 'RATA'
          ? ['SO₂', 'NOx', 'O₂', 'CO', 'Flow (Velocity)']
          : auditType === 'CORRELATION'
            ? ['PM / Dust']
            : ['SO₂', 'NOx', 'O₂', 'CO', 'Flow (Velocity)', 'PM / Dust'],
      auditDate: today,
      subcontractorName: '',
      subcontractorRegNo: '',
      subcontractorLead: '',
      workersTopCount: '',
      workersBottomCount: '',
      vehicleCount: '',
      vehicleTypes: '',
      inspectorName: '',
      inspectorDept: 'แผนกสิ่งแวดล้อม / วิศวกรรมควบคุม',
      overallConclusion: 'IN_PROGRESS',
      overallSummaryNote: '',
    },
    responses: {},
    inspectorSignature: {
      name: '',
      position: 'วิศวกรผู้ควบคุมงาน (Supervisor)',
      company: defaultCompanyName,
      dataUrl: '',
    },
    subcontractorSignature: {
      name: '',
      position: 'หัวหน้าทีมตรวจวัด (Team Leader)',
      company: '',
      dataUrl: '',
    },
  };
}

export function createDemoAuditRecord(): AuditRecord {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  return {
    id: `demo-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    metadata: {
      docNumber: 'CEMS-20261123-01',
      companyName: 'บริษัท สยาม พาวเวอร์ แอนด์ ปิโตรเคมี จำกัด (มหาชน)',
      plantName: 'โรงไฟฟ้าพลังความร้อนร่วม หน่วยที่ 1 (SPP-1)',
      stackName: 'Boiler Stack #1 (Main Stack - H60m)',
      auditType: 'BOTH',
      parameters: ['SO₂', 'NOx', 'O₂', 'CO', 'Flow (Velocity)', 'PM / Dust'],
      auditDate: today,
      subcontractorName: 'บริษัท เอนไวรอนเมนทัล เทสติ้ง แอนด์ โซลูชั่น จำกัด',
      subcontractorRegNo: 'ว-248',
      subcontractorLead: 'นายสมชาย วิศวกรรมสิ่งแวดล้อม',
      workersTopCount: '3',
      workersBottomCount: '2',
      vehicleCount: '2',
      vehicleTypes: 'รถตู้ตรวจวัดเคลื่อนที่ (Mobile Lab) 1 คัน, รถกระบะขนอุปกรณ์ 1 คัน',
      inspectorName: 'นายธงชัย ควบคุมคุณภาพ',
      inspectorDept: 'ฝ่ายสิ่งแวดล้อมและความปลอดภัย (EHS)',
      overallConclusion: 'PASS_WITH_CONDITION',
      overallSummaryNote:
        'การตรวจวัด RATA และ Correlation Test ดำเนินการตามมาตรฐาน US EPA PS-2, PS-11 และ Method 5/7E เรียบร้อยดี ยกเว้น Run ที่ 4 ของ Correlation Test มีค่า % Isokinetic อยู่ที่ 112.4% จึงทำการคัดออกและเก็บตัวอย่างซ้ำเพิ่มอีก 1 Run จนครบ 15 Valid Runs',
    },
    responses: {
      's1-01': {
        itemId: 's1-01',
        status: 'PASS',
        measuredValue: 'WP-2026-8841 (อนุมัติแล้ว)',
        remark: 'ทีมงาน 5 คน สวมหมวกนิรภัย สายรัดคาง Full Body Harness ครบทุกคน',
        checkedAt: now,
        photos: [
          {
            id: 'demo-p1',
            photoCode: 'IMG-01',
            dataUrl: createDemoEvidencePhoto(
              'ใบ Work Permit & การตรวจ PPE หน้างาน',
              'WP-2026-8841 • ทีมงาน 5 คน ผ่านการตรวจ PPE 100%',
              'S1-01',
              '#059669'
            ),
            caption: 'เอกสาร Work Permit งานบนที่สูงและทีม Sub-contract สวม PPE ครบถ้วน',
            capturedAt: now,
            watermarkApplied: true,
          },
        ],
      },
      's1-02': {
        itemId: 's1-02',
        status: 'PASS',
        measuredValue: 'ทะเบียน ว-248 (หมดอายุ 31/12/2027)',
        remark: 'ขอบข่ายครอบคลุม SO2, NOx, O2, CO, Flow และ TSP/PM',
        checkedAt: now,
        photos: [],
      },
      's1-03': {
        itemId: 's1-03',
        status: 'PASS',
        measuredValue: 'Horiba PG-350 S/N: H24901',
        remark: 'ตรวจสอบ S/N ตรงตามใบ Calibration Certificate ครบทุกชิ้น (PG-350, DGM, Pitot)',
        checkedAt: now,
        photos: [
          {
            id: 'demo-p2',
            photoCode: 'IMG-02',
            dataUrl: createDemoEvidencePhoto(
              'ใบ Calibration Certificate & Serial Number',
              'Horiba PG-350 S/N: H24901 • Due Date: 08/2027',
              'S1-03',
              '#0284c7'
            ),
            caption: 'ป้าย Serial Number เครื่อง Horiba PG-350 ตรงกับใบรับรองการสอบเทียบ',
            capturedAt: now,
            watermarkApplied: true,
          },
        ],
      },
      's1-04': {
        itemId: 's1-04',
        status: 'PASS',
        measuredValue: 'EPA Protocol Gas (หมดอายุ 10/2028)',
        remark: 'ก๊าซ Zero (N2), Mid & High (SO2/NOx/CO/O2) แรงดันคงเหลือ > 1,200 psi',
        checkedAt: now,
        photos: [
          {
            id: 'demo-p3',
            photoCode: 'IMG-03',
            dataUrl: createDemoEvidencePhoto(
              'ถังก๊าซมาตรฐาน EPA Protocol Gas',
              'Cylinder #EP-9921 • Exp: 10/2028 • Pressure: 1,450 psi',
              'S1-04',
              '#0284c7'
            ),
            caption: 'ฉลากถังก๊าซ EPA Protocol Gas และใบ Certificate of Analysis',
            capturedAt: now,
            watermarkApplied: true,
          },
        ],
      },
      's1-05': {
        itemId: 's1-05',
        status: 'PASS',
        measuredValue: 'CEMS Normal / No Alarm',
        remark: 'Daily Zero/Span Drift เช้านี้ผ่านเกณฑ์ทุกพารามิเตอร์',
        checkedAt: now,
        photos: [],
      },
      's1-06': {
        itemId: 's1-06',
        status: 'PASS',
        measuredValue: 'Horiba PG-350, Apex XC-572, Heated Line 30m',
        remark: 'เครื่องมือและอุปกรณ์หลักครบตามขอบเขตงาน RATA & Correlation สภาพพร้อมใช้งาน',
        checkedAt: now,
        photos: [],
      },
      's1-07': {
        itemId: 's1-07',
        status: 'PASS',
        measuredValue: 'Petri Dish 20 กล่อง, ขวดแก้วฝา Teflon 20 ขวด',
        remark: 'ภาชนะบรรจุตัวอย่างสะอาด ฝาปิดสนิท มีฉลากและกล่องกันกระแทกครบถ้วน',
        checkedAt: now,
        photos: [],
      },
      's2-r1': {
        itemId: 's2-r1',
        status: 'PASS',
        measuredValue: 'Time Offset = +2 วินาที',
        remark: 'เทียบเวลาระหว่าง DAHS โรงงานกับ Laptop ของ Sub-contract เรียบร้อย',
        checkedAt: now,
        photos: [],
      },
      's2-r2': {
        itemId: 's2-r2',
        status: 'PASS',
        measuredValue: '3 จุด (16.7%, 50%, 83.3%)',
        remark: 'มาร์คระยะบนก้าน Probe ชัดเจนที่ระยะ 0.50m, 1.50m, 2.50m',
        checkedAt: now,
        photos: [],
      },
      's2-r3': {
        itemId: 's2-r3',
        status: 'PASS',
        measuredValue: 'Heated Line 125°C / O2 = 0.01%',
        remark: 'ไม่พบการรั่วไหลของสายเก็บตัวอย่าง Chiller ทำงานที่ 4°C',
        checkedAt: now,
        photos: [],
      },
      's2-r4': {
        itemId: 's2-r4',
        status: 'PASS',
        measuredValue: 'Max Cal Error = 0.85% Span',
        remark: 'ผ่านเกณฑ์ ±2% Span ครบทั้ง Zero, Mid, High ทุกก๊าซ',
        checkedAt: now,
        photos: [
          {
            id: 'demo-p4',
            photoCode: 'IMG-04',
            dataUrl: createDemoEvidencePhoto(
              'Analyzer 3-Point Calibration Error Check',
              'SO2: 0.62% | NOx: 0.85% | O2: 0.30% (Criteria <= ±2.0%)',
              'S2-R4',
              '#7c3aed'
            ),
            caption: 'หน้าจอผลการทดสอบ Direct 3-Point Calibration Error ผ่านเกณฑ์ทุกจุด',
            capturedAt: now,
            watermarkApplied: true,
          },
        ],
      },
      's2-r5': {
        itemId: 's2-r5',
        status: 'PASS',
        measuredValue: 'Max Bias = 1.9% / RT = 45s',
        remark: 'จ่ายก๊าซผ่าน 3-Way Valve ที่ปลาย Probe ผ่านเกณฑ์ ±5% Span',
        checkedAt: now,
        photos: [],
      },
      's2-c1': {
        itemId: 's2-c1',
        status: 'PASS',
        measuredValue: 'PM CEMS Zero/Upscale OK',
        remark: 'ทำความสะอาด Optical Window เรียบร้อยก่อนวันทดสอบ',
        checkedAt: now,
        photos: [],
      },
      's2-c2': {
        itemId: 's2-c2',
        status: 'PASS',
        measuredValue: 'Nozzle 6.35 mm / Oven 122°C',
        remark: 'ตรวจสอบ Filter ID F-01 ถึง F-16 ตรงกับใบชั่งน้ำหนักเริ่มต้น',
        checkedAt: now,
        photos: [],
      },
      's2-c3': {
        itemId: 's2-c3',
        status: 'PASS',
        measuredValue: 'Leak = 0.004 cfm @ 16 in.Hg',
        remark: 'ผ่านเกณฑ์ Pre-Test Leak Check ≤ 0.02 cfm และ Pitot ไม่รั่ว',
        checkedAt: now,
        photos: [],
      },
      's2-c4': {
        itemId: 's2-c4',
        status: 'PASS',
        measuredValue: 'Low / Mid / High (5 Runs/Level)',
        remark: 'ประสานห้องควบคุมปรับระดับ ESP Field เพื่อสร้างฝุ่น 3 ระดับตามแผน PS-11',
        checkedAt: now,
        photos: [],
      },
      's3-01': {
        itemId: 's3-01',
        status: 'PASS',
        measuredValue: 'Plant Load 85% – 92%',
        remark: 'เดินเครื่องปกติเสถียรตลอดช่วงการเก็บตัวอย่าง',
        checkedAt: now,
        photos: [],
      },
      's3-02': {
        itemId: 's3-02',
        status: 'PASS',
        measuredValue: 'No Adjustment',
        remark: 'ล็อกตู้ CEMS ตลอดการทดสอบ ไม่มีการปรับแต่งค่าใดๆ',
        checkedAt: now,
        photos: [],
      },
      's3-r1': {
        itemId: 's3-r1',
        status: 'PASS',
        measuredValue: '10 Runs (21 นาที/Run)',
        remark: 'ย้าย Probe ครบ 3 จุด จุดละ 7 นาที ครบถ้วนทุก Run',
        checkedAt: now,
        photos: [],
      },
      's3-c1': {
        itemId: 's3-c1',
        status: 'FAIL',
        measuredValue: '15 Valid Runs (≥ 36 นาที/Run) • Run 4 = 112.4% (เก็บซ้ำแล้ว)',
        remark: 'Run 4 หลุดเกณฑ์ Isokinetic (112.4%) จึงตัดออกเป็น Invalid และทำการเก็บซ้ำ Run 16 (ระยะเวลา 40 นาที, Isokinetic 99.8%) ครบ 15 Valid Runs',
        checkedAt: now,
        photos: [],
      },
      's3-03': {
        itemId: 's3-03',
        status: 'PASS',
        measuredValue: 'ไม่มีเหตุขัดข้องรุนแรง',
        remark: 'งดการทำ Soot Blowing ตลอดช่วงเวลาที่เก็บตัวอย่าง',
        checkedAt: now,
        photos: [],
      },
      's4-r1': {
        itemId: 's4-r1',
        status: 'PASS',
        measuredValue: 'Max Drift = 1.1% Span',
        remark: 'Post-Test Zero & Span Drift ผ่านเกณฑ์ ±3.0% Span ครบทุกก๊าซ',
        checkedAt: now,
        photos: [],
      },
      's4-c1': {
        itemId: 's4-c1',
        status: 'PASS',
        measuredValue: 'Max Post Leak = 0.008 cfm',
        remark: 'ผ่านเกณฑ์ Post-Test Leak Check ≤ 0.02 cfm ครบทุก Valid Run',
        checkedAt: now,
        photos: [],
      },
      's4-c2': {
        itemId: 's4-c2',
        status: 'PASS',
        measuredValue: 'COC #2026-1123-PM',
        remark: 'เก็บกระดาษกรองและล้าง Probe ด้วย Acetone ปิดผนึกและขีดเส้นระดับของเหลวครบทุกขวด',
        checkedAt: now,
        photos: [],
      },
      's4-01': {
        itemId: 's4-01',
        status: 'PASS',
        measuredValue: '1-min Raw Data Exported',
        remark: 'ส่งออกข้อมูล CEMS รายนาทีครบทุกช่วงเวลาและส่งสำเนาให้ทั้ง 2 ฝ่ายแล้ว',
        checkedAt: now,
        photos: [],
      },
      's4-02': {
        itemId: 's4-02',
        status: 'PASS',
        measuredValue: 'ปิดฝา Port & ปิด Work Permit แล้ว',
        remark: 'พื้นที่บนปล่องและห้อง CEMS Shelter สะอาดเรียบร้อย',
        checkedAt: now,
        photos: [],
      },
    },
    inspectorSignature: {
      name: 'นายธงชัย ควบคุมคุณภาพ',
      position: 'วิศวกรสิ่งแวดล้อมอาวุโส (ผู้ควบคุมงาน)',
      company: 'บริษัท สยาม พาวเวอร์ แอนด์ ปิโตรเคมี จำกัด (มหาชน)',
      dataUrl: '',
      signedAt: now,
    },
    subcontractorSignature: {
      name: 'นายสมชาย วิศวกรรมสิ่งแวดล้อม',
      position: 'หัวหน้าทีมตรวจวัด (Team Leader)',
      company: 'บริษัท เอนไวรอนเมนทัล เทสติ้ง แอนด์ โซลูชั่น จำกัด',
      dataUrl: '',
      signedAt: now,
    },
  };
}
