import Header from "../components/Header";

export default function Settings() {
  return (
    <>
      <Header />
      <section className="settings-page">
        <h2>Settings</h2>
        <form>
            <label>Name: <input type="text" /></label>
            <label>Email: <input type="email" /></label>
            <label>Password: <input type="password" /></label>
            <label>Default Currency: <input type="text" /></label>
            <label>Notifications: <input type="checkbox" /></label>
            <button type="button" onclick="saveSettings()">Save Changes</button>
        </form>
      </section>
    </>
  );
}
