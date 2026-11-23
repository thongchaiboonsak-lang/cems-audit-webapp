# CEMS Audit Supervisor Web App (RATA & Correlation Test)

ระบบ Web App (PWA / Offline-Ready) สำหรับพนักงานผู้ควบคุมงาน (Supervisor / EHS Engineer) ใช้ตรวจสอบการทำงานของบริษัท Sub-contractor ในการทำ **CEMS Audit (RATA และ Correlation Test)** พร้อมระบบคำอธิบายวิธีตรวจในตัว เก็บภาพถ่ายหลักฐานประทับวัน-เวลา ซิงค์ข้อมูลลง **Google Sheets + Google Drive** และสร้างรายงาน **PDF ขนาด A4** ได้ทันที

---

## ฟีเจอร์หลัก (Production-Ready)

1. **ฐานข้อมูล Checklist มาตรฐาน 25 หัวข้อ (4 ระยะ):**
   - ครอบคลุมงานความปลอดภัย, เครื่องมือหลัก, ภาชนะบรรจุตัวอย่าง, ก๊าซมาตรฐาน EPA Protocol Gas, Time Sync, Leak Check, 3-Point Cal Error, System Bias, Method 5/17 (≥ 15 Runs, ≥ 36 นาที/Run, Isokinetic 90–110%), Post-Test Drift/Leak, Sample Recovery/COC และ CEMS Raw Data Export
   - รองรับการ **เพิ่ม / แก้ไข / ค้นหา / ลบ / ส่งออก Master CSV** ได้เองจากหน้าเว็บ
2. **คำอธิบายวิธีตรวจแบบ 2 ระดับ:**
   - **Desktop Hover:** เอาเมาส์ชี้ที่ชื่อหัวข้อเพื่อดูสรุปย่อและเกณฑ์ผ่านทันที
   - **Tap / Click "วิธีตรวจ / คำอธิบาย":** เปิดคู่มือละเอียดทีละขั้นตอน เกณฑ์ผ่านมาตรฐาน มุมถ่ายรูปที่แนะนำ และจุดที่ Sub-contractor มักพลาด
3. **เก็บข้อมูลกำลังพล & ยานพาหนะ Sub-contractor:**
   - จำนวนผู้ปฏิบัติงานด้านบน / ด้านล่าง (คำนวณยอดรวมอัตโนมัติ) และจำนวน/ชนิดรถยนต์ที่นำมาใช้งาน
4. **เก็บภาพถ่ายหลักฐาน + Offline IndexedDB + PWA:**
   - ถ่ายภาพจากกล้องมือถือ ย่อขนาดอัตโนมัติ และประทับลายน้ำวัน-เวลา/ชื่อปล่อง/รหัสข้อ
   - เก็บข้อมูลลง **IndexedDB** รองรับรูปภาพจำนวนมากและใช้งานได้แม้สัญญาณอินเทอร์เน็ตบนปล่องขาดหาย
   - รองรับ **Backup / Import JSON** สำหรับโอนย้ายใบงานพร้อมรูปถ่ายข้ามเครื่อง
5. **รายงาน PDF ขนาด A4 ภาษาไทยคมชัด 100%:**
   - รองรับ **อัปโหลดโลโก้บริษัท** ขึ้นหัวรายงาน
   - ตารางผลตรวจแยก Stage + ช่องลงนาม 3 ฝ่าย (**ผู้ควบคุมงาน / หัวหน้าทีม Sub-contractor / ผู้อนุมัติ**) + ภาคผนวกภาพถ่ายหลักฐานจัดเรียง 2 คอลัมน์
6. **เชื่อมต่อ Google Sheets + Google Drive อัตโนมัติ:**
   - ใช้ไฟล์ `google-apps-script.gs` สร้างแท็บ `Audit_Jobs`, `Checklist_Results`, `Checklist_Master` และสร้างโฟลเดอร์เก็บรูปถ่ายใน Google Drive (`CEMS_Audit_Photos`) พร้อมลิงก์ใน Google Sheet โดยอัตโนมัติ

---

## การรันและนำขึ้นใช้งานจริง (Deployment)

### 1. รันใช้งานในเครือข่ายภายใน (Local / Wi-Fi)
```bash
npm install
npm run dev -- --host --port 5173
```

### 2. สร้างไฟล์ Production (`dist/`) เพื่อนำไปโฮสต์บน HTTPS
```bash
npm run build
```
จะได้โฟลเดอร์ `dist/` ที่พร้อมใช้งานทันที สามารถอัปโหลดขึ้นโฮสต์ฟรีได้หลายวิธี:
- **Netlify Drop:** ลากโฟลเดอร์ `dist/` ไปวางที่ https://app.netlify.com/drop จะได้ลิงก์ HTTPS ทันที
- **Vercel / Firebase Hosting / GitHub Pages / Internal IIS or Nginx:** นำไฟล์ในโฟลเดอร์ `dist/` ไปวางเป็น Static Website
- เมื่อเปิดผ่าน HTTPS บนมือถือ Android/iPhone พนักงานสามารถกด **"Add to Home Screen (เพิ่มลงหน้าจอหลัก)"** เพื่อใช้งานแบบแอปเต็มหน้าจอ (PWA) ได้ทันที!
