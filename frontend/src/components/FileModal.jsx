import { useState } from 'react';

export default function FileModal({ file, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = file.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{file.path}</span>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button className="btn-ghost" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="modal-body">
          <pre><code>{file.content}</code></pre>
        </div>
      </div>
    </div>
  );
}
