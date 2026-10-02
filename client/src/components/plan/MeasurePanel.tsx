/**
 * Measure tab of the site-plan Operations panel: scale calibration, a live
 * readout of the selection, tagging (room / wall / door / window), and the
 * running takeoff. All maths comes from `shared/planMeasure.ts` — the same code
 * the server uses to compute the takeoff it hands to estimates.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PX_PER_FT,
  computeTakeoff,
  formatFeetInches,
  formatSqFt,
  parseLength,
  readTag,
  referenceLengthPx,
  scaleFromReference,
  type PlanKind,
  type WallType,
} from "@shared/planMeasure";
import { dimensionText, type SceneElement } from "@/lib/planScene";
import { Ruler, Tag, Type } from "lucide-react";
import { useMemo, useState } from "react";

export type SnapChoice = "1ft" | "6in" | "1in" | "off";
export const SNAP_FEET: Record<SnapChoice, number> = {
  "1ft": 1,
  "6in": 0.5,
  "1in": 1 / 12,
  off: 0,
};

type Props = {
  elements: readonly SceneElement[];
  selectedIds: readonly string[];
  /** null = never calibrated (the default scale is in effect). */
  scalePxPerFt: number | null;
  onScaleChange: (pxPerFt: number | null) => void;
  snap: SnapChoice;
  onSnapChange: (snap: SnapChoice) => void;
  onTag: (
    ids: readonly string[],
    tag: { kind: PlanKind; name?: string; wallType?: WallType } | null
  ) => void;
  onAddLabel: (id: string) => void;
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const TAGS: { label: string; tag: { kind: PlanKind; wallType?: WallType } }[] =
  [
    { label: "Room", tag: { kind: "room" } },
    { label: "Exterior wall", tag: { kind: "wall", wallType: "exterior" } },
    { label: "Interior wall", tag: { kind: "wall", wallType: "interior" } },
    {
      label: "Load-bearing wall",
      tag: { kind: "wall", wallType: "load-bearing" },
    },
    { label: "Door", tag: { kind: "door" } },
    { label: "Window", tag: { kind: "window" } },
  ];

function describeTag(el: SceneElement): string | null {
  const tag = readTag(el);
  if (!tag) return null;
  if (tag.kind === "wall") return `${tag.wallType ?? "unspecified"} wall`;
  if (tag.kind === "room") return tag.name ? `room — ${tag.name}` : "room";
  return tag.name ? `${tag.kind} — ${tag.name}` : tag.kind;
}

