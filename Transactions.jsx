import React, { useState } from "react";
import Header from "../components/Header";

export default function Transactions() {
  const [category, setCategory] = useState("All");
  const [month, setMonth] = useState("July");

  const transactions = [
    { id: 1, date: "2025-07-02", description: "Grocery Store", category: "Food", amount: -1500 },
    { id: 2, date: "2025-07-04", description: "Uber Ride", category: "Transport", amount: -250 },
    { id: 3, date: "2025-07-05", description: "Salary", category: "Income", amount: 20000 },
    { id: 4, date: "2025-07-10", description: "Electricity Bill", category: "Bills", amount: -1800 },
    { id: 5, date: "2025-07-12", description: "Movie Night", category: "Entertainment", amount: -500 },
  ];

  const filtered = transactions.filter((t) =>
    (category === "All" || t.category === category) &&
    (month === "All" || t.date.startsWith("2025-07")) // You can enhance this with a real date check
  );

  const total = filtered.reduce((acc, t) => acc + t.amount, 0);

  return (
    <>
      <Header />
      <section className="transactions-section">
        <h2>All Transactions</h2>

        <div className="transaction-filters">
          <div>
            <label>Month: </label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option>July</option>
              <option>June</option>
              <option>May</option>
              <option>All</option>
            </select>
          </div>
          <div>
            <label>Category: </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All</option>
              <option>Food</option>
              <option>Transport</option>
              <option>Bills</option>
              <option>Entertainment</option>
              <option>Income</option>
            </select>
          </div>
        </div>

        <table className="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td>{t.category}</td>
                  <td className={t.amount < 0 ? "negative" : "positive"}>₹{t.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="transactions-summary">
          <strong>Total: </strong>
          <span className={total < 0 ? "negative" : "positive"}>₹{total}</span>
        </div>
      </section>
    </>
  );
}
