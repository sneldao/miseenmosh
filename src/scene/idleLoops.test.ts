import { describe, it, expect } from "vitest";
import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack, type KeyframeTrack } from "three";
import {
  IDLE_VARIANTS,
  SEAM_BLEND,
  buildIdleClips,
  hash01,
  idlePhase,
  idleRate,
  makeBeatClock,
  makeIdleDrive,
  moodPose,
  pickVariant,
  workTimeScale,
  wrapBlend,
} from "./idleLoops";

/** the shipped clip durations these windows are cut from (probe output) */
const SOURCE_LEN: Record<string, number> = {
  Work: 2.97,
  PetraWork: 5.97,
  PetraPrep: 5.97,
  DimitriPrep: 5.97,
  AnwarPrep: 5.97,
};

function sampleTrack(track: KeyframeTrack, t: number): number[] {
  const interp = (track as unknown as { createInterpolant(): { evaluate(t: number): Float32Array } }).createInterpolant();
  return Array.from(interp.evaluate(t));
}

describe("idle windows (measured, not guessed)", () => {
  it("gives every station at least two variants that never look the same", () => {
    for (const cookId of [0, 1, 2]) {
      const variants = IDLE_VARIANTS[cookId];
      expect(variants.length).toBeGreaterThanOrEqual(2);
      const ids = new Set(variants.map((v) => v.id));
      expect(ids.size).toBe(variants.length);
      const starts = new Set(variants.map((v) => v.start));
      expect(starts.size).toBe(variants.length);
    }
  });

  it("cuts windows that fit inside their source clip and stay slower than the work pass", () => {
    for (const cookId of [0, 1, 2]) {
      for (const v of IDLE_VARIANTS[cookId]) {
        const src = SOURCE_LEN[v.source];
        expect(src, `${v.id} source clip ${v.source}`).toBeDefined();
        // a window strictly inside the clip: idle never replays the whole
        // performance, which is what keeps prep distinct from plating
        expect(v.start).toBeGreaterThanOrEqual(0);
        expect(v.start + v.len).toBeLessThanOrEqual(src + 1e-6);
        expect(v.len).toBeLessThan(src);
        // idle is background work: it never speeds the body up
        expect(v.tempo).toBeLessThan(1);
      }
    }
  });

  it("puts audible beats inside the loop, in order, at conservative levels", () => {
    for (const cookId of [0, 1, 2]) {
      for (const v of IDLE_VARIANTS[cookId]) {
        expect(v.beats.length).toBeGreaterThan(0);
        let prev = -1;
        for (const b of v.beats) {
          expect(b.at).toBeGreaterThan(0);
          expect(b.at).toBeLessThan(1);
          expect(b.at).toBeGreaterThan(prev);
          prev = b.at;
          // new events land meter-conservative until a person listens
          expect(b.vol).toBeLessThanOrEqual(0.7);
          expect(["knife", "chop", "boardTap"]).toContain(b.sound);
        }
      }
    }
  });
});

describe("wrapBlend", () => {
  const clip = new AnimationClip("Loop", 2, [
    new QuaternionKeyframeTrack(
      "Bone.quaternion",
      [0, 1, 2],
      [0, 0, 0, 1, 0.2588, 0, 0, 0.9659, 0.5, 0, 0, 0.866]
    ),
    new VectorKeyframeTrack("Bone.position", [0, 1, 2], [0, 0, 0, 0.2, 0.1, 0, 0.4, 0, 0]),
  ]);

  it("closes the loop: the pose at t=0 is the pose at t=duration", () => {
    const blended = wrapBlend(clip, SEAM_BLEND);
    for (const track of blended.tracks) {
      const first = sampleTrack(track, 0);
      const last = sampleTrack(track, blended.duration);
      for (let c = 0; c < first.length; c++) expect(first[c]).toBeCloseTo(last[c], 5);
    }
  });

  it("leaves the clip alone after the blend window", () => {
    const blended = wrapBlend(clip, SEAM_BLEND);
    const original = clip.tracks[1];
    const b = blended.tracks[1];
    for (const t of [0.5, 1, 1.5, 2]) {
      const a = sampleTrack(original, t);
      const c = sampleTrack(b, t);
      for (let i = 0; i < a.length; i++) expect(c[i]).toBeCloseTo(a[i], 4);
    }
  });

  it("makes the wrap an ordinary frame, not an event", () => {
    // the probe (assets/meshy/probe-loop-seam.mjs) measures this on the real
    // GLBs; this keeps the property enforced in CI on a dense stand-in: the
    // step across the wrap is never larger than the largest step inside the loop
    const blended = wrapBlend(clip, SEAM_BLEND);
    const step = 1 / 60;
    const dist = (a: number[], b: number[]) => {
      let d = 0;
      for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
      return d;
    };
    const pose = (t: number) => blended.tracks.flatMap((tr) => sampleTrack(tr, t));
    let inside = 0;
    for (let t = step; t <= blended.duration + 1e-9; t += step) {
      inside = Math.max(inside, dist(pose(t - step), pose(t % blended.duration)));
    }
    const seam = dist(pose(blended.duration), pose(0));
    expect(seam).toBeLessThanOrEqual(inside);
  });

  it("keeps quaternions unit length through the blend", () => {
    const blended = wrapBlend(clip, SEAM_BLEND);
    const q = blended.tracks[0];
    const values = q.values;
    for (let i = 0; i < values.length; i += 4) {
      const len = Math.hypot(values[i], values[i + 1], values[i + 2], values[i + 3]);
      expect(len).toBeCloseTo(1, 4);
    }
  });
});

