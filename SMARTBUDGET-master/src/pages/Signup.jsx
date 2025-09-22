import Header from "../components/Header";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { authAPI } from "../utils/api";

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(null);
    setIsLoading(true);
    try {
      const payload = await authAPI.signup({ username: name, email, password });
      const { user, token, message } = payload || {};
      if (user && token) {
        const sessionUser = { ...user, token };
        setUser(sessionUser);
        try { localStorage.setItem('sb_user', JSON.stringify(sessionUser)); } catch {}
      }
      setStatus({ type: "success", message: message || "Signup successful" });
      setName("");
      setEmail("");
      setPassword("");
      navigate("/dashboard");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header />
      <section className="signup-page">
        <form onSubmit={handleSubmit}>
          <label>Name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={isLoading}>{isLoading ? "Signing up..." : "Signup"}</button>
        </form>
        {status && (
          <p className={status.type === "error" ? "error" : "success"}>{status.message}</p>
        )}
      </section>
    </>
  );
}
