import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
          <h2 style={{ margin: 0, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ marginTop: 0, color: "#666" }}>
            Refresh the page. If it keeps happening, tell the admin.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#eee", padding: 12, borderRadius: 8 }}>
            {String(this.state.error || "")}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
