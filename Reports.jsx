import React from "react";
import Header from "../components/Header";

export default function Reports() {
  const reports = [
    { title: "Monthly Spending", amount: "₹12,300", date: "July 2025" },
    { title: "Top Expense Category", amount: "Food & Dining", date: "July 2025" },
    { title: "Total Income", amount: "₹25,000", date: "July 2025" },
    { title: "Savings", amount: "₹7,500", date: "July 2025" },
  ];

  return (
    <>
      <Header />
      <section className="reports-section">
        <h2>Financial Reports</h2>
        <p>View a summary of your spending, income, and savings for the selected period.</p>

        <div className="report-options">
          <label>Choose Month: </label>
          <select>
            <option>July 2025</option>
            <option>June 2025</option>
            <option>May 2025</option>
          </select>

          <label>Category:</label>
          <select>
            <option>All</option>
            <option>Food</option>
            <option>Transport</option>
            <option>Bills</option>
            <option>Entertainment</option>
          </select>
        </div>

        <div className="report-cards">
          {reports.map((report, index) => (
            <div className="report-card" key={index}>
              <h3>{report.title}</h3>
              <p className="report-amount">{report.amount}</p>
              <p className="report-date">{report.date}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
