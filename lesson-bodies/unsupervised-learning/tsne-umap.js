// GENERATED from content/lessons/unsupervised-learning/tsne-umap.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/unsupervised-learning/tsne-umap/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "tsne-umap": {
    "level": "core",
    "body": {
      "intuition": [
        "PCA can only flatten data onto a straight subspace, but real high-dimensional data often lies on a curved manifold - think of a sheet of paper rolled into a swiss roll, where the meaningful structure is the 2-D sheet, not the 3-D coordinates. Manifold learning methods find and unroll that intrinsic low-dimensional structure. t-SNE and UMAP are the two dominant nonlinear methods, and they exist for one job above all others: producing 2-D or 3-D pictures of high-dimensional data (embeddings, single-cell genomics, image features) in which similar points visibly cluster together.",
        "The shared idea is neighbor preservation: rather than trying to preserve all pairwise distances (which is impossible when squashing many dimensions into two), these methods focus on keeping each point's local neighborhood intact - points that are close in high dimensions should stay close in the map. t-SNE does this by converting distances to probabilities (how likely is j to be i's neighbor) in both spaces and minimizing the mismatch; UMAP does it by building a fuzzy neighbor graph and laying it out. Both deliberately sacrifice global structure (the distances between well-separated clusters) to nail the local structure.",
        "That trade-off is also the central warning of this lesson: t-SNE and UMAP plots are seductive and easy to over-read. Cluster sizes in the plot are meaningless, the distances between clusters are largely meaningless, and the same data can produce very different-looking maps with different hyperparameters (perplexity, learning rate) or random seeds. They are exploratory visualization tools that reveal whether local cluster structure exists - not measurement instruments, and not preprocessing you should feed into a downstream model without care."
      ],
      "math": [
        {
          "h": "t-SNE: match neighbor probabilities, high-D to low-D",
          "paras": [
            "t-SNE converts high-dimensional distances into conditional 'neighbor' probabilities p (Gaussian-weighted, with a per-point bandwidth set by the perplexity), and low-dimensional distances into probabilities q using a heavy-tailed Student-t distribution. It then minimizes the KL divergence between p and q by gradient descent, pulling neighbors together and pushing non-neighbors apart."
          ],
          "tex": "q_{ij} = \\frac{(1 + \\lVert y_i - y_j \\rVert^2)^{-1}}{\\sum_{k \\ne l}(1 + \\lVert y_k - y_l \\rVert^2)^{-1}} \\qquad \\mathcal{L} = \\text{KL}(P \\Vert Q) = \\sum_{ij} p_{ij}\\log\\frac{p_{ij}}{q_{ij}}",
          "texNote": "The heavy-tailed t-distribution in the low-D space (q) gives far-apart points room, mitigating crowding; minimizing KL(P||Q) preserves who-is-near-whom, not actual distances."
        },
        {
          "h": "Perplexity: the effective neighborhood size",
          "paras": [
            "The perplexity sets, per point, how many neighbors t-SNE tries to preserve - it's a smooth measure of the effective number of neighbors, controlling the bandwidth of the high-dimensional Gaussians. Small perplexity focuses on very local structure (many tiny clusters); large perplexity captures broader structure but blurs fine detail."
          ],
          "tex": "\\text{Perp}(P_i) = 2^{H(P_i)}, \\qquad H(P_i) = -\\sum_j p_{j|i} \\log_2 p_{j|i}",
          "texNote": "Perplexity is 2 to the entropy of point i's neighbor distribution - roughly 'the effective number of neighbors'. Typical values 5-50; the plot can change qualitatively with it."
        }
      ],
      "code": [
        {
          "h": "PCA vs t-SNE vs UMAP on digits",
          "paras": [
            "The same digits data reduced three ways: PCA (linear, fast, distances meaningful), t-SNE and UMAP (nonlinear, cluster structure clearer but distances/sizes not to be trusted)."
          ],
          "code": "import numpy as np\nfrom sklearn.datasets import load_digits\nfrom sklearn.decomposition import PCA\nfrom sklearn.manifold import TSNE\n# import umap  # umap-learn, if installed\n\nX, y = load_digits(return_X_y=True)\n\nX_pca  = PCA(n_components=2).fit_transform(X)                       # linear, deterministic\nX_tsne = TSNE(n_components=2, perplexity=30, init='pca',\n              random_state=0).fit_transform(X)                       # nonlinear, local structure\n# X_umap = umap.UMAP(n_neighbors=15, min_dist=0.1).fit_transform(X)  # nonlinear, faster, some global structure\n\nprint('shapes:', X_pca.shape, X_tsne.shape)\n# scatter each colored by y: PCA overlaps digits, t-SNE/UMAP separate them into visible clusters\n# init='pca' makes t-SNE more stable/reproducible than random init",
          "caption": "PCA is fast and its axes mean something; t-SNE/UMAP reveal clusters far better but their inter-cluster distances and cluster sizes must NOT be interpreted."
        },
        {
          "h": "Perplexity changes the picture - so try several",
          "paras": [
            "The single most important t-SNE knob is perplexity, and the honest way to use t-SNE is to run several values and only trust structure that persists across them."
          ],
          "code": "import numpy as np\nfrom sklearn.manifold import TSNE\nfrom sklearn.datasets import load_digits\n\nX, y = load_digits(return_X_y=True)\nfor perp in [5, 30, 50]:\n    emb = TSNE(n_components=2, perplexity=perp, init='pca', random_state=0).fit_transform(X)\n    print(f'perplexity={perp}: embedded {emb.shape[0]} points')\n# small perplexity -> many tiny fragmented clusters; large -> broader groupings.\n# trust only structure that's stable across perplexities AND random seeds",
          "caption": "The map can look qualitatively different at different perplexities - run a range and believe only what's stable, never a single plot."
        }
      ],
      "useCases": [
        "Visualizing learned embeddings and representations in 2-D - inspecting whether a model's features cluster by class, spotting mislabeled points, or seeing structure in single-cell RNA-seq, word/image embeddings.",
        "Exploratory quality checks on representations - a t-SNE/UMAP showing clean class separation is quick evidence a representation is good; overlapping blobs suggest it isn't (the linear-probe alternative from the SSL lessons is the quantitative version).",
        "UMAP as a nonlinear dimensionality-reduction preprocessing step (to a handful of dimensions) before density clustering - the 'UMAP then HDBSCAN' pipeline for high-dimensional data.",
        "Isomap / other manifold methods for genuinely-manifold data (poses, articulated motion) where preserving geodesic distances recovers an interpretable low-dimensional coordinate."
      ],
      "pitfalls": [
        "Cluster sizes in a t-SNE/UMAP plot are meaningless - a tight cluster and a spread-out one can represent equally-sized, equally-dense groups; the methods equalize density, so don't read 'this cluster is bigger/denser'.",
        "Distances between clusters are largely meaningless - t-SNE especially preserves local neighborhoods and discards global geometry, so two clusters far apart in the plot aren't necessarily more different than two close ones.",
        "The result depends on hyperparameters (perplexity, n_neighbors, min_dist, learning rate) and the random seed - different settings give qualitatively different maps, so trust only structure that persists across settings and seeds.",
        "t-SNE can manufacture apparent clusters from structureless data at low perplexity, and can tear a single connected manifold into fragments - it's an exploratory tool, so confirm any 'discovery' with an independent method or the raw data.",
        "These are visualization/embedding tools, not general-purpose reductions to feed a model blindly: t-SNE has no meaningful transform for new points (it's transductive), and UMAP's neighbor-preserving distortions mean the embedding coordinates shouldn't be treated as trustworthy features without validation."
      ],
      "connections": [
        {
          "ref": "unsupervised-learning/pca",
          "text": "PCA is the linear baseline - fast, deterministic, distances meaningful; t-SNE/UMAP capture nonlinear manifold structure PCA's flat projection misses, at the cost of interpretable geometry."
        },
        {
          "ref": "unsupervised-learning/kernel-methods",
          "text": "Kernel PCA and Isomap are the kernel/geodesic routes to nonlinear reduction; the kernel-methods lesson formalizes the implicit-feature-space idea."
        },
        {
          "ref": "supervised-learning/knn",
          "text": "Neighbor preservation is the core of both t-SNE/UMAP and kNN - and both are governed by the curse of dimensionality, which is why PCA often precedes t-SNE."
        },
        {
          "ref": "unsupervised-learning/hierarchical-density-clustering",
          "text": "UMAP-then-HDBSCAN is a standard pipeline: reduce nonlinearly to restore meaningful distances, then cluster by density."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is manifold learning?",
          "a": "Finding and unrolling the intrinsic low-dimensional (often curved) structure that high-dimensional data lies on - e.g., recovering the 2-D sheet of a swiss roll."
        },
        {
          "q": "What is the core idea shared by t-SNE and UMAP?",
          "a": "Neighbor preservation: keep each point's local neighborhood intact in the low-dimensional map, deliberately sacrificing global distances."
        },
        {
          "q": "What does t-SNE minimize?",
          "a": "The KL divergence between high-D neighbor probabilities (P) and low-D neighbor probabilities (Q), via gradient descent on point positions."
        },
        {
          "q": "What does perplexity control in t-SNE?",
          "a": "The effective number of neighbors each point tries to preserve (the Gaussian bandwidth) - small = very local structure, large = broader structure."
        },
        {
          "q": "Why does t-SNE use a Student-t distribution in the low-D space?",
          "a": "Its heavy tails give far-apart points more room, mitigating the 'crowding problem' of squashing many dimensions into two."
        },
        {
          "q": "Are cluster sizes in a t-SNE plot meaningful?",
          "a": "No - the methods equalize density, so a tight and a spread-out cluster can be equally sized/dense; never read size or density from the plot."
        },
        {
          "q": "Are inter-cluster distances in a t-SNE plot meaningful?",
          "a": "Largely no - t-SNE preserves local neighborhoods and discards global geometry, so distances between clusters shouldn't be interpreted."
        },
        {
          "q": "Can you apply a trained t-SNE to new points?",
          "a": "Not naturally - t-SNE is transductive (no out-of-sample transform); UMAP does support transforming new points, which is one of its advantages."
        },
        {
          "q": "How is UMAP generally different from t-SNE in practice?",
          "a": "UMAP is usually faster, scales better, tends to preserve more global structure, and supports transforming new data - while similar in spirit (neighbor graph layout)."
        },
        {
          "q": "Why run PCA before t-SNE?",
          "a": "To denoise and cut dimensionality (restoring meaningful distances and speeding computation) before the neighbor-based nonlinear step; init='pca' also stabilizes t-SNE."
        }
      ],
      "standard": [
        {
          "q": "Explain the crowding problem in dimensionality reduction and how t-SNE's use of a Student-t distribution addresses it.",
          "a": "The crowding problem arises because there's simply not enough room in low dimensions to faithfully represent the neighborhood relationships of high-dimensional data. In high dimensions, a point can have many neighbors all at moderate distance (the volume of a high-D shell is large), but when you squash into 2-D, the area available at a given radius is tiny, so all those moderately-distant neighbors get crushed together near the point - and to make room, genuinely distant points also get pulled inward, collapsing the structure. Early methods (like SNE with a Gaussian in both spaces) suffered badly from this. t-SNE's fix is to use a heavy-tailed Student-t distribution (with one degree of freedom, i.e. a Cauchy) for the low-dimensional similarities q, while keeping a Gaussian for the high-dimensional p. The heavy tail means that a pair of points that are moderately dissimilar in high-D can be placed much farther apart in the map while still contributing an acceptable q value - the t-distribution assigns non-negligible probability to large distances, so the layout gets 'permission' to spread dissimilar points out and give clusters room. This both relieves the crowding (dissimilar points push apart) and produces the characteristic well-separated clusters t-SNE is known for.",
          "deepDive": {
            "q": "Why does the asymmetry between a Gaussian (high-D) and a t-distribution (low-D) specifically produce well-separated clusters rather than just a spread-out cloud?",
            "a": "The asymmetry creates a force imbalance that separates clusters. For points that are close in high-D (high p), the KL objective strongly wants them close in low-D too (high q), so it pulls them tightly together - forming compact clusters. But for points that are moderately-to-far apart in high-D (small p), the heavy-tailed t-distribution means their low-D similarity q stays relatively high even at large low-D distances; since q must sum to 1 across all pairs, keeping distant pairs at moderate q 'wastes' probability mass, and the gradient responds by pushing those pairs far apart to drive their q down and reallocate mass to the near pairs - creating large gaps between clusters. The net effect is strong attraction within neighborhoods and strong repulsion between them, which is exactly what carves the data into visibly distinct clusters with empty space between. This is powerful for revealing cluster structure but is also precisely why inter-cluster distances are not meaningful: the gaps are an artifact of the probability-normalization dynamics, not a measurement of how different the clusters truly are."
          }
        },
        {
          "q": "A stakeholder points at a t-SNE plot and says 'cluster A is much bigger than cluster B, and A is far from C so they must be very different.' What's wrong with both claims?",
          "a": "Both claims read meaning into aspects of the plot that t-SNE does not preserve. 'Cluster A is bigger than B': the physical size (area) a cluster occupies in a t-SNE map is not related to how many points it has or how spread out they are in the original space - t-SNE effectively equalizes cluster densities, expanding tight high-dimensional clusters and contracting diffuse ones so that all clusters take up roughly comparable visual space adjusted by their internal neighbor structure. So A looking bigger tells you nothing about A having more points or being more variable; a genuinely larger or denser group can appear the same size as a small tight one. 'A is far from C so they're very different': t-SNE optimizes local neighborhood preservation and explicitly discards global geometry, so the distances between separated clusters in the plot are essentially arbitrary - two clusters rendered far apart are not necessarily more dissimilar than two rendered close together, and the arrangement can flip entirely with a different perplexity or seed. The correct framing to give the stakeholder: the plot is evidence that distinct groups exist and which points fall together locally, but any quantitative reading of size, density, or between-cluster distance is unsupported - to compare cluster sizes count the points, and to measure how different clusters are compute a distance/statistic in the original feature space.",
          "deepDive": {
            "q": "Does UMAP preserve global structure better than t-SNE, and can you therefore trust inter-cluster distances in a UMAP plot?",
            "a": "UMAP does tend to preserve more global structure than t-SNE - its graph-layout approach and its cross-entropy objective (with both attractive and repulsive terms tied to a fuzzy topological representation) generally keep the relative arrangement of clusters somewhat more faithful, so UMAP maps are often more useful for a rough sense of which clusters are near which. However, 'better than t-SNE' is not 'trustworthy': UMAP still applies strong nonlinear distortions, its inter-cluster distances are still not a reliable metric of true dissimilarity, cluster sizes are still not meaningful, and the layout still depends on hyperparameters (n_neighbors, min_dist) and initialization. The UMAP authors themselves caution against over-interpreting global distances. So the practical stance is the same as for t-SNE - treat both as tools for revealing local cluster structure and generating hypotheses, verify any quantitative claim (sizes, distances, separation) in the original space, and if you specifically need meaningful global distances, use a method designed to preserve them (PCA for linear structure, Isomap/MDS for geodesic distances) rather than a neighbor-embedding visualization."
          }
        },
        {
          "q": "Contrast t-SNE/UMAP with PCA across purpose, what they preserve, determinism, and use as preprocessing.",
          "a": "Purpose: PCA is a general-purpose linear dimensionality reduction (compression, denoising, decorrelation, and reduction before modeling), whereas t-SNE/UMAP are primarily visualization tools for revealing local cluster structure in 2-3 dimensions. What they preserve: PCA preserves global variance and linear structure - its axes and the distances along them are meaningful and interpretable - but it can only capture linear (flat-subspace) structure; t-SNE/UMAP preserve local neighborhoods (who is near whom) at the expense of global geometry, capturing nonlinear manifold structure but making cluster sizes and inter-cluster distances unreliable. Determinism: PCA is deterministic and has a unique closed-form answer (eigendecomposition/SVD), so it's reproducible; t-SNE and UMAP are stochastic (gradient descent / graph layout with random initialization) and their output varies with the seed and hyperparameters. Preprocessing use: PCA's output is a legitimate, meaningful reduced feature set you can feed to downstream models, and it provides an out-of-sample transform for new points; t-SNE is transductive with no natural transform for new data and shouldn't be used as model-input reduction, while UMAP does support transforming new points and is sometimes used as a preprocessing step (e.g., before clustering) but with the caveat that its coordinates are distorted. The common pipeline pattern reflects this division of labor: run PCA first to denoise and cut dimensions cheaply and meaningfully, then run t-SNE/UMAP on the PCA output purely to visualize.",
          "deepDive": {
            "q": "Why is running PCA before t-SNE a recommended default rather than running t-SNE on the raw high-dimensional data directly?",
            "a": "Three reasons make PCA-then-t-SNE a strong default. (1) Speed and memory: t-SNE's neighbor computations are expensive and scale poorly with dimensionality; reducing to, say, 50 PCA components first dramatically cuts the cost of computing high-dimensional distances/neighbors without much loss, since the top PCs retain most of the meaningful variance. (2) Denoising: high-dimensional data often has many low-variance noise dimensions that dilute the distance computations (curse of dimensionality); PCA strips those, so the neighbor relationships t-SNE preserves are computed on cleaner, more meaningful distances, often producing clearer maps. (3) Stability: initializing t-SNE with the PCA embedding (init='pca') rather than random gives more reproducible, more globally-coherent layouts, because the optimization starts from a configuration that already respects the dominant linear structure. The caveat is the same as always - if the discriminative structure lives in low-variance directions PCA discards, the pre-reduction could hurt - but for typical high-dimensional embeddings where signal is in the high-variance directions, PCA-to-~50-dims then t-SNE is faster, cleaner, and more stable than t-SNE on raw data, which is why it's the recommended workflow."
          }
        },
        {
          "q": "Explain the swiss-roll example and why Isomap succeeds where PCA fails on it.",
          "a": "The swiss roll is a 2-D sheet (like a rectangle of paper) that has been rolled up into a spiral and embedded in 3-D space. The true, intrinsic structure is 2-D - the flat sheet - and points that are far apart along the rolled-up surface (say, on opposite ends of the sheet that happen to spiral around near each other) are actually distant in the intrinsic geometry even though their straight-line (Euclidean) 3-D distance is small. PCA fails because it finds a linear projection: projecting the 3-D roll onto a 2-D plane flattens the spiral and superimposes parts of the sheet that are far apart along the surface onto each other, destroying the intrinsic structure - PCA cannot 'unroll' anything because it only does linear (flat) transformations. Isomap succeeds by preserving geodesic distances - distances measured ALONG the manifold surface rather than through the ambient space. It builds a neighborhood graph (connecting each point to its nearest neighbors, which are genuinely close along the surface), computes shortest-path distances through that graph as an approximation of geodesic distance (so travelling 'around the roll' is correctly measured as a long path, not a short straight line), and then uses classical multidimensional scaling to find a 2-D embedding that preserves those geodesic distances. The result is the unrolled flat sheet, recovering the true 2-D coordinates that PCA's straight-line projection could never find.",
          "deepDive": {
            "q": "What is the key assumption Isomap makes, and when does the neighborhood-graph geodesic approximation break down?",
            "a": "Isomap's key assumption is that the data lies on a single, well-sampled, roughly-isometric-to-a-convex-region manifold, and that Euclidean distances are a good approximation of geodesic distances only LOCALLY (for nearby points) - so it recovers global geodesic distances by chaining local Euclidean hops through the neighborhood graph. This breaks down in several ways: (1) If the manifold is under-sampled or has holes, the neighborhood graph can be disconnected or take wildly wrong shortcuts, corrupting the shortest-path distances. (2) 'Short-circuiting' - if the neighborhood size (k) is too large, the graph connects points across different folds of the manifold that are close in ambient space but far along the surface (e.g., connecting adjacent layers of the swiss roll), which creates false shortcuts that collapse the geodesic distances and ruin the embedding; too small a k risks disconnecting the graph. (3) Manifolds with non-trivial topology (a sphere, a torus) can't be isometrically flattened to a plane at all, so any 2-D embedding must distort. (4) Noise off the manifold degrades the local-distance assumption. This sensitivity to the neighborhood-size parameter and to sampling is why Isomap, though elegant, is less robust in practice than UMAP for messy real data - UMAP's fuzzy, probabilistic graph and its objective are more forgiving of these issues, even though it gives up Isomap's clean geodesic-distance interpretation."
          }
        },
        {
          "q": "How would you use t-SNE or UMAP responsibly to evaluate whether a learned representation is good, and what are the limits of that evaluation?",
          "a": "The responsible workflow: take the representation (embeddings from your model) for a labeled sample, reduce to 2-D with t-SNE or UMAP, color the points by their true labels, and look at whether points of the same class form coherent, separated clusters. Clean separation is quick visual evidence the representation captures class structure; heavily overlapping blobs suggest it doesn't. To do this responsibly rather than fooling yourself: run multiple hyperparameter settings (several perplexities / n_neighbors) and multiple random seeds, and only trust structure that persists across them; use init='pca' for stability; optionally PCA-preprocess; and never read cluster sizes or inter-cluster distances as meaningful. Crucially, treat the plot as qualitative evidence and confirm quantitatively - the visualization is a hypothesis generator, and the rigorous version of 'is this representation good' is a quantitative probe: train a simple linear classifier (linear probe) or a kNN classifier on the frozen representation and measure held-out accuracy (the approach the self-supervised lessons use), which gives a number rather than an impression. The limits: t-SNE/UMAP can make a mediocre representation look cleanly clustered (or a good one look messy) depending on settings; they can manufacture apparent clusters from noise; and 'looks separated in 2-D' doesn't guarantee linear separability or downstream usefulness in the full space. So the plot is a fast, intuition-building first check that must be backed by a quantitative metric before any conclusion about representation quality is drawn.",
          "deepDive": {
            "q": "Why can a representation look poorly separated in a t-SNE plot yet still be excellent for a downstream classifier, and vice versa?",
            "a": "Because t-SNE/UMAP measure something different from what a classifier needs. A representation can be linearly separable (a classifier can draw a clean hyperplane between classes) in the high-dimensional space while t-SNE's 2-D neighbor-preserving projection overlaps the classes - the separating direction might be a global-geometry feature that t-SNE, focused on local neighborhoods and discarding global structure, fails to render, so the plot looks messy even though a linear probe would score high. Conversely, t-SNE can produce beautifully separated visual clusters that don't correspond to robust, generalizable class boundaries - it can exaggerate or manufacture separation from noise or from settings, so a clean-looking plot can overstate a representation whose separation doesn't hold up under a proper held-out classifier or on new data. This mismatch is exactly why the quantitative probe (linear/kNN classifier accuracy on held-out data) is the ground truth and the visualization is only a heuristic: the plot answers 'does local neighborhood structure by class exist in this 2-D projection', while the classifier answers 'can class structure actually be recovered and generalized', and those are related but distinct questions - trust the number, use the picture for intuition."
          }
        },
        {
          "q": "t-SNE at low perplexity shows several distinct clusters in data you suspect has no real cluster structure. How do you decide whether the clusters are real?",
          "a": "This is exactly the situation where t-SNE can mislead, because at low perplexity it focuses on very local structure and can fragment even structureless or single-manifold data into apparent clusters - so the plot alone is not evidence. To decide whether the clusters are real: (1) Vary the hyperparameters and seeds - rerun t-SNE across a range of perplexities (e.g., 5, 30, 50) and several random seeds; genuine clusters persist and remain coherent, whereas artifactual fragmentation appears at low perplexity and dissolves or rearranges at higher perplexity or different seeds. Trust only structure stable across settings. (2) Cross-check with an independent method - run UMAP, and/or PCA (if the clusters are real and separated along high-variance directions they may show in PCA too), and see whether the grouping reproduces. (3) Validate in the original space, not the embedding - run a clustering algorithm (k-means with a silhouette check, or DBSCAN) on the raw/PCA-reduced data and see whether it finds the same groups with a decent silhouette/gap statistic; compute whether the putative clusters differ on the original features. (4) Use a statistical test for clustering tendency - the gap statistic or a Hopkins statistic on the original data tells you whether there's cluster structure at all versus uniform randomness. If the clusters vanish at higher perplexity, don't reproduce under other methods, and show no separation on the raw features or by the gap statistic, they're t-SNE artifacts; if they survive all of these checks, they're likely real. The governing principle is that t-SNE generates hypotheses and independent evidence in the original space confirms or refutes them.",
          "deepDive": {
            "q": "What is the Hopkins statistic and how does it test whether data has cluster structure at all before you even cluster it?",
            "a": "The Hopkins statistic tests the 'clustering tendency' of a dataset - whether it has meaningful cluster structure or is essentially uniformly random - before you commit to any clustering method (which, like t-SNE, will impose clusters on anything). It works by comparing two sets of nearest-neighbor distances: sample some real data points and measure each one's distance to its nearest neighbor among the real data; separately, generate the same number of synthetic points uniformly at random over the data's bounding region and measure each synthetic point's distance to its nearest REAL data point. The statistic H aggregates these: if the data is uniformly random (no clusters), the two sets of distances are similar and H is around 0.5; if the data is clustered, real points sit in dense groups so their nearest-neighbor distances are much smaller than the random points' distances to the (clumped) data, driving H toward 1; H near 0 indicates a very regular/grid-like arrangement. So H comfortably above ~0.75 is evidence of genuine cluster structure worth pursuing, while H near 0.5 warns that any clusters t-SNE or k-means produce are likely artifacts of the method imposing structure on structureless data - making it a useful sanity check to run before trusting a suggestive t-SNE plot."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Manifold learning",
        "back": "Finding/unrolling the intrinsic low-dimensional curved structure high-D data lies on (e.g., the 2-D sheet of a swiss roll)."
      },
      {
        "type": "intuition",
        "front": "Core idea of t-SNE/UMAP",
        "back": "Neighbor preservation: keep each point's LOCAL neighborhood intact in 2-3D, deliberately sacrificing global distances."
      },
      {
        "type": "formula",
        "front": "What t-SNE minimizes",
        "back": "KL(P||Q) between high-D neighbor probabilities P (Gaussian) and low-D Q (heavy-tailed Student-t), by gradient descent on positions."
      },
      {
        "type": "definition",
        "front": "Perplexity",
        "back": "The effective number of neighbors t-SNE preserves (2^entropy of the neighbor distribution). Small=very local, large=broader. Typical 5-50."
      },
      {
        "type": "pitfall",
        "front": "t-SNE/UMAP cluster sizes & distances",
        "back": "Both meaningless - the methods equalize density and discard global geometry. Don't read size, density, or inter-cluster distance from the plot."
      },
      {
        "type": "pitfall",
        "front": "t-SNE reproducibility",
        "back": "Stochastic + hyperparameter-sensitive (perplexity, seed) - can even manufacture clusters from noise. Trust only structure stable across settings."
      },
      {
        "type": "intuition",
        "front": "Why heavy-tailed t-distribution (low-D)?",
        "back": "Its heavy tails give dissimilar points room, relieving the crowding problem and producing the characteristic well-separated clusters."
      },
      {
        "type": "intuition",
        "front": "t-SNE vs UMAP practical differences",
        "back": "UMAP is faster, scales better, keeps more global structure, and can transform new points; t-SNE is transductive (no out-of-sample transform)."
      }
    ],
    "refs": [
      {
        "title": "van der Maaten & Hinton, Visualizing Data using t-SNE (2008)",
        "url": "https://www.jmlr.org/papers/v9/vandermaaten08a.html"
      },
      {
        "title": "McInnes, Healy, Melville - UMAP (2018)",
        "url": "https://arxiv.org/abs/1802.03426"
      },
      {
        "title": "Wattenberg et al., How to Use t-SNE Effectively (Distill, 2016)",
        "url": "https://distill.pub/2016/misread-tsne/"
      },
      {
        "title": "Tenenbaum, de Silva, Langford - Isomap (2000)",
        "url": "https://www.science.org/doi/10.1126/science.290.5500.2319"
      }
    ],
    "demos": [
      "tsne",
      "isomap",
      "embeddings"
    ]
  }
};
