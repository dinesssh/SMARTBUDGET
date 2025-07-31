import Header from "../components/Header";

export default function Signup() {
  return (
    <>
      <Header />
      <section className="signup-page">
        <form>
          <label>Name:</label>
          <input type="text" />
          <label>Email:</label>
          <input type="email" />
          <label>Password:</label>
          <input type="password" />
          <button type="submit">Signup</button>
        </form>
      </section>
    </>
  );
}
