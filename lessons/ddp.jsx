// lessons/ddp.jsx — Module 16-08 - Distributed Data Parallel.
// Full on-site flagship lesson. Loaded by /learn/training-systems/ddp/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Scale training across GPUs: replicate the model,
// split the batch, all-reduce the gradients, and overlap communication with compute.

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
            One GPU only holds so much and runs so fast. To train on more data in less time, you
            spread the work across many GPUs - and the dominant way to do that is data parallelism:
            every GPU keeps a full copy of the model, processes a different slice of each batch, and
            they synchronize gradients so all copies stay identical. Done right, throughput scales
            almost linearly with the number of GPUs.
          </P>
          <P>
            We will see why the only thing that must be communicated is gradients, how the all-reduce
            that averages them works, what the train loop looks like in PyTorch DDP, and the
            engineering - overlapping communication with computation - that keeps scaling efficient.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The idea ── */}
      <LessonSection n="0" title="Replicate and Split" tag="// DATA PARALLELISM">
        <P>
          Give each of <MathInline>{`K`}</MathInline> GPUs an identical copy of the model and a
          different shard of the mini-batch. Each computes a forward and backward pass on its shard,
          producing local gradients. If we then average those gradients across all GPUs and apply the
          same update everywhere, the copies remain identical - as if one machine had processed the
          whole large batch.
        </P>
        <MathBlock>{`g = \\frac{1}{K}\\sum_{k=1}^{K} g_k`}</MathBlock>
      </LessonSection>

      {/* ── Part 1 — Why only gradients ── */}
      <LessonSection n="1" title="Communicate Only Gradients" tag="// THE MINIMAL SYNC">
        <P>
          Because every replica starts each step with identical weights and applies the identical
          averaged update, they never diverge. So the only thing that has to cross the network is the
          gradient - not the weights, not the activations, not the data. That single averaging step
          per iteration is the entire communication cost of data-parallel training.
        </P>
        <KeyInsight title="Sync the gradients, and the weights take care of themselves">
          Identical initialization plus identical updates means identical models, forever, with no
          weight synchronization. This is why data parallelism is so clean: the whole distributed
          correctness argument reduces to "average the gradients each step."
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — All-reduce ── */}
      <LessonSection n="2" title="Ring All-Reduce" tag="// SUM ACROSS GPUS">
        <P>
          Averaging a tensor that lives on every GPU is the all-reduce operation. The naive approach -
          send everything to one GPU and back - makes that GPU a bottleneck. Ring all-reduce instead
          arranges the GPUs in a ring and passes chunks around it, so the communication is balanced
          and its cost is independent of the number of GPUs.
        </P>
        <MathBlock>{`\\text{ring all-reduce cost} \\approx 2\\,\\frac{(K-1)}{K}\\,\\frac{|\\theta|}{\\text{bandwidth}}`}</MathBlock>
        <Aside title="It is bandwidth-optimal">
          Each GPU sends and receives roughly the full gradient once, no matter how many GPUs join.
          That constant per-GPU cost is what lets data parallelism scale to hundreds of devices -
          and it is implemented for you by NCCL under the hood.
        </Aside>
      </LessonSection>

      {/* ── Part 3 — The code ── */}
      <LessonSection n="3" title="PyTorch DDP" tag="// WRAP AND TRAIN">
        <P>
          In practice you wrap your model in <code>DistributedDataParallel</code>, give each process
          a shard of the data via a <code>DistributedSampler</code>, and train almost exactly as you
          would on one GPU. DDP hooks into the backward pass and triggers the all-reduce
          automatically - you never call it yourself.
        </P>
        <CodeBlock lang="python">{`import torch, torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

dist.init_process_group("nccl")                  # one process per GPU
model = DDP(model.to(rank), device_ids=[rank])
sampler = DistributedSampler(dataset)            # each rank gets a disjoint shard

for x, y in DataLoader(dataset, sampler=sampler):
    loss = criterion(model(x), y)
    loss.backward()        # DDP all-reduces gradients here, automatically
    opt.step(); opt.zero_grad()`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Keep it efficient ── */}
      <LessonSection n="4" title="Scaling Efficiency" tag="// OVERLAP + SCALE THE LR">
        <P>
          Two things keep scaling near-linear. First, DDP overlaps communication with computation: it
          starts all-reducing the gradients of later layers while earlier layers are still computing
          their backward pass, hiding much of the network cost behind useful work. Second, since the
          effective batch grew by <MathInline>{`K`}</MathInline>, you scale the learning rate up to
          match - the linear scaling rule - usually with a warmup.
        </P>
        <CodeBlock lang="python">{`# linear scaling rule: bigger effective batch -> proportionally bigger LR
base_lr, base_bs = 1e-3, 256
lr = base_lr * (K * per_gpu_bs) / base_bs        # warm up to this`}</CodeBlock>
        <Warn title="When the model itself is too big">
          Data parallelism replicates the whole model on every GPU, so it fails the moment the model
          no longer fits. That is where sharded approaches take over - FSDP and ZeRO split the
          parameters, gradients, and optimizer state across GPUs, trading extra communication for the
          ability to train models far larger than one device.
        </Warn>
        <TryThis title="Measure the scaling efficiency">
          Plot throughput (samples/sec) against GPU count. Perfect scaling is a straight line;
          the gap below it is communication overhead. Larger models and faster interconnects push
          you closer to the ideal - this curve is how you justify the next GPU.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You saw how data-parallel training replicates the model, splits the batch, and averages
          gradients with a ring all-reduce - and how PyTorch DDP makes that nearly transparent while
          overlapping communication with compute.
        </P>
        <P>
          Distributed data parallel scales training by keeping identical model copies in sync through
          a single gradient all-reduce per step - the only thing that must be communicated. Ring
          all-reduce makes that cost independent of GPU count, overlapping hides it, and the linear
          scaling rule adjusts the learning rate for the larger effective batch. When the model
          outgrows one GPU, sharded methods (FSDP, ZeRO) pick up where DDP leaves off.
        </P>
        <Warn title="The one thing to remember">
          In data parallelism the only thing crossing the wire is gradients - get that average right
          and a hundred GPUs behave like one very fast one.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
