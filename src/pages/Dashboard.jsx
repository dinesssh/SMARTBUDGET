import React from 'react';
import Header from '../components/Header';

function Dashboard() {
  return (
    <>
      <Header />
      <section className="dashboard">
        <h2>Welcome back, DADDY!</h2>
        <div className="summary">
          <div>Budget Status: ₹200,000 / ₹250,000 <span className="positive">+5%</span></div>
          <div>Savings Rate: 10% <span className="negative">-2%</span></div>
          <div>Debt Overview: ₹400,000 <span className="positive">+1%</span></div>
        </div>
        <div className="tips">
          <h3>Personalized Tips</h3>
          <div className="tip">Reduce Dining Expenses - Consider cooking at home more often.</div>
          <div className="tip">Automate Savings - Set up automatic transfers to your savings account.</div>
        </div>
        <div className="transactions">
          <h3>Recent Transactions</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>2023-08-15</td><td>Grocery Shopping</td><td>Groceries</td><td>-₹12,000</td></tr>
              <tr><td>2023-08-14</td><td>Salary Deposit</td><td>Income</td><td>+₹240,000</td></tr>
              <tr><td>2023-08-12</td><td>Restaurant Dinner</td><td>Dining</td><td>-₹6,400</td></tr>
              <tr><td>2023-08-10</td><td>Rent Payment</td><td>Housing</td><td>-₹96,000</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default Dashboard;