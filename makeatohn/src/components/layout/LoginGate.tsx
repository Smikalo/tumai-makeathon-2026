import { useState } from "react";
import { useSession } from "../../context/SessionContext";

interface Props {
  onLogin: () => void;
}

export function LoginGate({ onLogin }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClick = () => {
    setIsConnecting(true);
    onLogin();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ background: "var(--bg-panel)" }}>
      <div className="max-w-md w-full">
        <div className="w-16 h-16 rounded-2xl bg-tum-blue flex items-center justify-center text-white text-2xl font-bold mb-6 mx-auto shadow-lg shadow-tum-blue/20">
          CC
        </div>
        <h1 className="text-2xl font-bold mb-2 text-app-fg">
          {isConnecting ? "Connecting to TUM..." : "Welcome to Campus Co-Pilot"}
        </h1>
        <p className="text-app-fg3 text-[14px] mb-8 leading-relaxed">
          {isConnecting 
            ? "Please wait while we establish a secure connection via Shibboleth SSO. You can see the progress in the Trace and Browser panels." 
            : "Your AI-powered assistant for university logistics. To provide personalized help with your schedule, grades, and Moodle courses, we need to connect to your TUM account."}
        </p>
        
        {!isConnecting && (
          <div 
            className="rounded-xl p-6 mb-8 text-left border border-dashed border-app-fg3/30 bg-app-fg3/5"
          >
            <h3 className="text-[12px] font-medium uppercase tracking-widest text-app-fg3 mb-3">What we access:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-[13px] text-app-fg2">
                <span className="text-tum-blue">✓</span> Private TUMonline schedule
              </li>
              <li className="flex items-center gap-2 text-[13px] text-app-fg2">
                <span className="text-tum-blue">✓</span> Course registrations & grades
              </li>
              <li className="flex items-center gap-2 text-[13px] text-app-fg2">
                <span className="text-tum-blue">✓</span> Moodle learning materials
              </li>
            </ul>
          </div>
        )}

        {isConnecting ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-tum-blue/30 border-t-tum-blue rounded-full animate-spin" />
            <p className="text-[12px] text-app-fg3 animate-pulse">Exchanging SAML 2.0 Tokens...</p>
          </div>
        ) : (
          <button
            onClick={handleClick}
            className="w-full py-3 px-4 rounded-xl font-medium text-white transition-all transform active:scale-[0.98] shadow-lg shadow-tum-blue/25"
            style={{ background: "var(--accent-blue)" }}
          >
            Connect TUM Account (Shibboleth)
          </button>
        )}
        
        <p className="mt-4 text-[11px] text-app-fg3">
          {isConnecting ? "A secure browser session has been launched." : "You will be redirected to the official TUM Shibboleth Identity Provider."}
        </p>
      </div>
    </div>
  );
}
