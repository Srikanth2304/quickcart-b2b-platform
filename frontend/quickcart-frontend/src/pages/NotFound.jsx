import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.code}>404</h1>
      <h2 style={styles.heading}>Page Not Found</h2>
      <p style={styles.text}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" style={styles.link}>
        ← Back to Home
      </Link>
    </div>
  );
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
  code: {
    fontSize: "5rem",
    fontWeight: 800,
    color: "#1976d2",
    margin: 0,
    lineHeight: 1,
  },
  heading: {
    fontSize: "1.5rem",
    color: "#333",
    marginTop: "0.5rem",
    marginBottom: "0.5rem",
  },
  text: {
    color: "#777",
    fontSize: "1rem",
    marginBottom: "1.5rem",
  },
  link: {
    color: "#1976d2",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  },
};
