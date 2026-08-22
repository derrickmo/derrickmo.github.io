// GENERATED from content/lessons/unsupervised-learning/hierarchical-density-clustering.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/unsupervised-learning/hierarchical-density-clustering/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "hierarchical-density-clustering": {
    "level": "core",
    "body": {
      "intuition": [
        "K-means made you commit to k up front and assumed round, equal blobs. This lesson covers the two families that drop those assumptions. Hierarchical clustering builds a whole tree of nested groupings (a dendrogram) instead of one partition, so you choose the number of clusters after seeing the structure, by cutting the tree at a height. Density-based clustering (DBSCAN) defines clusters as connected dense regions, so it discovers the number of clusters itself, finds arbitrarily-shaped clusters, and - uniquely - can label points as noise instead of forcing everyone into a group.",
        "Agglomerative hierarchical clustering is beautifully simple: start with every point as its own cluster, then repeatedly merge the two closest clusters until one remains, recording every merge and its height. The dendrogram that results is a multi-resolution view of the data - cut it low for many small clusters, cut it high for a few big ones. The one real choice is the linkage: how you measure 'distance between clusters' (nearest points, farthest points, average, or the variance-minimizing Ward criterion), and that choice dramatically changes the shapes the method prefers.",
        "DBSCAN takes a completely different stance: a cluster is a maximal set of points reachable through dense neighborhoods. Two parameters - a radius epsilon and a minimum number of neighbors - define what 'dense' means; points in dense regions become 'core' points that seed and grow clusters, points on the fringe join them, and points in sparse regions are simply labeled noise. This is why DBSCAN shines on the exact cases k-means fails: interleaving crescents, rings, and clusters of wildly different shapes, all while automatically flagging outliers."
      ],
      "math": [
        {
          "h": "Linkage criteria: how cluster distance is defined",
          "paras": [
            "Agglomerative clustering merges the two closest clusters, but 'closest' depends on the linkage. Single linkage uses the minimum distance between any two points across clusters (produces chains), complete uses the maximum (compact clusters), average uses the mean, and Ward merges the pair that least increases within-cluster variance (k-means-like compact clusters)."
          ],
          "tex": "d_{\\text{single}}(A,B)=\\min_{a\\in A, b\\in B} d(a,b) \\quad d_{\\text{complete}}=\\max_{a,b} d(a,b) \\quad d_{\\text{Ward}} \\propto \\Delta(\\text{within-cluster SS})",
          "texNote": "Single linkage chains through bridges (sensitive to noise); complete/Ward favor compact clusters. The linkage is the main modeling choice in hierarchical clustering."
        },
        {
          "h": "DBSCAN: core points and density-reachability",
          "paras": [
            "DBSCAN needs two parameters: epsilon (neighborhood radius) and minPts (minimum neighbors to be dense). A point is a core point if at least minPts points lie within epsilon of it. Clusters are formed by connecting core points whose neighborhoods overlap; non-core points within epsilon of a core join as border points; everything else is noise."
          ],
          "tex": "\\text{core}(p) \\iff |\\{\\, q : d(p,q) \\le \\varepsilon \\,\\}| \\ge \\text{minPts} \\qquad \\text{cluster} = \\text{density-connected core points} + \\text{their borders}",
          "texNote": "No k needed - the number of clusters emerges from the density structure. Points in no dense neighborhood are labeled noise, not forced into a cluster."
        }
      ],
      "code": [
        {
          "h": "DBSCAN vs k-means on non-spherical data",
          "paras": [
            "On two interleaving crescents (make_moons), k-means draws a straight boundary through them, while DBSCAN follows the density and recovers the true shapes plus any noise."
          ],
          "code": "import numpy as np\nfrom sklearn.datasets import make_moons\nfrom sklearn.cluster import KMeans, DBSCAN\nfrom sklearn.metrics import adjusted_rand_score\n\nX, y = make_moons(n_samples=400, noise=0.06, random_state=0)\n\nkm = KMeans(n_clusters=2, n_init=10, random_state=0).fit_predict(X)\ndb = DBSCAN(eps=0.2, min_samples=5).fit_predict(X)     # -1 label = noise\n\nprint('k-means ARI :', round(adjusted_rand_score(y, km), 3))   # low - straight cut splits the moons\nprint('DBSCAN  ARI :', round(adjusted_rand_score(y, db), 3))   # high - follows the crescents\nprint('DBSCAN found', len(set(db)) - (1 if -1 in db else 0), 'clusters +',\n      (db == -1).sum(), 'noise points')",
          "caption": "DBSCAN recovers the crescents (high ARI) and labels stray points as noise (-1); k-means can only draw a straight Voronoi boundary through them."
        },
        {
          "h": "The dendrogram: choose the cut after seeing the tree",
          "paras": [
            "Agglomerative clustering with Ward linkage builds the full merge tree; you then cut at a chosen number of clusters (or a distance threshold) - the decision comes after inspecting the structure."
          ],
          "code": "import numpy as np\nfrom scipy.cluster.hierarchy import linkage, fcluster\nfrom sklearn.datasets import make_blobs\n\nX, _ = make_blobs(n_samples=200, centers=3, random_state=0)\nZ = linkage(X, method='ward')          # the full merge tree (n-1 merges)\n\n# cut the tree two equivalent ways:\nlabels_k = fcluster(Z, t=3, criterion='maxclust')            # by number of clusters\nlabels_d = fcluster(Z, t=15, criterion='distance')           # by a height threshold\nprint('clusters by k=3   :', len(set(labels_k)))\nprint('clusters by height:', len(set(labels_d)))\n# scipy.cluster.hierarchy.dendrogram(Z) would draw the tree to pick the cut visually",
          "caption": "One tree, many partitions - cut low for more clusters, high for fewer. You decide k after seeing the dendrogram, not before."
        }
      ],
      "useCases": [
        "Discovering clusters of arbitrary shape and unknown count - DBSCAN on spatial data (geographic hotspots, GPS trajectories), density-varying blobs, and anything k-means' spherical assumption breaks on.",
        "Outlier / noise detection for free - DBSCAN's noise label makes it a natural anomaly detector, and hierarchical structure reveals which points join clusters only at high (unusual) merge heights.",
        "Taxonomy and multi-resolution analysis - dendrograms give a nested hierarchy (gene expression, document/topic hierarchies, phylogenetics) where you want structure at multiple granularities, not one flat partition.",
        "Exploratory analysis when you don't know k - both methods let you discover the number of clusters from the data rather than committing up front."
      ],
      "pitfalls": [
        "DBSCAN struggles when clusters have very different densities: a single global epsilon can't be dense enough for a sparse cluster and separating for a dense one at the same time - use HDBSCAN, which handles varying density by building a density hierarchy.",
        "DBSCAN is sensitive to its two parameters (epsilon, minPts) and to feature scaling; epsilon is chosen from a k-distance plot (the 'knee'), and in high dimensions the curse of dimensionality makes a single meaningful epsilon hard to find.",
        "Agglomerative clustering is O(n^2) memory and O(n^2 log n)-O(n^3) time (it needs the full pairwise distance matrix), so it doesn't scale to large n - it's for thousands, not millions, of points.",
        "Single-linkage's chaining effect: because it merges on the nearest pair of points, a thin bridge of noise points can chain two genuinely separate clusters into one - complete or Ward linkage is more robust to this.",
        "Hierarchical merges are greedy and irreversible: a bad early merge can't be undone, so the tree is locally, not globally, optimal - and different linkages give qualitatively different trees, so the choice is a real modeling decision, not a detail."
      ],
      "connections": [
        {
          "ref": "unsupervised-learning/kmeans",
          "text": "These methods drop k-means' two biggest assumptions: hierarchical defers the choice of k, and DBSCAN discovers k and handles non-spherical clusters plus noise."
        },
        {
          "ref": "unsupervised-learning/anomaly-detection",
          "text": "DBSCAN's noise label is a density-based anomaly detector; the density-estimation view underlies many of the anomaly methods in the next lesson."
        },
        {
          "ref": "unsupervised-learning/gmm-em",
          "text": "GMMs are the probabilistic alternative for non-spherical clusters (via covariance), a different route than DBSCAN's density-connectivity approach."
        },
        {
          "ref": "supervised-learning/knn",
          "text": "DBSCAN's epsilon-neighborhoods and the k-distance plot for choosing epsilon are the same neighborhood/distance machinery as kNN."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How does agglomerative hierarchical clustering work?",
          "a": "Start with each point as its own cluster; repeatedly merge the two closest clusters until one remains, recording every merge as a dendrogram."
        },
        {
          "q": "What is a dendrogram?",
          "a": "The tree of merges; cutting it at a height (or a target cluster count) yields a flat clustering - you choose k after seeing the structure."
        },
        {
          "q": "Name the main linkage criteria.",
          "a": "Single (min pairwise distance), complete (max), average (mean), and Ward (minimize within-cluster variance increase)."
        },
        {
          "q": "What is single-linkage chaining?",
          "a": "Merging on the nearest pair lets a thin bridge of points chain two separate clusters into one - single linkage is prone to this; complete/Ward resist it."
        },
        {
          "q": "What two parameters does DBSCAN need?",
          "a": "epsilon (neighborhood radius) and minPts (minimum neighbors to be a dense/core point)."
        },
        {
          "q": "What is a DBSCAN core point?",
          "a": "A point with at least minPts points within epsilon of it - core points seed and grow clusters."
        },
        {
          "q": "What can DBSCAN do that k-means can't?",
          "a": "Discover the number of clusters, find arbitrarily-shaped clusters, and label points as noise instead of forcing every point into a cluster."
        },
        {
          "q": "When does DBSCAN struggle?",
          "a": "When clusters have very different densities (one global epsilon can't fit both) and in high dimensions - use HDBSCAN for varying density."
        },
        {
          "q": "How do you choose DBSCAN's epsilon?",
          "a": "From a k-distance plot: sort each point's distance to its k-th nearest neighbor and pick epsilon at the 'knee' of the curve."
        },
        {
          "q": "Why doesn't agglomerative clustering scale to large n?",
          "a": "It needs the full pairwise distance matrix - O(n^2) memory and up to O(n^3) time - so it's for thousands, not millions, of points."
        }
      ],
      "standard": [
        {
          "q": "Compare hierarchical, density-based (DBSCAN), and centroid-based (k-means) clustering across the assumptions they make and the problems each solves.",
          "a": "Centroid-based (k-means) assumes a known number of spherical, roughly equal-sized clusters and partitions space by nearest-center; it's fast and scalable but fails on non-spherical/unequal clusters and forces every point into a cluster. Hierarchical (agglomerative) makes no assumption about cluster shape being spherical and, crucially, doesn't require k in advance - it builds a full nested tree (dendrogram) of merges so you can choose the granularity after seeing the structure, and it reveals multi-resolution structure; its costs are O(n^2)+ scaling and sensitivity to the linkage choice (and greedy, irreversible merges). Density-based (DBSCAN) assumes clusters are connected dense regions separated by sparser regions; it discovers the number of clusters automatically, finds arbitrarily-shaped clusters, and labels sparse points as noise rather than forcing them in - ideal for non-convex shapes and outlier-laden data, but it assumes clusters have comparable density (one global epsilon) and is sensitive to its parameters and to high dimensionality. So the choice maps to what you know and what shape the data has: known-k compact blobs at scale -> k-means; unknown-k with a need for multi-resolution structure -> hierarchical; arbitrary shapes with noise and unknown-k -> DBSCAN.",
          "deepDive": {
            "q": "DBSCAN and single-linkage hierarchical clustering are secretly related - how?",
            "a": "There's a precise connection: DBSCAN's density-connectivity is essentially single-linkage clustering with a density threshold. Single linkage merges clusters based on the minimum distance between any pair of points, which builds clusters by connecting nearby points into chains - exactly the 'reachability' idea DBSCAN uses, and both are prone to chaining through bridges of points. DBSCAN adds the minPts density requirement, which prunes the chaining: a point can only propagate a cluster if it's a core point (dense enough), so thin bridges of sparse points that would chain clusters together under pure single linkage are instead labeled noise and can't connect the clusters. HDBSCAN makes this relationship explicit - it builds a single-linkage-style hierarchy on a density-transformed distance (mutual reachability distance) and then extracts the most stable clusters across density levels, unifying the hierarchical and density-based views and solving DBSCAN's single-global-epsilon limitation in the process."
          }
        },
        {
          "q": "Walk through how DBSCAN forms clusters, defining core, border, and noise points, and explain why it can find non-convex clusters that k-means cannot.",
          "a": "DBSCAN classifies every point by its local density using two parameters, epsilon (radius) and minPts. A point is a core point if at least minPts points (including itself) lie within epsilon of it - it sits in a dense region. A point is a border point if it's within epsilon of a core point but isn't itself core (it's on the fringe of a dense region). A point that's neither - not core and not within epsilon of any core - is noise. Clustering then works by density-connectivity: pick an unvisited core point, start a cluster, and greedily absorb every point density-reachable from it (any point within epsilon of a core point in the cluster, expanding through chains of core points whose epsilon-neighborhoods overlap); border points join the cluster of a core they're near but don't expand it further; noise points are left unassigned. The number of clusters is however many separate density-connected components emerge. This finds non-convex clusters because a cluster is defined by connectivity through dense neighborhoods, not by distance to a single center: two crescent-shaped clusters are each internally dense and connected along their curved shape, and DBSCAN follows that connectivity around the curve, whereas k-means can only assign points by proximity to a center, which forces a straight-line Voronoi boundary that inevitably cuts across the interleaved crescents.",
          "deepDive": {
            "q": "Why is DBSCAN deterministic for core points but potentially non-deterministic for border points?",
            "a": "Core points and noise points are assigned deterministically regardless of processing order - a core point's cluster is fully determined by its density-connected component, and a noise point is never in any dense neighborhood. Border points, however, can be within epsilon of core points belonging to two different clusters; DBSCAN assigns such a border point to whichever cluster's core reaches it first during the expansion, which depends on the order in which points are processed. So the same dataset can yield slightly different border-point assignments across runs or implementations if the point ordering differs - the cluster cores and shapes are stable, but a handful of ambiguous fringe points may flip. This is usually negligible in practice (it affects only genuinely-between-two-clusters border points), and some implementations resolve it by a fixed tie-breaking rule, but it's the reason DBSCAN isn't strictly deterministic in the way k-means with a fixed seed is."
          }
        },
        {
          "q": "Explain the different linkage criteria in hierarchical clustering and how the choice changes the clusters you get.",
          "a": "Linkage defines the distance between two clusters, which determines which pair gets merged next and thus the whole tree's character. Single linkage uses the minimum distance between any point in one cluster and any point in the other - it merges clusters that have even one close pair, which lets it follow non-convex shapes and thin structures but makes it prone to chaining (a bridge of points links two otherwise-separate clusters) and sensitive to noise. Complete linkage uses the maximum pairwise distance - it only merges clusters when all their points are relatively close, producing compact, roughly equal-diameter clusters, but it can break up large clusters and is sensitive to outliers (one far point inflates the max). Average linkage uses the mean pairwise distance - a compromise between single and complete, less prone to chaining than single and less outlier-sensitive than complete. Ward linkage merges the pair of clusters that produces the smallest increase in total within-cluster variance (sum of squares) - it strongly favors compact, spherical, similar-sized clusters, effectively a hierarchical analogue of k-means' objective, and is often the best default for blob-like data. So the choice is a real modeling decision: single for elongated/connected structure, complete/Ward for compact clusters, average as a middle ground - and different linkages can give qualitatively different dendrograms on the same data.",
          "deepDive": {
            "q": "Why does Ward linkage tend to produce clusters similar to k-means, and when would you still prefer Ward?",
            "a": "Ward linkage merges the two clusters whose merger increases the total within-cluster sum of squares the least, and within-cluster sum of squares is exactly k-means' inertia objective - so Ward is greedily, hierarchically optimizing the same criterion k-means optimizes by iterative refinement. Both therefore favor compact, spherical, similar-sized clusters, and on clean blob data they often produce very similar partitions. You'd still prefer Ward over k-means when you want the full hierarchy (to choose k after seeing multi-resolution structure, or to get a dendrogram for interpretation), when you can't or don't want to specify k up front, or when you need deterministic results without k-means' initialization sensitivity (Ward's greedy merges are deterministic given the data). The trade-off is scale: Ward, like all agglomerative methods, needs the pairwise distances and is O(n^2)+, so for large n k-means (or mini-batch k-means) is the practical choice even when Ward would give a similar answer."
          }
        },
        {
          "q": "You apply DBSCAN and it labels almost everything as one giant cluster or almost everything as noise. Diagnose and fix.",
          "a": "This is the classic DBSCAN parameter-sensitivity failure, and which extreme you hit tells you which way to move. If almost everything is one giant cluster, epsilon is too large (or minPts too small): with a big radius, every point's neighborhood is dense enough to be core and neighborhoods overlap everywhere, so the whole dataset becomes one density-connected blob. If almost everything is noise, epsilon is too small (or minPts too large): no point has minPts neighbors within the tiny radius, so nothing qualifies as core and there are no cluster seeds. The principled fix for epsilon is the k-distance plot: for each point compute the distance to its k-th nearest neighbor (k = minPts), sort those distances ascending, and plot them - the curve stays low and flat through the dense in-cluster points and then bends sharply upward (the 'knee') where points transition to being isolated; choosing epsilon at that knee separates dense from sparse. Also ensure features are standardized (epsilon is a single radius across all dimensions, so scale matters), and set minPts based on dimensionality (a common heuristic is minPts >= dimensions + 1, often 2*dimensions). If, after tuning, no single epsilon works because clusters genuinely have very different densities, switch to HDBSCAN, which doesn't need a global epsilon.",
          "deepDive": {
            "q": "Why does a single global epsilon fundamentally fail on clusters of different densities, and how does HDBSCAN fix it?",
            "a": "DBSCAN's epsilon is a single global density threshold: it defines one radius within which minPts neighbors makes a point 'dense'. But if one true cluster is dense (points close together) and another is sparse (points farther apart but still a real cluster), no single epsilon works - an epsilon large enough to connect the sparse cluster's points will also merge the dense cluster with its neighbors (or with the sparse cluster) because that large radius is way more than enough for the dense region, while an epsilon tuned to the dense cluster leaves the sparse cluster's points too far apart to ever be core, so they're all labeled noise. HDBSCAN fixes this by not using a single global epsilon at all: it transforms distances into a density-aware 'mutual reachability distance', builds a hierarchy of clusters across ALL density levels (effectively running DBSCAN for every epsilon simultaneously), and then extracts the clusters that are most stable/persistent across a range of density thresholds. This lets it accept a dense cluster and a sparse cluster from the same dataset as separate valid clusters, each identified at its own appropriate density level, which is exactly the case that defeats plain DBSCAN's single epsilon."
          }
        },
        {
          "q": "When would you choose hierarchical clustering specifically because of the dendrogram, versus a flat clustering method?",
          "a": "You choose hierarchical clustering when the nested, multi-resolution structure is itself the thing you want, not just a single flat partition. Concrete cases: (1) When the data has a genuine hierarchy you need to see - taxonomies (species/phylogenetics), document or topic hierarchies, organizational or product category trees - where clusters exist at multiple granularities and you want to inspect all of them, not commit to one level. (2) When you don't know k and want to decide it by looking at the structure - the dendrogram lets you see where large gaps between merge heights occur (long vertical edges indicate well-separated clusters), which is a more informed way to pick the cut than guessing k for k-means. (3) When you want a stable, deterministic, interpretable clustering you can present and reason about - the dendrogram is a single visual artifact that shows the entire clustering process and how robust each cluster is (clusters that merge only at large heights are well-separated). (4) When cluster relationships matter - the tree shows not just which cluster a point is in but which clusters are most similar to each other. You'd prefer a flat method (k-means, DBSCAN) when you only need one partition, when n is large (hierarchical's O(n^2)+ cost is prohibitive), or when you specifically need arbitrary shapes with noise (DBSCAN) - the dendrogram's value is in the hierarchy and interpretability, which you pay for in scalability.",
          "deepDive": {
            "q": "How do you read a dendrogram to judge how many clusters the data really supports?",
            "a": "Read it by the merge heights (the y-axis, the distance at which two clusters combine). Well-separated clusters merge only at large heights, so the signature of natural cluster structure is a set of clusters connected by long vertical lines with a big vertical gap before the next merge - you cut the tree horizontally across that gap, and the number of vertical lines the cut crosses is the number of clusters. Concretely, scan up the tree for the largest jump in merge height (the biggest vertical distance between consecutive merges): cutting just below that jump gives the number of clusters the data most strongly supports, because everything below merged 'cheaply' (points were close) while the next merge is 'expensive' (it would join genuinely distant groups). If there's no clear big gap - merges happen at steadily increasing heights with no dominant jump - that itself is evidence the data doesn't have a strong, well-defined cluster count, and any k you pick is somewhat arbitrary. This visual gap analysis is the hierarchical analogue of the elbow/silhouette diagnostics for k-means, with the advantage that you see the entire merge structure at once rather than one scalar per k."
          }
        },
        {
          "q": "How do these clustering methods behave in high dimensions, and what would you do to cluster high-dimensional data?",
          "a": "All distance-based clustering degrades in high dimensions because of the curse of dimensionality: distances concentrate (nearest and farthest points become nearly equidistant), so the notions all three methods rely on - k-means' nearest-center, hierarchical's cluster-distances, and DBSCAN's epsilon-neighborhood density - all lose their discriminative power. DBSCAN is hit especially hard: a single meaningful epsilon becomes nearly impossible to choose because the contrast between dense and sparse neighborhoods collapses, and the k-distance knee flattens out. Hierarchical clustering's pairwise distances become similarly uninformative, and its O(n^2)+ cost compounds the problem. Practical remedies: (1) Reduce dimensionality first - apply PCA to project onto the top components capturing real variance, or a nonlinear embedding (UMAP is popular as a pre-clustering step), then cluster in the low-dimensional space where distances are meaningful again. (2) Feature selection to drop noise dimensions that dilute the signal. (3) Use a domain-appropriate distance (cosine similarity for text/embeddings often behaves better than Euclidean in high dimensions). (4) For DBSCAN specifically, HDBSCAN on a reduced-dimension embedding is a common robust pipeline. The general principle mirrors k-means: restore meaningful distances (via dimensionality reduction or a better metric) before running any distance-based clustering.",
          "deepDive": {
            "q": "Why is 'UMAP then HDBSCAN' a popular modern clustering pipeline for high-dimensional data like embeddings?",
            "a": "It's popular because the two components address complementary weaknesses. High-dimensional embeddings (from a neural network, say) live in a space where raw Euclidean distances are unreliable for clustering (curse of dimensionality) and where the true cluster structure lies on a lower-dimensional manifold. UMAP is a nonlinear manifold-learning technique that projects the data to a low-dimensional space (2-10 dims) while preserving local neighborhood structure and, reasonably well, the density relationships - so it both restores meaningful distances and often makes genuine clusters visually and geometrically separable. HDBSCAN then clusters in that low-dimensional space, where its density-based approach thrives: it discovers the number of clusters, handles the arbitrary shapes UMAP embeddings often produce, labels genuinely-ambiguous points as noise, and (unlike plain DBSCAN) copes with the varying densities UMAP can introduce. The combination gives you assumption-light clustering (no k to specify, arbitrary shapes, noise handling) on data that would defeat any single distance-based method in its original high-dimensional form - which is why it's a go-to for clustering text/image embeddings, though the caveat is that UMAP's neighbor-preserving distortions mean the resulting cluster geometry shouldn't be over-interpreted."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Agglomerative hierarchical clustering",
        "back": "Start with each point as a cluster; repeatedly merge the two closest clusters into a dendrogram. Cut the tree to choose k after seeing the structure."
      },
      {
        "type": "definition",
        "front": "Linkage criteria",
        "back": "How to measure cluster distance: single (min pairwise), complete (max), average (mean), Ward (min variance increase, k-means-like)."
      },
      {
        "type": "pitfall",
        "front": "Single-linkage chaining",
        "back": "Merging on the nearest pair lets a thin bridge of points chain two separate clusters into one - complete/Ward linkage resist this."
      },
      {
        "type": "definition",
        "front": "DBSCAN core point",
        "back": "A point with >= minPts neighbors within epsilon. Clusters = density-connected core points + their border points; the rest is noise."
      },
      {
        "type": "intuition",
        "front": "What DBSCAN does that k-means can't",
        "back": "Discovers the cluster count, finds arbitrarily-shaped clusters, and labels sparse points as noise instead of forcing them into a cluster."
      },
      {
        "type": "pitfall",
        "front": "DBSCAN + varying density",
        "back": "One global epsilon can't fit both dense and sparse clusters - use HDBSCAN, which builds a density hierarchy across all epsilon levels."
      },
      {
        "type": "definition",
        "front": "Choosing DBSCAN epsilon",
        "back": "k-distance plot: sort each point's distance to its k-th (=minPts) nearest neighbor, pick epsilon at the 'knee' where the curve bends up."
      },
      {
        "type": "pitfall",
        "front": "Hierarchical clustering scalability",
        "back": "Needs the full pairwise distance matrix: O(n^2) memory, up to O(n^3) time - for thousands, not millions, of points."
      }
    ],
    "refs": [
      {
        "title": "Ester et al., DBSCAN (1996)",
        "url": "https://www.aaai.org/Papers/KDD/1996/KDD96-037.pdf"
      },
      {
        "title": "Campello et al., HDBSCAN (2013)",
        "url": "https://link.springer.com/chapter/10.1007/978-3-642-37456-2_14"
      },
      {
        "title": "scikit-learn: Clustering (hierarchical & DBSCAN)",
        "url": "https://scikit-learn.org/stable/modules/clustering.html"
      },
      {
        "title": "scipy.cluster.hierarchy (linkage & dendrogram)",
        "url": "https://docs.scipy.org/doc/scipy/reference/cluster.hierarchy.html"
      }
    ],
    "demos": [
      "dbscan",
      "hierarchical-clustering"
    ]
  }
};
