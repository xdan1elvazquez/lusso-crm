import React from 'react';
import ErrorState from './ui/ErrorState';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState message={this.state.error?.message || 'Ocurrió un error inesperado.'} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;