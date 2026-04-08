import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { showToast } from "../utils/notify";
import "../components/Loader.css";
import "./AuthModern.css";

export default function Login() {
  const { login, register, requestOtp, verifyOtp, oauthLogin } = useAuth();
  const navigate = useNavigate();

  const [authTab, setAuthTab] = useState("login");
  const [loginMode, setLoginMode] = useState("email");
  const [loadingAction, setLoadingAction] = useState("");
  const [pendingLockSec, setPendingLockSec] = useState(0);
  const [otpCooldownSec, setOtpCooldownSec] = useState(0);
  const [banner, setBanner] = useState({ type: "", text: "" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState("RETAILER");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const [otpEmail, setOtpEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const [otpName, setOtpName] = useState("");
  const [otpRole, setOtpRole] = useState("RETAILER");
  const [errors, setErrors] = useState({});
  const [oauthRole, setOauthRole] = useState("RETAILER");

  const isBusy = !!loadingAction;
  const loginLocked = pendingLockSec > 0;

  useEffect(() => {
    if (pendingLockSec <= 0) return undefined;
    const timer = setInterval(() => {
      setPendingLockSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingLockSec]);

  useEffect(() => {
    if (otpCooldownSec <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldownSec]);

  const validators = useMemo(
    () => ({
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || ""),
      phone: (value) => /^\d{10}$/.test(value || ""),
      otp: (value) => /^\d{6}$/.test(value || ""),
      password: (value) => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value || ""),
    }),
    []
  );

  function redirectByRole(role) {
    switch (String(role || "").replace(/^ROLE_/, "").toUpperCase()) {
      case "SUPER_ADMIN":
        navigate("/super-admin/dashboard", { replace: true });
        break;
      case "ADMIN":
        navigate("/admin/dashboard", { replace: true });
        break;
      case "CATALOG_MANAGER":
        navigate("/catalog/dashboard", { replace: true });
        break;
      case "MANUFACTURER":
        navigate("/manufacturer/dashboard", { replace: true });
        break;
      case "RETAILER":
        navigate("/retailer/dashboard", { replace: true });
        break;
      default:
        navigate("/login", { replace: true });
    }
  }

  const setPendingBanner = (text) => {
    setBanner({ type: "pending", text });
    setPendingLockSec(5);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!validators.email(email)) nextErrors.email = "Enter a valid email address";
    if (!password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (loginLocked) return;

    setLoadingAction("email-login");
    setBanner({ type: "", text: "" });

    try {
      const result = await login(email.trim(), password);
      const status = (result?.approvalStatus || result?.status || "").toUpperCase();
      if (status === "PENDING") {
        navigate("/pending-approval", { replace: true });
        return;
      }

      if (result?.token) {
        redirectByRole(result.role || "RETAILER");
        return;
      }

      if (status.includes("PENDING")) {
        setPendingBanner("Your account is pending approval. Please wait until admin activates your account.");
        return;
      }
      if (status.includes("REJECT")) {
        setBanner({ type: "rejected", text: "Your account was rejected. Contact support." });
        return;
      }

      showToast("Unable to log in. Please try again.", "error");
    } catch (err) {
      const statusCode = err?.response?.status;
      const message = String(err?.response?.data?.message || err?.message || "");

      if (statusCode === 403 && /pending approval|pending/i.test(message)) {
        setPendingBanner("Your account is pending approval. Please wait until admin activates your account.");
      } else if (/rejected/i.test(message)) {
        setBanner({ type: "rejected", text: "Your account was rejected. Contact support." });
      } else if (statusCode === 429) {
        showToast("Too many requests. Please wait.", "error");
      } else {
        showToast(message || "Invalid credentials. Please try again.", "error");
      }
    } finally {
      setLoadingAction("");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!signupName.trim()) nextErrors.signupName = "Full name is required";
    if (!validators.email(signupEmail)) nextErrors.signupEmail = "Enter a valid email address";
    if (!validators.password(signupPassword)) {
      nextErrors.signupPassword = "Min 8 chars, 1 uppercase, 1 number, 1 special character";
    }
    if (signupPassword !== signupConfirmPassword) nextErrors.signupConfirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoadingAction("signup");
    try {
      await register({
        name: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        role: signupRole,
      });

      showToast("Registration successful. Awaiting admin approval.", "success");
      setAuthTab("login");
      setLoginMode("email");
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      setBanner({ type: "pending", text: "Your account is pending approval. Please wait until admin activates your account." });
    } catch (err) {
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message || "Registration failed. Please try again.";
      if (statusCode === 429) {
        showToast("Too many requests. Please wait.", "error");
      } else {
        showToast(message, "error");
      }
    } finally {
      setLoadingAction("");
    }
  };

  const handleRequestOtp = async (method) => {
    const isPhone = method === "phone";
    const identifier = isPhone ? phoneNumber.trim() : otpEmail.trim();
    const valid = isPhone ? validators.phone(identifier) : validators.email(identifier);

    if (!valid) {
      setErrors((prev) => ({
        ...prev,
        [isPhone ? "phoneNumber" : "otpEmail"]: isPhone ? "Enter a valid 10-digit phone number" : "Enter a valid email address",
      }));
      return;
    }

    if (otpCooldownSec > 0) return;

    setLoadingAction(`${method}-request-otp`);
    try {
      await requestOtp({ method, value: identifier });
      setOtpCooldownSec(30);
      if (isPhone) setPhoneOtpSent(true);
      else setEmailOtpSent(true);
      showToast("OTP sent successfully.", "success");
    } catch (err) {
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to send OTP.";
      if (statusCode === 429) {
        setOtpCooldownSec(30);
        showToast("Too many requests. Please wait.", "error");
      } else {
        showToast(message, "error");
      }
    } finally {
      setLoadingAction("");
    }
  };

  const handleVerifyOtp = async (method) => {
    const isPhone = method === "phone";
    const identifier = isPhone ? phoneNumber.trim() : otpEmail.trim();
    const otpValue = isPhone ? phoneOtp.trim() : emailOtp.trim();
    const nextErrors = {};

    if (!(isPhone ? validators.phone(identifier) : validators.email(identifier))) {
      nextErrors[isPhone ? "phoneNumber" : "otpEmail"] = isPhone
        ? "Enter a valid 10-digit phone number"
        : "Enter a valid email address";
    }

    if (!validators.otp(otpValue)) {
      nextErrors[isPhone ? "phoneOtp" : "emailOtp"] = "OTP must be 6 digits";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length) return;

    setLoadingAction(`${method}-verify-otp`);
    try {
      const payload = isPhone
        ? { phoneNumber: identifier, otp: otpValue, name: otpName.trim(), role: otpRole }
        : { email: identifier, otp: otpValue, name: otpName.trim(), role: otpRole };

      const result = await verifyOtp({ method, payload });
      if (result?.token) {
        redirectByRole(result.role || otpRole);
        return;
      }

      const status = (result?.approvalStatus || "").toUpperCase();
      if (status.includes("PENDING")) {
        showToast("Registration successful. Awaiting approval.", "success");
        setBanner({ type: "pending", text: "Your account is pending approval. Please wait until admin activates your account." });
      } else if (status.includes("REJECT")) {
        setBanner({ type: "rejected", text: "Your account was rejected. Contact support." });
      }
    } catch (err) {
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message || "OTP verification failed.";
      if (statusCode === 429) {
        showToast("Too many requests. Please wait.", "error");
      } else {
        showToast(message, "error");
      }
    } finally {
      setLoadingAction("");
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoadingAction(`oauth-${provider}`);
    try {
      const callbackUrl = `${window.location.origin}/oauth/callback/${provider}`;
      const oauthWindow = window.open(
        `/oauth/start/${provider}?redirect_uri=${encodeURIComponent(callbackUrl)}`,
        "oauthPopup",
        "width=520,height=640"
      );
      if (!oauthWindow) {
        showToast("Popup blocked. Please enable popups and try again.", "error");
        return;
      }
      oauthWindow.focus();

      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener("message", handleMessage);
          reject(new Error("OAuth timed out. Please try again."));
        }, 120000);

        const poll = setInterval(() => {
          if (oauthWindow.closed) {
            clearInterval(poll);
            clearTimeout(timeout);
            window.removeEventListener("message", handleMessage);
            reject(new Error("OAuth login cancelled."));
          }
        }, 400);

        const handleMessage = async (event) => {
          if (event.origin !== window.location.origin) return;
          const data = event.data || {};
          if (data.type !== "quickcart-oauth-result") return;
          if (String(data.provider || "").toLowerCase() !== String(provider).toLowerCase()) return;

          clearInterval(poll);
          clearTimeout(timeout);
          window.removeEventListener("message", handleMessage);

          if (data.error) {
            reject(new Error(data.error));
            return;
          }

          if (!data.credential) {
            reject(new Error("OAuth credential was not returned."));
            return;
          }

          try {
            const authResult = await oauthLogin({
              provider,
              credential: data.credential,
              role: oauthRole,
            });
            resolve(authResult);
          } catch (err) {
            reject(err);
          }
        };

        window.addEventListener("message", handleMessage);
      });

      if (result?.token) {
        redirectByRole(result.role || "RETAILER");
        return;
      }

      const status = (result?.approvalStatus || "").toUpperCase();
      if (status.includes("PENDING")) {
        setBanner({ type: "pending", text: "Account pending approval." });
        showToast("Account created. Awaiting approval.", "success");
      } else if (status.includes("REJECT")) {
        setBanner({ type: "rejected", text: "Your account was rejected. Contact support." });
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || `Failed to continue with ${provider}.`;
      showToast(message, "error");
    } finally {
      setLoadingAction("");
    }
  };

  const renderBanner = () => {
    if (!banner.text) return null;
    return <div className={`auth-banner auth-banner--${banner.type || "info"}`}>{banner.text}</div>;
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-marketing">
          <div className="auth-brand">QuickCart</div>
          <h1>Wholesale B2B Made Simple</h1>
          <p>One platform to manage manufacturers, retailers, inventory, orders, and payments.</p>
          <ul>
            <li>Role-specific dashboards</li>
            <li>Secure multi-method authentication</li>
            <li>Admin approval workflow for account activation</li>
          </ul>
        </section>

        <section className="auth-card">
          <div className="auth-top-tabs">
            <button type="button" className={authTab === "login" ? "active" : ""} onClick={() => setAuthTab("login")}>Login</button>
            <button type="button" className={authTab === "signup" ? "active" : ""} onClick={() => setAuthTab("signup")}>Signup</button>
          </div>

          {renderBanner()}

          {authTab === "login" && (
            <div className="auth-panel auth-panel--fade">
              <div className="auth-sub-tabs">
                <button type="button" className={loginMode === "email" ? "active" : ""} onClick={() => setLoginMode("email")}>Email Login</button>
                <button type="button" className={loginMode === "phone" ? "active" : ""} onClick={() => setLoginMode("phone")}>Phone OTP</button>
                <button type="button" className={loginMode === "emailOtp" ? "active" : ""} onClick={() => setLoginMode("emailOtp")}>Email OTP</button>
              </div>

              {loginMode === "email" && (
                <form className="auth-form" onSubmit={handleEmailLogin}>
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  {errors.email && <small className="auth-error-inline">{errors.email}</small>}

                  <label>Password</label>
                  <div className="auth-password-wrap">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
                  </div>
                  {errors.password && <small className="auth-error-inline">{errors.password}</small>}

                  <label className="auth-checkbox">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span>Remember Me</span>
                  </label>

                  <button className="auth-btn auth-btn--primary" type="submit" disabled={isBusy || loginLocked}>
                    {isBusy && loadingAction === "email-login" ? "Logging in..." : loginLocked ? `Try again in ${pendingLockSec}s` : "LOG IN"}
                  </button>
                </form>
              )}

              {loginMode === "phone" && (
                <div className="auth-form">
                  <label>Phone Number</label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" />
                  {errors.phoneNumber && <small className="auth-error-inline">{errors.phoneNumber}</small>}

                  {!phoneOtpSent && (
                    <button type="button" className="auth-btn auth-btn--primary" disabled={isBusy || otpCooldownSec > 0} onClick={() => handleRequestOtp("phone")}>
                      {isBusy && loadingAction === "phone-request-otp" ? "Sending..." : otpCooldownSec > 0 ? `Resend OTP in ${otpCooldownSec}s` : "Send OTP"}
                    </button>
                  )}

                  {phoneOtpSent && (
                    <>
                      <label>OTP</label>
                      <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" />
                      {errors.phoneOtp && <small className="auth-error-inline">{errors.phoneOtp}</small>}

                      <label>Name (for new users)</label>
                      <input type="text" value={otpName} onChange={(e) => setOtpName(e.target.value)} placeholder="Full name" />

                      <label>Register As</label>
                      <div className="auth-radio-row">
                        <label><input type="radio" name="otp-role-phone" checked={otpRole === "RETAILER"} onChange={() => setOtpRole("RETAILER")} /> Retailer</label>
                        <label><input type="radio" name="otp-role-phone" checked={otpRole === "MANUFACTURER"} onChange={() => setOtpRole("MANUFACTURER")} /> Manufacturer</label>
                      </div>

                      <button type="button" className="auth-btn auth-btn--primary" disabled={isBusy} onClick={() => handleVerifyOtp("phone")}>
                        {isBusy && loadingAction === "phone-verify-otp" ? "Verifying..." : "Verify OTP"}
                      </button>

                      <button type="button" className="auth-btn auth-btn--ghost" disabled={isBusy || otpCooldownSec > 0} onClick={() => handleRequestOtp("phone")}>
                        {otpCooldownSec > 0 ? `Resend OTP in ${otpCooldownSec}s` : "Resend OTP"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {loginMode === "emailOtp" && (
                <div className="auth-form">
                  <label>Email</label>
                  <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} placeholder="you@example.com" />
                  {errors.otpEmail && <small className="auth-error-inline">{errors.otpEmail}</small>}

                  {!emailOtpSent && (
                    <button type="button" className="auth-btn auth-btn--primary" disabled={isBusy || otpCooldownSec > 0} onClick={() => handleRequestOtp("email")}>
                      {isBusy && loadingAction === "email-request-otp" ? "Sending..." : otpCooldownSec > 0 ? `Resend OTP in ${otpCooldownSec}s` : "Send OTP"}
                    </button>
                  )}

                  {emailOtpSent && (
                    <>
                      <label>OTP</label>
                      <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" />
                      {errors.emailOtp && <small className="auth-error-inline">{errors.emailOtp}</small>}

                      <label>Name (for new users)</label>
                      <input type="text" value={otpName} onChange={(e) => setOtpName(e.target.value)} placeholder="Full name" />

                      <label>Register As</label>
                      <div className="auth-radio-row">
                        <label><input type="radio" name="otp-role-email" checked={otpRole === "RETAILER"} onChange={() => setOtpRole("RETAILER")} /> Retailer</label>
                        <label><input type="radio" name="otp-role-email" checked={otpRole === "MANUFACTURER"} onChange={() => setOtpRole("MANUFACTURER")} /> Manufacturer</label>
                      </div>

                      <button type="button" className="auth-btn auth-btn--primary" disabled={isBusy} onClick={() => handleVerifyOtp("email")}>
                        {isBusy && loadingAction === "email-verify-otp" ? "Verifying..." : "Verify OTP"}
                      </button>

                      <button type="button" className="auth-btn auth-btn--ghost" disabled={isBusy || otpCooldownSec > 0} onClick={() => handleRequestOtp("email")}>
                        {otpCooldownSec > 0 ? `Resend OTP in ${otpCooldownSec}s` : "Resend OTP"}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="auth-divider"><span>OR</span></div>
              <label>OAuth Role</label>
              <div className="auth-radio-row">
                <label><input type="radio" name="oauth-role" checked={oauthRole === "RETAILER"} onChange={() => setOauthRole("RETAILER")} /> Retailer</label>
                <label><input type="radio" name="oauth-role" checked={oauthRole === "MANUFACTURER"} onChange={() => setOauthRole("MANUFACTURER")} /> Manufacturer</label>
              </div>
              <div className="auth-oauth-row">
                <button type="button" className="auth-btn auth-btn--oauth" disabled={isBusy} onClick={() => handleOAuthLogin("google")}>Continue with Google</button>
                <button type="button" className="auth-btn auth-btn--oauth" disabled={isBusy} onClick={() => handleOAuthLogin("github")}>Continue with GitHub</button>
              </div>

              <p className="auth-pending-note">New accounts remain in PENDING approval until activated by admin/catalog manager.</p>
            </div>
          )}

          {authTab === "signup" && (
            <form className="auth-form auth-panel--fade" onSubmit={handleSignup}>
              <label>Full Name</label>
              <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Your full name" />
              {errors.signupName && <small className="auth-error-inline">{errors.signupName}</small>}

              <label>Email</label>
              <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" />
              {errors.signupEmail && <small className="auth-error-inline">{errors.signupEmail}</small>}

              <label>Password</label>
              <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Create password" />
              {errors.signupPassword && <small className="auth-error-inline">{errors.signupPassword}</small>}

              <label>Confirm Password</label>
              <input type="password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} placeholder="Re-enter password" />
              {errors.signupConfirmPassword && <small className="auth-error-inline">{errors.signupConfirmPassword}</small>}

              <label>Register As</label>
              <div className="auth-radio-row">
                <label><input type="radio" name="signup-role" checked={signupRole === "RETAILER"} onChange={() => setSignupRole("RETAILER")} /> Retailer</label>
                <label><input type="radio" name="signup-role" checked={signupRole === "MANUFACTURER"} onChange={() => setSignupRole("MANUFACTURER")} /> Manufacturer</label>
              </div>

              <button type="submit" className="auth-btn auth-btn--primary" disabled={isBusy}>
                {isBusy && loadingAction === "signup" ? "Creating..." : "CREATE ACCOUNT"}
              </button>

              <p className="auth-pending-note">All new users remain in PENDING approval until activated by admin/catalog manager.</p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
