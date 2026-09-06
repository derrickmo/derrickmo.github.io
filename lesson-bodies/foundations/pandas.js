// GENERATED from content/lessons/foundations/pandas.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/pandas/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "pandas": {
    "level": "intro",
    "body": {
      "intuition": [
        "Real data rarely arrives as a clean tensor - it arrives as a table with mixed types, missing values, and columns that need to be joined, filtered, and reshaped before a model can see them. Pandas is NumPy's answer for that layer: a DataFrame is a collection of labeled, possibly-different-dtype columns, each backed by a contiguous NumPy array, with an index that lets you align, join, and filter by label instead of by raw position.",
        "The mental model that keeps pandas from feeling arbitrary is: columns are Series (labeled 1-D arrays), operations broadcast and vectorize exactly like NumPy underneath, and groupby is 'split the rows into groups, apply a function to each group's columns, combine the results back into one table' - the same split-apply-combine pattern shows up constantly in data science, from computing per-class statistics to building the leaderboards in Module 20's experiment tracking.",
        "The California Housing dataset used in this lesson is a good stand-in for the tabular problems you'll hit constantly outside of pure deep learning: predicting a continuous target (median house value) from a mix of geographic, demographic, and structural features - exactly the shape of data that gradient boosting and simple neural nets (Module 02) both compete on."
      ],
      "math": [
        {
          "h": "Split-apply-combine",
          "paras": [
            "groupby(key).agg(f) partitions rows into groups sharing a key value, applies an aggregation f independently to each group, then concatenates the per-group results back into one table indexed by the group keys. It is the tabular analogue of a reduction: instead of reducing an entire array to one number, you reduce each group to one row."
          ],
          "tex": "\\text{groupby}(k).\\text{agg}(f)\\big(X\\big) = \\Big\\{\\, f\\big(X_{[X_k = v]}\\big) \\;\\Big|\\; v \\in \\text{unique}(X_k) \\,\\Big\\}",
          "texNote": "For each distinct key value v, select the rows where the key column equals v, apply f to that subset, and stack the results - one output row per distinct key."
        },
        {
          "h": "Join cardinality",
          "paras": [
            "Merging two tables on a key produces rows equal to, for each matching key value, the *product* of how many times that value appears on each side - a one-to-many join multiplies rows on the 'many' side, and a many-to-many join can blow up row count unexpectedly if a key isn't actually unique where you assumed it was."
          ],
          "tex": "|\\text{merge}(A, B, \\text{on}=k)| = \\sum_{v} \\text{count}_A(k{=}v) \\cdot \\text{count}_B(k{=}v)",
          "texNote": "If key v appears 3 times in A and 2 times in B, the merge produces 6 rows for that key - always check for unexpected row-count growth after a join."
        }
      ],
      "code": [
        {
          "h": "Loading, inspecting, and filtering",
          "paras": [
            "The first five minutes with any new dataset: shape, dtypes, missing values, then a boolean-mask filter - the tabular equivalent of NumPy boolean indexing from the previous lesson."
          ],
          "code": "import pandas as pd\nfrom sklearn.datasets import fetch_california_housing\n\ndata = fetch_california_housing(as_frame=True)\ndf = data.frame\n\nprint(df.shape)                 # (20640, 9)\nprint(df.dtypes)                # all float64 here; real data mixes int/float/object/datetime\nprint(df.isna().sum())          # per-column missing-value counts\n\n# boolean-mask filter: expensive coastal-ish houses with few rooms per household\nmask = (df['MedHouseVal'] > 3.0) & (df['AveRooms'] < 5)\nsubset = df[mask]\nprint(subset.shape)",
          "caption": "df[boolean_series] is the same masking idea as NumPy - pandas just carries column labels and dtypes along for the ride."
        },
        {
          "h": "groupby and merge",
          "paras": [
            "Bucket a continuous feature, then aggregate the target per bucket - a one-line sanity check that a feature actually correlates with the label before building any model."
          ],
          "code": "import pandas as pd\n\n# split-apply-combine: median house value by income quartile\ndf['income_bin'] = pd.qcut(df['MedInc'], q=4, labels=['low', 'mid-low', 'mid-high', 'high'])\nsummary = df.groupby('income_bin', observed=True)['MedHouseVal'].agg(['mean', 'median', 'count'])\nprint(summary)\n\n# merge: attach a lookup table by key (illustrative - not part of California Housing)\nregion_lookup = pd.DataFrame({'income_bin': ['low', 'mid-low', 'mid-high', 'high'],\n                               'typical_buyer': ['first-time', 'starter', 'move-up', 'luxury']})\nenriched = df.merge(region_lookup, on='income_bin', how='left')",
          "caption": "groupby().agg() is split-apply-combine in one line; merge() is a SQL-style join with an explicit how= to control unmatched rows."
        }
      ],
      "useCases": [
        "Exploratory data analysis before any modeling: shape, dtypes, missingness, and per-group summaries are the first thing you run on a new dataset, in interviews and in practice alike.",
        "Feature engineering pipelines - binning, one-hot encoding categorical columns, merging auxiliary tables - happen in pandas before tensors ever enter a model.",
        "Every classical-ML tabular problem (Module 02's linear/logistic regression, Module 03's trees/boosting) is fed by a pandas DataFrame, not a raw tensor.",
        "Logging and experiment tracking (Module 20) commonly land results in a DataFrame for groupby-based leaderboards and pivot tables."
      ],
      "pitfalls": [
        "SettingWithCopyWarning: chained indexing like df[df.x > 0]['y'] = 1 may write to a temporary copy, not the original - use .loc[df.x > 0, 'y'] = 1 instead.",
        "merge() silently changes row count on unexpected duplicate keys - a 'one-to-one' join that's actually one-to-many multiplies rows without an error; check len() before and after.",
        "Mixed dtypes coerce to object (Python-level, slow, no vectorization) the moment one value in a numeric column is a string or NaN-of-the-wrong-kind - dtype='object' columns lose all of pandas' speed advantage.",
        "groupby drops NaN keys silently by default - rows whose group key is missing vanish from the result unless you handle them explicitly (dropna=False).",
        ".iloc (position-based) vs .loc (label-based) confusion: after filtering or sorting, the index labels no longer match row position, so iloc[0] and loc[0] can return different rows entirely."
      ],
      "connections": [
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "Every pandas column is backed by a NumPy array underneath - the vectorization and broadcasting rules from the first lesson still apply."
        },
        {
          "ref": "foundations/matplotlib",
          "text": "The next lesson plots exactly this kind of grouped/aggregated DataFrame output - .plot() calls into matplotlib directly."
        },
        {
          "ref": "foundations/pytorch-data-loading",
          "text": "A cleaned pandas DataFrame is the typical bridge into a custom torch Dataset - .values or .to_numpy() hands off to tensors."
        },
        {
          "text": "Module 02's classical regression/classification models and Module 03's tree ensembles both consume tabular features assembled exactly this way."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a pandas Series?",
          "a": "A labeled 1-D array - one column of a DataFrame, backed by a NumPy array with an index."
        },
        {
          "q": "How do you filter rows by a boolean condition safely for later assignment?",
          "a": "df.loc[condition, 'col'] = value - avoids the SettingWithCopyWarning from chained indexing."
        },
        {
          "q": "What does groupby().agg() implement conceptually?",
          "a": "Split-apply-combine: partition rows by key, apply a function to each group, concatenate results into one table."
        },
        {
          "q": "What happens to row count when you merge on a key that isn't unique on one side?",
          "a": "It multiplies - a one-to-many join duplicates rows on the 'one' side to match every row on the 'many' side."
        },
        {
          "q": "iloc vs loc - what's the difference?",
          "a": "iloc is purely position-based (0-indexed); loc is label-based (uses the index/column labels), which can diverge from position after filtering or sorting."
        },
        {
          "q": "How do you check for missing values per column?",
          "a": "df.isna().sum() - counts NaN/null entries column by column."
        },
        {
          "q": "What does pd.qcut do?",
          "a": "Bins a continuous column into quantile-based buckets (equal counts per bucket) rather than equal-width bins."
        },
        {
          "q": "Why does a numeric column silently become dtype object?",
          "a": "One non-numeric value (a stray string, or the wrong NaN representation) forces pandas to fall back to Python-object storage, losing vectorized speed."
        },
        {
          "q": "Default behavior of groupby on NaN keys?",
          "a": "Rows with a missing group key are dropped from the result unless dropna=False is passed."
        },
        {
          "q": "How do you convert a DataFrame to a NumPy array / torch tensor?",
          "a": "df.to_numpy() (or .values), then torch.from_numpy() or torch.tensor() to hand off to a model."
        }
      ],
      "standard": [
        {
          "q": "Explain why df[df.x > 0]['y'] = 1 can silently fail to modify df, and give the fix.",
          "a": "df[df.x > 0] first creates a new (possibly a view, possibly a copy - pandas doesn't guarantee which) intermediate DataFrame; the second [...] = 1 then assigns into that intermediate, which may or may not be backed by the same memory as df. When it's a copy, the assignment is silently lost and df is unchanged - pandas raises SettingWithCopyWarning as a heads-up, but it's easy to miss. The fix is a single .loc call that expresses both the row filter and the column selection at once: df.loc[df.x > 0, 'y'] = 1, which pandas guarantees operates on df directly.",
          "deepDive": {
            "q": "Why doesn't pandas just always guarantee a view or always guarantee a copy?",
            "a": "Whether df[mask] can be a view depends on whether the underlying block manager can express the filtered rows as a contiguous slice of the original memory - for a boolean mask that selects non-contiguous rows, it generally can't, so it must copy; for a contiguous slice (df[10:20]) a view is possible. Because this is an implementation detail that can change between pandas versions, the library refuses to promise either and instead warns you to be explicit."
          }
        },
        {
          "q": "You merge two DataFrames on a customer_id key and the result has more rows than either input. What happened, and how do you defend against it?",
          "a": "The key wasn't unique on at least one side - a 'many-to-many' or unexpected 'one-to-many' relationship means merge produces, for each key value, the cross-product of matching rows from both sides (count_A(v) * count_B(v)), which can be far larger than either input. Defend against it by checking df['customer_id'].is_unique before merging when you expect one-to-one, or by asserting len(merged) == len(left) after a left join that should be one-to-one, and by passing validate='one_to_one' (or the appropriate variant) to merge(), which raises immediately if the assumption is violated.",
          "deepDive": {
            "q": "What's the difference between how='left' and how='inner' here, and when does that distinction matter most?",
            "a": "how='inner' keeps only keys present on both sides (rows with no match vanish silently); how='left' keeps every row of the left table, filling unmatched right-side columns with NaN. The distinction matters most when you need to know your row count is preserved (audit trails, joining features onto a fixed label set) - inner joins can silently drop labeled examples, which is a subtle form of data leakage/bias if the missingness isn't random."
          }
        },
        {
          "q": "How would you compute, for each of 4 income quartiles, the mean and standard deviation of house value, and explain what groupby is doing under the hood?",
          "a": "df.groupby(pd.qcut(df['MedInc'], 4))['MedHouseVal'].agg(['mean', 'std']). Under the hood groupby builds a mapping from each distinct bin label to the integer row positions belonging to that bin (the 'split'), then for each bin slices out those rows' MedHouseVal values and calls the aggregation function on that 1-D array (the 'apply' - this is just a NumPy reduction per group), then stacks the per-group scalars back into a DataFrame indexed by bin label (the 'combine'). It's conceptually a for-loop over groups, but pandas implements the split step with sorted/hashed row-position arrays so it avoids a literal Python loop over rows.",
          "deepDive": {
            "q": "How does this generalize to a custom aggregation that isn't a built-in string like 'mean'?",
            "a": "df.groupby(...)['col'].apply(custom_fn) calls custom_fn on each group's Series and concatenates whatever it returns - if custom_fn returns a scalar you get one row per group (like agg); if it returns a Series or DataFrame you get a result with a hierarchical index, which is how you'd implement something like 'the top-3 rows by value within each group'."
          }
        },
        {
          "q": "A DataFrame column that should be all floats keeps showing dtype object, and .mean() on it raises a TypeError. Diagnose and fix.",
          "a": "dtype object almost always means at least one entry isn't a native numeric type - commonly a stray string ('N/A', '-', an empty string) used as a missing-value placeholder instead of NaN, or numbers that were read in as strings from a CSV with inconsistent formatting. Diagnose with df['col'].apply(type).value_counts() to see which rows carry a non-numeric Python type, or pd.to_numeric(df['col'], errors='coerce') to attempt conversion and see which entries become NaN. Fix by cleaning those placeholder values (replace them with actual NaN) and then casting explicitly with pd.to_numeric or .astype(float).",
          "deepDive": {
            "q": "Why does this matter for performance, not just correctness?",
            "a": "An object-dtype column stores boxed Python objects with per-element type dispatch, exactly like the interpreted loop from 01-01 - every arithmetic op on it falls back to slow, unvectorized Python-level iteration instead of a compiled NumPy loop, so a single contaminating string can silently make an entire column's operations 10-100x slower even after the immediate error is worked around with errors='coerce'."
          }
        },
        {
          "q": "Design a pandas pipeline to go from a raw California Housing CSV to a clean (X, y) pair ready for torch.tensor(), handling missing values and a categorical column.",
          "a": "1) pd.read_csv, then df.isna().sum() to audit missingness; 2) impute or drop - e.g. df['col'].fillna(df['col'].median()) for a numeric column with a small missing fraction, or df.dropna(subset=['critical_col']) when imputation would be misleading; 3) encode any categorical column with pd.get_dummies(df, columns=['cat_col']) (one-hot) or an explicit ordinal mapping if there's a natural order; 4) split off the target: y = df.pop('MedHouseVal'), X = df; 5) convert with X_t = torch.tensor(X.to_numpy(dtype='float32')) and y_t = torch.tensor(y.to_numpy(dtype='float32')) - float32 explicitly, since pandas/NumPy default to float64 and torch's default is float32 (the dtype pitfall from 01-01).",
          "deepDive": {
            "q": "Where in this pipeline does data leakage most commonly sneak in, and how do you prevent it?",
            "a": "Computing the imputation value (e.g., df['col'].median()) or any normalization statistic on the *full* dataset before the train/test split leaks test-set information into training - the fix is to split first, fit the imputer/scaler on the training set only, then apply those same fitted values to transform the test set, never recomputing statistics on test data (the same principle 25-10's leakage trap makes explicit for feature selection)."
          }
        },
        {
          "q": "You call df.groupby('category').transform('mean') instead of df.groupby('category').agg('mean'). What's the difference in output shape, and when would you reach for transform instead of agg?",
          "a": "agg collapses each group down to one row per distinct key, producing a smaller result indexed by the group key. transform instead returns a result with the SAME shape (same length, same index) as the original DataFrame - it broadcasts the aggregated value back out to every row belonging to that group. You reach for transform when you need the group statistic aligned back onto the original rows for a further row-wise computation, e.g. df['deviation'] = df['value'] - df.groupby('category')['value'].transform('mean') computes each row's deviation from its own group's mean in one vectorized expression, without a separate merge step to rejoin a smaller agg result back onto the original table.",
          "deepDive": {
            "q": "How would you implement the same 'deviation from group mean' feature using agg + merge instead, and why is transform usually preferred?",
            "a": "group_means = df.groupby('category')['value'].agg('mean').reset_index(name='group_mean'); df = df.merge(group_means, on='category'); df['deviation'] = df['value'] - df['group_mean'] - functionally equivalent, but it requires an explicit merge (with its own row-count and key-matching considerations from the earlier merge discussion) and a temporary column cleanup; transform is preferred because it's a single expression with no merge-key bookkeeping, guarantees the output aligns row-for-row with the input by construction, and is typically faster since it avoids materializing an intermediate reduced table and rejoining it."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "pandas Series",
        "back": "A labeled 1-D array - one DataFrame column, backed by a NumPy array plus an index."
      },
      {
        "type": "intuition",
        "front": "groupby().agg() in one sentence",
        "back": "Split-apply-combine: partition rows by key, apply a function per group, stack results into one table."
      },
      {
        "type": "pitfall",
        "front": "SettingWithCopyWarning cause",
        "back": "Chained indexing df[mask]['col']=v may write to a temporary copy - use df.loc[mask,'col']=v instead."
      },
      {
        "type": "pitfall",
        "front": "Merge row-count surprise",
        "back": "A join on a non-unique key multiplies rows (count_A(v)*count_B(v) per key value) - check len() or pass validate=."
      },
      {
        "type": "definition",
        "front": "iloc vs loc",
        "back": "iloc = position-based (0-indexed); loc = label-based - they diverge once the index no longer matches row position."
      },
      {
        "type": "pitfall",
        "front": "Numeric column becomes dtype object",
        "back": "One stray non-numeric value (placeholder string, bad NaN) forces slow, unvectorized Python-object storage."
      },
      {
        "type": "pitfall",
        "front": "groupby drops NaN keys by default",
        "back": "Rows whose group key is missing vanish from the result unless dropna=False is passed."
      },
      {
        "type": "formula",
        "front": "Merge output row count",
        "back": "sum over key values v of count_A(v) * count_B(v) - a one-to-many or many-to-many join multiplies, doesn't just union."
      }
    ],
    "refs": [
      {
        "title": "pandas: User Guide - Indexing and selecting data",
        "url": "https://pandas.pydata.org/docs/user_guide/indexing.html"
      },
      {
        "title": "pandas: Group by: split-apply-combine",
        "url": "https://pandas.pydata.org/docs/user_guide/groupby.html"
      },
      {
        "title": "pandas: Merge, join, concatenate and compare",
        "url": "https://pandas.pydata.org/docs/user_guide/merging.html"
      },
      {
        "title": "scikit-learn: California Housing dataset",
        "url": "https://scikit-learn.org/stable/datasets/real_world.html#california-housing-dataset"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
