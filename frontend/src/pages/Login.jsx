import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Invalid email or password");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* LEFT SIDE */}
      <section className="login-showcase">
        <div className="showcase-content">
          <div className="brand">
            <div className="brand-icon">F</div>
            <span>FileMind</span>
          </div>

          <div className="showcase-text">
            <p className="eyebrow">PERSONAL FILE INTELLIGENCE</p>

            <h1>
              Your files.
              <br />
              <span>Understand them.</span>
            </h1>

            <p className="showcase-description">
              Search, organize, summarize and ask questions about
              your documents from one intelligent workspace.
            </p>
          </div>

          <div className="document-visual">
            <div className="floating-card card-one">
              <div className="card-icon">📄</div>
              <div>
                <strong>Research.pdf</strong>
                <small>Indexed document</small>
              </div>
            </div>

            <div className="main-document">
              <div className="document-top">
                <span className="document-dot"></span>
                <span className="document-dot"></span>
                <span className="document-dot"></span>
              </div>

              <div className="document-heading"></div>

              <div className="document-line long"></div>
              <div className="document-line"></div>
              <div className="document-line medium"></div>

              <div className="document-highlight">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="document-line long"></div>
              <div className="document-line medium"></div>
            </div>

            <div className="floating-card card-two">
              <div className="ai-icon">✦</div>
              <div>
                <strong>AI Insight</strong>
                <small>Ask your documents</small>
              </div>
            </div>
          </div>
        </div>

        <div className="showcase-footer">
          <span>Search</span>
          <span>Summarize</span>
          <span>Ask</span>
          <span>Organize</span>
        </div>
      </section>

      {/* RIGHT SIDE */}
      <section className="login-form-section">
        <div className="login-container">
          <div className="mobile-brand">
            <div className="brand-icon">F</div>
            <span>FileMind</span>
          </div>

          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => setMessage("Password reset coming soon")}
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {message && (
              <div className="login-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="register-prompt">
            <span>Don't have an account?</span>

            <button
              type="button"
              onClick={() => navigate("/register")}
            >
              Create an account
            </button>
          </div>

          <p className="login-footer">
            By continuing, you agree to use FileMind responsibly.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Login;