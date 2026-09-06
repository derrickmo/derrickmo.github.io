// GENERATED from content/lessons/advanced-cv/image-retrieval.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-cv/image-retrieval/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "image-retrieval": {
    "level": "core",
    "body": {
      "intuition": [
        "Image retrieval is 'find me images like this one', and the whole system rests on one idea: map every image to a VECTOR such that visually or semantically similar images land close together, then reduce search to nearest-neighbour lookup in that space. Everything interesting is in the two halves of that sentence - what 'similar' means, which is a modelling and product question, and how to find neighbours among a hundred million vectors in ten milliseconds, which is an indexing question. They are usually owned by different people and both determine whether the system works.",
        "The 'similar' question is the one people underestimate. Similar in WHAT sense? The same object instance (find this exact painting), the same category (find other sofas), the same visual style (find images with this palette), or the same semantic content (find pictures of a birthday party)? These are different embedding spaces and a model trained for one does poorly at another - which is why the choice of pretrained backbone is really a choice of similarity definition. CLIP embeds semantic/textual similarity; DINOv2 embeds visual and part-level similarity; a metric-learning model trained with triplet or contrastive losses on YOUR labels embeds exactly the similarity your labels define.",
        "The search half has a hard constraint: exact nearest-neighbour search is linear in the database size, so at 100M vectors it is far too slow. Practical systems use APPROXIMATE nearest neighbour indexes - HNSW graphs, IVF partitioning, product quantization - which trade a small, measurable amount of recall for orders of magnitude in speed. The critical discipline is that ANN recall is a TUNABLE parameter, not a fixed property: every index exposes a knob (efSearch, nprobe) trading latency against how often you return the true nearest neighbours, and reporting retrieval quality without stating that operating point is meaningless. Real systems then add a RERANKING stage - retrieve 100 candidates cheaply, rescore them with an expensive model - which is the same two-stage funnel that appears in search and recommendation."
      ],
      "math": [
        {
          "h": "Cosine similarity and why embeddings are normalized",
          "paras": [
            "Almost all retrieval uses cosine similarity, which is the dot product of L2-normalized vectors. Normalizing makes similarity depend only on DIRECTION, discarding magnitude - which matters because embedding norm often encodes nuisance properties (image contrast, object size, or simply how confident the encoder is) rather than content. It also makes cosine and Euclidean distance monotonically equivalent, so an index built for L2 works for cosine."
          ],
          "tex": "\\cos(u, v) = \\frac{u^{\\top} v}{\\lVert u\\rVert \\lVert v\\rVert} = \\hat{u}^{\\top}\\hat{v}, \\qquad \\lVert \\hat{u} - \\hat{v}\\rVert^2 = 2 - 2\\,\\hat{u}^{\\top}\\hat{v}",
          "texNote": "The second identity is why normalizing lets you use a Euclidean index for cosine search - minimizing L2 distance and maximizing cosine similarity are the same problem on the unit sphere. Normalize once at indexing time and once per query."
        },
        {
          "h": "Triplet loss: pull positives in, push negatives out",
          "paras": [
            "Metric learning trains the embedding directly. The triplet loss requires the anchor to be closer to a positive than to a negative by at least a MARGIN, and is zero once that holds - so once a triplet is satisfied it contributes no gradient, which is exactly why mining hard triplets matters so much."
          ],
          "tex": "\\mathcal{L} = \\max\\Big(0,\\; d(a, p) - d(a, n) + \\alpha \\Big), \\qquad \\text{semi-hard: } d(a,p) < d(a,n) < d(a,p) + \\alpha",
          "texNote": "alpha = the margin (0.2-0.5 typical for normalized embeddings). Random triplets are mostly already satisfied and give zero gradient; HARDEST negatives destabilize training (they are often mislabelled); SEMI-HARD negatives - violating the margin but not inverted - are the standard compromise from FaceNet."
        }
      ],
      "code": [
        {
          "h": "A retrieval system in thirty lines",
          "paras": [
            "Embed, normalize, index, search. The important detail is normalizing BEFORE indexing so that an inner-product index computes cosine similarity - and that this must be done identically for the query."
          ],
          "code": "import torch, numpy as np, faiss\n\n@torch.no_grad()\ndef embed_all(model, loader, dim=768):\n    \"\"\"Extract L2-normalized embeddings for the whole corpus.\"\"\"\n    out = np.empty((len(loader.dataset), dim), dtype='float32')\n    i = 0\n    for x, _ in loader:\n        f = model(x.cuda())                       # (B, D)\n        f = torch.nn.functional.normalize(f, dim=1)     # UNIT norm -> cosine == inner product\n        out[i:i + len(f)] = f.cpu().numpy(); i += len(f)\n    return out\n\nX = embed_all(backbone, corpus_loader)            # (N, 768) float32\n\n# exact search: fine up to ~1M vectors, linear in N beyond that\nindex_flat = faiss.IndexFlatIP(768)               # inner product on normalized = cosine\nindex_flat.add(X)\n\n# approximate search: HNSW graph, sublinear, the usual default under ~10M\nindex = faiss.IndexHNSWFlat(768, 32)              # M=32 neighbours per node\nindex.hnsw.efConstruction = 200                   # build quality (slower build, better graph)\nindex.add(X)\nindex.hnsw.efSearch = 64                          # THE recall/latency knob at query time\n\nq = torch.nn.functional.normalize(backbone(query_img), dim=1).cpu().numpy()\nscores, ids = index.search(q, k=10)\n\n# ALWAYS measure ANN recall against exact search - it is a tunable, not a given\n_, ids_exact = index_flat.search(q_batch, 10)\nrecall_at_10 = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(ids_ann, ids_exact)])\nprint(f'ANN recall@10 = {recall_at_10:.3f} at efSearch={index.hnsw.efSearch}')",
          "caption": "Normalize before indexing so an inner-product index computes cosine similarity. The last block is the discipline that matters: ANN recall against exact search is a tunable operating point (efSearch), and quoting retrieval quality without it is meaningless."
        },
        {
          "h": "The recall/latency curve, and why reranking exists",
          "paras": [
            "Every ANN index exposes a knob trading recall against speed, and the curve is steep at the useful end. Two-stage retrieval exploits that: recall generously with a cheap index, then rescore the shortlist with an expensive model that you could never run over the whole corpus."
          ],
          "code": "# 10M vectors, 768-d, HNSW, single query, one CPU core:\n#\n#   efSearch    ANN recall@10    latency\n#       16          0.847         0.4 ms\n#       32          0.928         0.7 ms\n#       64          0.971         1.3 ms\n#      128          0.989         2.4 ms\n#      256          0.996         4.6 ms\n#   exact           1.000       310   ms      <- 240x slower than efSearch=64\n#\n# Product quantization for MEMORY: 768-d float32 = 3 KB/vector = 30 GB at 10M.\n#   PQ with 96 subquantizers x 8 bits = 96 bytes/vector = 0.96 GB (32x smaller)\n#   ... at some recall cost, usually recovered by reranking the shortlist exactly.\n\n# TWO-STAGE: cheap recall, then expensive precision\ncand_scores, cand_ids = index.search(q, k=100)          # ANN over 10M, ~1 ms\nrescored = cross_encoder(query_img, corpus[cand_ids])   # expensive, only 100 items\ntop10 = cand_ids[np.argsort(-rescored)[:10]]\n# The funnel is the same one used in search and recommendation: optimize the first\n# stage for RECALL@100 (did the good item survive?) and the second for NDCG@10.",
          "caption": "The ANN operating point: efSearch=64 gives 97% recall at 240x the speed of exact search. Product quantization trades memory 32x for some recall, typically recovered by exact reranking of the shortlist - the standard two-stage funnel."
        }
      ],
      "useCases": [
        "Visual search in e-commerce - photograph a product and find it or similar items - which is the canonical application and where the instance-versus-category distinction matters most commercially.",
        "Deduplication and content moderation at scale: near-duplicate detection for copyright, spam, and harmful-content matching, where perceptual hashing and embedding search complement each other and adversarial robustness is a real requirement.",
        "Reverse image search and provenance: finding where an image appeared before, which requires instance-level matching robust to crops, rescaling, and compression.",
        "As the retrieval stage of larger systems: RAG over image corpora, few-shot classification by nearest-neighbour lookup, dataset curation and cleaning (finding mislabelled or duplicated training images), and open-vocabulary detection pipelines."
      ],
      "pitfalls": [
        "Reporting retrieval metrics without the ANN operating point: recall@10 depends on efSearch or nprobe, and a system quoting 0.97 at one setting and 0.85 at another is the same index. Always measure ANN recall against exact search and state the knob.",
        "Forgetting to normalize, or normalizing inconsistently between indexing and query: an inner-product index on unnormalized vectors ranks by magnitude as much as by direction, which silently returns high-norm images regardless of content.",
        "Choosing the backbone without deciding what 'similar' means: CLIP embeds semantic/textual similarity, DINOv2 visual and part-level similarity, and a metric-learning model whatever your labels define. A category-similarity model will not find the exact instance a user photographed.",
        "Evaluating with a test set that leaks: near-duplicates of query images sitting in the index inflate every metric. Deduplicate the corpus and check that evaluation queries are not themselves in the index (or are excluded at query time).",
        "Ignoring index maintenance: corpora change, and most ANN indexes handle deletions poorly (HNSW marks rather than removes) and drift as the distribution shifts. Plan for periodic rebuilds, and remember that re-embedding the whole corpus is required whenever the model changes - which makes model updates expensive."
      ],
      "connections": [
        {
          "ref": "advanced-cv/dino-mae",
          "text": "Self-supervised features - DINOv2 in particular - are the practical default for visual similarity, because their embedding space is semantically organized without any fine-tuning."
        },
        {
          "ref": "rag-agents/embeddings-vector-stores",
          "text": "The indexing machinery (HNSW, IVF, product quantization) and the recall/latency trade-off are identical for text retrieval - only the encoder changes."
        },
        {
          "ref": "ml-applications/search-ranking",
          "text": "The retrieve-then-rerank funnel, and the discipline of optimizing recall@k for stage one and NDCG@10 for stage two, is the same two-stage architecture used in search."
        },
        {
          "ref": "multimodal/clip",
          "text": "CLIP makes cross-modal retrieval possible - search images with text - by embedding both in one space, which is a different notion of similarity from purely visual matching."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How does image retrieval work at a high level?",
          "a": "Embed every image into a vector space where similar images are close, index those vectors, and answer a query by nearest-neighbour search - then usually rerank the top candidates with a more expensive model."
        },
        {
          "q": "Why normalize embeddings?",
          "a": "So similarity depends on DIRECTION not magnitude (norm often encodes nuisance factors), and so cosine similarity equals the inner product - letting a Euclidean/IP index serve cosine search."
        },
        {
          "q": "Instance-level vs category-level retrieval?",
          "a": "Instance: find THIS exact object (the same painting, the same product). Category: find the same KIND of thing. They need different embeddings, and conflating them is a common product failure."
        },
        {
          "q": "What is HNSW?",
          "a": "Hierarchical Navigable Small World - a multi-layer proximity graph searched greedily from a top layer down. The usual ANN default under ~10M vectors; efSearch trades recall against latency."
        },
        {
          "q": "What is IVF?",
          "a": "Inverted file index: cluster vectors (k-means), and at query time search only the nprobe nearest clusters. Simple, memory-efficient, and nprobe is its recall/latency knob."
        },
        {
          "q": "What is product quantization?",
          "a": "Split each vector into subvectors, quantize each with its own small codebook, and store codes instead of floats - typically 32x memory reduction at some recall cost, usually recovered by exact reranking."
        },
        {
          "q": "What is triplet loss?",
          "a": "max(0, d(a,p) - d(a,n) + margin): the anchor must be closer to a positive than a negative by a margin. Zero gradient once satisfied, which is why triplet MINING matters."
        },
        {
          "q": "What is semi-hard negative mining?",
          "a": "Choosing negatives that violate the margin but are still farther than the positive. Random negatives give no gradient; hardest negatives destabilize training (often mislabelled). FaceNet's compromise."
        },
        {
          "q": "Why is ANN recall an operating point, not a property?",
          "a": "Every index exposes a knob (efSearch, nprobe) trading recall against latency - the same index gives 0.85 or 0.99 recall depending on it. Quoting retrieval quality without it is meaningless."
        },
        {
          "q": "What is reranking and why use it?",
          "a": "Retrieve ~100 candidates with a cheap index, then rescore them with an expensive model (cross-encoder, geometric verification). You get precision you could never afford over the whole corpus."
        },
        {
          "q": "Which backbone would you start with?",
          "a": "DINOv2 for visual/part-level similarity, CLIP for semantic or text-to-image search, and a fine-tuned metric-learning model when you have labels defining your own notion of similarity."
        },
        {
          "q": "What happens when you change the embedding model?",
          "a": "You must RE-EMBED and REINDEX the entire corpus - old and new vectors are not comparable. That cost is what makes model updates a significant operational event."
        }
      ],
      "standard": [
        {
          "q": "Design an image retrieval system end to end. What are the main decisions?",
          "a": "DECISION 1 - WHAT DOES 'SIMILAR' MEAN? This is the product question and it determines everything downstream. INSTANCE-level (find this exact product, painting, or landmark) needs an embedding sensitive to fine detail and robust to viewpoint, crop, and lighting. CATEGORY-level (find other sofas) needs semantic abstraction and deliberate insensitivity to instance detail. STYLE or colour similarity is different again. SEMANTIC/textual similarity ('a birthday party') needs a vision-language model. A system that returns visually similar but wrong-category results, or the right category but not the item the user photographed, is failing this decision rather than a technical one. DECISION 2 - THE ENCODER, which follows directly. DINOv2 frozen features are a strong default for visual and part-level similarity and require no training. CLIP is the choice for cross-modal or semantic search. If you have labels defining your own similarity (products in the same SKU, faces of the same person), fine-tune with a metric-learning objective - triplet or, better, a contrastive/InfoNCE loss with in-batch negatives, or ArcFace-style angular-margin classification which is the strong default for identity retrieval. Start frozen and only fine-tune if the frozen baseline is insufficient, because fine-tuning means re-embedding the corpus on every model change. DECISION 3 - THE INDEX, chosen by corpus size and constraints. Under ~1M vectors, exact search (IndexFlatIP) is genuinely fine on a modern CPU and removes an entire class of problems. Up to ~10M, HNSW is the default - excellent recall/latency, but memory-hungry (the graph plus full vectors) and awkward for deletions. Beyond that, or when memory is the constraint, IVF plus product quantization (IVFPQ), or the disk-based options (DiskANN). If you need distribution, use a managed vector database rather than sharding an index yourself. DECISION 4 - THE OPERATING POINT. Measure ANN recall against exact search and choose efSearch or nprobe from the latency budget. A representative curve at 10M vectors: efSearch 16 gives 0.85 recall at 0.4 ms, 64 gives 0.97 at 1.3 ms, exact gives 1.0 at 310 ms. Pick deliberately and monitor it, because index growth shifts the curve. DECISION 5 - RERANKING, if precision at the top matters. Retrieve 100-200 candidates cheaply, then rescore with something expensive: a cross-encoder that jointly encodes query and candidate, geometric verification with local features (SIFT/SuperPoint plus RANSAC) for instance matching, or simply exact distances if the index used quantization. This two-stage funnel is how you get both scale and precision, and it is the same architecture as search and recommendation. DECISION 6 - THE OPERATIONAL PARTS people forget. Embedding the corpus is a batch job that must be re-run on every model change - budget for it, and version the embeddings alongside the model. Handle DELETIONS (HNSW marks rather than removes, so deleted items accumulate and require periodic rebuilds). Handle ADDITIONS (incremental insert is supported but degrades graph quality over time). DEDUPLICATE the corpus, or near-duplicates will fill the top-k and make results look broken. And decide the query-time policy for the query image itself if it is in the index. WHAT I WOULD EVALUATE: recall@k and mAP against a labelled ground-truth set that reflects your similarity definition; ANN recall against exact search separately (so index error and model error are not conflated); latency percentiles; and, if possible, an online metric like click-through or task success - because offline similarity metrics correlate imperfectly with whether users found what they wanted.",
          "deepDive": {
            "q": "Explain the ANN index families in depth. How do you choose, and what are their failure modes?",
            "a": "THE FUNDAMENTAL TRADE-OFF is between recall, latency, memory, and build time, and every index picks a point in that space. Exact search is O(N) per query - at 10M 768-dimensional vectors that is a 30 GB scan, around 300 ms on a CPU core, which is fine for offline batch and unusable for interactive search. (1) IVF - INVERTED FILE. Run k-means to partition the vectors into nlist clusters (typically sqrt(N)), store each vector in its cluster's list, and at query time compare the query to the nlist centroids and scan only the nprobe nearest lists. Cost falls by roughly nlist/nprobe. STRENGTHS: simple, memory-light (just the assignment), fast to build, and easy to reason about. WEAKNESSES: the EDGE PROBLEM - a query near a cluster boundary has its true neighbours in an adjacent unprobed cluster, so recall degrades in a way that is unevenly distributed across queries; and it assumes the data clusters reasonably, which high-dimensional embeddings only partly do. nprobe is the knob. (2) HNSW - HIERARCHICAL NAVIGABLE SMALL WORLD. Build a multi-layer proximity graph: the top layer is sparse with long-range links, lower layers progressively denser. Search greedily from an entry point in the top layer, descending. STRENGTHS: the best recall/latency curve of the mainstream options, robust across data distributions, and no training step. WEAKNESSES: MEMORY - it stores the full vectors plus M neighbours per node per layer, so it can be 1.5-2x the raw data size, which is the binding constraint at scale; slow to build; and DELETIONS are handled by marking rather than removing, so a corpus with churn accumulates tombstones and needs periodic rebuilds. efConstruction controls build quality, efSearch controls query recall. (3) PRODUCT QUANTIZATION. Split each vector into m subvectors, learn a small codebook (typically 256 centroids) per subspace, and store m bytes instead of 4*d bytes. Distances are computed via precomputed lookup tables. STRENGTHS: enormous memory reduction - 768-d float32 (3 KB) to 96 bytes is 32x, turning 30 GB into under 1 GB - which is what makes billion-scale search feasible on one machine. WEAKNESSES: quantization error reduces recall, and the error is data-dependent; usually combined with IVF (IVFPQ) for the coarse stage and with exact RERANKING of the shortlist to recover precision. OPQ (a learned rotation before quantization) improves it meaningfully. (4) SCANN and similar - anisotropic quantization that optimizes for the inner-product objective specifically rather than for reconstruction error, which is a better fit for retrieval and gives a stronger recall/latency curve. (5) DISK-BASED (DiskANN) - keep the graph on SSD with a memory-resident compressed index, for corpora exceeding RAM. HOW I CHOOSE, as a rule of thumb: under 1M vectors, exact - it removes a whole class of problems and is fast enough. 1M-10M with RAM available, HNSW. Beyond 10M or memory-constrained, IVFPQ or ScaNN, with reranking. Corpus exceeding RAM, DiskANN or a managed service. High churn, prefer IVF (easier to update) or plan rebuild cadence for HNSW. THE FAILURE MODES THAT MATTER IN PRODUCTION, which are mostly not about recall. (a) DISTRIBUTION DRIFT: IVF's centroids were fit on the original data, so as the corpus evolves the partition degrades and recall silently falls - monitor ANN recall against a sampled exact ground truth on a schedule, not just at launch. (b) DELETION ACCUMULATION in HNSW. (c) THE INDEX AND THE MODEL DRIFTING APART - if any subset of the corpus was embedded with an older model version, those vectors are in a different space and are effectively invisible or spuriously close; version embeddings explicitly. (d) TAIL LATENCY: ANN search has variable cost per query (some queries traverse more of the graph), so p99 can be several times p50 - budget on the tail. (e) FILTERED SEARCH - 'nearest neighbours WHERE category = shoes' is genuinely hard for graph indexes, since filtering after search may return nothing and filtering during traversal breaks the graph's connectivity assumptions. This is one of the most common practical surprises, and the answer is usually either partitioned indexes per filter value or a hybrid approach - worth designing for early rather than discovering late."
          }
        },
        {
          "q": "How do you train an embedding for retrieval, and what makes metric learning hard?",
          "a": "THE OBJECTIVE FAMILIES, in the order the field developed them. (1) CONTRASTIVE (pairwise): pull matching pairs together, push non-matching pairs apart beyond a margin. Simple, but requires constructing pairs and the loss depends heavily on which pairs you sample. (2) TRIPLET: an anchor, a positive, and a negative, with the requirement that d(a,p) + margin < d(a,n). Better than pairwise because it optimizes a RELATIVE ordering rather than absolute distances, which is what retrieval actually needs. FaceNet made this the standard for identity retrieval. (3) IN-BATCH SOFTMAX / InfoNCE: treat each positive as the correct class among all other items in the batch, which uses every item as a negative for every other - far more efficient than explicit triplets and is why large batches help. This is what CLIP and most modern contrastive training use. (4) CLASSIFICATION-BASED ANGULAR MARGIN losses - ArcFace, CosFace, SphereFace: train a classifier over identities but add an angular margin to the correct class's logit, which produces embeddings with large inter-class separation. These are the strong default for face and product identity retrieval and are often better and much easier to train than triplet losses, because there is no mining problem at all - a useful thing to know since triplet loss gets disproportionate airtime. WHY METRIC LEARNING IS HARD - four reasons. (a) THE MINING PROBLEM. Triplet loss is zero once the margin is satisfied, and randomly sampled triplets are almost all satisfied after a short time, so the gradient vanishes and training stalls. You must MINE informative triplets. But the hardest negatives are often MISLABELLED examples or genuine near-duplicates, so training on them destabilizes or collapses the embedding. SEMI-HARD mining (negatives that violate the margin but are still farther than the positive) is the classic compromise; batch-hard mining within a large batch is the practical modern version. The fact that this delicate balance is required is the single biggest practical difficulty. (b) BATCH COMPOSITION MATTERS ENORMOUSLY. In-batch-negative methods need each batch to contain informative negatives, so batch construction (P identities x K samples each) is part of the algorithm, and large batches help - which is an infrastructure requirement, not just a hyperparameter. (c) THE EMBEDDING CAN COLLAPSE or occupy a low-dimensional subspace, especially without enough negatives - the same dimensional-collapse phenomenon as in self-supervised learning, and it is invisible in the training loss. Check the singular-value spectrum of the embeddings. (d) EVALUATION IS DIFFICULT AND HAS BEEN UNRELIABLE. Musgrave et al.'s 'A Metric Learning Reality Check' (2020) showed that a decade of claimed improvements largely evaporated under fair comparison with matched architectures, matched training budgets, and proper hyperparameter tuning on a validation set - a well-tuned baseline contrastive loss was competitive with almost everything. That is a strong caution against believing metric-learning leaderboards and a good thing to cite. WHAT I WOULD ACTUALLY DO in 2026: start with FROZEN DINOv2 or CLIP features and measure - they are strong and require no training. If fine-tuning is needed, use an angular-margin classification loss (ArcFace) if you have identity labels, or in-batch InfoNCE with a large batch if you have pairs, and treat triplet loss with explicit mining as a legacy option. Tune on a proper validation set, compare against the frozen baseline honestly, and remember that every fine-tune means re-embedding the entire corpus."
        },
        {
          "q": "Your visual search returns visually similar but semantically wrong results. Diagnose.",
          "a": "This symptom - 'it returns things that look alike but are not what the user wanted' - almost always means the embedding encodes the wrong NOTION OF SIMILARITY, and the fix is usually a different encoder rather than a better index. I would work through it as follows. (1) CHARACTERIZE THE FAILURE PRECISELY, because 'semantically wrong' covers several distinct problems. Are the results the same COLOUR or TEXTURE but a different object (a beige sofa returning beige walls)? Then the embedding is dominated by low-level appearance - typical of features taken from too early a layer, or of models trained on objectives that reward texture. Are they the same CATEGORY but not the same INSTANCE (returning other sneakers rather than the exact model photographed)? Then the embedding is too abstract for instance retrieval - a category-level space being used for an instance-level task. Are they the same SCENE TYPE but wrong subject? Then the embedding may be encoding context and background rather than the foreground object. Each of these has a different fix, so getting the diagnosis right matters more than the remedy. (2) CHECK THE ENCODER AGAINST THE TASK. CLIP embeds SEMANTIC similarity as defined by co-occurrence with text, so it excels at 'a photo of a birthday party' and is comparatively weak at distinguishing two similar product SKUs. DINOv2 embeds visual and part-level structure - much better for instance-level and fine-grained matching. An ImageNet-supervised backbone embeds whatever distinguishes 1000 classes, which is often texture-biased. If you are using an ImageNet classifier's penultimate layer for instance retrieval, that is likely the whole problem. (3) CHECK THE PREPROCESSING, which is a surprisingly common cause. Is the query image being resized and centre-cropped the same way as the corpus? A query photographed with the object off-centre, then centre-cropped, may not contain the object at all. Is normalization identical? Are you embedding the whole image when the user cares about one object in it - in which case DETECT AND CROP first, which frequently transforms results because the embedding is no longer averaging over background. (4) CHECK FOR BACKGROUND DOMINANCE. Test by masking the background (or cropping tightly) and seeing whether results improve - if they do, the embedding is being driven by context, and cropping to a detected region becomes a pipeline stage. (5) CONSIDER WHETHER THE INDEX IS THE PROBLEM AT ALL - it usually is not, but verify: compare ANN results against exact search on the same queries. If exact search gives the same wrong answers, the index is fine and the embedding is at fault. This one check separates the two halves of the system and takes minutes. (6) THE FIXES, ranked. Switch to a more appropriate pretrained encoder (usually the highest-return move and requires no training). Add a detection-and-crop stage. FINE-TUNE with your own similarity labels using an angular-margin or contrastive objective - which directly defines 'similar' as your labels do, and is the principled fix when off-the-shelf embeddings do not match the product's notion. Add a RERANKING stage using a cross-encoder or, for instance matching, geometric verification with local features and RANSAC - which is the classical and still very effective answer for 'is this the same object'. Combine multiple embeddings (semantic plus visual) with a learned or tuned weighting. (7) EVALUATE THE FIX PROPERLY: build a labelled query set that reflects the actual product need (for each query, which corpus items count as correct?), and measure recall@k and mAP against it. Without that set, every change is a matter of opinion, and in my experience getting the evaluation set built is the step that unblocks the whole investigation."
        },
        {
          "q": "How does image retrieval differ from text retrieval, and where is the machinery shared?",
          "a": "WHAT IS SHARED - essentially the entire retrieval stack below the encoder. Embed items into a vector space, normalize, index with HNSW/IVF/PQ, search by cosine similarity, tune the recall/latency operating point, and rerank the shortlist with an expensive model. The two-stage funnel, the ANN trade-offs, the index maintenance problems, the need to re-embed on model change - all identical. If you have built one you can build the other, and vector databases are deliberately modality-agnostic for this reason. WHAT DIFFERS. (1) THE NOTION OF RELEVANCE IS SHARPER IN TEXT. A text query states what the user wants, more or less explicitly. An image query states 'like this', which is ambiguous - like this in colour, in category, in style, in the specific object? Text retrieval has a well-posed relevance judgement; image retrieval usually has several plausible ones, which is why the 'what does similar mean' question dominates image system design and is comparatively settled in text. (2) TEXT HAS A STRONG LEXICAL BASELINE. BM25 - term-frequency matching - is a genuinely competitive baseline for text retrieval and remains part of most production systems in a HYBRID with dense retrieval, because exact term matching handles rare entities, names, and codes that dense embeddings blur. Images have no comparable lexical signal; the closest analogues are perceptual hashes (excellent for near-duplicate detection, useless for semantic similarity) and classical local features (SIFT/SuperPoint with geometric verification, which are excellent for instance matching and are the image equivalent of exact matching). Knowing that hybrid retrieval is standard in text and that its image analogue is 'embedding plus geometric verification' is a good parallel to draw. (3) QUERY-DOCUMENT ASYMMETRY. In text retrieval the query is short and the document long, which motivates asymmetric encoders and techniques like HyDE and query expansion. In image retrieval the query and corpus items are usually the same kind of object, so a single symmetric encoder is natural - except in CROSS-MODAL retrieval (text query, image corpus), where the asymmetry returns and CLIP-style two-tower models are the answer. (4) STORAGE AND COMPUTE PROFILE. Image embedding is far more expensive per item than text embedding, so re-embedding a corpus on model change is a major batch job rather than a minor one - which makes model updates more consequential. Conversely, image corpora are often smaller in item count than web-text corpora. (5) EVALUATION DATA. Text retrieval has mature benchmarks with human relevance judgements (MS MARCO, BEIR); image retrieval's benchmarks are narrower and often instance-level (Oxford/Paris landmarks, Google Landmarks), so for a new application you will usually have to build your own labelled query set - and that is the main practical cost. (6) NEAR-DUPLICATES ARE A BIGGER PROBLEM IN IMAGES. Corpora are full of crops, rescalings, and re-compressions of the same image, which fill the top-k and make results look broken; deduplication is a standard and necessary preprocessing stage in a way it is less often for text. THE CONVERGENCE worth mentioning: multimodal embeddings (CLIP and successors) put text and images in ONE space, so 'text retrieval' and 'image retrieval' become the same system with different encoders on the query side. That is how modern multimodal RAG works, and it means the interesting differences are increasingly in the encoder and the evaluation rather than in the retrieval infrastructure."
        },
        {
          "q": "How would you handle a corpus of 500 million images with a 50 ms latency budget?",
          "a": "The two binding constraints are MEMORY and LATENCY, and they push in the same direction: you cannot hold 500M full-precision embeddings in RAM on one machine, and you cannot scan them. THE ARITHMETIC FIRST. 500M vectors at 768 dimensions in float32 is 1.5 TB - far beyond a single machine. So the design is forced: either compress aggressively, shard across machines, or both. THE DESIGN I WOULD PROPOSE. (1) REDUCE THE DIMENSION. 768 is more than most retrieval tasks need. Train a PCA or a learned projection down to 128-256 dimensions, or use a model trained with Matryoshka representation learning which allows truncating the embedding to a prefix with graceful degradation. At 128 dimensions, float32 gives 256 GB - still large but tractable. Measure the recall cost of the reduction; it is usually small and occasionally zero. (2) QUANTIZE. Product quantization at, say, 64 bytes per vector gives 32 GB for the whole corpus - fits comfortably in RAM on one large machine, and easily when sharded. OPQ (learned rotation before quantization) recovers some of the accuracy loss. This is the step that makes the problem tractable at all. (3) INDEX WITH IVF-PQ (or ScaNN). Coarse quantization into ~sqrt(N) ~ 22,000 clusters, search nprobe of them, compute approximate distances from the PQ codes via lookup tables. This is the standard billion-scale recipe and is what FAISS's large-scale configurations do. (4) SHARD, by vector ID, across machines - each shard holds a slice of the corpus and answers the query independently, and a coordinator merges the top-k. Sharding by ID (rather than by cluster) keeps the load balanced and means every shard does equal work, at the cost of querying all shards for every request. With enough shards each one's work is small, which is how the latency budget is met. (5) RERANK. The PQ distances are approximate, so retrieve a generous shortlist (say 500-1000 across shards) and rescore with exact distances on the full-precision vectors for just those items - which requires storing full vectors on disk or in a separate store, keyed by ID. This recovers most of the precision lost to quantization for a small cost. (6) BUDGET THE LATENCY explicitly: query embedding (5-15 ms on GPU for the image encoder, and this is often the LARGEST term - a point people miss when they focus on the index), coarse search (~1-5 ms), shortlist rerank (~5 ms), network and merge (~5 ms). Note that the encoder may dominate, in which case optimizing the index further is pointless and you should quantize or distill the encoder instead. Profile before optimizing. THE OPERATIONAL CONCERNS at this scale, which are where the real difficulty lies. Building the index is a large distributed batch job (embedding 500M images is itself days of GPU time), so plan for incremental updates rather than full rebuilds. Handle additions with a small hot index searched alongside the main one, merged periodically. Handle deletions with a tombstone list applied at merge time. Version embeddings so a model change can be rolled out shard by shard. Monitor ANN recall against a sampled exact ground truth continuously, because IVF centroids drift as the corpus evolves. And measure p99 latency, not p50, since ANN query cost is variable and the tail is what users experience. THE ALTERNATIVE WORTH CONSIDERING, and I would raise it: use a managed vector database (or a hosted service) rather than operating this yourself. The engineering above is genuinely substantial - sharding, rebuilds, monitoring, incremental updates - and unless vector search is your core competency, the build-versus-buy calculation usually favours buy at this scale. The parts you cannot outsource are the encoder choice, the evaluation set, and the relevance definition, which is where the differentiated value is anyway."
        },
        {
          "q": "What are the failure modes of embedding-based retrieval that a demo will not reveal?",
          "a": "Demos use curated corpora and cooperative queries; production has neither. Seven failure modes that appear only at scale or over time. (1) NEAR-DUPLICATE FLOODING. Real corpora contain many crops, rescalings, watermarked copies, and re-compressions of the same image. Without deduplication the top-10 fills with variants of one item and the results look broken even though the retrieval is technically correct. This shows up immediately in production and never in a curated demo set. The fix is deduplication at index time (perceptual hashing plus embedding clustering) and diversity-aware reranking (MMR) at query time. (2) THE POPULARITY/HUBNESS PROBLEM. In high-dimensional spaces some points become HUBS - they appear in the k-nearest-neighbour lists of a disproportionate number of queries, for geometric reasons rather than semantic ones. This is a well-documented property of high-dimensional nearest-neighbour search, and the practical symptom is a handful of images that turn up for everything. Mitigations include hubness-corrected similarity measures, normalizing by a point's average similarity to the corpus, or simply detecting and capping hubs. (3) DISTRIBUTION DRIFT BETWEEN QUERY AND CORPUS. The corpus is professional product photography; the queries are phone snapshots with clutter, motion blur, and odd lighting. Both embed into the same space, but the query distribution is systematically displaced, so nearest neighbours are dominated by the few corpus images that happen to look similarly casual. The fix is augmentation matching real query conditions during fine-tuning, or a query-side preprocessing stage (detect and crop, quality normalization). (4) THE COLD-START AND COVERAGE PROBLEM. New items are invisible until indexed, and if indexing runs nightly the newest and often most commercially important items cannot be found. Requires an incremental hot index or a separate freshness path. (5) FILTERED SEARCH DEGRADATION. 'Nearest neighbours WHERE in_stock AND size=10' is much harder than unfiltered search: post-filtering can return an empty or tiny result set when the filter is selective, and in-graph filtering breaks the connectivity assumptions HNSW relies on, quietly collapsing recall. This is one of the most common production surprises, and it must be designed for (partitioned indexes, filtered-search-aware libraries, or over-retrieval with a large multiplier). (6) SILENT INDEX/MODEL SKEW. If part of the corpus was embedded with an older model version, those vectors live in a different space - they are either never retrieved or spuriously close, with no error anywhere. Version embeddings explicitly and assert the version at query time. (7) ADVERSARIAL AND ABUSE CONCERNS if retrieval drives moderation or copyright matching: embeddings can be attacked with imperceptible perturbations, and near-duplicate detection can be evaded with crops and re-encodings that preserve human perception but move the embedding. That is a genuine arms race requiring robust hashing and defense in depth rather than a single embedding model. WHAT I WOULD BUILD INTO THE SYSTEM FROM THE START to catch these: a labelled query set that reflects real query conditions (not curated corpus images), continuous monitoring of ANN recall against exact search on a sample, monitoring of result diversity and of how often individual items are returned (which surfaces hubs and duplicates immediately), embedding version assertions, and a canary set of queries whose expected results are known so regressions are caught on every index rebuild. Most of these cost little and each one corresponds to a failure I would otherwise learn about from a user."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The two halves of retrieval",
        "back": "(1) What does SIMILAR mean - instance vs category vs style vs semantic - which the ENCODER choice defines. (2) Finding neighbours fast, which the INDEX defines. Different owners, both decide whether the system works."
      },
      {
        "type": "formula",
        "front": "Why normalize embeddings",
        "back": "cos(u,v) = u_hat . v_hat, and ||u_hat - v_hat||^2 = 2 - 2 u_hat.v_hat. So normalized L2 and cosine rank identically - one index serves both - and similarity depends on DIRECTION, not norm (which encodes nuisance factors)."
      },
      {
        "type": "definition",
        "front": "Encoder = similarity definition",
        "back": "CLIP: semantic/textual similarity. DINOv2: visual and part-level. ImageNet-supervised: whatever separates 1000 classes (texture-biased). Metric-learned: exactly what your labels say. Pick by the product question."
      },
      {
        "type": "formula",
        "front": "Triplet loss + mining",
        "back": "max(0, d(a,p) - d(a,n) + margin) - ZERO gradient once satisfied, so random triplets stall training. Hardest negatives are often mislabelled and destabilize. SEMI-HARD is the compromise."
      },
      {
        "type": "pitfall",
        "front": "ANN recall is a knob, not a property",
        "back": "10M vectors, HNSW: efSearch 16 -> 0.85 recall @0.4ms; 64 -> 0.97 @1.3ms; exact -> 1.0 @310ms. Always measure ANN recall against EXACT search and state the operating point."
      },
      {
        "type": "definition",
        "front": "Index families",
        "back": "IVF: k-means partitions, probe nprobe of them (edge problem at boundaries). HNSW: layered proximity graph, best recall/latency, memory-heavy, bad deletions. PQ: subvector codebooks, ~32x memory cut, rerank to recover."
      },
      {
        "type": "intuition",
        "front": "Two-stage funnel",
        "back": "Cheap ANN retrieves ~100 candidates (optimize RECALL@100), then an expensive reranker rescores just those (optimize NDCG@10). Same architecture as search and recommendation."
      },
      {
        "type": "pitfall",
        "front": "Near-duplicate flooding",
        "back": "Real corpora are full of crops/rescalings/recompressions, so top-k fills with variants of one item and looks broken. Deduplicate at index time; add diversity-aware reranking (MMR). Never appears in a curated demo."
      },
      {
        "type": "pitfall",
        "front": "Filtered search breaks ANN",
        "back": "'Nearest neighbours WHERE in_stock' - post-filtering can return almost nothing when selective; in-graph filtering breaks HNSW's connectivity assumptions and silently collapses recall. Design for it early."
      },
      {
        "type": "pitfall",
        "front": "Changing the model = re-embedding everything",
        "back": "Old and new vectors are not comparable, so a model change is a full corpus re-embed and reindex. Version embeddings explicitly - partially-updated indexes fail silently, with stale vectors never retrieved or spuriously close."
      }
    ],
    "refs": [
      {
        "title": "Johnson, Douze & Jegou (2017), Billion-scale similarity search with GPUs (FAISS)",
        "url": "https://arxiv.org/abs/1702.08734"
      },
      {
        "title": "Malkov & Yashunin (2016), Efficient and robust approximate nearest neighbor search using HNSW graphs",
        "url": "https://arxiv.org/abs/1603.09320"
      },
      {
        "title": "Musgrave, Belongie & Lim (2020), A Metric Learning Reality Check",
        "url": "https://arxiv.org/abs/2003.08505"
      },
      {
        "title": "Deng et al. (2019), ArcFace: Additive Angular Margin Loss for Deep Face Recognition",
        "url": "https://arxiv.org/abs/1801.07698"
      }
    ],
    "demos": [
      "vector-search",
      "embeddings",
      "contrastive-learning"
    ],
    "demoTitles": {
      "vector-search": "Vector Search",
      "embeddings": "Embedding Atlas",
      "contrastive-learning": "Contrastive Learning"
    }
  }
};
