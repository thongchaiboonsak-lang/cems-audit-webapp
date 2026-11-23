import { useState } from 'react';
import { Lock, LogIn, ShieldAlert, X } from 'lucide-react';

interface AdminLoginModalProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

// Default Admin credentials (Username: admin, Password hash for "cems2026")
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_PLAIN = 'cems2026';

export function AdminLoginModal({ open, onSuccess, onClose }: AdminLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD_PLAIN) {
      setError('');
      setUsername('');
      setPassword('');
      onSuccess();
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <Lock className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold">เข้าสู่ระบบผู้ดูแล (Admin Login)</h3>
              <p className="text-[11px] text-slate-400">สำหรับจัดการ Checklist, Google Sheet และโหมด Demo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="กรอกชื่อผู้ใช้ผู้ดูแลระบบ"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="กรอกรหัสผ่าน"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