describe("buildIdleClips", () => {
  /** a dense stand-in for a real GLB clip: keys every 0.1 s */
  function denseClip(name: string, duration: number) {
    const times: number[] = [];
    const q: number[] = [];
    const v: number[] = [];
    for (let t = 0; t <= duration + 1e-6; t += 0.1) {
      times.push(+t.toFixed(4));
      const half = Math.sin(t * 2) * 0.2;
      q.push(half, 0, 0, Math.sqrt(1 - half * half));
      v.push(Math.sin(t), 0.1 * Math.cos(t), 0);
    }
    return new AnimationClip(name, duration, [
      new QuaternionKeyframeTrack(`${name}.quaternion`, times, q),
      new VectorKeyframeTrack(`${name}.position`, times, v),
    ]);
  }

  it("builds one action-ready clip per variant, and nothing when the source is missing", () => {
    const src = denseClip("Work", 3);
    const clips = buildIdleClips(new Map([["Work", src], ["PetraWork", src], ["DimitriPrep", denseClip("DimitriPrep", 6)]]), 1);
    expect(clips.map((c) => c.name)).toEqual(IDLE_VARIANTS[1].map((v) => v.id));
    for (const c of clips) expect(c.duration).toBeGreaterThan(0.2);
    expect(buildIdleClips(new Map(), 2)).toEqual([]);
  });

  it("builds a clip that loops without a pop, from a real-shaped source", () => {
    const clips = buildIdleClips(new Map([["Work", denseClip("Work", 3)], ["AnwarPrep", denseClip("AnwarPrep", 6)]]), 2);
    expect(clips.length).toBe(IDLE_VARIANTS[2].length);
    for (const c of clips) {
      for (const track of c.tracks) {
        const first = sampleTrack(track, 0);
        const last = sampleTrack(track, c.duration);
        for (let i = 0; i < first.length; i++) expect(first[i]).toBeCloseTo(last[i], 4);
      }
    }
  });
});

describe("idle timing", () => {
  it("staggers cooks and loops so no two bodies are in step", () => {
    const v = IDLE_VARIANTS[1][0];
    const phases = new Set([idlePhase(1, v, 0), idlePhase(2, v, 0), idlePhase(1, v, 1)]);
    expect(phases.size).toBe(3);
    for (const p of phases) expect(p).toBeGreaterThanOrEqual(0);
    for (const p of phases) expect(p).toBeLessThan(v.len);
  });

  it("jitters tempo per loop and tilts with mood", () => {
    const v = IDLE_VARIANTS[1][0];
    const rates = new Set([0, 1, 2, 3, 4].map((loop) => idleRate(1, v, loop, "CALM").toFixed(4)));
    expect(rates.size).toBeGreaterThan(1);
    // a straining cook slows down; an angry one speeds up
    expect(idleRate(1, v, 0, "STRAINED")).toBeLessThan(idleRate(1, v, 0, "CALM"));
    expect(idleRate(1, v, 0, "ANGRY")).toBeGreaterThan(idleRate(1, v, 0, "CALM"));
  });

  it("is deterministic: the same cook and loop give the same numbers twice", () => {
    const v = IDLE_VARIANTS[2][1];
    expect(hash01(2, 3, 7)).toBe(hash01(2, 3, 7));
    expect(idlePhase(2, v, 3)).toBe(idlePhase(2, v, 3));
    expect(pickVariant(2, IDLE_VARIANTS[2], 4, "CALM").id).toBe(pickVariant(2, IDLE_VARIANTS[2], 4, "CALM").id);
  });

  it("drifts a straining cook to the slower window", () => {
    for (const loop of [0, 1]) {
      const picked = pickVariant(0, IDLE_VARIANTS[0], loop, "STRAINED");
      const slowest = [...IDLE_VARIANTS[0]].sort((a, b) => a.tempo - b.tempo)[loop % 2];
      expect(picked.id).toBe(slowest.id);
    }
  });
});

