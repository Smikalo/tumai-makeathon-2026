import { SessionProvider } from "./context/SessionContext";
import { AppShell } from "./components/layout/AppShell";

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}
