import Header from "../components/Header";

export default function Login() {
  return (
    <>
      <Header />
      <section className="login-page">
        <h2>Login</h2>
        <form>
          <label>Email:</label>
          <input type="email" />
          <label>Password:</label>
          <input type="password" />
          <button type="submit">Login</button>
        </form>
      </section>
    </>
  );
}
