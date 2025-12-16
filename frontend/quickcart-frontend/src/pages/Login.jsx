import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";


export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);


  const isValidEmail = (emailValue) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  };


  const handlePasswordKeyDown = (e) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");


    // Client-side validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }


    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }


    setLoading(true);


    try {
      const role = await login(email, password);


      if (role === "MANUFACTURER") {
        navigate("/manufacturer");
      } else {
        navigate("/retailer");
      }
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setError("Please enter a valid email address");
    }
  };


  const togglePassword = () => {
    setShowPassword(!showPassword);
  };


  const handleSocialLogin = (provider) => {
    alert(`Logging in with ${provider}...`);
  };


  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Brand Section */}
        <div className="brand-section">
          <div className="brand-logo">
            <div className="logo-icon">📦</div>
            <span>QuickCart</span>
          </div>
          <h1>Wholesale B2B Made Simple</h1>
          <p>
            Connect manufacturers with retailers. Manage inventory, orders, and
            payments all in one place.
          </p>


          <div className="features">
            <div className="feature">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <strong>Instant Setup</strong> - Start trading in minutes, not
                days
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <strong>Global Reach</strong> - Connect with buyers and sellers
                worldwide
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <strong>Secure Payments</strong> - Industry-leading security
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <strong>Growth Tools</strong> - Analytics & business suite
              </div>
            </div>
          </div>
        </div>


        {/* Login Form Section */}
        <div className="login-section">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Log in to your QuickArt account and continue creating</p>
          </div>

          <form id="loginForm" onSubmit={handleSubmit}>
            {error && <div className="error-message" id="errorMessage">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  required
                />
                <div className="input-icon">✉️</div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={togglePassword}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
                {capsLockOn && (
                  <div className="caps-lock-warning" id="capsLockWarning">
                    <span>⚠️</span> Caps Lock is on
                  </div>
                )}
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-label">Remember me</span>
              </label>
              <a href="#" className="forgot-password">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="social-login">
            <button
              type="button"
              className="btn-social"
              onClick={() => handleSocialLogin("google")}
            >
              <span className="social-icon">G</span>
              <span>Google</span>
            </button>
            <button
              type="button"
              className="btn-social"
              onClick={() => handleSocialLogin("github")}
            >
              <span className="social-icon">⚙️</span>
              <span>GitHub</span>
            </button>
          </div>

          <div className="signup-link">
            Don't have an account? <a href="#">Create one now</a>
          </div>
        </div>
      </div>
    </div>
  );
}