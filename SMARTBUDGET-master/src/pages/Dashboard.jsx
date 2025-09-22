import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import ExportXMLButton from '../components/ExportXMLButton';
import { analyticsAPI, transactionAPI } from '../utils/api';
import { Bar, Pie } from 'react-chartjs-2';
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

const CATEGORIES = ['Income','Groceries','Dining','Transportation','Housing','Utilities','Healthcare','Entertainment','Shopping','Education','Travel','Insurance','Savings','Other'];

function Dashboard() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, categoryBreakdown: {}, savingsRate: 0, monthlyBudget: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), description: '', category: 'Other', type: 'expense', amount: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sb_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [sum, tx] = await Promise.all([
          analyticsAPI.getSummary(),
          transactionAPI.getAll({ limit: 10, page: 1 }),
        ]);
        setSummary(sum);
        setTransactions(tx.transactions || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalIncome = summary.income || 0;
  const totalExpenses = summary.expenses || 0;
  const balance = summary.balance || 0;

  const barData = useMemo(() => ({
    labels: ['This Month'],
    datasets: [
      { label: 'Income', data: [totalIncome], backgroundColor: '#34d399' },
      { label: 'Expenses', data: [totalExpenses], backgroundColor: '#f87171' },
    ],
  }), [totalIncome, totalExpenses]);

  const pieData = useMemo(() => {
    const labels = Object.keys(summary.categoryBreakdown || {});
    const values = Object.values(summary.categoryBreakdown || {});
    const colors = labels.map((_, i) => `hsl(${(i*40)%360}deg 85% 55%)`);
    return { labels, datasets: [{ data: values, backgroundColor: colors }] };
  }, [summary]);

  const suggestion = useMemo(() => {
    if (totalExpenses > totalIncome) return 'Warning: overspending!';
    const savingsRate = Number(summary.savingsRate) || 0;
    if (savingsRate >= 20) return 'Great job, you saved money!';
    return 'Track spending to hit your savings goals.';
  }, [totalIncome, totalExpenses, summary.savingsRate]);

  async function addTransaction(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      await transactionAPI.create(payload);
      setForm({ date: new Date().toISOString().slice(0,10), description: '', category: 'Other', type: 'expense', amount: '' });
      // reload
      const [sum, tx] = await Promise.all([
        analyticsAPI.getSummary(),
        transactionAPI.getAll({ limit: 10, page: 1 }),
      ]);
      setSummary(sum);
      setTransactions(tx.transactions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <section className="dashboard">
        <h2>Welcome back{user?.username ? `, ${user.username}` : ''}!</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="summary">
              <div style={{ borderLeftColor: '#facc15' }}>Total Income: ₹{totalIncome.toFixed(2)}</div>
              <div style={{ borderLeftColor: '#facc15' }}>Total Expenses: ₹{totalExpenses.toFixed(2)}</div>
              <div style={{ borderLeftColor: '#facc15' }}>Balance: ₹{balance.toFixed(2)}</div>
            </div>
            <div className="tips">
              <h3>Suggestions</h3>
              <div className="tip">{suggestion}</div>
            </div>
            <div className="charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h3>Monthly Income vs Expenses</h3>
                <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' }}}} />
              </div>
              <div>
                <h3>Expenses by Category</h3>
                <Pie data={pieData} />
              </div>
            </div>
            <div className="transactions">
              <h3>Recent Transactions</h3>
              <table>
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {transactions.length ? transactions.map(t => (
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
                    <tr><td colSpan="5">No transactions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="add-transaction" style={{ marginTop: 24 }}>
              <h3>Add Transaction</h3>
              <form onSubmit={addTransaction}>
                <label>Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f, date: e.target.value}))} required />
                <label>Description</label>
                <input type="text" value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} required />
                <label>Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))}>
                  {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <label>Type</label>
                <select value={form.type} onChange={e=>setForm(f=>({...f, type: e.target.value}))}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <label>Amount</label>
                <input type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f, amount: e.target.value}))} required />
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Transaction'}</button>
              </form>
            </div>
            <div style={{ marginTop: '16px' }}>
              <ExportXMLButton />
            </div>
          </>
        )}
      </section>
    </>
  );
}

export default Dashboard;