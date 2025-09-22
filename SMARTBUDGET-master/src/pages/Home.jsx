import React from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <section className="hero">
        <h1>Take Control of Your Finances</h1>
        <p>
          SmartBudget helps you track your budget, offers personalized suggestions, and provides
          valuable financial tips to help you achieve your financial goals.
        </p>
        <button onClick={() => navigate('/login')}>Login</button>
        <button onClick={() => navigate('/signup')}>Sign Up</button>
      </section>
    </>
  );
}

export default Home;