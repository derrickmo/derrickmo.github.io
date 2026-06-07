// lessons/system-design.jsx — Module 20-10 - ML System Design Patterns.
// Full on-site flagship lesson. Loaded by /learn/mlops/system-design/index.html AFTER lesson-app.jsx.
// Sets __DM_LESSON_CONTENT. The model is the small part: the lifecycle, training-serving skew and
// feature stores, batch vs online inference, and the monitoring-retraining loop that keeps it alive.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            Training a good model is the part of an ML system that gets the attention and the smallest part of
            the work. Around it sits everything that makes it useful and keeps it useful: data pipelines,
            feature computation, serving infrastructure, monitoring, and a loop to retrain when the world moves.
            Most production ML failures are not modeling failures - they are systems failures.
          </P>
          <P>
            This lesson is the architecture, not the algorithm. We walk the ML lifecycle, confront
            training-serving skew and the feature store that prevents it, choose between batch and online
            inference, and close the loop with monitoring and retraining - the patterns that recur in every ML
            system design.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The model is small ── */}
      <LessonSection n="0" title="The Model Is a Small Box" tag="// THE SYSTEM AROUND IT">
        <P>
          Sketch a production ML system and the model occupies one small box in a diagram full of others: data
          ingestion, feature pipelines, training orchestration, a model registry, a serving layer, logging, and
          monitoring. Designing ML systems is mostly about the connections between these boxes - where data
          flows, where it can go stale, and where failures hide.
        </P>
        <CodeBlock lang="python">{`# the lifecycle, as a loop (not a line)
# data -> features -> train -> evaluate -> deploy -> serve -> monitor -> (back to data)`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Training-serving skew ── */}
      <LessonSection n="1" title="Training-Serving Skew" tag="// THE CLASSIC BUG">
        <P>
          The most common production failure: the features a model sees at serving time differ subtly from those
          it trained on. A transformation done one way in the training notebook and another way in the serving
          code - a different default, a different time window, a units mismatch - quietly degrades the model
          while every metric looks fine. The fix is to compute features once, in shared code, for both training
          and serving.
        </P>
        <KeyInsight title="Compute features once">
          A feature store exists to enforce exactly this: define each feature a single time and serve the same
          values to training (historically) and to production (in real time). Training-serving skew is invisible
          and corrosive; the discipline of one feature definition is the antidote.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — Batch vs online ── */}
      <LessonSection n="2" title="Batch or Online" tag="// WHEN TO PREDICT">
        <P>
          A central design fork: precompute predictions in bulk, or compute them on demand. Batch inference runs
          on a schedule, stores results, and serves them instantly - simple and cheap, but stale between runs and
          impossible when the input is only known at request time. Online inference computes per request - fresh
          and able to use live context, but it must meet a latency budget and stay up under load.
        </P>
        <MathBlock>{`\\text{batch: precompute} \\;\\to\\; \\text{look up} \\qquad\\qquad \\text{online: compute per request under an SLO}`}</MathBlock>
        <Aside title="Often both">
          Many systems do both: batch-precompute heavy features and candidate sets offline, then do a light
          online pass to rank or personalize at request time. The art is deciding what can be stale and what must
          be fresh - and pushing as much as possible to the cheap, simple batch side.
        </Aside>
      </LessonSection>

      {/* ── Part 3 — Serving concerns ── */}
      <LessonSection n="3" title="Serving Under Load" tag="// LATENCY, THROUGHPUT, ROLLOUT">
        <P>
          An online model is a service, so the systems toolbox applies: batch requests together for GPU
          throughput, autoscale replicas to track demand, cache repeated queries, and ship new versions behind a
          canary so a bad model hits a few percent of traffic, not everyone. These are the same patterns covered
          in the serving demos - and they matter more than another point of model accuracy.
        </P>
        <CodeBlock lang="python">{`# a serving endpoint is judged on latency (p99), throughput, and availability
# new model -> shadow or canary -> compare metrics -> ramp or roll back`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Close the loop ── */}
      <LessonSection n="4" title="Monitor and Retrain" tag="// THE WORLD MOVES">
        <P>
          A deployed model decays. User behavior shifts, an upstream feature breaks, the input distribution
          drifts away from training - and accuracy slides with no error in the logs. So the system must watch
          itself: track input distributions and prediction quality, alarm on drift, and trigger retraining on
          fresh data. The loop from monitoring back to data is what separates a model that was deployed from a
          system that stays correct.
        </P>
        <CodeBlock lang="python">{`# monitoring closes the loop
if drift(live_features, training_ref) > threshold:
    alert("distribution shift"); trigger_retrain()
track(prediction_quality)            # vs delayed ground truth / proxies`}</CodeBlock>
        <TryThis title="Trace a failure">
          Pick a way an ML system can silently break - a renamed upstream column, a timezone bug in a feature, a
          seasonal shift - and trace where each would show up: skew, drift, or a quality drop. Designing the
          system is largely anticipating these failure paths and instrumenting for them before they happen.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You stepped back from the model to the system: the lifecycle loop, training-serving skew and the
          feature store that prevents it, the batch-versus-online inference fork, serving under load, and the
          monitoring-and-retraining loop that keeps a model correct over time.
        </P>
        <P>
          An ML system is mostly not the model. Its reliability comes from computing features once to avoid
          skew, choosing batch or online inference deliberately, serving with the same throughput-latency-rollout
          discipline as any service, and closing the loop with monitoring that catches drift and triggers
          retraining. Design the system around the model, and instrument it to fail loudly - because in
          production, it eventually will.
        </P>
        <Warn title="The one thing to remember">
          Shipping the model is the start, not the finish - the system that feeds, serves, watches, and retrains
          it is what actually keeps it working.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
