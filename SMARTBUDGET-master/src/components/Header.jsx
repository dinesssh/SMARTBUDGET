import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sb_user');
      setUser(raw ? JSON.parse(raw) : null);
    } catch {}
  }, []);
  function logout() {
    try { localStorage.removeItem('sb_user'); } catch {}
    setUser(null);
    navigate('/');
  }
  return (
    <header>
      <div className="logo">SmartBudget</div>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/dashboard">Dashboard</Link></li>
          <li><Link to="/transactions">Transactions</Link></li>
          <li><Link to="/reports">Reports</Link></li>
          <li><Link to="/budget">Budget</Link></li>
          <li><Link to="/settings">Settings</Link></li>
          {!user && <li><Link to="/login">Login</Link></li>}
          {!user && <li><Link to="/signup">Sign Up</Link></li>}
          {user && <li><button type="button" onClick={logout}>Logout</button></li>}
        </ul>
      </nav>
    </header>
  );
}

export default Header;