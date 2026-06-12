import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Sparkles, MessageSquare, BarChart3, ArrowRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Card, Spinner } from "../components/ui";

export default function Login() {
  const { user, login, demo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(demo.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setTimeout(() => {
      const res = login(email, password);
      if (res.ok) navigate("/");
      else {
        setError(res.error);
        setBusy(false);
      }
    }, 350);
  }

  return (
    <div className="login-split">
      <div className="login-hero">
        <div className="row" style={{ gap: 12, zIndex: 1 }}>
          <div className="brand-mark" style={{ fontSize: 24 }}>☕</div>
          <div>
            <div className="brand-name" style={{ fontSize: 20 }}>Brewhaus</div>
            <div className="brand-sub">AI-NATIVE CRM</div>
          </div>
        </div>

        <div style={{ zIndex: 1 }}>
          <h1>Reach the right shoppers, in their words.</h1>
          <p className="tag">
            Describe a goal in plain English. Your co-pilot finds the audience,
            writes the message, and sends it — then tells you what worked.
          </p>
          <div style={{ marginTop: 28 }}>
            <div className="login-feature">
              <span className="fi"><Sparkles size={16} /></span>
              Natural-language audience building, grounded on live data
            </div>
            <div className="login-feature">
              <span className="fi"><MessageSquare size={16} /></span>
              AI-drafted, on-brand messages per channel
            </div>
            <div className="login-feature">
              <span className="fi"><BarChart3 size={16} /></span>
              Live delivery, engagement & revenue attribution
            </div>
          </div>
        </div>

        <div className="tiny" style={{ color: "#a8927e", zIndex: 1 }}>
          Brewhaus Coffee Co. · Internal marketing tool
        </div>
      </div>

      <div className="login-form-wrap">
        <Card pad className="login-card">
          <div className="eyebrow">Welcome back</div>
          <h2 style={{ fontSize: 26, margin: "6px 0 4px" }}>Sign in</h2>
          <p className="muted small" style={{ marginBottom: 20 }}>
            Sign in to your Brewhaus marketing workspace.
          </p>

          <form onSubmit={submit}>
            <label className="field-label">Work email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brewhaus.coffee"
              style={{ marginBottom: 14 }}
            />
            <label className="field-label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ marginBottom: 16 }}
            />
            {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? <Spinner /> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="demo-hint" style={{ marginTop: 18 }}>
            <b>Demo login</b> — email <code>{demo.email}</code>, password{" "}
            <code>{demo.password}</code>. (Auth is a deliberate scope cut; this is a
            lightweight gate, not production auth.)
          </div>
        </Card>
      </div>
    </div>
  );
}