describe("beat clock (the sfx calls Dev 1 fires)", () => {
  const variant = IDLE_VARIANTS[0][0];

  it("counts loops, wraps cleanly and never drifts out of the window", () => {
    const clock = makeBeatClock(variant, 0);
    for (let i = 0; i < 600; i++) {
      clock.advance(0.05, 1, 0);
      expect(clock.t).toBeGreaterThanOrEqual(0);
      expect(clock.t).toBeLessThan(variant.len);
    }
    expect(clock.loop).toBeGreaterThan(10);
  });

  it("fires each beat at most once per loop, and sometimes not at all", () => {
    const clock = makeBeatClock(variant, 0);
    let fired = 0;
    let loops = 0;
    while (loops < 40) {
      const beats = clock.advance(variant.len, 1, 0);
      expect(beats.length).toBeLessThanOrEqual(variant.beats.length);
      fired += beats.length;
      loops = clock.loop;
    }
    // one loop hands the clock to the next; the density gate keeps it sparse
    expect(fired).toBeGreaterThan(0);
    expect(fired).toBeLessThan(40 * variant.beats.length);
  });

  it("fires nothing while paused (dt 0) or on a backwards step", () => {
    const clock = makeBeatClock(variant, 0);
    expect(clock.advance(0, 1, 0)).toEqual([]);
    expect(clock.advance(-1, 1, 0)).toEqual([]);
    expect(clock.t).toBe(0);
  });
});

describe("the watch (the between-ticket silhouette)", () => {
  it("stands the watch eventually, only ever on a loop wrap", () => {
    const d = makeIdleDrive(0, "CALM")!;
    let sawWatch = false;
    for (let i = 0; i < 6000 && !sawWatch; i++) {
      d.step(0, 1 / 30, "CALM", true);
      if (d.watching) {
        sawWatch = true;
        // a watch begins where a loop wrapped: the window clock is at or
        // near zero, never mid-gesture
        expect(d.t).toBeLessThan(0.2);
      }
    }
    expect(sawWatch).toBe(true);
  });

  it("fires no beats strictly inside the watch and resumes the same window", () => {
    const d = makeIdleDrive(1, "CALM")!;
    let guard = 0;
    while (!d.watching && guard++ < 6000) d.step(1, 1 / 30, "CALM", true);
    expect(d.watching).toBe(true);
    const variantAt = d.variant.id;
    const loopAt = d.loop;
    let beats = 0;
    while (d.watching) {
      const b = d.step(1, 1 / 30, "CALM", true);
      if (d.watching) beats += b.length; // the expiry frame may already resume
    }
    expect(beats).toBe(0);
    expect(d.variant.id).toBe(variantAt);
    expect(d.loop).toBe(loopAt); // the window clock never advanced during it
  });

  it("holds the watch through a pause and clears it on restart", () => {
    const d = makeIdleDrive(2, "CALM")!;
    let guard = 0;
    while (!d.watching && guard++ < 6000) d.step(2, 1 / 30, "CALM", true);
    for (let i = 0; i < 100; i++) d.step(2, 1 / 30, "CALM", false);
    expect(d.watching).toBe(true); // paused: it freezes, does not burn down
    d.restart(2, "CALM", 0);
    expect(d.watching).toBe(false);
  });

  it("is deterministic: the same cook watches on the same loops twice", () => {
    const watchLoops = (id: number) => {
      const d = makeIdleDrive(id, "CALM")!;
      const seen: number[] = [];
      for (let i = 0; i < 4000 && seen.length < 3; i++) {
        d.step(id, 1 / 30, "CALM", true);
        if (d.watching && seen[seen.length - 1] !== d.loop) seen.push(d.loop);
      }
      return seen;
    };
    expect(watchLoops(0)).toEqual(watchLoops(0));
    expect(watchLoops(0).length).toBeGreaterThan(0);
  });
});

describe("mood carries the body", () => {
  it("keeps ANGRY and EDGE in different silhouettes (never blur at distance)", () => {
    const angry = moodPose("ANGRY");
    const edge = moodPose("EDGE");
    expect(angry.tremble).toBe(0); // braced and fast
    expect(edge.tremble).toBeGreaterThan(0); // shaking and set
    expect(edge.handHip).toBeGreaterThan(0);
    expect(angry.handHip).toBe(0);
    expect(edge.brace).toBeGreaterThan(angry.brace); // EDGE is MORE set
    expect(edge.idleRate).toBeGreaterThan(angry.idleRate); // and faster still
  });

  it("gives STRAINED the slump and the hard breathing, CALM the calmest body", () => {
    expect(moodPose("STRAINED").slump).toBeGreaterThan(0);
    expect(moodPose("STRAINED").breathRate).toBeGreaterThan(moodPose("CALM").breathRate);
    expect(moodPose("CALM").slump).toBe(0);
    expect(moodPose("CALM").breathAmp).toBe(1);
    expect(moodPose(undefined).slump).toBe(moodPose("CALM").slump);
  });

  it("bounds the work tempo so a ticket's performance always completes", () => {
    const clipDur = 3;
    const plateDur = 2;
    // slower moods never stretch a performance past its ticket
    expect(workTimeScale(plateDur, clipDur, "STRAINED")).toBeCloseTo((clipDur / plateDur) * 1, 6);
    // faster moods may hold the last frame, but never for more than a fifth
    expect(workTimeScale(plateDur, clipDur, "ANGRY")).toBeCloseTo((clipDur / plateDur) * 1.12, 6);
    expect(workTimeScale(plateDur, clipDur, "EDGE")).toBeLessThanOrEqual((clipDur / plateDur) * 1.2 + 1e-9);
  });
});
