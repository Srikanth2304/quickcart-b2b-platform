import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";

function buildGoogleAuthorizeUrl(clientId, redirectUri, state) {
  const scope = encodeURIComponent("openid email profile");
  return `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&nonce=${encodeURIComponent(state)}&state=${encodeURIComponent(state)}&prompt=select_account`;
}

function buildGithubAuthorizeUrl(clientId, redirectUri, state) {
  const scope = encodeURIComponent("read:user user:email");
  return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`;
}

export default function OAuthStart() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const lower = String(provider || "").toLowerCase();
    const redirectUri = searchParams.get("redirect_uri") || `${window.location.origin}/oauth/callback/${lower}`;
    const state = `${lower}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let target = "";
    if (lower === "google") {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
      if (!clientId) {
        window.location.replace(`${redirectUri}?error=Missing%20VITE_GOOGLE_CLIENT_ID`);
        return;
      }
      target = buildGoogleAuthorizeUrl(clientId, redirectUri, state);
    } else if (lower === "github") {
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "";
      if (!clientId) {
        window.location.replace(`${redirectUri}?error=Missing%20VITE_GITHUB_CLIENT_ID`);
        return;
      }
      target = buildGithubAuthorizeUrl(clientId, redirectUri, state);
    } else {
      window.location.replace(`${redirectUri}?error=Unsupported%20OAuth%20provider`);
      return;
    }

    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_provider", lower);
    sessionStorage.setItem("oauth_redirect_uri", redirectUri);
    window.location.replace(target);
  }, [provider, searchParams]);

  return <div style={{ padding: 24 }}>Redirecting to {provider}...</div>;
}
