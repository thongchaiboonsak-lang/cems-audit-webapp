/**
 * Compresses an uploaded image file on the client using HTML5 Canvas
 * and optionally stamps a professional audit watermark (Date/Time, Stack, Item Code).
 */
export async function processEvidenceImage(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    applyWatermark?: boolean;
    stackName?: string;
    itemCode?: string;
    docNumber?: string;
  } = {}
): Promise<{ dataUrl: string; capturedAt: string }> {
  const {
    maxDimension = 1280,
    quality = 0.78,
    applyWatermark = true,
    stackName = '-',
    itemCode = '',
    docNumber = '',
  } = options;

  const capturedAt = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (applyWatermark) {
          const stripHeight = Math.max(36, Math.round(height * 0.065));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.fillRect(0, height - stripHeight, width, stripHeight);

          const fontSize = Math.max(13, Math.round(stripHeight * 0.42));
          ctx.font = `600 ${fontSize}px "Sarabun", "IBM Plex Sans Thai", sans-serif`;
          ctx.fillStyle = '#f8fafc';
          ctx.textBaseline = 'middle';

          const now = new Date(capturedAt);
          const timeStr = now.toLocaleString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          const leftText = `CEMS AUDIT | ${itemCode || 'EVIDENCE'} | ${stackName}`;
          const rightText = `${docNumber ? `${docNumber} • ` : ''}${timeStr}`;

          ctx.textAlign = 'left';
          ctx.fillText(leftText, 14, height - stripHeight / 2);

          ctx.textAlign = 'right';
          ctx.fillText(rightText, width - 14, height - stripHeight / 2);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, capturedAt });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a realistic vector-drawn placeholder evidence photo as DataURL for demo mode.
 */
export function createDemoEvidencePhoto(
  title: string,
  subtitle: string,
  itemCode: string,
  accentColor = '#0284c7'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean technical background
  const grad = ctx.createLinearGradient(0, 0, 800, 540);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 540);

  // Subtle grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 540);
    ctx.stroke();
  }
  for (let y = 0; y < 540; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }

  // Accent badge
  ctx.fillStyle = accentColor;
  ctx.fillRect(48, 48, 140, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(itemCode, 70, 68);

  // Sample graphic frame
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 112, 704, 330);

  // Main text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px "Sarabun", sans-serif';
  ctx.fillText(title, 80, 230);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '22px "Sarabun", sans-serif';
  ctx.fillText(subtitle, 80, 285);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '18px monospace';
  ctx.fillText('DEMO EVIDENCE IMAGE • REPLACE WITH FIELD PHOTO', 80, 355);

  // Watermark strip
  ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
  ctx.fillRect(0, 488, 800, 52);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 16px sans-serif';
  ctx.fillText(`CEMS AUDIT | ${itemCode} | Boiler Stack #1 (Unit 1)`, 20, 514);
  ctx.textAlign = 'right';
  ctx.fillText('CEMS-2026-11-001 • 23/11/2569 09:30:15', 780, 514);

  return canvas.toDataURL('image/jpeg', 0.85);
}
