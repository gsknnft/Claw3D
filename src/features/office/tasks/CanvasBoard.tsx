"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Maximize2, Minus, Plus } from "lucide-react";

import type { TaskBoardCard, TaskBoardStatus } from "@/features/office/tasks/types";

// ---------------------------------------------------------------------------
// JSON Canvas spec types (https://jsoncanvas.org/)
// ---------------------------------------------------------------------------
export type CanvasColor =
  | "1" | "2" | "3" | "4" | "5" | "6"
  | (string & Record<never, never>); // hex fallback

export type CanvasNodeBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
};

export type CanvasTextNode = CanvasNodeBase & { type: "text"; text: string };
export type CanvasTaskNode = CanvasNodeBase & { type: "task"; cardId: string };
export type CanvasGroupNode = CanvasNodeBase & { type: "group"; label?: string };

export type CanvasNode = CanvasTextNode | CanvasTaskNode | CanvasGroupNode;

export type CanvasEdgeSide = "top" | "right" | "bottom" | "left";

export type CanvasEdge = {
  id: string;
  fromNode: string;
  fromSide?: CanvasEdgeSide;
  toNode: string;
  toSide?: CanvasEdgeSide;
  color?: CanvasColor;
  label?: string;
};

export type JsonCanvas = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

// ---------------------------------------------------------------------------
// Color palette (maps JSON Canvas spec colors 1–6)
// ---------------------------------------------------------------------------
const NODE_PALETTE: Record<string, string> = {
  "1": "border-rose-500/40 bg-rose-500/8",
  "2": "border-orange-400/40 bg-orange-400/8",
  "3": "border-amber-400/40 bg-amber-400/8",
  "4": "border-emerald-400/40 bg-emerald-400/8",
  "5": "border-cyan-400/40 bg-cyan-400/8",
  "6": "border-violet-400/40 bg-violet-400/8",
};

const STATUS_NODE_COLOR: Record<TaskBoardStatus, string> = {
  todo: "border-white/15 bg-white/5",
  in_progress: "border-cyan-400/35 bg-cyan-500/8",
  blocked: "border-rose-400/35 bg-rose-500/8",
  review: "border-amber-400/35 bg-amber-400/8",
  done: "border-emerald-400/30 bg-emerald-500/6",
};

const STATUS_LABELS: Record<TaskBoardStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.15;
const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function nodeColorClass(node: CanvasNode): string {
  if (node.color && NODE_PALETTE[node.color]) {
    return NODE_PALETTE[node.color]!;
  }
  return "border-white/12 bg-white/[0.04]";
}

// Find anchor point on node edge for an edge line
function anchorPoint(
  node: CanvasNode,
  side: CanvasEdgeSide | undefined,
): { x: number; y: number } {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (side) {
    case "top":    return { x: cx, y: node.y };
    case "bottom": return { x: cx, y: node.y + node.height };
    case "left":   return { x: node.x, y: cy };
    case "right":  return { x: node.x + node.width, y: cy };
    default:       return { x: cx, y: cy };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function TaskNodeCard({
  node,
  card,
  selected,
  onSelect,
  onDragStart,
  onStatusChange,
}: {
  node: CanvasTaskNode;
  card: TaskBoardCard;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: ReactPointerEvent, nodeId: string) => void;
  onStatusChange: (cardId: string, status: TaskBoardStatus) => void;
}) {
  const statusClass = STATUS_NODE_COLOR[card.status];
  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        minHeight: node.height,
      }}
      className={`flex flex-col overflow-hidden rounded-xl border transition-shadow ${statusClass} ${selected ? "ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10" : ""}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart(e, node.id);
        onSelect();
      }}
    >
      {/* Drag handle / header */}
      <div className="flex cursor-grab items-center justify-between gap-2 border-b border-white/8 px-3 py-2 active:cursor-grabbing">
        <span className="truncate text-[11px] font-medium text-white/85">{card.title}</span>
        <span className="shrink-0 rounded bg-white/8 px-1.5 py-0.5 font-mono text-[8px] uppercase text-white/40">
          {STATUS_LABELS[card.status]}
        </span>
      </div>
      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 py-2">
        {card.description ? (
          <p className="line-clamp-2 text-[10px] leading-relaxed text-white/50">
            {card.description}
          </p>
        ) : null}
        {card.assignedAgentId ? (
          <span className="font-mono text-[9px] text-white/30">{card.assignedAgentId}</span>
        ) : null}
      </div>
      {/* Status quick-change footer */}
      <div className="border-t border-white/6 px-2 py-1.5">
        <select
          value={card.status}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(card.id, e.target.value as TaskBoardStatus);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full rounded bg-black/20 px-1 py-0.5 font-mono text-[9px] text-white/50 outline-none"
        >
          {(Object.keys(STATUS_LABELS) as TaskBoardStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextNodeCard({
  node,
  selected,
  onSelect,
  onDragStart,
  onTextChange,
}: {
  node: CanvasTextNode;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: ReactPointerEvent, nodeId: string) => void;
  onTextChange: (nodeId: string, text: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      className={`overflow-hidden rounded-xl border ${nodeColorClass(node)} ${selected ? "ring-1 ring-cyan-400/50" : ""}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart(e, node.id);
        onSelect();
      }}
    >
      <textarea
        value={node.text}
        onChange={(e) => onTextChange(node.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="Note…"
        className="h-full w-full resize-none bg-transparent px-3 py-2 text-[11px] leading-relaxed text-white/70 outline-none placeholder:text-white/20"
      />
    </div>
  );
}

