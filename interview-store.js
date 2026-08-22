// interview-store.js — review scheduling + progress for /interview/.
//
// Mirrors window.DM_PATHS in paths.js: one namespaced localStorage key, try/catch
// on every access so private mode degrades to in-memory rather than throwing.
// Nothing leaves the browser and there is no account — which is also why export and
// import exist, as a copy-paste blob rather than a backend.

(function () {
  // ── SM-2, the scheduling algorithm behind Anki and its ancestors ──────────
  //
  // Kept pure and separate from any component so it can be reasoned about and
  // tested: same card, same grade, same day in => same schedule out. The caller
  // passes the day rather than the function reading the clock, which is what keeps
  // it pure. `todayEpochDay` is whole days since the epoch, so "due tomorrow"
  // survives the reader closing the tab, and time zones only shift the boundary.
  //
  // grade: 0 Again · 1 Hard · 2 Good · 3 Easy
  function schedule(card, grade, todayEpochDay) {
    let reps = card && card.reps ? card.reps : 0;
    let interval = card && card.interval ? card.interval : 0;
    let ease = card && card.ease ? card.ease : 2.5;

    if (grade === 0) {
      // A lapse resets the streak. The ease penalty is what makes a card you keep
      // failing come back more often than a card you have never seen.
      reps = 0; interval = 1; ease = Math.max(1.3, ease - 0.2);
    } else {
      ease = Math.max(1.3, ease + (0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02)));
      reps += 1;
      interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease);
      if (grade === 1) interval = Math.max(1, Math.round(interval * 0.6));
    }
    return { reps: reps, interval: interval, ease: Math.round(ease * 1000) / 1000, due: todayEpochDay + interval, last: todayEpochDay };
  }

  var KEY = "dm_interview_v1";
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode */ } }

  window.DM_INTERVIEW = {
    schedule: schedule,
    today: function () { return Math.floor(Date.now() / 86400000); },

    card: function (id) { return (read().cards || {})[id] || null; },
    all: function () { return read().cards || {}; },

    grade: function (id, grade, meta) {
      var o = read();
      o.cards = o.cards || {};
      var next = schedule(o.cards[id], grade, this.today());
      // The module rides along so weak-spots can aggregate without loading a shard.
      if (meta && meta.module) next.m = meta.module;
      o.cards[id] = next;
      o.graded = (o.graded || 0) + 1;
      write(o);
      return next;
    },

    due: function (todayEpochDay) {
      var day = todayEpochDay == null ? this.today() : todayEpochDay;
      var c = read().cards || {}, out = [];
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k) && (c[k].due || 0) <= day) out.push(k);
      return out;
    },

    stats: function () {
      var o = read(), c = o.cards || {}, day = this.today();
      var seen = 0, dueNow = 0, mature = 0;
      for (var k in c) {
        if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
        seen++;
        if ((c[k].due || 0) <= day) dueNow++;
        if ((c[k].interval || 0) >= 21) mature++;   // Anki's convention for "known"
      }
      return { seen: seen, due: dueNow, mature: mature, graded: o.graded || 0 };
    },

    // Average ease per module. Low ease = repeatedly failed = a real weak spot,
    // which is more honest than counting wrong answers, since it decays as you
    // relearn. Only modules with enough graded cards to mean anything are returned.
    weakSpots: function (minCards) {
      var c = read().cards || {}, agg = {};
      for (var k in c) {
        if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
        var m = c[k].m; if (!m) continue;
        agg[m] = agg[m] || { module: m, n: 0, ease: 0 };
        agg[m].n++; agg[m].ease += (c[k].ease || 2.5);
      }
      var out = [];
      for (var m2 in agg) if (Object.prototype.hasOwnProperty.call(agg, m2)) {
        if (agg[m2].n >= (minCards || 5)) out.push({ module: m2, n: agg[m2].n, ease: agg[m2].ease / agg[m2].n });
      }
      return out.sort(function (a, b) { return a.ease - b.ease; });
    },

    reset: function () { write({}); },
    exportJSON: function () { return JSON.stringify(read()); },
    importJSON: function (s) { try { var o = JSON.parse(s); if (!o || typeof o !== "object") return false; write(o); return true; } catch (e) { return false; } },
  };
})();
