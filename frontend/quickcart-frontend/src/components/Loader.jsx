import "./Loader.css";

export default function Loader({ size = "md", text = "", fullPage = false, overlay = false }) {
  const spinner = (
    <div className={`qc-loader qc-loader--${size}`}>
      <div className="qc-spinner" />
      {text && <span className="qc-loader-text">{text}</span>}
    </div>
  );

  if (fullPage) {
    return <div className="qc-loader-fullpage">{spinner}</div>;
  }

  if (overlay) {
    return <div className="qc-loader-overlay">{spinner}</div>;
  }

  return spinner;
}
