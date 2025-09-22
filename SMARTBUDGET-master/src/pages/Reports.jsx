import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { analyticsAPI, transactionAPI } from "../utils/api";

const CATEGORIES = ['All','Groceries','Dining','Transportation','Housing','Utilities','Healthcare','Entertainment','Shopping','Education','Travel','Insurance','Savings','Other','Income'];
const SORTS = [
  { value: '-date', label: 'Date (newest)' },
  { value: 'date', label: 'Date (oldest)' },
  { value: '-amount', label: 'Amount (high→low)' },
  { value: 'amount', label: 'Amount (low→high)' },
];

function monthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

export default function Reports() {
  const months = useMemo(() => monthOptions(), []);
  const [selected, setSelected] = useState({ month: months[0].month, year: months[0].year });
  const [filters, setFilters] = useState({ category: 'All', type: 'all', sort: '-date' });
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, categoryBreakdown: {} });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const { startDate, endDate } = useMemo(() => {
    const s = new Date(selected.year, selected.month - 1, 1);
    const e = new Date(selected.year, selected.month, 0);
    const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { startDate: toISO(s), endDate: toISO(e) };
  }, [selected]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sum, tx] = await Promise.all([
          analyticsAPI.getSummary({ month: selected.month, year: selected.year }),
          transactionAPI.getAll({ page, limit, startDate, endDate, sort: filters.sort, category: filters.category !== 'All' ? filters.category : undefined, type: filters.type !== 'all' ? filters.type : undefined }),
        ]);
        setSummary(sum);
        setRows(tx.transactions || []);
        setTotalPages(tx.totalPages || 1);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selected, filters, page, startDate, endDate]);

  const topCategory = useMemo(() => {
    const entries = Object.entries(summary.categoryBreakdown || {});
    if (!entries.length) return '—';
    return entries.sort((a,b)=> b[1]-a[1])[0][0];
  }, [summary]);

  async function exportFile(kind) {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (filters.category !== 'All') params.set('category', filters.category);
      if (filters.type !== 'all') params.set('type', filters.type);
      params.set('sort', filters.sort);
      const url = `/api/export/${kind}?${params.toString()}`;
      let token = null;
      try { token = JSON.parse(localStorage.getItem('sb_user'))?.token || null; } catch {}
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(await res.text() || 'Export failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = kind === 'csv' ? 'transactions.csv' : 'transactions.xml';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      alert(e.message || 'Export failed');
    }
  }

  return (
    <>
      <Header />
      <section className="reports-section modern">
        <div className="reports-header">
          <div>
            <h2>Financial Reports</h2>
            <p className="muted">Review your income, expenses, and top categories for the selected month.</p>
          </div>
          <div className="export-group">
            <button className="btn primary" onClick={()=>exportFile('csv')}>Export CSV</button>
            <button className="btn outline" onClick={()=>exportFile('xml')}>Export XML</button>
          </div>
        </div>

        <div className="filters">
          <div>
            <label>Month</label>
            <select value={`${selected.month}-${selected.year}`} onChange={e=>{ const [m,y]=e.target.value.split('-').map(Number); setPage(1); setSelected({ month:m, year:y }); }}>
              {months.map(m => (
                <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Category</label>
            <select value={filters.category} onChange={e=>{ setPage(1); setFilters(f=>({ ...f, category: e.target.value })) }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Type</label>
            <select value={filters.type} onChange={e=>{ setPage(1); setFilters(f=>({ ...f, type: e.target.value })) }}>
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label>Sort</label>
            <select value={filters.sort} onChange={e=>{ setPage(1); setFilters(f=>({ ...f, sort: e.target.value })) }}>
              {SORTS.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="report-cards">
              <div className="report-card">
                <h3>Total Income</h3>
                <p className="report-amount positive">₹{(summary.income||0).toFixed(2)}</p>
                <p className="report-date">{months.find(m=> m.month===selected.month && m.year===selected.year)?.label}</p>
              </div>
              <div className="report-card">
                <h3>Total Expenses</h3>
                <p className="report-amount negative">₹{(summary.expenses||0).toFixed(2)}</p>
                <p className="report-date">{months.find(m=> m.month===selected.month && m.year===selected.year)?.label}</p>
              </div>
              <div className="report-card">
                <h3>Balance</h3>
                <p className="report-amount">₹{(summary.balance||0).toFixed(2)}</p>
                <p className="report-date">{months.find(m=> m.month===selected.month && m.year===selected.year)?.label}</p>
              </div>
              <div className="report-card">
                <h3>Top Expense Category</h3>
                <p className="report-amount">{topCategory}</p>
                <p className="report-date">{months.find(m=> m.month===selected.month && m.year===selected.year)?.label}</p>
              </div>
            </div>

            <div className="transactions">
              <h3>Transactions</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map(t => (
                    <tr key={t._id}>
                      <td>{new Date(t.date).toISOString().slice(0,10)}</td>
                      <td>{t.description}</td>
                      <td>{t.category}</td>
                      <td>{t.type}</td>
                      <td className={t.type === 'expense' ? 'negative' : 'positive'}>
                        {t.type === 'expense' ? '-' : '+'}₹{t.amount.toFixed(2)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="no-data">No transactions</td></tr>
                  )}
                </tbody>
              </table>
              <div className="pager">
                <button className="btn" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>Prev</button>
                <span>Page {page} of {totalPages}</span>
                <button className="btn" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
