import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, send to an error-reporting service (Sentry, etc.)
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.text}>
            An unexpected error occurred. Please try again.
          </p>
          <div style={styles.actions}>
            <button style={styles.btn} onClick={this.handleReset}>
              Try Again
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => (window.location.href = "/")}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: "2rem",
    textAlign: "center",
  },
  heading: {
    fontSize: "1.8rem",
    color: "#d32f2f",
    marginBottom: "0.5rem",
  },
  text: {
    color: "#555",
    fontSize: "1rem",
    marginBottom: "1.5rem",
    maxWidth: "420px",
  },
  actions: { display: "flex", gap: "1rem" },
  btn: {
    padding: "0.6rem 1.4rem",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.95rem",
    cursor: "pointer",
    backgroundColor: "#1976d2",
    color: "#fff",
  },
  btnSecondary: {
    backgroundColor: "#f5f5f5",
    color: "#333",
    border: "1px solid #ddd",
  },
};
