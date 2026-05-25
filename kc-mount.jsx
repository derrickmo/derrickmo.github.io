// kc-mount.jsx — mounts the shared site TopNav + Footer into the otherwise-static
// Key Concepts gallery pages (which keep their hand-tuned SVG/CSS animations).
// Loaded last, after chrome.jsx has put TopNav/Footer on window.

const { TopNav, Footer } = window;
const navEl = document.getElementById("nav-root");
const footEl = document.getElementById("foot-root");
if (navEl && TopNav) ReactDOM.createRoot(navEl).render(<TopNav />);
if (footEl && Footer) ReactDOM.createRoot(footEl).render(<Footer />);
