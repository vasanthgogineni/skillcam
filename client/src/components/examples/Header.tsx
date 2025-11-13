import Header from "../Header";

export default function HeaderExample() {
  return (
    <Header
      userName="Sarah Johnson"
      userRole="trainee"
      onThemeToggle={() => console.log("Theme toggle clicked")}
      onLogout={() => console.log("Logout clicked")}
      isDark={false}
    />
  );
}
