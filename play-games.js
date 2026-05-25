// play-games.js — single source of truth for the Play (AI games) section.
// Loaded before games-app.jsx. Status: LIVE (link active) | PLANNED (placeholder).
// Games you play directly in the browser; every one runs real AI client-side.

window.PLAY_GAMES = {
  games: [
    // ── Watch AI Learn ──
    { slug: "neuroevolution", topic: "NEUROEVOLUTION", title: "Neuroevolution: Flappy", tone: "violet", status: "LIVE",
      blurb: "Watch neural-network birds evolve to fly — then take the controls and race the champion the AI trained.",
      tech: "genetic algorithm + neural net" },
    { slug: "snake-dqn", topic: "REINFORCEMENT LEARNING", title: "Snake: Self-Taught", tone: "violet", status: "LIVE",
      blurb: "A snake that learns to feed itself from reward alone — real Q-learning, exploration decaying, policy sharpening episode by episode.",
      tech: "Q-learning (TD)" },
    { slug: "self-driving", topic: "NEUROEVOLUTION", title: "Evolving Drivers", tone: "violet", status: "LIVE",
      blurb: "A population of cars with ray sensors evolves to take a track without crashing — no rules, just survival of the furthest.",
      tech: "neuroevolution + ray sensors" },
    // ── You vs the AI ──
    { slug: "tic-tac-toe", topic: "MINIMAX", title: "Tic-Tac-Toe", tone: "blue", status: "LIVE",
      blurb: "Take on a minimax player that searches the whole game tree. On Perfect, the best you can do is a draw — try to find it.",
      tech: "minimax (full game tree)" },
    { slug: "connect-four", topic: "MINIMAX", title: "Connect Four vs AI", tone: "blue", status: "LIVE",
      blurb: "Play a real minimax + alpha-beta engine with adjustable search depth. Can you force the win?",
      tech: "minimax + alpha-beta" },
    { slug: "rps", topic: "SEQUENCE MODEL", title: "Rock-Paper-Scissors Mind-Reader", tone: "violet", status: "LIVE",
      blurb: "Throw against an AI that learns your habits and predicts your next move. Humans are more predictable than they think.",
      tech: "Markov pattern model" },
    // ── AI Co-pilot ──
    { slug: "twenty48", topic: "EXPECTIMAX", title: "2048 + AI Assist", tone: "blue", status: "LIVE",
      blurb: "Play 2048 with an expectimax AI riding shotgun — let it suggest, or hand it the wheel and watch it autoplay.",
      tech: "expectimax search" },
    { slug: "minesweeper", topic: "PROBABILITY", title: "Minesweeper Oracle", tone: "violet", status: "LIVE",
      blurb: "Play Minesweeper with an AI that computes each cell's mine probability and flags the safe moves.",
      tech: "constraint + Bayesian probability" },
    { slug: "wordle", topic: "INFORMATION", title: "Wordle Solver Duel", tone: "blue", status: "LIVE",
      blurb: "Race an entropy-maximizing solver to the answer — see which guess actually carries the most information.",
      tech: "entropy / information gain" },
    // ── Board & Strategy (mini) ──
    { slug: "chess", topic: "ALPHA-BETA", title: "Chess", tone: "blue", status: "LIVE",
      blurb: "Full-rules chess against a real negamax + alpha-beta engine with material + piece-square evaluation.",
      tech: "negamax + alpha-beta + PST" },
    { slug: "go", topic: "MONTE CARLO", title: "Go 7x7", tone: "violet", status: "LIVE",
      blurb: "Real Go on a small board against a Monte-Carlo rollout AI — the search idea that, scaled up, became AlphaGo.",
      tech: "Monte-Carlo search (UCB rollouts)" },
    { slug: "poker", topic: "GAME THEORY", title: "Heads-Up Poker", tone: "blue", status: "LIVE",
      blurb: "Kuhn poker against an AI that trained itself to a Nash equilibrium with counterfactual regret — bluffs and all.",
      tech: "counterfactual regret (CFR)" },
  ],
  // AI-autonomous games first, per the design intent.
  categories: [
    { name: "Watch AI Learn", why: "No opponent — just an algorithm teaching itself to play in front of you. Evolution and reinforcement turn random flailing into competence, generation by generation.", slugs: ["neuroevolution", "snake-dqn", "self-driving"] },
    { name: "You vs the AI", why: "Classic games against engines that actually search and reason — adversarial planning and pattern-prediction you can try to outsmart.", slugs: ["tic-tac-toe", "connect-four", "rps"] },
    { name: "AI Co-pilot", why: "You drive; the AI advises (or takes over). Search-based assistants that show what a few seconds of lookahead really buys you.", slugs: ["twenty48", "minesweeper", "wordle"] },
    { name: "Board & Strategy", why: "The hard games — search trees too big to brute-force, hidden information, and bluffing. Mini versions that keep the real algorithm: alpha-beta, MCTS, and regret minimization.", slugs: ["chess", "go", "poker"] },
  ],
  findGame(slug) { return this.games.find(g => g.slug === slug); },
};