function GroupNodeCard({
  node,
  selected,
  onSelect,
  onDragStart,
}: {
  node: CanvasGroupNode;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: ReactPointerEvent, nodeId: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      className={`rounded-2xl border-2 border-dashed ${nodeColorClass(node)} ${selected ? "ring-1 ring-cyan-400/30" : ""}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart(e, node.id);
        onSelect();
      }}
    >
      {node.label && (
        <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
          {node.label}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edge SVG layer
// ---------------------------------------------------------------------------
function EdgeLayer({
  edges,
  nodes,
  canvasW,
  canvasH,
}: {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
  canvasW: number;
  canvasH: number;
}) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: canvasW, height: canvasH }}
      className="pointer-events-none overflow-visible"
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.2)" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const from = nodeMap.get(edge.fromNode);
        const to = nodeMap.get(edge.toNode);
        if (!from || !to) return null;
        const a = anchorPoint(from, edge.fromSide);
        const b = anchorPoint(to, edge.toSide);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={edge.id}>
            <path
              d={`M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
            {edge.label && (
              <text
                x={mx}
                y={my - 4}
                textAnchor="middle"
                className="fill-white/30 font-mono text-[9px]"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main CanvasBoard
// ---------------------------------------------------------------------------
export function CanvasBoard({
  canvas,
  cardMap,
  onCanvasChangeAction,
  onMoveCardAction,
  onCreateCardAction,
  onSelectCardAction,
  selectedCardId,
}: {
  canvas: JsonCanvas;
  cardMap: Map<string, TaskBoardCard>;
  onCanvasChangeAction: (next: JsonCanvas) => void;
  onMoveCardAction: (cardId: string, status: TaskBoardStatus) => void;
  onCreateCardAction: () => void;
  onSelectCardAction: (cardId: string | null) => void;
  selectedCardId: string | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Pan state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Node drag state
  const draggingNodeId = useRef<string | null>(null);
  const dragStart = useRef({ mx: 0, my: 0, nx: 0, ny: 0 });

  // Canvas bounding box for SVG edge layer
  const canvasBounds = useMemo(() => {
    if (canvas.nodes.length === 0) return { w: 2000, h: 1200 };
    const maxX = Math.max(...canvas.nodes.map((n) => n.x + n.width)) + 200;
    const maxY = Math.max(...canvas.nodes.map((n) => n.y + n.height)) + 200;
    return { w: Math.max(maxX, 2000), h: Math.max(maxY, 1200) };
  }, [canvas.nodes]);

  // Zoom with wheel
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((prev) => {
        const next = clamp(prev + delta, MIN_ZOOM, MAX_ZOOM);
        // Zoom toward cursor
        const scale = next / prev;
        setPan((p) => ({
          x: mx - (mx - p.x) * scale,
          y: my - (my - p.y) * scale,
        }));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onViewportPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setSelectedNodeId(null);
    onSelectCardAction(null);
  }, [pan, onSelectCardAction]);

  const onViewportPointerMove = useCallback((e: ReactPointerEvent) => {
    if (draggingNodeId.current) {
      const dx = (e.clientX - dragStart.current.mx) / zoom;
      const dy = (e.clientY - dragStart.current.my) / zoom;
      const nodeId = draggingNodeId.current;
      onCanvasChangeAction({
        ...canvas,
        nodes: canvas.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, x: Math.round(dragStart.current.nx + dx), y: Math.round(dragStart.current.ny + dy) }
            : n,
        ),
      });
      return;
    }
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [canvas, onCanvasChangeAction, zoom]);

  const onViewportPointerUp = useCallback(() => {
    isPanning.current = false;
    draggingNodeId.current = null;
  }, []);

  const onNodeDragStart = useCallback(
    (e: ReactPointerEvent, nodeId: string) => {
      e.preventDefault();
      draggingNodeId.current = nodeId;
      const node = canvas.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      dragStart.current = { mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
    },
    [canvas.nodes],
  );

  const handleTextChange = useCallback(
    (nodeId: string, text: string) => {
      onCanvasChangeAction({
        ...canvas,
        nodes: canvas.nodes.map((n) => (n.id === nodeId ? { ...n, text } : n)),
      });
    },
    [canvas, onCanvasChangeAction],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    onCanvasChangeAction({
      nodes: canvas.nodes.filter((n) => n.id !== selectedNodeId),
      edges: canvas.edges.filter(
        (e) => e.fromNode !== selectedNodeId && e.toNode !== selectedNodeId,
      ),
    });
    setSelectedNodeId(null);
  }, [canvas, onCanvasChangeAction, selectedNodeId]);

  const addTextNode = () => {
    const id = `note-${Date.now()}`;
    onCanvasChangeAction({
      ...canvas,
      nodes: [
        ...canvas.nodes,
        { id, type: "text", text: "", x: Math.round((400 - pan.x) / zoom), y: Math.round((200 - pan.y) / zoom), width: DEFAULT_NODE_W, height: DEFAULT_NODE_H, color: "5" },
      ],
    });
  };

  const addGroupNode = () => {
    const id = `group-${Date.now()}`;
    onCanvasChangeAction({
      ...canvas,
      nodes: [
        ...canvas.nodes,
        { id, type: "group", label: "Group", x: Math.round((400 - pan.x) / zoom), y: Math.round((200 - pan.y) / zoom), width: 400, height: 300 },
      ],
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 40, y: 40 });
  };

  // Render groups behind, tasks/text in front
  const groups = canvas.nodes.filter((n) => n.type === "group") as CanvasGroupNode[];
  const foreground = canvas.nodes.filter((n) => n.type !== "group");

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/8 px-4 py-2">
        <button
          type="button"
          onClick={addTextNode}
          className="rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/60 hover:text-white"
        >
          + Note
        </button>
        <button
          type="button"
          onClick={addGroupNode}
          className="rounded border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/60 hover:text-white"
        >
          + Group
        </button>
        <button
          type="button"
          onClick={onCreateCardAction}
          className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100 hover:border-cyan-400/50"
        >
          + Task
        </button>
        {selectedNodeId && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="rounded border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-rose-100 hover:border-rose-400/40"
          >
            Delete node
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
            className="rounded border border-white/10 bg-white/5 p-1 text-white/50 hover:text-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-12 text-center font-mono text-[10px] text-white/40">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
            className="rounded border border-white/10 bg-white/5 p-1 text-white/50 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Reset view"
            className="rounded border border-white/10 bg-white/5 p-1 text-white/50 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-[#050810] cursor-default select-none"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerLeave={onViewportPointerUp}
      >
        {/* Transformed canvas */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            width: canvasBounds.w,
            height: canvasBounds.h,
          }}
        >
          {/* Edge SVG */}
          <EdgeLayer
            edges={canvas.edges}
            nodes={canvas.nodes}
            canvasW={canvasBounds.w}
            canvasH={canvasBounds.h}
          />

          {/* Groups (behind) */}
          {groups.map((node) => (
            <GroupNodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={() => setSelectedNodeId(node.id)}
              onDragStart={onNodeDragStart}
            />
          ))}

          {/* Task & text nodes (front) */}
          {foreground.map((node) => {
            if (node.type === "task") {
              const card = cardMap.get(node.cardId);
              if (!card) return null;
              return (
                <TaskNodeCard
                  key={node.id}
                  node={node}
                  card={card}
                  selected={selectedNodeId === node.id || selectedCardId === card.id}
                  onSelect={() => {
                    setSelectedNodeId(node.id);
                    onSelectCardAction(card.id);
                  }}
                  onDragStart={onNodeDragStart}
                  onStatusChange={onMoveCardAction}
                />
              );
            }
            if (node.type === "text") {
              return (
                <TextNodeCard
                  key={node.id}
                  node={node}
                  selected={selectedNodeId === node.id}
                  onSelect={() => setSelectedNodeId(node.id)}
                  onDragStart={onNodeDragStart}
                  onTextChange={handleTextChange}
                />
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Zoom hint */}
      <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/15">
        Scroll to zoom · drag to pan
      </div>
    </div>
  );
}
