import { Component } from "react";

// Prinde erorile JS care apar la randarea unei pagini (de ex. date lipsă de la
// API, .map pe undefined etc). Fara asta, o eroare nepristurita facea ca tot
// React sa se demonteze si ramaneai cu ecran complet gol, fara niciun mesaj.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Eroare prinsa de ErrorBoundary:", error, info);
  }

  componentDidUpdate(prevProps) {
    // Daca ne-am navigat pe alta ruta cat timp eram in stare de eroare,
    // resetam automat ca sa nu blocheze restul navigarii.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            height: "60vh",
            textAlign: "center",
            padding: 24,
            color: "var(--text, #eee)",
          }}
        >
          <div style={{ fontSize: 40 }}>🌴💥</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Ceva n-a mers bine la încărcarea acestei secțiuni.
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 320 }}>
            Apasă butonul de mai jos ca să reîncerci. Dacă problema persistă,
            spune-i administratorului.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: 20,
              border: "none",
              background: "var(--accent, #e91e8c)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🔄 Reîncarcă pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
