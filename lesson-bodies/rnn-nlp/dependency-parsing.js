// GENERATED from content/lessons/rnn-nlp/dependency-parsing.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rnn-nlp/dependency-parsing/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "dependency-parsing": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Sentences aren't flat sequences of words - they have structure, a hierarchy of which words modify or depend on which others. Dependency parsing recovers that structure as a tree: every word (except the root) points to its 'head' - the word it grammatically depends on - labeled with the relationship (subject, object, modifier, etc.). 'The cat chased the mouse' becomes a tree where 'chased' is the root, 'cat' is its subject, 'mouse' is its object, and each 'the' depends on the noun it determines. This explicit structure is what lets you answer 'who did what to whom' - the grammatical backbone of meaning.",
        "Why care, in the transformer era? Dependency structure is exactly the kind of relational information that matters for understanding, and it's a clean example of STRUCTURED PREDICTION - predicting an interdependent output (a valid tree) rather than independent labels. There are two classic algorithmic paradigms, and they illustrate a general tension in structured prediction: transition-based parsing builds the tree incrementally with a sequence of local actions (fast, greedy, linear-time), while graph-based parsing scores all possible dependency edges and finds the highest-scoring valid tree globally (slower but globally optimal). This local-greedy-vs-global-optimal contrast recurs throughout ML.",
        "Dependency parsing also teaches the shift from hand-engineered pipelines to learned representations. Classical parsers used carefully designed features; neural parsers replaced them with learned embeddings and (later) contextual representations, and modern systems often get dependency structure implicitly - a transformer's attention heads have been shown to partially encode syntactic dependencies without ever being trained to parse. Understanding explicit parsing clarifies what that implicit structure IS, and dependency parsing remains useful for interpretable NLP, relation extraction, and low-resource settings where explicit structure helps."
      ],
      "math": [
        {
          "h": "The dependency tree and its constraints",
          "paras": [
            "A dependency parse is a directed tree over the words: every word has exactly one head (parent), there's a single root, no cycles, and (for projective parses) no crossing edges. Each edge carries a label (the grammatical relation). The parsing problem is to find the valid tree that best explains the sentence."
          ],
          "tex": "\\text{tree } T: \\; \\text{each word } w_i \\to \\text{head}(w_i), \\quad \\text{one root, no cycles, } |edges| = n-1, \\quad \\hat{T} = \\arg\\max_T \\text{score}(T)",
          "texNote": "A valid dependency tree has n-1 edges (each non-root word has one head), one root, and no cycles. Projective trees additionally forbid crossing edges - most sentences are projective."
        },
        {
          "h": "Transition-based parsing: a sequence of local actions",
          "paras": [
            "Transition-based (arc-standard) parsing maintains a stack and a buffer, and builds the tree with a sequence of actions - SHIFT (move a word from buffer to stack), LEFT-ARC / RIGHT-ARC (create a dependency between the top stack items). A classifier predicts each action from the current configuration; the actions incrementally construct the tree."
          ],
          "tex": "\\text{config} = (\\text{stack}, \\text{buffer}, \\text{arcs}), \\quad a_t = \\arg\\max_a \\text{score}(a \\mid \\text{config}_t), \\quad a \\in \\{\\text{SHIFT}, \\text{LEFT-ARC}, \\text{RIGHT-ARC}\\}",
          "texNote": "Each action is a local classification given the current parser state; 2n-1 actions build a full tree in linear time. Greedy (fast) but a wrong early action can't be undone."
        }
      ],
      "code": [
        {
          "h": "Arc-standard transition parsing (the action loop)",
          "paras": [
            "The core of a transition-based parser: a stack, a buffer, and a loop that applies actions until the sentence is fully parsed. A classifier (features or neural) chooses each action."
          ],
          "code": "def parse(words, predict_action):\n    stack = ['ROOT']\n    buffer = list(words)\n    arcs = []                                        # (head, dependent) pairs\n    while buffer or len(stack) > 1:\n        action = predict_action(stack, buffer, arcs) # a classifier picks the action\n        if action == 'SHIFT' and buffer:\n            stack.append(buffer.pop(0))\n        elif action == 'LEFT-ARC' and len(stack) >= 2:\n            arcs.append((stack[-1], stack[-2]))       # top is head of second\n            stack.pop(-2)\n        elif action == 'RIGHT-ARC' and len(stack) >= 2:\n            arcs.append((stack[-2], stack[-1]))       # second is head of top\n            stack.pop()\n        else:\n            if buffer: stack.append(buffer.pop(0))\n    return arcs\n\n# each action is a local classification; 2n-1 actions -> a full tree in O(n) time\nprint('transition parsing: greedy local actions build the tree left to right, linear time')",
          "caption": "A stack + buffer + a sequence of SHIFT/LEFT-ARC/RIGHT-ARC actions builds the tree incrementally in linear time - fast and greedy, but early mistakes propagate."
        },
        {
          "h": "Graph-based: score all edges, find the best tree",
          "paras": [
            "Graph-based parsing scores every possible head-dependent edge, then finds the maximum-scoring valid tree (a maximum spanning tree) - globally optimal, unlike greedy transition parsing."
          ],
          "code": "import numpy as np\n\ndef score_edges(words, model):\n    n = len(words)\n    # model gives a score for each possible (head, dependent) edge\n    S = np.array([[model.edge_score(h, d) for d in range(n)] for h in range(n)])\n    return S\n\n# then find the maximum spanning tree over the scored edges (Chu-Liu/Edmonds algorithm),\n# subject to the tree constraints (one head each, one root, no cycles).\n# GLOBALLY optimal given the edge scores - no greedy early-commitment problem,\n# at O(n^2) or O(n^3) cost vs transition parsing's O(n)\nprint('graph-based: score all n^2 edges, extract the best valid tree globally')",
          "caption": "Graph-based parsing scores all possible edges and extracts the maximum-scoring valid tree (a maximum spanning tree) - globally optimal, at higher cost than greedy transition parsing."
        }
      ],
      "useCases": [
        "Relation and information extraction - the dependency path between two entities is a strong feature for detecting their relationship (who works for whom, what causes what), used in knowledge-base construction.",
        "Grammatical analysis and interpretable NLP - explicit syntactic structure supports grammar checking, linguistic analysis, and applications where you need to justify 'who did what to whom'.",
        "Low-resource and structured tasks - explicit syntactic structure can help when data is limited or when downstream tasks (semantic role labeling, some question answering) benefit from grammatical scaffolding.",
        "A canonical STRUCTURED PREDICTION problem - the transition-based vs graph-based contrast (local-greedy vs global-optimal) is a transferable lesson for any task predicting interdependent structured outputs."
      ],
      "pitfalls": [
        "Transition-based parsing is greedy: a wrong early action can't be undone and propagates errors down the rest of the parse - the classic error-propagation problem of greedy structured prediction (mitigated by beam search or dynamic oracles).",
        "The output must be a VALID tree (one head per word, one root, no cycles), so you can't just predict edges independently - the structural constraints are what make this structured prediction, not independent classification.",
        "Projectivity: standard transition parsers only produce projective trees (no crossing edges), but some languages/constructions are non-projective - handling them needs special transitions or graph-based methods.",
        "Evaluation nuance: attachment scores (UAS - unlabeled, LAS - labeled) measure the fraction of words with the correct head (and label), but a single high-level attachment error can be more damaging to meaning than several low-level ones, so the aggregate score can understate structural mistakes.",
        "In the transformer era, explicit parsing is often unnecessary - large models capture much syntactic structure implicitly - so building an explicit parser is worthwhile mainly for interpretability, relation extraction, low-resource settings, or when explicit structure is genuinely needed downstream."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/lstm-gru",
          "text": "Neural dependency parsers use (bi)LSTM representations of the words to score actions or edges - the sequence encoder from the previous lessons feeds the parser."
        },
        {
          "ref": "rnn-nlp/sequence-labeling",
          "text": "Both are structured prediction over sentences; sequence labeling predicts a label per word (with a CRF for label dependencies), parsing predicts a tree - related structured-output problems."
        },
        {
          "ref": "foundations/complexity",
          "text": "The transition (O(n), greedy) vs graph-based (O(n^2)-O(n^3), globally optimal) contrast is a concrete complexity-vs-optimality trade-off."
        },
        {
          "text": "Module 08's transformers capture syntactic dependencies implicitly in attention heads - explicit parsing clarifies what that emergent structure represents."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is dependency parsing?",
          "a": "Recovering a sentence's grammatical structure as a tree where each word points to its head (the word it depends on), labeled with the relation (subject, object, modifier...)."
        },
        {
          "q": "What are the constraints on a valid dependency tree?",
          "a": "Each word has exactly one head, there's a single root, no cycles, and n-1 edges; projective trees additionally have no crossing edges."
        },
        {
          "q": "What is transition-based parsing?",
          "a": "Build the tree incrementally with a sequence of local actions (SHIFT, LEFT-ARC, RIGHT-ARC) over a stack and buffer - a classifier picks each action. Fast, greedy, linear-time."
        },
        {
          "q": "What is graph-based parsing?",
          "a": "Score every possible head-dependent edge and extract the maximum-scoring valid tree (a maximum spanning tree) - globally optimal, at higher cost than greedy transition parsing."
        },
        {
          "q": "Transition vs graph-based - the core trade-off?",
          "a": "Transition is local/greedy/fast (O(n)) but early errors propagate; graph-based is global/optimal but slower (O(n^2)-O(n^3)). Local-greedy vs global-optimal."
        },
        {
          "q": "What is the error-propagation problem in transition parsing?",
          "a": "Greedy actions can't be undone, so a wrong early action corrupts the rest of the parse - mitigated with beam search or dynamic oracles."
        },
        {
          "q": "What is projectivity?",
          "a": "A tree is projective if it has no crossing edges (dependencies don't cross when words are in linear order). Standard transition parsers only produce projective trees."
        },
        {
          "q": "What are UAS and LAS?",
          "a": "Unlabeled Attachment Score (fraction of words with the correct head) and Labeled Attachment Score (correct head AND relation label) - the standard parsing metrics."
        },
        {
          "q": "Why is dependency parsing 'structured prediction'?",
          "a": "The output must be a valid interdependent structure (a tree), so you can't predict edges independently - the structural constraints couple the predictions."
        },
        {
          "q": "Is explicit parsing still needed with transformers?",
          "a": "Often not - large models capture syntax implicitly - but explicit parsing helps for interpretability, relation extraction, low-resource settings, or when downstream tasks need explicit structure."
        }
      ],
      "standard": [
        {
          "q": "Explain transition-based dependency parsing in detail, including its key trade-off.",
          "a": "Transition-based (arc-standard) parsing builds the dependency tree incrementally by applying a sequence of local actions to a parser configuration. The configuration has three parts: a STACK (words being processed, initialized with a ROOT symbol), a BUFFER (the remaining input words, in order), and a set of ARCS built so far. At each step, a classifier examines the current configuration (typically the top stack items, the front buffer items, and their existing dependents) and predicts one of a small set of ACTIONS: SHIFT (move the front buffer word onto the stack), LEFT-ARC (create a dependency where the top stack word is the head of the second-from-top word, then remove the dependent), or RIGHT-ARC (the second-from-top is the head of the top, remove the dependent) - with labeled variants for each relation type. Applying about 2n-1 actions (for n words) constructs a complete tree, and because each action is a single classification and there are a linear number of them, parsing runs in LINEAR TIME O(n) - very fast. The key trade-off is SPEED VS GREEDINESS/OPTIMALITY: transition parsing is fast and processes the sentence left-to-right (even suited to incremental/streaming parsing), but it's GREEDY - it commits to each action based on local information without lookahead, and a wrong action early cannot be undone, so errors PROPAGATE (a mistaken attachment corrupts all subsequent decisions that depend on the corrupted configuration). This local-commitment problem is the price of the linear-time greedy approach, and it's exactly the same greedy-structured-prediction issue as elsewhere. Mitigations include BEAM SEARCH (keep several candidate action sequences rather than committing greedily, recovering some global consideration at higher cost) and DYNAMIC ORACLES (a training technique that teaches the parser to recover gracefully from earlier mistakes rather than assuming a perfect history).",
          "deepDive": {
            "q": "How did neural networks change transition-based parsing, and what did Chen & Manning's 2014 parser demonstrate?",
            "a": "Chen & Manning's 2014 neural dependency parser was a landmark that demonstrated the shift from hand-engineered features to learned representations in a clean, high-impact way. Classical transition-based parsers chose actions using a classifier over MILLIONS of sparse, hand-designed features - specific combinations of words, part-of-speech tags, and existing arcs at particular stack/buffer positions (e.g., 'the word on top of the stack is X AND the front of the buffer is Y AND its leftmost child is Z'). These feature templates were painstakingly engineered, produced enormous sparse feature vectors, were slow to compute, and generalized poorly (each exact feature combination had to be seen in training). Chen & Manning replaced this with a small NEURAL network: they embedded the relevant words, POS tags, and arc labels from the configuration into dense vectors, concatenated them, and fed them through a hidden layer to predict the action. This was transformative for several reasons: (1) the dense embeddings GENERALIZED - similar words/tags/configurations got similar representations, so the parser could handle configurations it hadn't seen exactly (fixing the sparse-feature generalization problem); (2) it was FASTER at inference because it computed a small dense network instead of extracting millions of sparse features; (3) it achieved higher accuracy with a far simpler, cleaner model. It was one of the early demonstrations that learned dense representations beat hand-engineered sparse features on a structured NLP task, presaging the broader deep-learning takeover of NLP - the same 'learned representations generalize where hand-engineered features can't' lesson as word embeddings, applied to structured prediction. Later work added (bi)LSTM and then transformer encoders to provide even richer contextual representations of each word for scoring actions/edges, but Chen & Manning's parser was the pivotal proof-of-concept that neural representations belonged in parsing."
          }
        },
        {
          "q": "Compare transition-based and graph-based parsing across the algorithmic and accuracy dimensions.",
          "a": "They're the two dominant paradigms and differ fundamentally in how they search for the tree. TRANSITION-BASED parsing builds the tree incrementally through a sequence of local actions (a classifier picks each action given the current configuration), making decisions greedily left-to-right. Its properties: LINEAR TIME O(n) (a fixed number of local classifications), fast, memory-efficient, naturally incremental, and it can use RICH FEATURES of the partially-built structure (the actions it's already taken, the partial tree) since it has access to the full configuration history. Its weakness is GREEDINESS - local decisions without global guarantees, so early errors propagate and it can be locally-optimal-but-globally-wrong (mitigated by beam search). GRAPH-BASED parsing instead scores every possible dependency edge (head-dependent pair) and then finds the highest-scoring VALID tree globally, typically via a maximum-spanning-tree algorithm (Chu-Liu/Edmonds for non-projective, Eisner's algorithm for projective). Its properties: GLOBALLY OPTIMAL given the edge scores (no greedy early-commitment problem - it considers all trees), which tends to give better accuracy on long-range dependencies and long sentences where greedy errors accumulate; but it's SLOWER (O(n^2) to O(n^3)) because it scores all edges and runs a tree-extraction algorithm, and its edge scores are more LOCAL - to keep the optimization tractable, edges are usually scored somewhat independently (first-order: each edge scored alone; higher-order models score edge combinations but at greater cost), so it can't as easily use rich features of the whole partial structure the way transition parsing can. So the trade-off is: transition-based = fast, incremental, rich structural features, but greedy/local; graph-based = globally optimal tree search, better on long-range structure, but slower and with more-local edge scoring. Historically both achieved similar top accuracy with different error profiles (transition parsers err more on long-range/late decisions, graph parsers on decisions needing rich structural context), and the best systems sometimes combined them; with strong neural (transformer) encoders, both paradigms reach high accuracy, and the choice depends on speed needs (transition for fast/incremental) vs the desire for global optimality (graph-based).",
          "deepDive": {
            "q": "This local-greedy vs global-optimal trade-off appears all over ML - name other instances and the common principle.",
            "a": "The transition-based (greedy, local, fast) vs graph-based (global, optimal, slower) contrast is a specific instance of a pervasive ML/CS trade-off between greedy local search and global optimization, and recognizing the pattern is valuable. Other instances: (1) DECISION TREES - greedy top-down splitting (choose the locally-best split at each node, never reconsidered - fast but not globally optimal, the same 'a wrong early split can't be undone' as transition parsing) versus the NP-hard globally-optimal tree; the greedy heuristic is universal precisely because global is intractable, exactly as most parsing is greedy/beam for speed. (2) DECODING in sequence generation - greedy decoding (pick the best token each step, fast, can be locally-optimal-globally-suboptimal) versus beam search (keep multiple hypotheses, closer to finding the globally-best sequence) - the identical local-vs-global search trade-off, and beam search is the SAME mitigation used in both parsing and generation. (3) k-MEANS - Lloyd's algorithm greedily alternates local optimal steps to a LOCAL optimum, versus the NP-hard global optimum, mitigated by restarts (like beam search's multiple hypotheses). (4) Reinforcement learning - greedy action selection vs planning/search (MCTS) that looks ahead globally. The COMMON PRINCIPLE: finding the globally-optimal structured output is often expensive or intractable, so we use greedy local search for speed and accept sub-optimality, OR pay more compute for global optimization (exact algorithms, spanning trees, dynamic programming) when the structure permits it and the accuracy gain justifies the cost - and BEAM SEARCH is the recurring middle-ground that trades a controllable amount of compute for a controllable improvement over pure greedy. The transferable insight is to recognize when you're in a structured-prediction/search setting and to reason explicitly about where you sit on the greedy-fast-local to optimal-slow-global spectrum, choosing based on whether the problem's structure makes global optimization affordable and whether the accuracy gain is worth it - the same reasoning whether you're parsing, decoding, clustering, or planning."
          }
        },
        {
          "q": "Why is dependency parsing a 'structured prediction' problem, and how does that differ from ordinary classification?",
          "a": "Dependency parsing is structured prediction because the output is not a single label or a set of INDEPENDENT labels, but an interdependent STRUCTURE - a valid tree - where the parts constrain each other and must be predicted jointly. In ordinary (multi-class) classification, you predict ONE label from a fixed set for each independent input, and each prediction is separate; even in multi-label classification, the labels are typically predicted independently. In parsing, the output is a whole tree over the sentence subject to hard STRUCTURAL CONSTRAINTS: every word must have exactly one head, there must be exactly one root, there can be no cycles, and (for projective trees) no crossing edges. These constraints COUPLE the predictions - you cannot choose each word's head independently, because independently-chosen heads could easily form an invalid structure (a cycle, multiple roots, or a word with two heads). So the prediction problem is to find the best VALID structure as a whole, not to make independent per-word decisions. This difference has concrete consequences: (1) the search/inference is over the space of valid trees (exponentially many), requiring specialized algorithms (transition sequences, maximum spanning trees, dynamic programming) rather than a simple argmax per item; (2) the training must account for the interdependence (structured loss functions, or teaching the model to produce valid structures); (3) evaluation is over the structure (attachment scores) rather than independent accuracy. Structured prediction is a whole subfield (encompassing parsing, sequence labeling with CRFs, machine translation, image segmentation) unified by this property: the output has internal structure and constraints that make the pieces interdependent, so you predict the joint structure rather than independent parts. Dependency parsing is a canonical, clean example - a tree with clear constraints - which is why it's a standard vehicle for teaching structured prediction and the transition-vs-graph algorithmic approaches to it.",
          "deepDive": {
            "q": "How does sequence labeling with a CRF handle output interdependence, and how does it compare to parsing's tree constraints?",
            "a": "Sequence labeling (like named-entity recognition or POS tagging) is another structured-prediction problem, and comparing how a CRF handles its interdependence to how parsing handles tree constraints illuminates the structured-prediction landscape. In sequence labeling you assign a label to each word, but the labels are INTERDEPENDENT - e.g., in BIO tagging for NER, an 'Inside-Person' tag can only follow a 'Begin-Person' or another 'Inside-Person' tag (an I-PER after an O or a B-LOC is invalid), so the labels aren't independent. A naive per-word classifier ignores this and can produce invalid label sequences (an I-PER with no preceding B-PER). A Conditional Random Field (CRF) handles the interdependence by modeling the labels JOINTLY: it scores an entire label sequence using both per-word 'emission' scores (how well each label fits its word) AND 'transition' scores (how compatible adjacent labels are), and finds the highest-scoring VALID sequence globally via the Viterbi algorithm (dynamic programming). This lets it enforce label-transition constraints and capture dependencies between adjacent labels, exactly as parsing must enforce tree constraints. The comparison: both are structured prediction with output interdependence, but the STRUCTURE differs - sequence labeling's structure is a LINEAR CHAIN (each label depends mainly on its neighbors, so the interdependence is local/sequential and Viterbi solves it exactly in linear time), while parsing's structure is a TREE (the constraints are global - one root, no cycles, one head each - requiring tree-specific algorithms like spanning trees or transition sequences). So the CRF's chain structure is a SIMPLER form of structured prediction than parsing's tree structure: the chain's local dependencies admit exact, efficient dynamic-programming inference (Viterbi), whereas the tree's global constraints need more elaborate algorithms. Both illustrate the core structured-prediction move - model the output jointly and search over VALID structures - but the tractability and algorithms depend on the structure's shape (chain vs tree), which is exactly why the next lesson (sequence labeling with BiLSTM-CRF) is a natural companion to parsing: they're two points on the structured-prediction spectrum, sharing the principle of coupling predictions but differing in the structure and thus the inference algorithm."
          }
        },
        {
          "q": "In the transformer era, do transformers make explicit dependency parsing obsolete? Discuss both sides.",
          "a": "This is a genuine debate with merit on both sides. The case that transformers make explicit parsing OBSOLETE: (1) Large pretrained transformers capture a great deal of syntactic structure IMPLICITLY - probing studies have shown that BERT's and similar models' internal representations and attention patterns encode dependency relations, part-of-speech, and hierarchical structure without ever being trained to parse, and you can even RECOVER dependency trees from a transformer's representations with a simple probe. (2) On downstream tasks that used to benefit from explicit parse features (sentiment, question answering, relation extraction), end-to-end transformers typically match or beat pipelines that use explicit parses, because the model learns whatever structural information the task needs directly, without an error-prone explicit parsing step in the pipeline. (3) Explicit parsing adds pipeline complexity and a source of error propagation (parse errors hurt downstream) that end-to-end learning avoids. So for many applications, you no longer need to run a parser - the transformer implicitly does the relevant structural reasoning. The case that explicit parsing STILL MATTERS: (1) INTERPRETABILITY - an explicit dependency tree is a human-readable, auditable representation of grammatical structure, valuable when you need to explain or verify 'who did what to whom' (legal, linguistic, or high-stakes analysis), whereas the transformer's implicit structure is entangled and not directly inspectable. (2) RELATION/INFORMATION EXTRACTION - the explicit dependency path between entities remains a strong, interpretable feature and is still used in knowledge-base construction and some IE systems. (3) LOW-RESOURCE settings - explicit syntactic structure (or cross-lingual transfer of it) can help when labeled data is scarce and the transformer can't learn everything implicitly. (4) LINGUISTIC RESEARCH and applications where the structure IS the goal (grammar analysis, treebanking, language documentation). (5) The implicit structure transformers learn is PARTIAL and not guaranteed correct - it's a byproduct, not a reliable parse. So the honest synthesis: transformers have made explicit parsing UNNECESSARY for most mainstream downstream NLP tasks (where end-to-end learning wins), so it's no longer a routine pipeline step, but it remains valuable for interpretability, explicit relation extraction, low-resource scenarios, and applications where the grammatical structure itself is the deliverable - a shift from 'parsing as a necessary preprocessing step' to 'parsing as a specialized tool for when explicit structure is genuinely needed'.",
          "deepDive": {
            "q": "What do 'probing' studies reveal about how transformers encode syntax, and what's the limitation of concluding they 'understand' grammar?",
            "a": "Probing studies investigate whether a model's internal representations ENCODE a property (like syntactic dependencies) by training a simple classifier (a 'probe') to predict that property from the frozen representations - if a simple probe succeeds, the information is decodably present. For transformers, probing has shown that syntactic structure IS substantially encoded: probes can recover part-of-speech, dependency relations, and even reconstruct dependency-tree-like structure from BERT's layer representations (the Hewitt-Manning 'structural probe' famously found that a linear transformation of BERT's embeddings reflects dependency-tree distances), and specific attention heads correlate with specific dependency relations. This is real evidence that pretraining on next-token/masked-token prediction induces syntactic structure as a byproduct. BUT there are important LIMITATIONS to concluding the model 'understands' grammar: (1) DECODABILITY != USE - a probe showing the information is PRESENT in the representations doesn't prove the model USES it for its predictions, or uses it the way a grammar would; the information might be incidental. This is exactly the probing-selectivity caution (the control-task / Hewitt-Liang point from the interpretability lessons): a probe can decode structure that the model isn't actually relying on, and even decode RANDOM labels to some degree, so 'a probe can recover it' overstates the case unless you control for probe capacity and show selectivity. (2) CORRELATIONAL not CAUSAL - probing is correlational; it shows the representation correlates with syntax, not that manipulating the syntax representation changes behavior in the expected way (causal interventions like activation patching are needed for that, per the mech-interp lessons). (3) PARTIAL and APPROXIMATE - the recovered structure is imperfect and entangled, not a clean, reliable parse. (4) 'Encodes syntactic information' is weaker than 'understands grammar' - the model has learned statistical regularities that correlate with grammatical structure because grammatical text is what it was trained to predict, which is genuine but shouldn't be overclaimed as human-like grammatical understanding. So probing gives real, valuable evidence that transformers induce syntactic structure implicitly (supporting the 'explicit parsing often unnecessary' view), but the honest interpretation is measured: the information is present and partly used, the model has learned much about syntax as a byproduct of language modeling, but 'the representation encodes dependency structure' is a decodability claim that needs the selectivity and causal caveats before it becomes 'the model understands and uses grammar', exactly the plausible-vs-faithful and correlational-vs-causal discipline the interpretability lessons make rigorous."
          }
        },
        {
          "q": "You need to extract relationships between entities in text (e.g., 'X acquired Y', 'A works for B'). How could dependency parsing help, and what are the alternatives?",
          "a": "Dependency parsing is a classic, interpretable tool for relation extraction because the grammatical structure directly encodes 'who did what to whom'. How it helps: the DEPENDENCY PATH between two entities in the parse tree is a strong, compact signal of their relationship. For 'Google acquired YouTube', the parse has 'acquired' as the root with 'Google' as its subject and 'YouTube' as its object, so the dependency path Google <-subject- acquired -object-> YouTube directly captures the acquisition relation and its direction (who acquired whom). Concretely, you'd: (1) identify the entity mentions (via named-entity recognition), (2) parse the sentence, (3) extract the shortest dependency path between each entity pair, and (4) use that path (the sequence of relations and the connecting words, especially the verb) as a feature to classify the relationship - a short path through a relation-indicating verb is highly informative, and the path's direction disambiguates which entity plays which role. This is interpretable (you can point to the grammatical path justifying the extraction), works with limited data (the syntactic feature is strong), and handles the direction/role of the relation naturally. The ALTERNATIVES: (1) End-to-end NEURAL relation extraction - a transformer that takes the sentence with marked entities and directly classifies the relation, learning whatever structural cues it needs implicitly; this typically achieves higher accuracy with enough training data and avoids parse-error propagation, and is the mainstream modern approach. (2) LLM-based extraction - prompt a large language model to extract the relations directly (or with structured output/constrained decoding for a clean schema), which is flexible, needs little task-specific data, and handles complex phrasing, at the cost of reliability/verifiability. (3) Pattern/rule-based extraction - hand-written patterns over words or parses for high-precision extraction in narrow domains. The trade-offs: dependency-parse-based extraction is interpretable, data-efficient, and good in low-resource or high-precision settings, but depends on parse accuracy and struggles with relations expressed non-syntactically or across sentences; end-to-end neural/LLM approaches are more accurate and flexible with enough data/scale but less interpretable and can be less reliable. In practice, modern systems lean toward neural/LLM extraction for accuracy, while dependency paths remain valuable for interpretability, low-resource domains, distant supervision, and as features that can complement neural models - a good example of when explicit structure (parsing) is still a useful tool even though end-to-end learning often wins on raw accuracy.",
          "deepDive": {
            "q": "What is the shortest-dependency-path hypothesis, and why is it a strong feature for relation extraction?",
            "a": "The shortest-dependency-path (SDP) hypothesis is the empirical observation - and modeling principle - that the SHORTEST PATH between two entities in the dependency parse tree captures almost all the information needed to determine their relationship, while excluding irrelevant words. The intuition: a sentence may be long and contain many words, but the grammatically-relevant connection between two entities is a compact path through the tree (usually passing through the verb or predicate that relates them), and the words OFF this path (modifiers, other clauses, adjuncts) are mostly irrelevant to THAT relation. So for 'Google, the search giant, recently acquired YouTube for $1.65 billion', the shortest dependency path Google -> acquired -> YouTube strips away 'the search giant', 'recently', and 'for $1.65 billion' - all irrelevant to WHETHER an acquisition relation holds - leaving just the acquisition-indicating verb and the two entities in their subject/object roles. This makes the SDP a powerful feature because: (1) it's a strong DENOISER - it focuses the model on exactly the grammatically-connected words that determine the relation, discarding distracting content, which improves both accuracy and data efficiency (the model learns from a clean signal); (2) it captures the DIRECTION and ROLES (subject vs object) that disambiguate who-did-what-to-whom; (3) it's relatively INVARIANT to surface variation - many different phrasings of the same relation share a similar shortest dependency path, so the feature generalizes across paraphrases better than surface word patterns; (4) it's SHORT and structured, so it's easy to model (early systems used the path as a feature, later ones ran an LSTM/CNN along the SDP). The SDP hypothesis was a productive idea in relation extraction precisely because it operationalizes the insight that grammatical structure isolates the relevant relational information - a clean example of using explicit syntactic structure (from parsing) to extract a focused, generalizable, interpretable feature, which is exactly the enduring value of dependency parsing even in the neural era: it provides a principled way to find the grammatically-relevant substructure connecting entities, whether used as an explicit feature or as an interpretable check on a neural extractor."
          }
        },
        {
          "q": "How is a dependency parser evaluated, and what do the standard metrics miss?",
          "a": "The standard metrics are attachment scores. UNLABELED ATTACHMENT SCORE (UAS) is the fraction of words assigned the correct HEAD (correct parent in the tree), ignoring the relation label. LABELED ATTACHMENT SCORE (LAS) is the fraction of words with BOTH the correct head AND the correct relation label - the stricter, more complete metric, and the one usually reported as the headline number. Both are computed per-word and averaged, and they're intuitive: 'what fraction of words did the parser attach correctly?'. What the metrics MISS: (1) NOT ALL ERRORS ARE EQUAL - attachment scores treat every word's attachment as equally important, but a single HIGH-LEVEL structural error (misattaching the main verb, or attaching a clause to the wrong head) can distort the meaning of the whole sentence far more than several low-level errors (misattaching a determiner or a low modifier), yet they count the same. So a parser with a slightly higher LAS could actually make more MEANING-DAMAGING errors than one with lower LAS, because the aggregate score is blind to which attachments matter for interpretation. (2) PER-WORD, not PER-SENTENCE - a metric averaged over words can look high even if few sentences are FULLY correct (one error per sentence still gives high per-word accuracy but zero fully-correct sentences), and for downstream uses that need a correct whole structure, sentence-level exact-match matters. (3) DISTRIBUTION over error types - the score doesn't tell you WHAT the parser gets wrong (long-range attachments? coordination? specific relations?), which is what you need to improve it or judge fitness for a downstream task; error analysis by relation type, dependency length, and sentence length reveals this. (4) DOWNSTREAM IMPACT - ultimately what matters is whether parse errors hurt the downstream task, and attachment score is an intrinsic metric that may not track downstream utility (the same intrinsic-vs-extrinsic gap as perplexity). So while UAS/LAS are the standard, useful, comparable intrinsic metrics, they're aggregate per-word scores that obscure the SEVERITY and TYPE of errors and their downstream impact - which is why serious parser evaluation supplements them with error analysis (by relation, attachment distance, sentence length), sentence-level exact-match where relevant, and downstream task evaluation when the parser feeds a pipeline.",
          "deepDive": {
            "q": "This 'aggregate score hides which errors matter' issue recurs across ML - what's the general lesson?",
            "a": "The parser-evaluation issue - a per-item aggregate score (LAS) obscuring that some errors are far more consequential than others - is a specific instance of a pervasive ML evaluation lesson: aggregate metrics average away structure that matters, so you must look beneath the aggregate at WHICH errors occur and WHAT they cost. The same pattern appears everywhere: (1) OVERALL ACCURACY hides subgroup/slice failures - a model with high aggregate accuracy can fail badly on a specific subgroup or a backdoor trigger (the 24-09 red-teaming and 25-10 slice-analysis lessons), so you do slice-based error analysis, not just report the headline number. (2) A SINGLE LOSS/PERPLEXITY number hides per-example and per-region behavior - two models with the same average can have very different error distributions and calibration (the 24-01 calibration lesson: aggregate accuracy says nothing about whether confidences are honest, and a good average can hide concentrated failures). (3) A single classification metric hides the cost asymmetry - a false negative and false positive can have wildly different real costs (the fraud/threshold lessons), so aggregate accuracy without a cost structure is misleading. (4) Distances/errors in aggregate hide that they're concentrated in the tail or a specific region (regression residual analysis). The GENERAL LESSON is that any aggregate metric is a lossy summary that weights all errors (or examples) by a fixed, usually-uniform scheme, which rarely matches the true importance/cost of different errors - so a responsible evaluation ALWAYS supplements the headline aggregate with (a) DISAGGREGATION - break the metric down by slice, error type, region, difficulty, or subgroup to find where and how the model fails; (b) COST-AWARENESS - weight errors by their actual consequences rather than counting them equally; and (c) the RIGHT GRANULARITY - per-item vs per-structure vs downstream, matching what the application needs. This is the recurring 'don't trust a single number - look at the distribution of errors and what they cost' discipline that connects parser attachment scores to model calibration, slice analysis, cost-sensitive thresholds, and honest evaluation throughout the curriculum - the aggregate is a starting point, never the whole story."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Dependency parsing",
        "back": "Recover a sentence's structure as a tree: each word points to its head (the word it depends on), labeled with the relation (subject/object/modifier...). 'Who did what to whom'."
      },
      {
        "type": "definition",
        "front": "Valid dependency tree constraints",
        "back": "One head per word, single root, no cycles, n-1 edges; projective trees also forbid crossing edges. These constraints couple the predictions (structured prediction)."
      },
      {
        "type": "definition",
        "front": "Transition-based parsing",
        "back": "Build the tree with local actions (SHIFT/LEFT-ARC/RIGHT-ARC) over a stack+buffer, a classifier picking each. Linear-time, greedy - early errors propagate."
      },
      {
        "type": "definition",
        "front": "Graph-based parsing",
        "back": "Score all possible edges, extract the maximum-scoring valid tree (max spanning tree). Globally optimal, O(n^2)-O(n^3) - no greedy early-commitment problem."
      },
      {
        "type": "intuition",
        "front": "Transition vs graph = local vs global",
        "back": "Transition: fast/greedy/rich-structural-features, errors propagate. Graph: global-optimal, better long-range, but slower + more-local edge scoring. The recurring greedy-vs-optimal trade-off."
      },
      {
        "type": "definition",
        "front": "Structured prediction",
        "back": "Predicting an interdependent structure (a valid tree) with constraints coupling the parts - not independent per-item classification. Needs joint search over valid structures."
      },
      {
        "type": "definition",
        "front": "UAS / LAS",
        "back": "Unlabeled Attachment Score (fraction with correct head) and Labeled Attachment Score (correct head AND relation). Standard parsing metrics."
      },
      {
        "type": "intuition",
        "front": "Shortest dependency path (relation extraction)",
        "back": "The shortest tree path between two entities captures their relation (usually through the verb), denoising irrelevant words - a strong, interpretable relation-extraction feature."
      }
    ],
    "refs": [
      {
        "title": "Chen & Manning, A Fast and Accurate Neural Dependency Parser (2014)",
        "url": "https://aclanthology.org/D14-1082/"
      },
      {
        "title": "Jurafsky & Martin, Speech and Language Processing (Ch. 14, Dependency Parsing)",
        "url": "https://web.stanford.edu/~jurafsky/slp3/14.pdf"
      },
      {
        "title": "Hewitt & Manning, A Structural Probe for Finding Syntax in Word Representations (2019)",
        "url": "https://aclanthology.org/N19-1419/"
      },
      {
        "title": "Dozat & Manning, Deep Biaffine Attention for Neural Dependency Parsing (2017)",
        "url": "https://arxiv.org/abs/1611.01734"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
