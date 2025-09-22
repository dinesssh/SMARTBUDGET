import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import { budgetAPI } from '../utils/api';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function monthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

export default function Budget() {
  const months = useMemo(() => monthOptions(), []);
  const [selected, setSelected] = useState({ month: months[0].month, year: months[0].year });
  const [categories, setCategories] = useState([]); // {name, type, limit}
  const [summary, setSummary] = useState({ items: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [thresholds, setThresholds] = useState(true);
  const dragIndexRef = useRef(null);

  const KNOWN_CATEGORIES = useMemo(() => (
    ['Income','Groceries','Dining','Transportation','Housing','Utilities','Healthcare','Entertainment','Shopping','Education','Travel','Insurance','Savings','Other']
  ), []);

  const { startDate, endDate } = useMemo(() => {
    const s = new Date(selected.year, selected.month - 1, 1);
    const e = new Date(selected.year, selected.month, 0);
    const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { startDate: toISO(s), endDate: toISO(e) };
  }, [selected]);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);
      const [b, sum] = await Promise.all([
        budgetAPI.get(),
        budgetAPI.summary({ month: selected.month, year: selected.year })
      ]);
      setCategories(b?.budget?.categories || []);
      setSummary(sum || { items: [], totals: {} });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 20000); // auto-refresh every 20s
    return () => clearInterval(t);
  }, [selected]);

  function addRow(type) {
    setCategories(arr => [...arr, { name: '', type, limit: 0 }]);
  }
  function updateRow(idx, patch) {
    setCategories(arr => arr.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }
  function removeRow(idx) {
    setCategories(arr => arr.filter((_, i) => i !== idx));
  }

  // Drag-and-drop ordering
  function onDragStart(idx) {
    dragIndexRef.current = idx;
  }
  function onDragOver(e) {
    e.preventDefault();
  }
  function onDrop(idx) {
    const from = dragIndexRef.current;
    if (from === null || from === idx) return;
    setCategories(arr => {
      const copy = [...arr];
      const [moved] = copy.splice(from, 1);
      copy.splice(idx, 0, moved);
      return copy;
    });
    dragIndexRef.current = null;
  }

  async function exportBudget(kind) {
    try {
      const params = new URLSearchParams({ month: String(selected.month), year: String(selected.year) });
      const url = `/api/budget/export/${kind}?${params.toString()}`;
      let token = null;
      try { token = JSON.parse(localStorage.getItem('sb_user'))?.token || null; } catch {}
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(await res.text() || 'Export failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = kind === 'csv' ? 'budget_summary.csv' : 'budget_summary.xml';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      alert(e.message || 'Export failed');
    }
  }

  async function saveBudget(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // simple sanitize
      const cleaned = categories
        .filter(c => c.name && (c.type === 'income' || c.type === 'expense'))
        .map(c => ({ name: c.name.trim(), type: c.type, limit: Number(c.limit) || 0 }));
      await budgetAPI.save(cleaned);
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const expenseItems = (summary.items || []).filter(i => i.type === 'expense');
  const incomeItems = (summary.items || []).filter(i => i.type === 'income');

  const expensePie = useMemo(() => {
    const labels = expenseItems.map(i => i.name);
    const data = expenseItems.map(i => i.actual);
    const colors = labels.map((_, i) => `hsl(${(i*45)%360} 85% 55%)`);
    return { labels, datasets: [{ data, backgroundColor: colors }] };
  }, [expenseItems]);

  const barData = useMemo(() => {
    const totalIncomeActual = Number(summary?.totals?.totalIncomeActual || 0);
    const totalExpenseActual = Number(summary?.totals?.totalExpenseActual || 0);
    const totalIncomeLimit = incomeItems.reduce((s,i)=>s+i.limit,0);
    const totalExpenseLimit = expenseItems.reduce((s,i)=>s+i.limit,0);
    return {
      labels: ['Income', 'Expenses'],
      datasets: [
        { label: 'Actual', data: [totalIncomeActual, totalExpenseActual], backgroundColor: ['#34d399', '#f87171'] },
        { label: 'Limit', data: [totalIncomeLimit, totalExpenseLimit], backgroundColor: ['#86efac', '#fca5a5'] },
      ],
    };
  }, [summary, incomeItems, expenseItems]);

  return (
    <>
      <Header />
      <section className="budget-section modern">
        <div className="budget-header">
          <div>
            <h2>Budget Planner</h2>
            <p className="muted">Create category limits and track your spending in real time.</p>
          </div>
          <div className="filters">
            <div>
              <label>Month</label>
              <select value={`${selected.month}-${selected.year}`} onChange={e=>{ const [m,y]=e.target.value.split('-').map(Number); setSelected({ month:m, year:y }); }}>
                {months.map(m => (<option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>{m.label}</option>))}
              </select>
            </div>
            <button className="btn" onClick={loadAll}>Refresh</button>
            <button className="btn primary" onClick={()=>exportBudget('csv')}>Export CSV</button>
            <button className="btn outline" onClick={()=>exportBudget('xml')}>Export XML</button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="budget-summary-cards">
              <div className="report-card">
                <h3>Total Income</h3>
                <p className="report-amount positive">₹{Number(summary?.totals?.totalIncomeActual||0).toFixed(2)}</p>
              </div>
              <div className="report-card">
                <h3>Total Expenses</h3>
                <p className="report-amount negative">₹{Number(summary?.totals?.totalExpenseActual||0).toFixed(2)}</p>
              </div>
              <div className="report-card">
                <h3>Remaining</h3>
                <p className="report-amount">₹{Number(summary?.totals?.remainingBudget||0).toFixed(2)}</p>
              </div>
              <div className="report-card">
                <h3>Used %</h3>
                <p className="report-amount">{summary?.totals?.percentUsed || 0}%</p>
              </div>
            </div>

            <div className="budget-grid">
              <div className="budget-editor">
                <h3>Categories & Limits</h3>
                <form onSubmit={saveBudget}>
                  <table className="transactions-table">
                    <thead>
                      <tr>
                        <th style={{width: 40}}></th>
                        <th>Type</th>
                        <th>Name</th>
                        <th>Limit</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c, idx) => (
                        <tr key={idx}
                            draggable
                            onDragStart={()=>onDragStart(idx)}
                            onDragOver={onDragOver}
                            onDrop={()=>onDrop(idx)}
                        >
                          <td className="drag-handle" title="Drag to reorder">≡</td>
                          <td>
                            <select value={c.type} onChange={e=>updateRow(idx, { type: e.target.value })}>
                              <option value="income">Income</option>
                              <option value="expense">Expense</option>
                            </select>
                          </td>
                          <td>
                            <input type="text" list="known-categories" value={c.name} onChange={e=>updateRow(idx, { name: e.target.value })} placeholder="e.g., Salary or Groceries" />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" value={c.limit} onChange={e=>updateRow(idx, { limit: e.target.value })} />
                          </td>
                          <td>
                            <button type="button" className="btn" onClick={()=>removeRow(idx)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <datalist id="known-categories">
                    {KNOWN_CATEGORIES.map((opt)=> <option key={opt} value={opt} />)}
                  </datalist>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn primary" onClick={()=>addRow('income')}>Add Income</button>
                    <button type="button" className="btn outline" onClick={()=>addRow('expense')}>Add Expense</button>
                    <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save Budget'}</button>
                  </div>
                </form>
              </div>

              <div className="budget-visuals">
                <div className="chart-card">
                  <h3>Expense Distribution (Actual)</h3>
                  {expenseItems.length ? <Pie data={expensePie} /> : <p className="muted">No expense data</p>}
                </div>
                <div className="chart-card">
                  <h3>Actual vs Limit</h3>
                  <Bar data={barData} options={{ responsive:true, plugins:{ legend:{ position:'top' }}}} />
                </div>
              </div>
            </div>

            <div className="budget-progress">
              <h3>Category Usage</h3>
              <div style={{ marginBottom: 10 }}>
                <label>
                  <input type="checkbox" checked={thresholds} onChange={e=>setThresholds(e.target.checked)} style={{ marginRight: 8 }} />
                  Use threshold colors (green &lt; 70%, orange 70–90%, red &gt; 90%)
                </label>
              </div>
              <div className="progress-list">
                {summary.items.map((i, idx) => (
                  <div key={idx} className="progress-item">
                    <div className="progress-header">
                      <span>{i.type === 'expense' ? '🛒' : '💰'} {i.name}</span>
                      <span>₹{i.actual.toFixed(2)} / ₹{i.limit.toFixed(2)} ({i.usedPct}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${thresholds ? (i.usedPct>90 ? 'danger' : i.usedPct>=70 ? 'warn' : 'ok') : i.type}`} style={{ width: `${Math.min(100, i.usedPct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
