import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can also log to a remote server here
    console.error("ErrorBoundary caught:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2 style={{ color: "#b00020" }}>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fff6f6", padding: 12, borderRadius: 8 }}>
            {String(this.state.error && this.state.error.toString()).slice(0, 1000)}
          </pre>
          <details style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
            {this.state.info && this.state.info.componentStack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