export function MeasurePanel({
  elements,
  selectedIds,
  scalePxPerFt,
  onScaleChange,
  snap,
  onSnapChange,
  onTag,
  onAddLabel,
}: Props) {
  const [realLength, setRealLength] = useState("");
  const [calError, setCalError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");

  const effective = scalePxPerFt ?? DEFAULT_PX_PER_FT;
  const selected = useMemo(
    () => elements.filter(e => !e.isDeleted && selectedIds.includes(e.id)),
    [elements, selectedIds]
  );
  const single = selected.length === 1 ? selected[0]! : null;
  const referencePx = single ? referenceLengthPx(single) : null;
  const takeoff = useMemo(
    () => computeTakeoff(elements, effective),
    [elements, effective]
  );

  const applyCalibration = () => {
    if (referencePx == null) return;
    const feet = parseLength(realLength);
    if (feet == null) {
      setCalError(`Enter a length like 12, 12' 6" or 150".`);
      return;
    }
    const next = scaleFromReference(referencePx, feet);
    if (next == null) {
      setCalError("That length gives an unusable scale. Check the number.");
      return;
    }
    setCalError(null);
    setRealLength("");
    onScaleChange(next);
  };

  const empty =
    takeoff.rooms.length === 0 &&
    takeoff.walls.length === 0 &&
    takeoff.doors + takeoff.windows === 0 &&
    takeoff.fixtures.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-sm">
      {/* ── Scale ─────────────────────────────────────────────── */}
      <section aria-labelledby="plan-scale-h" className="space-y-2">
        <h4
          id="plan-scale-h"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Ruler className="h-3.5 w-3.5" /> Scale
        </h4>
        <p className="text-xs text-muted-foreground" data-testid="scale-status">
          {scalePxPerFt == null
            ? `Not calibrated — 1 grid square = 1 ft (${DEFAULT_PX_PER_FT}px).`
            : `Calibrated — 1 ft = ${Math.round(scalePxPerFt * 100) / 100}px.`}
        </p>
        <p className="text-xs text-muted-foreground">
          Draw a line over something you know the length of (a wall on a photo,
          a scaled drawing), select it, and enter its real length.
        </p>
        <div className="flex gap-2">
          <Input
            value={realLength}
            onChange={e => {
              setRealLength(e.target.value);
              setCalError(null);
            }}
            onKeyDown={e => {
              if (e.key === "Enter") applyCalibration();
            }}
            placeholder={`Real length, e.g. 12' 6"`}
            aria-label="Real length of the selected line"
            aria-invalid={calError ? true : undefined}
            disabled={referencePx == null}
            className="h-9"
          />
          <Button
            size="sm"
            className="h-9 shrink-0"
            onClick={applyCalibration}
            disabled={referencePx == null || !realLength.trim()}
          >
            Set scale
          </Button>
        </div>
        {referencePx == null && (
          <p className="text-xs text-muted-foreground">
            Select one line (or wall) to calibrate from.
          </p>
        )}
        {calError && (
          <p role="alert" className="text-xs text-destructive">
            {calError}
          </p>
        )}
        {scalePxPerFt != null && (
          <button
            type="button"
            onClick={() => onScaleChange(null)}
            className={`text-xs underline text-muted-foreground hover:text-foreground rounded ${FOCUS_RING}`}
          >
            Reset to 1 grid square = 1 ft
          </button>
        )}
        <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          Snap to
          <select
            value={snap}
            onChange={e => onSnapChange(e.target.value as SnapChoice)}
            aria-label="Snap increment"
            className={`h-8 rounded-md border border-border bg-background px-2 text-foreground ${FOCUS_RING}`}
          >
            <option value="1ft">1 ft</option>
            <option value="6in">6 in</option>
            <option value="1in">1 in</option>
            <option value="off">Off</option>
          </select>
        </label>
      </section>

      {/* ── Selection ─────────────────────────────────────────── */}
      <section aria-labelledby="plan-sel-h" className="space-y-2">
        <h4
          id="plan-sel-h"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
        >
          <Tag className="h-3.5 w-3.5" /> Selection
        </h4>
        {selected.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Select a shape to see its size and mark what it is.
          </p>
        ) : (
          <>
            {single && (
              <p className="font-medium" data-testid="selection-readout">
                {dimensionText(single, effective) ?? "No measurable geometry"}
                {describeTag(single) && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    Marked as {describeTag(single)}
                  </span>
                )}
              </p>
            )}
            {selected.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {selected.length} shapes selected.
              </p>
            )}
            <Input
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="Name (for a room), e.g. Kitchen"
              aria-label="Room name"
              className="h-9"
            />
            <div className="grid grid-cols-2 gap-1.5">
              {TAGS.map(({ label, tag }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  className="h-9 justify-start"
                  onClick={() =>
                    onTag(selectedIds, {
                      ...tag,
                      ...(tag.kind === "room" && roomName.trim()
                        ? { name: roomName.trim() }
                        : {}),
                    })
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => onTag(selectedIds, null)}
              >
                Clear marking
              </Button>
              {single && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => onAddLabel(single.id)}
                  disabled={dimensionText(single, effective) == null}
                >
                  <Type className="h-3.5 w-3.5" /> Add dimension label
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Takeoff ───────────────────────────────────────────── */}
      <section aria-labelledby="plan-take-h" className="space-y-2">
        <h4
          id="plan-take-h"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Takeoff
        </h4>
        {empty ? (
          <p className="text-xs text-muted-foreground">
            Nothing marked yet. Mark rooms and walls above — or drop them from
            the Library — and the quantities add up here.
          </p>
        ) : (
          <dl className="space-y-2" data-testid="takeoff">
            {takeoff.rooms.length > 0 && (
              <div>
                <dt className="font-medium">
                  Floor area · {formatSqFt(takeoff.totalFloorAreaSqFt)}
                </dt>
                {takeoff.rooms.map(r => (
                  <dd
                    key={r.id}
                    className="flex justify-between text-xs text-muted-foreground"
                  >
                    <span className="truncate">{r.name}</span>
                    <span>{formatSqFt(r.areaSqFt)}</span>
                  </dd>
                ))}
              </div>
            )}
            {takeoff.walls.length > 0 && (
              <div>
                <dt className="font-medium">
                  Walls · {formatFeetInches(takeoff.totalWallFt)}
                </dt>
                {takeoff.walls.map(w => (
                  <dd
                    key={w.wallType}
                    className="flex justify-between text-xs text-muted-foreground"
                  >
                    <span>
                      {w.wallType} ({w.count})
                    </span>
                    <span>{formatFeetInches(w.lengthFt)}</span>
                  </dd>
                ))}
              </div>
            )}
            {takeoff.doors + takeoff.windows > 0 && (
              <div className="flex justify-between">
                <dt className="font-medium">Openings</dt>
                <dd className="text-xs text-muted-foreground">
                  {takeoff.doors} door{takeoff.doors === 1 ? "" : "s"} ·{" "}
                  {takeoff.windows} window{takeoff.windows === 1 ? "" : "s"}
                </dd>
              </div>
            )}
            {takeoff.fixtures.length > 0 && (
              <div>
                <dt className="font-medium">Fixtures</dt>
                {takeoff.fixtures.map(f => (
                  <dd
                    key={f.name}
                    className="flex justify-between text-xs text-muted-foreground"
                  >
                    <span>{f.name}</span>
                    <span>× {f.count}</span>
                  </dd>
                ))}
              </div>
            )}
            {takeoff.unmeasured > 0 && (
              <p className="text-xs text-amber-500">
                {takeoff.unmeasured} marked shape
                {takeoff.unmeasured === 1 ? "" : "s"} couldn't be measured
                (rooms need a closed shape or rectangle).
              </p>
            )}
          </dl>
        )}
        {scalePxPerFt == null && !empty && (
          <p className="text-xs text-amber-500">
            Quantities use the default scale. Calibrate above before relying on
            them.
          </p>
        )}
      </section>
    </div>
  );
}
