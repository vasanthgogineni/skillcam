import Login from "../Login";

export default function LoginExample() {
  return (
    <Login
      onLogin={(username, role) =>
        console.log("Login successful:", username, role)
      }
    />
  );
}
