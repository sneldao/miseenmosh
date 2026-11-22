"""Summarize frozen renderer observations; never rerun or alter the game."""
import json
import math
import statistics
import sys
from pathlib import Path


def percentile(values, fraction):
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * fraction) - 1)]


def distribution(values):
    return {
        "median": round(statistics.median(values), 3),
        "p95": round(percentile(values, .95), 3),
        "p99": round(percentile(values, .99), 3),
        "max": round(max(values), 3),
    }


def summarize(capture):
    frames = capture["frames"]
    if capture["reason"] != "frame-target":
        raise ValueError(f"Incomplete capture: {capture['reason']}, {len(frames)} frames")
    if len(frames) != capture["requestedFrames"] or len(frames) < 2:
        raise ValueError("Frame count does not match requested sample")
    if not all(b["frame"] == a["frame"] + 1 for a, b in zip(frames, frames[1:])):
        raise ValueError("Renderer frame counters are not consecutive")
    if any(not math.isfinite(r["intervalMs"]) or r["intervalMs"] <= 0 for r in frames):
        raise ValueError("Invalid renderer interval")
    if any(r["paused"] for r in frames):
        raise ValueError("Paused frames cannot substantiate active-service performance")
    if any(r["phase"] != "service" for r in frames):
        raise ValueError("Capture crosses outside service; report it separately")
    times = [r["intervalMs"] for r in frames]
    median = statistics.median(times)
    slowest_count = max(1, math.ceil(len(times) * .01))
    slowest = sorted(times, reverse=True)[:slowest_count]
    return {
        "profile": capture["profile"],
        "sampleFrames": len(frames),
        "sampleIntervalSeconds": round(sum(times) / 1000, 3),
        "rendererIntervalsMs": distribution(times),
        "rendererSubmissionCpuMs": distribution([r["submitCpuMs"] for r in frames]),
        "meanSubmissionCadenceHz": round(1000 / statistics.mean(times), 2),
        "slowestOnePercentCadenceHz": round(1000 / statistics.mean(slowest), 2),
        "framesOver16_7msPercent": round(100 * sum(t > 16.7 for t in times) / len(times), 2),
        "framesOverTwiceMedian": sum(t > 2 * median for t in times),
        "worstOverMedian": round(max(times) / median, 2),
        "drawCalls": distribution([r["calls"] for r in frames]),
        "triangles": distribution([r["triangles"] for r in frames]),
        "geometryCountRange": [min(r["geometries"] for r in frames), max(r["geometries"] for r in frames)],
        "textureCountRange": [min(r["textures"] for r in frames), max(r["textures"] for r in frames)],
        "longTaskCount": len(capture["longTasks"]) if capture["longTasksSupported"] else None,
        "longTaskTotalMs": sum(t["durationMs"] for t in capture["longTasks"]) if capture["longTasksSupported"] else None,
        "serviceTimeRange": [frames[0]["serviceTime"], frames[-1]["serviceTime"]],
        "scenarioEvidence": {
            "maximumCooking": max(r["cooking"] for r in frames),
            "maximumReady": max(r["ready"] for r in frames),
            "maximumQueued": max(r["rail"] for r in frames),
            "framesWithMultipleCooking": sum(r["cooking"] >= 2 for r in frames),
            "framesWithMultipleReady": sum(r["ready"] >= 2 for r in frames),
            "framesHoldingPlate": sum(r["held"] > 0 for r in frames),
            "firstPersonFrames": sum(r["firstPerson"] for r in frames),
        },
        "limitations": "Renderer submission cadence, not measured physical display presentation. CPU metric excludes game/React work and asynchronous GPU cost. Machine contention must be reported separately.",
    }


def self_check():
    frame = dict(intervalMs=1000 / 60, submitCpuMs=4, calls=100, triangles=1000,
                 geometries=10, textures=4, phase="service", paused=False,
                 serviceTime=0, rail=0, cooking=0, ready=0, held=1, firstPerson=False)
    capture = dict(reason="frame-target", requestedFrames=100, profile={},
                   longTasks=[], longTasksSupported=True,
                   frames=[dict(frame, frame=i) for i in range(100)])
    stable = summarize(capture)
    assert stable["meanSubmissionCadenceHz"] == 60
    assert stable["slowestOnePercentCadenceHz"] == 60
    capture["frames"][-1]["intervalMs"] = 100
    stalled = summarize(capture)
    assert stalled["slowestOnePercentCadenceHz"] == 10
    assert stalled["framesOverTwiceMedian"] == 1
    capture["reason"] = "hidden"
    try:
        summarize(capture)
    except ValueError:
        pass
    else:
        raise AssertionError("Incomplete evidence did not fail closed")


if __name__ == "__main__":
    self_check()
    if len(sys.argv) == 1:
        print("Synthetic cadence, slow-frame tail, and incomplete-capture checks passed.")
    else:
        frozen = json.loads(Path(sys.argv[1]).read_text())
        result = summarize(frozen.get("data", frozen))
        print(json.dumps(result, indent=2))
