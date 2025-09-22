import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import { transactionAPI } from "../utils/api";

const CATEGORIES = ['All','Groceries','Dining','Transportation','Housing','Utilities','Healthcare','Entertainment','Shopping','Education','Travel','Insurance','Savings','Other','Income'];

export default function Transactions() {
  const [filters, setFilters] = useState({ type: 'all', category: 'All', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  // Upload states
  const [file, setFile] = useState(null);
  const uploadingRef = useRef(false);

  // Quick paste states
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  // Quick add with suggestions
  const [qa, setQa] = useState({ date: "", description: "", category: "", type: "expense", amount: "" });
  const [catSug, setCatSug] = useState([]);
  const [descSug, setDescSug] = useState([]);
  const [amtSug, setAmtSug] = useState([]);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (filters.category && filters.category !== 'All') params.category = filters.category;
    if (filters.type && filters.type !== 'all') params.type = filters.type;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return params;
  }, [page, limit, filters]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await transactionAPI.getAll(queryParams);
        setRows(data.transactions || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryParams]);

  const pageTotal = rows.reduce((acc, t) => acc + (t.type === 'expense' ? -t.amount : t.amount), 0);

  async function remove(id) {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionAPI.delete(id);
      // reload
      const data = await transactionAPI.getAll(queryParams);
      setRows(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      setError(e.message);
    }
  }

  // Handlers: Upload
  async function handleUpload(e) {
    e.preventDefault();
    setStatus("");
    if (!file || uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const res = await transactionAPI.uploadFile(file);
      setStatus(`Uploaded: inserted ${res.inserted} of ${res.total || res.results?.length || 0}`);
      // refresh
      const data = await transactionAPI.getAll(queryParams);
      setRows(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setBulkResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      uploadingRef.current = false;
      setFile(null);
    }
  }

  // Quick paste parse
  function parsePasted(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
    const colsNeeded = ['date','description','category','type','amount'];
    const hasAll = colsNeeded.every(c=> header.includes(c));
    const rows = [];
    for (let i=hasAll?1:0; i<lines.length; i++) {
      const cols = lines[i].split(',').map(c=>c.trim());
      const obj = {};
      if (hasAll) header.forEach((h, idx)=> obj[h] = cols[idx] ?? "");
      else {
        obj.date = cols[0]; obj.description = cols[1]; obj.category = cols[2]; obj.type = cols[3]; obj.amount = cols[4];
      }
      rows.push(obj);
    }
    return rows;
  }

  async function submitPaste() {
    setStatus("");
    try {
      const rowsParsed = parsePasted(pasteText);
      if (!rowsParsed.length) { setStatus('Nothing to import'); return; }
      const res = await transactionAPI.bulk(rowsParsed);
      setBulkResult(res);
      setStatus(`Bulk: inserted ${res.inserted} of ${rowsParsed.length}`);
      // refresh
      const data = await transactionAPI.getAll(queryParams);
      setRows(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  // Quick Add suggestions
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        if (qa.category) {
          const s = await transactionAPI.suggestions('category', { q: qa.category });
          if (active) setCatSug(s);
        } else setCatSug([]);
        if (qa.description) {
          const s2 = await transactionAPI.suggestions('description', { q: qa.description });
          if (active) setDescSug(s2);
        } else setDescSug([]);
        if (qa.description) {
          const s3 = await transactionAPI.suggestions('amount', { description: qa.description });
          if (active) setAmtSug(s3?.map(v=> String(v)) || []);
        } else setAmtSug([]);
      } catch {}
    };
    run();
    return () => { active = false; };
  }, [qa.category, qa.description]);

  async function quickAdd(e) {
    e.preventDefault();
    setStatus("");
    try {
      const payload = { ...qa, amount: Number(qa.amount) };
      if (!payload.date) payload.date = new Date().toISOString().slice(0,10);
      await transactionAPI.create(payload);
      setQa({ date: "", description: "", category: "", type: "expense", amount: "" });
      const data = await transactionAPI.getAll(queryParams);
      setRows(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setStatus('Added');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Header />
      <section className="transactions-section">
        <h2>All Transactions</h2>

        {/* Upload & Quick Paste */}
        <div style={{ display:'grid', gap: '10px', marginBottom: 12 }}>
          <form onSubmit={handleUpload} style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ fontWeight:600 }}>Upload CSV/XLSX:</label>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={e=> setFile(e.target.files?.[0] || null)} />
            <button type="submit" disabled={!file}>Upload</button>
            {status && <span className="muted">{status}</span>}
          </form>
          <div>
            <button className="btn outline" onClick={()=> setPasteOpen(o=>!o)}>{pasteOpen ? 'Hide' : 'Quick Paste'}</button>
          </div>
          {pasteOpen && (
            <div>
              <p className="muted">Paste CSV-like data with columns: date, description, category, type, amount (header optional)</p>
              <textarea rows={5} style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:8 }} value={pasteText} onChange={e=> setPasteText(e.target.value)} />
              <div style={{ marginTop: 6 }}>
                <button onClick={submitPaste}>Import Pasted Rows</button>
              </div>
              {bulkResult && bulkResult.results && (
                <details style={{ marginTop: 6 }}>
                  <summary>View import results</summary>
                  <pre style={{ whiteSpace:'pre-wrap' }}>{JSON.stringify(bulkResult, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Quick Add with suggestions */}
        <div style={{ border:'1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 12, background:'#fff' }}>
          <form onSubmit={quickAdd} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8 }}>
            <div>
              <label>Date</label>
              <input type="date" value={qa.date} onChange={e=> setQa(q=>({...q, date:e.target.value}))} />
            </div>
            <div style={{ position:'relative' }}>
              <label>Description</label>
              <input type="text" value={qa.description} onChange={e=> setQa(q=>({...q, description:e.target.value}))} autoComplete="off" />
              {descSug?.length>0 && (
                <ul className="suggest-list">
                  {descSug.map((s,i)=> (
                    <li key={i} onClick={()=> setQa(q=>({...q, description:s}))}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ position:'relative' }}>
              <label>Category</label>
              <input type="text" value={qa.category} onChange={e=> setQa(q=>({...q, category:e.target.value}))} autoComplete="off" />
              {catSug?.length>0 && (
                <ul className="suggest-list">
                  {catSug.map((s,i)=> (
                    <li key={i} onClick={()=> setQa(q=>({...q, category:s}))}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ position:'relative' }}>
              <label>Amount</label>
              <input type="number" step="0.01" value={qa.amount} onChange={e=> setQa(q=>({...q, amount:e.target.value}))} />
              {amtSug?.length>0 && (
                <ul className="suggest-list">
                  {amtSug.map((s,i)=> (
                    <li key={i} onClick={()=> setQa(q=>({...q, amount:s}))}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label>Type</label>
              <select value={qa.type} onChange={e=> setQa(q=>({...q, type:e.target.value}))}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div style={{ alignSelf:'end' }}>
              <button type="submit">Add</button>
            </div>
          </form>
        </div>

        <div className="transaction-filters">
          <div>
            <label>Type: </label>
            <select value={filters.type} onChange={e=>{ setPage(1); setFilters(f=>({...f, type: e.target.value})) }}>
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label>Category: </label>
            <select value={filters.category} onChange={e=>{ setPage(1); setFilters(f=>({...f, category: e.target.value})) }}>
              {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>From: </label>
            <input type="date" value={filters.startDate} onChange={e=>{ setPage(1); setFilters(f=>({...f, startDate: e.target.value})) }} />
          </div>
          <div>
            <label>To: </label>
            <input type="date" value={filters.endDate} onChange={e=>{ setPage(1); setFilters(f=>({...f, endDate: e.target.value})) }} />
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((t) => (
                    <tr key={t._id}>
                      <td>{new Date(t.date).toISOString().slice(0,10)}</td>
                      <td>{t.description}</td>
                      <td>{t.category}</td>
                      <td>{t.type}</td>
                      <td className={t.type === 'expense' ? "negative" : "positive"}>
                        {t.type === 'expense' ? '-' : '+'}₹{t.amount.toFixed(2)}
                      </td>
                      <td>
                        <button style={{ backgroundColor: '#f87171' }} onClick={()=>remove(t._id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div>
                <strong>Page Total:</strong> <span className={pageTotal < 0 ? 'negative' : 'positive'}>₹{pageTotal.toFixed(2)}</span>
              </div>
              <div>
                <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>Prev</button>
                <span style={{ margin: '0 8px' }}>Page {page} of {totalPages}</span>
                <button onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
