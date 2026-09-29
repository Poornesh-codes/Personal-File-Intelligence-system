import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../services/api";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }

      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">

      {/* LEFT SIDE */}
      <section className="register-showcase">
        <div className="register-brand">
          <div className="register-brand-icon">F</div>
          <span>FileMind</span>
        </div>

        <div className="register-showcase-content">
          <p className="register-eyebrow">
            YOUR DOCUMENT WORKSPACE
          </p>

          <h1>
            Everything you need
            <br />
            <span>inside your files.</span>
          </h1>

          <p>
            Build your personal knowledge space. Upload documents,
            search through them and unlock intelligent insights.
          </p>

          <div className="register-features">
            <div>
              <span>✓</span>
              Search across your documents
            </div>

            <div>
              <span>✓</span>
              Organize your personal files
            </div>

            <div>
              <span>✓</span>
              Ask questions about your documents
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT SIDE */}
      <section className="register-form-section">
        <div className="register-container">

          <div className="register-header">
            <h2>Create your account</h2>
            <p>
              Start building your personal knowledge workspace.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="register-form"
          >
            <div className="form-group">
              <label htmlFor="name">Full name</label>

              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

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
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {message && (
              <div className="register-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="login-prompt">
            <span>Already have an account?</span>

            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </div>

        </div>
      </section>

    </div>
  );
}

export default Register;