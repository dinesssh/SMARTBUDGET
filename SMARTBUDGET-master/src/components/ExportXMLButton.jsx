import React from 'react';

export default function ExportXMLButton({ params = {} }) {
  async function handleClick() {
    try {
      // Build query
      const qp = new URLSearchParams(params).toString();
      const url = `/api/export/xml${qp ? `?${qp}` : ''}`;
      // Token
      let token = null;
      try { token = JSON.parse(localStorage.getItem('sb_user'))?.token || null; } catch {}
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Export failed');
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'budget.xml';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      alert(err.message || 'Export failed');
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="export-btn"
    >
      Export Budget (XML)
    </button>
  );
}


