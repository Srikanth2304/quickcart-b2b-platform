import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";

function parseHashParams(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(raw);
  return {
    accessToken: params.get("access_token") || "",
    idToken: params.get("id_token") || "",
    error: params.get("error") || "",
    state: params.get("state") || "",
  };
}

export default function OAuthCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const lower = String(provider || "").toLowerCase();
    const { accessToken, idToken, error: hashError, state: hashState } = parseHashParams(window.location.hash);
    const queryError = searchParams.get("error") || "";
    const queryCode = searchParams.get("code") || "";
    const queryState = searchParams.get("state") || "";

    const storedState = sessionStorage.getItem("oauth_state") || "";
    const storedProvider = sessionStorage.getItem("oauth_provider") || "";

    let error = queryError || hashError;
    if (!error && storedProvider && storedProvider !== lower) {
      error = "OAuth provider mismatch.";
    }
    const returnedState = queryState || hashState;
    if (!error && storedState && returnedState && storedState !== returnedState) {
      error = "OAuth state validation failed.";
    }

    const credential = lower === "google"
      ? (idToken || searchParams.get("id_token") || accessToken)
      : (searchParams.get("oauthToken") || searchParams.get("access_token") || accessToken || queryCode);

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "quickcart-oauth-result",
          provider: lower,
          credential: credential || "",
          error: error || "",
        },
        window.location.origin
      );
    }

    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("oauth_provider");
    sessionStorage.removeItem("oauth_redirect_uri");

    setTimeout(() => {
      window.close();
    }, 200);
  }, [provider, searchParams]);

  return <div style={{ padding: 24 }}>Completing {provider} sign in...</div>;
}
