const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["chunks/agents.BUoiklxm.js","chunks/services.NrlqZpNE.js","chunks/InvestigationSummaryAgent.h8LP0CJK.js","chunks/BackgroundAgent.Bz6RECVn.js","chunks/MedicationAgent.CjbOUxMN.js","chunks/MTEERAgent.DtXYlnTp.js","chunks/PFOClosureAgent._oao8gHW.js","chunks/RightHeartCathAgent.DqBj-H9G.js"])))=>i.map(i=>d[i]);
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import "./chunks/modulepreload-polyfill.DaKOjhqt.js";
import { r as reactExports, a as reactDomExports, R as React } from "./chunks/vendor.CF6UFJB_.js";
import { L as LMStudioService, W as WhisperServerService } from "./chunks/services.NrlqZpNE.js";
import { M as MedicalAgent } from "./chunks/agents.BUoiklxm.js";
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var f$1 = reactExports, k$1 = Symbol.for("react.element"), l$1 = Symbol.for("react.fragment"), m$2 = Object.prototype.hasOwnProperty, n = f$1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p$1 = { key: true, ref: true, __self: true, __source: true };
function q$1(c2, a2, g2) {
  var b2, d2 = {}, e2 = null, h2 = null;
  void 0 !== g2 && (e2 = "" + g2);
  void 0 !== a2.key && (e2 = "" + a2.key);
  void 0 !== a2.ref && (h2 = a2.ref);
  for (b2 in a2) m$2.call(a2, b2) && !p$1.hasOwnProperty(b2) && (d2[b2] = a2[b2]);
  if (c2 && c2.defaultProps) for (b2 in a2 = c2.defaultProps, a2) void 0 === d2[b2] && (d2[b2] = a2[b2]);
  return { $$typeof: k$1, type: c2, key: e2, ref: h2, props: d2, _owner: n.current };
}
reactJsxRuntime_production_min.Fragment = l$1;
reactJsxRuntime_production_min.jsx = q$1;
reactJsxRuntime_production_min.jsxs = q$1;
{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}
var jsxRuntimeExports = jsxRuntime.exports;
var createRoot;
var m$1 = reactDomExports;
{
  createRoot = m$1.createRoot;
  m$1.hydrateRoot;
}
const WORKFLOWS = [
  // Documentation workflows - lighter processing, some using optimized models
  {
    id: "quick-letter",
    label: "Quick Letter",
    description: "Medical correspondence and consultation letters",
    agent: "QuickLetterAgent",
    icon: "FileText",
    color: "green",
    category: "documentation",
    estimatedTime: "1-3 min",
    complexity: "low"
  },
  {
    id: "consultation",
    label: "Consultation",
    description: "Comprehensive patient assessments",
    agent: "ConsultationAgent",
    icon: "Stethoscope",
    color: "blue",
    category: "documentation",
    estimatedTime: "2-4 min",
    complexity: "medium"
  },
  // Complex procedure workflows - detailed medical reports using full MedGemma-27b
  {
    id: "angiogram-pci",
    label: "Angiogram/PCI",
    description: "Cardiac catheterization and coronary interventions",
    agent: "AngiogramPCIAgent",
    icon: "Heart",
    color: "red",
    category: "procedure",
    estimatedTime: "8-15 min",
    complexity: "high"
  },
  {
    id: "tavi",
    label: "TAVI Report",
    description: "Transcatheter aortic valve implantation",
    agent: "TAVIAgent",
    icon: "CircleDot",
    color: "red",
    category: "procedure",
    estimatedTime: "8-12 min",
    complexity: "high"
  },
  {
    id: "mteer",
    label: "mTEER Report",
    description: "Mitral transcatheter edge-to-edge repair",
    agent: "MTEERAgent",
    icon: "Zap",
    color: "purple",
    category: "procedure",
    estimatedTime: "7-10 min",
    complexity: "high"
  },
  {
    id: "pfo-closure",
    label: "PFO Closure",
    description: "Patent foramen ovale closure",
    agent: "PFOClosureAgent",
    icon: "Shield",
    color: "green",
    category: "procedure",
    estimatedTime: "5-8 min",
    complexity: "medium"
  },
  {
    id: "right-heart-cath",
    label: "Right Heart Cath",
    description: "Right heart catheterisation with haemodynamic assessment",
    agent: "RightHeartCathAgent",
    icon: "Activity",
    color: "orange",
    category: "procedure",
    estimatedTime: "6-10 min",
    complexity: "medium"
  }
];
const MicIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m12 1 0 11" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m18 7c0 4.97-4.03 9-9 9s-9-4.03-9-9" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m12 20 0 3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m8 23 8 0" })
    ]
  }
);
const HeartIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" })
  }
);
const FileTextIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "14,2 14,8 20,8" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "10,9 9,9 8,9" })
    ]
  }
);
const ActivityIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "22,12 18,12 15,21 9,3 6,12 2,12" })
  }
);
const StethoscopeIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "20", cy: "10", r: "2" })
    ]
  }
);
const CircleDotIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "1" })
    ]
  }
);
const CopyIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })
    ]
  }
);
const CheckIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "20,6 9,17 4,12" })
  }
);
const AlertCircleIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
    ]
  }
);
const SquareIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" })
  }
);
const Volume2Icon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: "11,5 6,9 2,9 2,15 6,15 11,19" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" })
    ]
  }
);
const SearchIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "11", cy: "11", r: "8" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m21 21-4.35-4.35" })
    ]
  }
);
const UserIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "7", r: "4" })
    ]
  }
);
const PillIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M10.5 20.5 L3.5 13.5 L10.5 6.5 L17.5 13.5 Z" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13.5 3.5 L20.5 10.5 L13.5 17.5 L6.5 10.5 Z" })
    ]
  }
);
const ShieldIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
  }
);
const ChevronDownIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "6,9 12,15 18,9" })
  }
);
const ChevronUpIcon = ({ className, size = 20 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "18,15 12,9 6,15" })
  }
);
const iconMap = {
  Heart: HeartIcon,
  FileText: FileTextIcon,
  Activity: ActivityIcon,
  Stethoscope: StethoscopeIcon,
  CircleDot: CircleDotIcon,
  Mic: MicIcon,
  Square: SquareIcon,
  Search: SearchIcon,
  User: UserIcon,
  Pill: PillIcon,
  Shield: ShieldIcon
};
const WorkflowButtons = reactExports.memo(({
  onWorkflowSelect,
  activeWorkflow,
  isRecording,
  disabled = false,
  voiceActivityLevel = 0,
  recordingTime = 0
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const getButtonClasses = (workflow, isActive) => {
    const baseClasses = "relative w-full h-16 rounded-lg border-2 flex flex-col items-center justify-center p-2 font-medium text-[9px] leading-tight";
    const disabledClasses = "opacity-50 cursor-not-allowed";
    if (disabled) {
      return `${baseClasses} glass-button border-gray-300 ${disabledClasses}`;
    }
    if (isActive && isRecording) {
      const categoryClass2 = workflow.category === "procedure" ? "procedure-card" : workflow.category === "documentation" ? "documentation-card" : "investigation-card";
      return `${baseClasses} ${categoryClass2} recording-glow border-2`;
    }
    const categoryClass = workflow.category === "procedure" ? "btn-procedure-outline" : workflow.category === "documentation" ? "btn-documentation-outline" : "btn-investigation-outline";
    return `${baseClasses} ${categoryClass} border-2 btn-hover-enhanced`;
  };
  const renderWorkflowButton = (workflow) => {
    const IconComponent = iconMap[workflow.icon] || FileTextIcon;
    const isActive = activeWorkflow === workflow.id;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => onWorkflowSelect(workflow.id),
        disabled: disabled || isRecording && !isActive,
        className: getButtonClasses(workflow, isActive),
        title: `${workflow.description} • ${workflow.estimatedTime} • ${workflow.complexity} complexity`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-col items-center justify-center w-full h-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-1", children: [
              isActive && isRecording ? /* @__PURE__ */ jsxRuntimeExports.jsx(SquareIcon, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconComponent, { className: "w-4 h-4" }),
              isActive && isRecording && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 rounded-full bg-red-500/20 animate-ping" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[9px] font-semibold text-center leading-tight truncate w-full px-1 ${isActive && isRecording ? "text-red-700 font-bold" : ""}`, children: isActive && isRecording ? "Stop & Process" : workflow.label }),
            isActive && isRecording && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono mt-1 text-center font-bold bg-red-500/10 px-2 py-0.5 rounded", children: formatTime(recordingTime) }),
            isActive && isRecording && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-1 left-1/2 transform -translate-x-1/2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "w-6 h-0.5 rounded-full transition-all duration-150",
                style: {
                  backgroundColor: voiceActivityLevel > 0.1 ? "#10b981" : "#e5e7eb",
                  opacity: 0.3 + voiceActivityLevel * 0.7
                }
              }
            ) })
          ] }),
          isActive && isRecording && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2 right-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-red-500 rounded-full animate-pulse" }) })
        ]
      },
      workflow.id
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl p-3 w-full min-h-[140px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-gray-900 text-base font-semibold", children: "Select Workflow" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 text-[9px]", children: isRecording ? `Recording ${WORKFLOWS.find((w2) => w2.id === activeWorkflow)?.label}...` : "Choose the type of medical report to create" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2 mb-3", children: WORKFLOWS.map(renderWorkflowButton) }),
    !isRecording && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-gray-500 text-[9px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Tap workflow to start recording" }) }),
    isRecording && activeWorkflow && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-lg p-2 text-center bg-red-50 border border-red-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center space-x-2 mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-red-800 text-[9px] font-bold", children: [
          "Recording ",
          WORKFLOWS.find((w2) => w2.id === activeWorkflow)?.label
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-red-700 text-[9px] font-medium", children: [
        voiceActivityLevel > 0.1 ? "🎤 Listening..." : "🔇 Speak now",
        " • Tap ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Stop & Process" }),
        " when done"
      ] })
    ] })
  ] });
});
WorkflowButtons.displayName = "WorkflowButtons";
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().trim();
const createLucideIcon = (iconName, iconNode) => {
  const Component = reactExports.forwardRef(
    ({ color = "currentColor", size = 24, strokeWidth = 2, absoluteStrokeWidth, className = "", children, ...rest }, ref) => reactExports.createElement(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: ["lucide", `lucide-${toKebabCase(iconName)}`, className].join(" "),
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    )
  );
  Component.displayName = `${iconName}`;
  return Component;
};
const Activity = createLucideIcon("Activity", [
  ["path", { d: "M22 12h-4l-3 9L9 3l-3 9H2", key: "d5dnw9" }]
]);
const AlertCircle = createLucideIcon("AlertCircle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
]);
const AlertTriangle = createLucideIcon("AlertTriangle", [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
      key: "c3ski4"
    }
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
const ArrowLeft = createLucideIcon("ArrowLeft", [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
]);
const Bot = createLucideIcon("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);
const Brain = createLucideIcon("Brain", [
  [
    "path",
    {
      d: "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z",
      key: "1mhkh5"
    }
  ],
  [
    "path",
    {
      d: "M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z",
      key: "1d6s00"
    }
  ]
]);
const Calendar = createLucideIcon("Calendar", [
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", ry: "2", key: "eu3xkr" }],
  ["line", { x1: "16", x2: "16", y1: "2", y2: "6", key: "m3sa8f" }],
  ["line", { x1: "8", x2: "8", y1: "2", y2: "6", key: "18kwsl" }],
  ["line", { x1: "3", x2: "21", y1: "10", y2: "10", key: "xt86sb" }]
]);
const Camera = createLucideIcon("Camera", [
  [
    "path",
    {
      d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
      key: "1tc9qg"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "3", key: "1vg3eu" }]
]);
const CheckCircle = createLucideIcon("CheckCircle", [
  ["path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14", key: "g774vq" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
]);
const CheckSquare = createLucideIcon("CheckSquare", [
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }],
  ["path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", key: "1jnkn4" }]
]);
const Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);
const ChevronDown = createLucideIcon("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
const ChevronRight = createLucideIcon("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
const ChevronUp = createLucideIcon("ChevronUp", [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]]);
const Clock = createLucideIcon("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
const Copy = createLucideIcon("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);
const Download = createLucideIcon("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
const ExternalLink = createLucideIcon("ExternalLink", [
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }],
  ["polyline", { points: "15 3 21 3 21 9", key: "mznyad" }],
  ["line", { x1: "10", x2: "21", y1: "14", y2: "3", key: "18c3s4" }]
]);
const EyeOff = createLucideIcon("EyeOff", [
  ["path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24", key: "1jxqfv" }],
  [
    "path",
    {
      d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",
      key: "9wicm4"
    }
  ],
  [
    "path",
    { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61", key: "1jreej" }
  ],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }]
]);
const Eye = createLucideIcon("Eye", [
  ["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z", key: "rwhkz3" }],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
const FileText = createLucideIcon("FileText", [
  [
    "path",
    { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z", key: "1nnpy2" }
  ],
  ["polyline", { points: "14 2 14 8 20 8", key: "1ew0cm" }],
  ["line", { x1: "16", x2: "8", y1: "13", y2: "13", key: "14keom" }],
  ["line", { x1: "16", x2: "8", y1: "17", y2: "17", key: "17nazh" }],
  ["line", { x1: "10", x2: "8", y1: "9", y2: "9", key: "1a5vjj" }]
]);
const Filter = createLucideIcon("Filter", [
  ["polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3", key: "1yg77f" }]
]);
const Keyboard = createLucideIcon("Keyboard", [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", ry: "2", key: "15u882" }],
  ["path", { d: "M6 8h.001", key: "1ej0i3" }],
  ["path", { d: "M10 8h.001", key: "1x2st2" }],
  ["path", { d: "M14 8h.001", key: "1vkmyp" }],
  ["path", { d: "M18 8h.001", key: "kfsenl" }],
  ["path", { d: "M8 12h.001", key: "1sjpby" }],
  ["path", { d: "M12 12h.001", key: "al75ts" }],
  ["path", { d: "M16 12h.001", key: "931bgk" }],
  ["path", { d: "M7 16h10", key: "wp8him" }]
]);
const Loader2 = createLucideIcon("Loader2", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
const Mic = createLucideIcon("Mic", [
  ["path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z", key: "131961" }],
  ["path", { d: "M19 10v2a7 7 0 0 1-14 0v-2", key: "1vc78b" }],
  ["line", { x1: "12", x2: "12", y1: "19", y2: "22", key: "x3vr5v" }]
]);
const Pause = createLucideIcon("Pause", [
  ["rect", { width: "4", height: "16", x: "6", y: "4", key: "iffhe4" }],
  ["rect", { width: "4", height: "16", x: "14", y: "4", key: "sjin7j" }]
]);
const PenLine = createLucideIcon("PenLine", [
  ["path", { d: "M12 20h9", key: "t2du7b" }],
  ["path", { d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z", key: "ymcmye" }]
]);
const Pill = createLucideIcon("Pill", [
  [
    "path",
    { d: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z", key: "wa1lgi" }
  ],
  ["path", { d: "m8.5 8.5 7 7", key: "rvfmvr" }]
]);
const Play = createLucideIcon("Play", [
  ["polygon", { points: "5 3 19 12 5 21 5 3", key: "191637" }]
]);
const RefreshCw = createLucideIcon("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
const RotateCcw = createLucideIcon("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const Search = createLucideIcon("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
const Send = createLucideIcon("Send", [
  ["path", { d: "m22 2-7 20-4-9-9-4Z", key: "1q3vgg" }],
  ["path", { d: "M22 2 11 13", key: "nzbqef" }]
]);
const Server = createLucideIcon("Server", [
  ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2", key: "ngkwjq" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2", key: "iecqi9" }],
  ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
  ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }]
]);
const Settings = createLucideIcon("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
const Shield = createLucideIcon("Shield", [
  ["path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10", key: "1irkt0" }]
]);
const Star = createLucideIcon("Star", [
  [
    "polygon",
    {
      points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
      key: "8f66p6"
    }
  ]
]);
const Trash2 = createLucideIcon("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]);
const UserCheck = createLucideIcon("UserCheck", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["polyline", { points: "16 11 18 13 22 9", key: "1pwet4" }]
]);
const User = createLucideIcon("User", [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
]);
const Users = createLucideIcon("Users", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
]);
const Volume2 = createLucideIcon("Volume2", [
  ["polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5", key: "16drj5" }],
  ["path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07", key: "ltjumu" }],
  ["path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14", key: "1kegas" }]
]);
const WifiOff = createLucideIcon("WifiOff", [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
  ["path", { d: "M8.5 16.5a5 5 0 0 1 7 0", key: "sej527" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 4.17-2.65", key: "11utq1" }],
  ["path", { d: "M10.66 5c4.01-.36 8.14.9 11.34 3.76", key: "hxefdu" }],
  ["path", { d: "M16.85 11.25a10 10 0 0 1 2.22 1.68", key: "q734kn" }],
  ["path", { d: "M5 13a10 10 0 0 1 5.24-2.76", key: "piq4yl" }],
  ["line", { x1: "12", x2: "12.01", y1: "20", y2: "20", key: "of4bc4" }]
]);
const Wifi = createLucideIcon("Wifi", [
  ["path", { d: "M5 13a10 10 0 0 1 14 0", key: "6v8j51" }],
  ["path", { d: "M8.5 16.5a5 5 0 0 1 7 0", key: "sej527" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0", key: "dnpr2z" }],
  ["line", { x1: "12", x2: "12.01", y1: "20", y2: "20", key: "of4bc4" }]
]);
const X$1 = createLucideIcon("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
const Zap = createLucideIcon("Zap", [
  ["polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2", key: "45s27k" }]
]);
const TranscriptionDisplay = ({
  transcription,
  onEdit,
  isEditable = true,
  onCopy,
  onInsertToEMR,
  currentAgent,
  onAgentReprocess,
  isProcessing = false
}) => {
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [isExpanded, setIsExpanded] = reactExports.useState(true);
  const [editValue, setEditValue] = reactExports.useState(transcription);
  const [copiedRecently, setCopiedRecently] = reactExports.useState(false);
  const [insertedRecently, setInsertedRecently] = reactExports.useState(false);
  const [showReprocessDropdown, setShowReprocessDropdown] = reactExports.useState(false);
  const textareaRef = reactExports.useRef(null);
  const dropdownRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setEditValue(transcription);
  }, [transcription]);
  reactExports.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);
  const handleStartEdit = () => {
    if (!isEditable) return;
    setIsEditing(true);
  };
  const handleSaveEdit = () => {
    onEdit(editValue.trim());
    setIsEditing(false);
  };
  const handleCancelEdit = () => {
    setEditValue(transcription);
    setIsEditing(false);
  };
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter" && (e2.metaKey || e2.ctrlKey)) {
      e2.preventDefault();
      handleSaveEdit();
    } else if (e2.key === "Escape") {
      e2.preventDefault();
      handleCancelEdit();
    }
  };
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  reactExports.useEffect(() => {
    if (isEditing) {
      adjustTextareaHeight();
    }
  }, [isEditing, editValue]);
  const handleCopy = async () => {
    if (!onCopy || !transcription) return;
    try {
      await onCopy(transcription);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2e3);
    } catch (error) {
      console.error("Failed to copy transcription:", error);
    }
  };
  const handleInsertToEMR = async () => {
    if (!onInsertToEMR || !transcription) return;
    try {
      await onInsertToEMR(transcription);
      setInsertedRecently(true);
      setTimeout(() => setInsertedRecently(false), 2e3);
    } catch (error) {
      console.error("Failed to insert transcription to EMR:", error);
    }
  };
  const handleReprocess = (agentType) => {
    if (onAgentReprocess && !isProcessing) {
      onAgentReprocess(agentType);
      setShowReprocessDropdown(false);
    }
  };
  reactExports.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowReprocessDropdown(false);
      }
    };
    if (showReprocessDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showReprocessDropdown]);
  const getPreviewText = (text, maxLength = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };
  const availableAgents = [
    { id: "tavi", label: "TAVI", icon: "🫀" },
    { id: "angiogram-pci", label: "Angiogram/PCI", icon: "🩺" },
    { id: "quick-letter", label: "Quick Letter", icon: "📝" },
    { id: "consultation", label: "Consultation", icon: "👨‍⚕️" },
    { id: "investigation-summary", label: "Investigation", icon: "🔬" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-2xl p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Transcription" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-gray-500", children: [
          transcription.split(" ").length,
          " words"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        transcription && onCopy && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleCopy,
            className: "glass-button p-2 rounded-lg hover:bg-white/20 transition-colors",
            title: "Copy transcription to clipboard",
            children: copiedRecently ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-green-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4 text-gray-600" })
          }
        ),
        transcription && onInsertToEMR && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleInsertToEMR,
            className: "glass-button p-2 rounded-lg hover:bg-white/20 transition-colors",
            title: "Insert transcription to EMR",
            children: insertedRecently ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4 text-green-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "w-4 h-4 text-blue-600" })
          }
        ),
        transcription && onAgentReprocess && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref: dropdownRef, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowReprocessDropdown(!showReprocessDropdown),
              disabled: isProcessing,
              className: `glass-button p-2 rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-1 ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`,
              title: "Reprocess with different agent",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-4 h-4 text-purple-600 ${isProcessing ? "animate-spin" : ""}` }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-3 h-3 text-gray-500" })
              ]
            }
          ),
          showReprocessDropdown && !isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 min-w-[160px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-1", children: availableAgents.map((agent) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => handleReprocess(agent.id),
              className: `w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 ${currentAgent === agent.id ? "bg-blue-50 text-blue-700" : "text-gray-700"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: agent.icon }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: agent.label }),
                currentAgent === agent.id && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-xs text-blue-500", children: "Current" })
              ]
            },
            agent.id
          )) }) })
        ] }),
        isEditable && !isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleStartEdit,
            className: "glass-button p-2 rounded-lg hover:bg-white/20 transition-colors",
            title: "Edit transcription",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { className: "w-4 h-4 text-blue-600" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setIsExpanded(!isExpanded),
            className: "glass-button p-2 rounded-lg hover:bg-white/20 transition-colors",
            title: isExpanded ? "Collapse transcription" : "Expand transcription",
            children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-4 h-4 text-gray-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4 text-gray-600" })
          }
        )
      ] })
    ] }),
    isEditing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          ref: textareaRef,
          value: editValue,
          onChange: (e2) => {
            setEditValue(e2.target.value);
            adjustTextareaHeight();
          },
          onKeyDown: handleKeyDown,
          className: "w-full glass-input p-3 rounded-lg resize-none overflow-hidden text-sm leading-relaxed",
          placeholder: "Edit your transcription...",
          rows: 3
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleSaveEdit,
            className: "flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Save" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: handleCancelEdit,
            className: "flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Cancel" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-gray-500 text-xs", children: [
        "Press ",
        navigator.platform.toLowerCase().includes("mac") ? "⌘+Enter" : "Ctrl+Enter",
        " to save, Esc to cancel"
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gray-50/80 rounded-lg p-3 min-h-[60px] border border-gray-200/50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-900 text-sm leading-relaxed whitespace-pre-wrap", children: transcription || "Your transcription will appear here..." }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gray-50/80 rounded-lg p-3 border border-gray-200/50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-900 text-sm leading-relaxed", children: transcription ? getPreviewText(transcription) : "Your transcription will appear here..." }) }),
      transcription && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          transcription.split(" ").length,
          " words"
        ] }),
        isEditable && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Click ",
          isExpanded ? "edit to modify" : "expand to view full text"
        ] })
      ] })
    ] })
  ] });
};
const ReportDisplay = reactExports.memo(({
  results,
  agentType,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = reactExports.useState(true);
  const [showFullContent, setShowFullContent] = reactExports.useState(false);
  const reportMetrics = reactExports.useMemo(() => {
    const wordCount = results.split(/\s+/).filter((word) => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    const charCount = results.length;
    const lineCount = results.split("\n").length;
    return { wordCount, readingTime, charCount, lineCount };
  }, [results]);
  const shouldTruncate = results.length > 1e3;
  const displayContent = reactExports.useMemo(() => {
    if (!shouldTruncate || showFullContent) {
      return results;
    }
    return results.substring(0, 500) + "...";
  }, [results, shouldTruncate, showFullContent]);
  const reportSections = reactExports.useMemo(() => {
    const sections = [];
    const lines = displayContent.split("\n");
    let currentSection = { title: "", content: "" };
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^[A-Z][A-Z\s]+:?$/) || trimmedLine.match(/^[A-Z][a-z\s]+:$/)) {
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }
        currentSection = { title: trimmedLine.replace(":", ""), content: "" };
      } else if (trimmedLine) {
        currentSection.content += line + "\n";
      }
    }
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    if (sections.length === 0) {
      sections.push({ title: "Medical Report", content: displayContent });
    }
    return sections;
  }, [displayContent]);
  const getAgentDisplayName = (type) => {
    const names = {
      "tavi": "TAVI Report",
      "angiogram-pci": "Angiogram/PCI Report",
      "quick-letter": "Quick Letter",
      "consultation": "Consultation Report",
      "investigation-summary": "Investigation Summary",
      "background": "Background Summary",
      "medication": "Medication Review",
      "mteer": "mTEER Report",
      "tteer": "TTEER Report",
      "pfo-closure": "PFO Closure Report",
      "asd-closure": "ASD Closure Report",
      "pvl-plug": "PVL Plug Report",
      "bypass-graft": "Bypass Graft Report",
      "right-heart-cath": "Right Heart Catheterisation",
      "tavi-workup": "TAVI Workup",
      "ai-medical-review": "AI Medical Review",
      "batch-ai-review": "Batch AI Review",
      "enhancement": "Enhanced Report",
      "transcription": "Transcription",
      "generation": "Generated Report"
    };
    return type ? names[type] || type.toUpperCase() : "Medical Report";
  };
  if (!results) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `glass rounded-2xl overflow-hidden ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setIsExpanded(!isExpanded),
            className: "p-1 hover:bg-gray-100 rounded transition-colors",
            "aria-label": isExpanded ? "Collapse report" : "Expand report",
            children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "w-5 h-5 text-gray-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-5 h-5 text-gray-600" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-semibold text-sm", children: getAgentDisplayName(agentType) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-gray-600 text-xs mt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              reportMetrics.wordCount,
              " words"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-2", children: "•" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              reportMetrics.readingTime,
              " min read"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-2", children: "•" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: (/* @__PURE__ */ new Date()).toLocaleTimeString() })
          ] })
        ] })
      ] }),
      shouldTruncate && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setShowFullContent(!showFullContent),
          className: "text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors",
          children: showFullContent ? "Show Less" : "Show More"
        }
      )
    ] }) }),
    isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "report-content", children: [
      reportSections.length > 1 ? (
        // Structured sections display
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4 p-4", children: reportSections.map((section, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section", children: [
          section.title && /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2 text-sm", children: section.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-sm leading-relaxed whitespace-pre-wrap", children: section.content })
        ] }, index)) })
      ) : (
        // Single block content
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-sm leading-relaxed whitespace-pre-wrap font-mono", children: displayContent }) })
      ),
      shouldTruncate && !showFullContent && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setShowFullContent(true),
          className: "text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "Show complete report (",
              reportMetrics.charCount,
              " characters)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-4 h-4" })
          ]
        }
      ) })
    ] })
  ] });
});
ReportDisplay.displayName = "ReportDisplay";
const TranscriptionSection = reactExports.memo(({
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onAgentReprocess,
  currentAgent,
  isProcessing = false,
  className = ""
}) => {
  const [transcriptionExpanded, setTranscriptionExpanded] = reactExports.useState(false);
  const [transcriptionCopied, setTranscriptionCopied] = reactExports.useState(false);
  const [transcriptionInserted, setTranscriptionInserted] = reactExports.useState(false);
  const availableAgents = [
    { id: "tavi", label: "TAVI", icon: "🫀" },
    { id: "angiogram-pci", label: "Angiogram/PCI", icon: "🩺" },
    { id: "quick-letter", label: "Quick Letter", icon: "📝" },
    { id: "consultation", label: "Consultation", icon: "👨‍⚕️" },
    { id: "investigation-summary", label: "Investigation", icon: "🔬" }
  ];
  const handleTranscriptionCopy = async () => {
    if (onTranscriptionCopy) {
      try {
        await onTranscriptionCopy(originalTranscription);
        setTranscriptionCopied(true);
        setTimeout(() => setTranscriptionCopied(false), 2e3);
      } catch (error) {
        console.error("Failed to copy transcription:", error);
      }
    }
  };
  const handleTranscriptionInsert = async () => {
    if (onTranscriptionInsert) {
      try {
        await onTranscriptionInsert(originalTranscription);
        setTranscriptionInserted(true);
        setTimeout(() => setTranscriptionInserted(false), 2e3);
      } catch (error) {
        console.error("Failed to insert transcription:", error);
      }
    }
  };
  const handleReprocess = (agentType) => {
    if (onAgentReprocess && !isProcessing) {
      onAgentReprocess(agentType);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `border-b border-gray-200/50 ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setTranscriptionExpanded(!transcriptionExpanded),
        className: "w-full p-4 text-left hover:bg-gray-50/50 transition-colors flex items-center justify-between",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileTextIcon, { className: "w-4 h-4 text-gray-600" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 font-medium text-sm", children: "Original Transcription" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-gray-500", children: [
              originalTranscription.split(" ").length,
              " words"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            onTranscriptionCopy && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e2) => {
                  e2.stopPropagation();
                  handleTranscriptionCopy();
                },
                className: "p-1.5 rounded hover:bg-gray-100 transition-colors",
                title: "Copy transcription",
                children: transcriptionCopied ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { className: "w-3.5 h-3.5 text-green-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CopyIcon, { className: "w-3.5 h-3.5 text-gray-500" })
              }
            ),
            onTranscriptionInsert && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e2) => {
                  e2.stopPropagation();
                  handleTranscriptionInsert();
                },
                className: "p-1.5 rounded hover:bg-gray-100 transition-colors",
                title: "Insert transcription to EMR",
                children: transcriptionInserted ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { className: "w-3.5 h-3.5 text-green-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SquareIcon, { className: "w-3.5 h-3.5 text-blue-500" })
              }
            ),
            onAgentReprocess && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3.5 h-3.5 text-purple-500 ${isProcessing ? "animate-spin" : ""}` }) }),
            transcriptionExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUpIcon, { className: "w-4 h-4 text-gray-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { className: "w-4 h-4 text-gray-400" })
          ] })
        ]
      }
    ),
    transcriptionExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gray-50/80 rounded-lg p-3 border border-gray-200/50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-900 text-sm leading-relaxed whitespace-pre-wrap", children: originalTranscription }) }),
      onAgentReprocess && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 pt-3 border-t border-gray-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-600 mb-2", children: "Reprocess with different agent:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: availableAgents.map((agent) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => handleReprocess(agent.id),
            disabled: isProcessing,
            className: `px-2 py-1 text-xs rounded-md border transition-colors flex items-center space-x-1 ${currentAgent === agent.id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"} ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: agent.icon }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: agent.label }),
              currentAgent === agent.id && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-blue-500", children: "•" })
            ]
          },
          agent.id
        )) })
      ] })
    ] })
  ] });
});
TranscriptionSection.displayName = "TranscriptionSection";
const AIReviewCards = reactExports.memo(({
  reviewData,
  className = ""
}) => {
  const [acknowledgedFindings, setAcknowledgedFindings] = reactExports.useState(/* @__PURE__ */ new Set());
  reactExports.useEffect(() => {
    if (reviewData?.findings) {
      setAcknowledgedFindings(/* @__PURE__ */ new Set());
      console.log("🔄 Reset AI Review acknowledged findings for new review data");
    }
  }, [reviewData?.findings, reviewData?.timestamp]);
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "Immediate":
        return "red";
      case "Soon":
        return "amber";
      default:
        return "blue";
    }
  };
  const handleAcknowledgement = (index) => {
    const newAcknowledged = new Set(acknowledgedFindings);
    if (acknowledgedFindings.has(index)) {
      newAcknowledged.delete(index);
    } else {
      newAcknowledged.add(index);
    }
    setAcknowledgedFindings(newAcknowledged);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `space-y-3 ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Clinical Advisory Cards" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-500", children: [
        acknowledgedFindings.size,
        " of ",
        reviewData.findings.length,
        " reviewed"
      ] })
    ] }),
    reviewData.findings.map((finding, index) => {
      const isAcknowledged = acknowledgedFindings.has(index);
      const urgencyColor = getUrgencyColor(finding.urgency);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `border rounded-lg transition-all duration-300 ${isAcknowledged ? "opacity-60 border-gray-200 bg-gray-50" : `border-${urgencyColor}-200 bg-white`}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => handleAcknowledgement(index),
                className: `flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${isAcknowledged ? "bg-green-500 border-green-500" : `border-${urgencyColor}-300 hover:border-${urgencyColor}-400`}`,
                children: isAcknowledged && /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { className: "w-3 h-3 text-white" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: `font-medium text-sm ${isAcknowledged ? "text-gray-500" : "text-gray-900"}`, children: finding.finding }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgencyColor === "red" ? "bg-red-100 text-red-800" : urgencyColor === "amber" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`, children: finding.urgency }),
                finding.patientName && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800", children: finding.patientName })
              ] }),
              finding.patientFileNumber && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-500 mb-2", children: [
                "File: ",
                finding.patientFileNumber
              ] }),
              !isAcknowledged && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-700", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Guideline:" }),
                  " ",
                  finding.australianGuideline
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-700", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Reasoning:" }),
                  " ",
                  finding.clinicalReasoning
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-700", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Recommendation:" }),
                  " ",
                  finding.recommendedAction
                ] }),
                finding.heartFoundationLink && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "a",
                  {
                    href: finding.heartFoundationLink,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "text-blue-600 hover:text-blue-700 underline",
                    children: "Heart Foundation Resource →"
                  }
                ) })
              ] })
            ] })
          ] }) })
        },
        index
      );
    })
  ] });
});
AIReviewCards.displayName = "AIReviewCards";
const ActionButtons = reactExports.memo(({
  results,
  agentType,
  onCopy,
  onInsertToEMR,
  className = ""
}) => {
  const [copiedRecently, setCopiedRecently] = reactExports.useState(false);
  const [insertedRecently, setInsertedRecently] = reactExports.useState(false);
  const handleCopy = async () => {
    try {
      await onCopy(results);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2e3);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };
  const handleInsertToEMR = async () => {
    try {
      await onInsertToEMR(results);
      setInsertedRecently(true);
      setTimeout(() => setInsertedRecently(false), 2e3);
    } catch (error) {
      console.error("Failed to insert to EMR:", error);
    }
  };
  const handleDownload = () => {
    const blob = new Blob([results], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a");
    a2.href = url;
    a2.download = `medical-report-${agentType || "report"}-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a2);
    a2.click();
    document.body.removeChild(a2);
    URL.revokeObjectURL(url);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-4 border-t border-emerald-200/50 ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleCopy,
          className: `
            p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
            ${copiedRecently ? "bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration" : "bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700"}
          `,
          children: [
            copiedRecently ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { className: "w-4 h-4 text-emerald-600 checkmark-appear" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CopyIcon, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs ${copiedRecently ? "text-emerald-700" : "text-gray-700"}`, children: copiedRecently ? "Copied!" : "Copy" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleInsertToEMR,
          className: `
            p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
            ${insertedRecently ? "bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration" : "bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700"}
          `,
          children: [
            insertedRecently ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, { className: "w-4 h-4 text-emerald-600 checkmark-appear" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SquareIcon, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs ${insertedRecently ? "text-emerald-700" : "text-gray-700"}`, children: insertedRecently ? "Inserted!" : "Insert" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleDownload,
          className: "bg-white/60 border border-emerald-200 p-3 rounded-lg flex flex-col items-center space-y-1 hover:bg-emerald-50/60 transition-colors btn-micro-press btn-micro-hover",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 text-gray-700" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-gray-700", children: "Download" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "w-4 h-4 text-green-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-400 text-xs", children: "Report generated successfully" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-500 text-xs", children: "Confidence: 95%" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 p-2 bg-emerald-50/50 rounded-lg border border-emerald-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-emerald-700 text-xs", children: [
      "💡 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Full Letter:" }),
      " Complete medical correspondence ready for EMR insertion or sharing."
    ] }) })
  ] });
});
ActionButtons.displayName = "ActionButtons";
const WarningsPanel = reactExports.memo(({
  warnings = [],
  onDismissWarnings,
  className = ""
}) => {
  const [warningsExpanded, setWarningsExpanded] = reactExports.useState(false);
  if (!warnings || warnings.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setWarningsExpanded(!warningsExpanded),
        className: "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors",
        title: `${warnings.length} warning${warnings.length !== 1 ? "s" : ""} - click to ${warningsExpanded ? "hide" : "view"}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "w-3 h-3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: warnings.length })
        ]
      }
    ),
    warningsExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `p-4 border-b border-orange-200/50 bg-orange-50/30 ${className}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-orange-800 font-medium text-sm mb-2", children: "Content Warnings" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1", children: warnings.map((warning, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-orange-700 text-sm leading-relaxed", children: [
          "• ",
          warning
        ] }, index)) }),
        onDismissWarnings && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              onDismissWarnings();
              setWarningsExpanded(false);
            },
            className: "mt-3 text-orange-600 hover:text-orange-700 text-xs font-medium transition-colors",
            children: "Dismiss warnings"
          }
        )
      ] })
    ] }) })
  ] });
});
WarningsPanel.displayName = "WarningsPanel";
const AudioPlayback = ({
  audioBlob,
  fileName = "investigation-audio",
  className = "",
  onAnalysisUpdate
}) => {
  const [isPlaying, setIsPlaying] = reactExports.useState(false);
  const [currentTime, setCurrentTime] = reactExports.useState(0);
  const [duration, setDuration] = reactExports.useState(0);
  const [playbackRate, setPlaybackRate] = reactExports.useState(1);
  const [volume, setVolume] = reactExports.useState(1);
  const [waveformData, setWaveformData] = reactExports.useState([]);
  const [audioUrl, setAudioUrl] = reactExports.useState("");
  const [analysis, setAnalysis] = reactExports.useState(null);
  const audioRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const animationFrameRef = reactExports.useRef();
  reactExports.useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);
  const analyzeAudio = reactExports.useCallback(async () => {
    if (!audioBlob) return;
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration2 = audioBuffer.duration;
      let sum = 0;
      let silenceSamples = 0;
      const silenceThreshold = 0.01;
      for (let i2 = 0; i2 < channelData.length; i2++) {
        const abs = Math.abs(channelData[i2]);
        sum += abs;
        if (abs < silenceThreshold) {
          silenceSamples++;
        }
      }
      const avgVolume = sum / channelData.length;
      const silenceDuration = silenceSamples / sampleRate;
      const sortedSamples = [...channelData].map(Math.abs).sort((a2, b2) => a2 - b2);
      const noiseFloor = sortedSamples[Math.floor(sortedSamples.length * 0.1)];
      const signalLevel = sortedSamples[Math.floor(sortedSamples.length * 0.9)];
      const estimatedSNR = signalLevel > 0 ? 20 * Math.log10(signalLevel / (noiseFloor + 1e-3)) : 0;
      let quality = "good";
      if (avgVolume < 5e-3 || silenceDuration > duration2 * 0.8 || estimatedSNR < 10) {
        quality = "poor";
      } else if (avgVolume < 0.02 || silenceDuration > duration2 * 0.5 || estimatedSNR < 20) {
        quality = "fair";
      }
      const waveformPoints = 200;
      const blockSize = Math.floor(channelData.length / waveformPoints);
      const waveform = [];
      for (let i2 = 0; i2 < waveformPoints; i2++) {
        let blockSum = 0;
        const start = i2 * blockSize;
        const end = Math.min(start + blockSize, channelData.length);
        for (let j2 = start; j2 < end; j2++) {
          blockSum += Math.abs(channelData[j2]);
        }
        waveform.push(blockSum / (end - start));
      }
      const analysisResult = {
        duration: duration2,
        fileSize: audioBlob.size,
        quality,
        avgVolume,
        silenceDuration,
        estimatedSNR
      };
      setWaveformData(waveform);
      setAnalysis(analysisResult);
      onAnalysisUpdate?.(analysisResult);
      await audioContext.close();
    } catch (error) {
      console.error("Audio analysis failed:", error);
    }
  }, [audioBlob, onAnalysisUpdate]);
  reactExports.useEffect(() => {
    if (audioUrl) {
      analyzeAudio();
    }
  }, [audioUrl, analyzeAudio]);
  const drawWaveform = reactExports.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length || !duration) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const progress = currentTime / duration;
    ctx.clearRect(0, 0, width, height);
    const barWidth = width / waveformData.length;
    const maxAmplitude = Math.max(...waveformData);
    waveformData.forEach((amplitude, i2) => {
      const barHeight = amplitude / maxAmplitude * height * 0.8;
      const x2 = i2 * barWidth;
      const y2 = (height - barHeight) / 2;
      const barProgress = i2 / waveformData.length;
      ctx.fillStyle = barProgress <= progress ? "#3b82f6" : "#e5e7eb";
      ctx.fillRect(x2, y2, Math.max(1, barWidth - 1), barHeight);
    });
    const progressX = progress * width;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
  }, [waveformData, currentTime, duration]);
  reactExports.useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  const handleEnded = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  const seekTo = (percentage) => {
    if (!audioRef.current || !duration) return;
    const newTime = percentage / 100 * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  const handleWaveformClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x2 = event.clientX - rect.left;
    const percentage = x2 / rect.width * 100;
    seekTo(percentage);
  };
  const resetPlayback = () => {
    seekTo(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  const downloadAudio = () => {
    const url = URL.createObjectURL(audioBlob);
    const a2 = document.createElement("a");
    a2.href = url;
    a2.download = `${fileName}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
    document.body.appendChild(a2);
    a2.click();
    document.body.removeChild(a2);
    URL.revokeObjectURL(url);
  };
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const getQualityColor = (quality) => {
    switch (quality) {
      case "good":
        return "text-green-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };
  const getQualityIcon = (quality) => {
    switch (quality) {
      case "good":
        return "✅";
      case "fair":
        return "⚠️";
      case "poor":
        return "❌";
      default:
        return "❓";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `space-y-4 p-4 bg-gray-50 rounded-lg border ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "audio",
      {
        ref: audioRef,
        src: audioUrl,
        onTimeUpdate: handleTimeUpdate,
        onLoadedMetadata: handleLoadedMetadata,
        onEnded: handleEnded,
        onRateChange: () => setPlaybackRate(audioRef.current?.playbackRate || 1),
        preload: "metadata"
      }
    ),
    analysis && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Quality:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-medium ${getQualityColor(analysis.quality)}`, children: [
            getQualityIcon(analysis.quality),
            " ",
            analysis.quality.toUpperCase()
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Duration:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900", children: formatTime(analysis.duration) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "File Size:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-900", children: [
            (analysis.fileSize / 1024).toFixed(1),
            "KB"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Avg Volume:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-900", children: [
            (analysis.avgVolume * 100).toFixed(1),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Silence:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900", children: formatTime(analysis.silenceDuration) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Est. SNR:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-900", children: [
            analysis.estimatedSNR.toFixed(1),
            "dB"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "canvas",
        {
          ref: canvasRef,
          width: 400,
          height: 80,
          className: "w-full h-20 bg-white rounded border cursor-pointer",
          onClick: handleWaveformClick
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(currentTime) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Click waveform to seek" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(duration) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: togglePlayback,
            className: "flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors",
            disabled: !audioUrl,
            children: isPlaying ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { className: "w-5 h-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "w-5 h-5 ml-1" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: resetPlayback,
            className: "flex items-center justify-center w-8 h-8 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full transition-colors",
            disabled: !audioUrl,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { className: "w-4 h-4 text-gray-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "range",
              min: "0",
              max: "1",
              step: "0.1",
              value: volume,
              onChange: (e2) => {
                const newVolume = parseFloat(e2.target.value);
                setVolume(newVolume);
                if (audioRef.current) {
                  audioRef.current.volume = newVolume;
                }
              },
              className: "w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: playbackRate,
            onChange: (e2) => {
              const rate = parseFloat(e2.target.value);
              setPlaybackRate(rate);
              if (audioRef.current) {
                audioRef.current.playbackRate = rate;
              }
            },
            className: "text-xs bg-white border border-gray-300 rounded px-2 py-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0.5, children: "0.5x" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0.75, children: "0.75x" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1.0x" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1.25, children: "1.25x" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1.5, children: "1.5x" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2.0x" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: downloadAudio,
            className: "flex items-center justify-center w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded transition-colors",
            title: "Download audio file",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4" })
          }
        )
      ] })
    ] }),
    analysis && analysis.quality !== "good" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-yellow-50 border-l-4 border-yellow-400 p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-yellow-700 font-medium", children: "Audio Quality Issues Detected" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-xs text-yellow-600 space-y-1", children: [
        analysis.avgVolume < 5e-3 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "• Recording is very quiet - check microphone levels" }),
        analysis.silenceDuration > analysis.duration * 0.5 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "• Recording contains significant silence" }),
        analysis.estimatedSNR < 15 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "• High background noise detected" }),
        analysis.duration < 2 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "• Recording is very short - may affect transcription accuracy" })
      ] })
    ] }) }) })
  ] });
};
const TroubleshootingSection = reactExports.memo(({
  failedAudioRecordings,
  errors,
  onClearFailedRecordings,
  className = ""
}) => {
  const [troubleshootingExpanded, setTroubleshootingExpanded] = reactExports.useState(false);
  const [selectedFailedRecording, setSelectedFailedRecording] = reactExports.useState(null);
  const shouldShow = failedAudioRecordings.length > 0 && errors.length > 0 && errors.some(
    (error) => error.includes("could not be parsed coherently") || error.includes("Investigation dictation could not be parsed")
  );
  if (!shouldShow) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `border-t border-red-200/50 bg-red-50/30 ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setTroubleshootingExpanded(!troubleshootingExpanded),
        className: "w-full p-4 text-left hover:bg-red-50/50 transition-colors flex items-center justify-between",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2Icon, { className: "w-4 h-4 text-red-600" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-900 font-medium text-sm", children: "🔊 Troubleshoot Audio Recording" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full", children: [
              failedAudioRecordings.length,
              " recording",
              failedAudioRecordings.length !== 1 ? "s" : ""
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            onClearFailedRecordings && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e2) => {
                  e2.stopPropagation();
                  onClearFailedRecordings();
                },
                className: "p-1.5 rounded hover:bg-red-100 transition-colors",
                title: "Clear all failed recordings",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5 text-red-500" })
              }
            ),
            troubleshootingExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUpIcon, { className: "w-4 h-4 text-red-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDownIcon, { className: "w-4 h-4 text-red-400" })
          ] })
        ]
      }
    ),
    troubleshootingExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-red-700 bg-red-100/50 p-3 rounded-lg border border-red-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: "Investigation parsing failed" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-600 mt-1 text-xs", children: "The recording could not be processed into a structured investigation summary. Use the audio playback below to identify potential issues:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-2 text-xs text-red-600 space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "• Check if audio is too quiet or contains too much silence" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "• Verify medical terminology is clearly spoken" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "• Ensure recording duration is adequate (≥2 seconds)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "• Look for background noise or audio quality issues" })
          ] })
        ] })
      ] }) }),
      failedAudioRecordings.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-red-700 mb-2", children: "Select recording to troubleshoot:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-2", children: failedAudioRecordings.map((recording, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setSelectedFailedRecording(recording),
            className: `p-3 rounded-lg border text-left transition-colors ${selectedFailedRecording?.id === recording.id ? "bg-red-100 border-red-300 text-red-800" : "bg-white border-red-200 hover:bg-red-50 text-red-700"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium text-sm", children: [
                  "Recording #",
                  failedAudioRecordings.length - index
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs opacity-75 mt-1", children: [
                  new Date(recording.timestamp).toLocaleString(),
                  " •",
                  recording.metadata.recordingTime,
                  "s •",
                  (recording.metadata.fileSize / 1024).toFixed(1),
                  "KB"
                ] })
              ] }),
              selectedFailedRecording?.id === recording.id && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-red-500 rounded-full" })
            ] })
          },
          recording.id
        )) })
      ] }),
      (selectedFailedRecording || failedAudioRecordings.length === 1) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-red-700 mb-1", children: "Audio Playback & Analysis" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-600", children: "Listen to the recording and check the audio quality metrics below:" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AudioPlayback,
          {
            audioBlob: (selectedFailedRecording || failedAudioRecordings[0]).audioBlob,
            fileName: `investigation-failed-${(selectedFailedRecording || failedAudioRecordings[0]).agentType}`,
            className: "border-red-200"
          }
        ),
        (selectedFailedRecording || failedAudioRecordings[0]).transcriptionAttempt && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h5", { className: "text-sm font-medium text-red-700 mb-2", children: "Transcription Result:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white p-3 rounded-lg border border-red-200 text-sm text-gray-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "whitespace-pre-wrap", children: (selectedFailedRecording || failedAudioRecordings[0]).transcriptionAttempt }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-600 mt-2", children: "The transcription above was successful, but could not be parsed into a structured investigation summary." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h5", { className: "text-sm font-medium text-red-700 mb-2", children: "Error Details:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 p-3 rounded-lg border border-red-200", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-800 font-mono", children: (selectedFailedRecording || failedAudioRecordings[0]).errorMessage }) })
        ] })
      ] })
    ] }) })
  ] });
});
TroubleshootingSection.displayName = "TroubleshootingSection";
const OptimizedResultsPanel = reactExports.memo(({
  results,
  agentType,
  onCopy,
  onInsertToEMR,
  warnings = [],
  onDismissWarnings,
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  currentAgent,
  onAgentReprocess,
  isProcessing = false,
  failedAudioRecordings = [],
  onClearFailedRecordings,
  errors = [],
  reviewData
}) => {
  const [isExpanded, setIsExpanded] = reactExports.useState(true);
  const reportMetrics = reactExports.useMemo(() => {
    const wordCount = results.split(/\s+/).filter((word) => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    return { wordCount, readingTime };
  }, [results]);
  const isAIReview = agentType === "ai-medical-review" && reviewData?.findings;
  const renderHeader = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-emerald-200/50", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center space-x-2", children: isAIReview ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircleIcon, { className: "w-4 h-4 text-blue-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: reviewData.isBatchReview ? "Batch AI Medical Review" : "AI Medical Review" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-blue-700 text-xs", children: reviewData.isBatchReview ? "Multi-patient clinical oversight recommendations" : "Australian clinical oversight recommendations" })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileTextIcon, { className: "w-4 h-4 text-emerald-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Full Letter" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-emerald-700 text-xs", children: "Complete medical correspondence" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setIsExpanded(!isExpanded),
          className: "bg-white/60 border border-emerald-200 p-2 rounded-lg hover:bg-emerald-50/60 transition-colors",
          title: isExpanded ? "Collapse" : "Expand",
          children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-4 h-4 text-emerald-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4 text-emerald-600" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4 mt-2 text-xs", children: [
      isAIReview ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-blue-600 flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          reviewData.findings.length,
          " clinical findings"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          reviewData.findings.filter((f2) => f2.urgency === "Immediate").length,
          " immediate"
        ] }),
        reviewData.isBatchReview && reviewData.batchSummary && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            reviewData.batchSummary.totalPatients,
            " patients"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: (/* @__PURE__ */ new Date()).toLocaleTimeString() }),
        warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-emerald-600 flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          reportMetrics.wordCount,
          " words"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          reportMetrics.readingTime,
          " min read"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: (/* @__PURE__ */ new Date()).toLocaleTimeString() }),
        warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" })
      ] }),
      warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        WarningsPanel,
        {
          warnings,
          onDismissWarnings
        }
      )
    ] })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "letter-card rounded-2xl overflow-hidden shadow-lg border", children: [
    renderHeader(),
    originalTranscription && /* @__PURE__ */ jsxRuntimeExports.jsx(
      TranscriptionSection,
      {
        originalTranscription,
        onTranscriptionCopy,
        onTranscriptionInsert,
        onAgentReprocess,
        currentAgent,
        isProcessing
      }
    ),
    isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: isAIReview ? /* @__PURE__ */ jsxRuntimeExports.jsx(AIReviewCards, { reviewData }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      ReportDisplay,
      {
        results,
        agentType
      }
    ) }),
    !isAIReview && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ActionButtons,
      {
        results,
        agentType,
        onCopy,
        onInsertToEMR
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TroubleshootingSection,
      {
        failedAudioRecordings,
        errors,
        onClearFailedRecordings
      }
    )
  ] });
});
OptimizedResultsPanel.displayName = "OptimizedResultsPanel";
function r(n2, r2) {
  void 0 === r2 && (r2 = {});
  var o2 = r2.insertAt;
  if (n2 && "undefined" != typeof document) {
    var a2 = document.head || document.getElementsByTagName("head")[0], e2 = document.createElement("style");
    e2.type = "text/css", "top" === o2 && a2.firstChild ? a2.insertBefore(e2, a2.firstChild) : a2.appendChild(e2), e2.styleSheet ? e2.styleSheet.cssText = n2 : e2.appendChild(document.createTextNode(n2));
  }
}
r('.react-loading-indicator-normalize,\n[class$=rli-bounding-box] {\n  font-size: 1rem;\n  display: inline-block;\n  box-sizing: border-box;\n  text-align: unset;\n  isolation: isolate;\n}\n\n.rli-d-i-b {\n  display: inline-block;\n}\n\n.rli-text-format {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  font-weight: 600;\n  width: 90%;\n  text-transform: uppercase;\n  text-align: center;\n  font-size: 0.7em;\n  letter-spacing: 0.5px;\n  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Avenir Next", "Avenir", "Segoe UI", "Lucida Grande", "Helvetica Neue", "Helvetica", "Fira Sans", "Roboto", "Noto", "Droid Sans", "Cantarell", "Oxygen", "Ubuntu", "Franklin Gothic Medium", "Century Gothic", "Liberation Sans", sans-serif;\n}');
var o = function() {
  return o = Object.assign || function(n2) {
    for (var r2, o2 = 1, a2 = arguments.length; o2 < a2; o2++) for (var e2 in r2 = arguments[o2]) Object.prototype.hasOwnProperty.call(r2, e2) && (n2[e2] = r2[e2]);
    return n2;
  }, o.apply(this, arguments);
};
function a(n2) {
  return a = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(n3) {
    return typeof n3;
  } : function(n3) {
    return n3 && "function" == typeof Symbol && n3.constructor === Symbol && n3 !== Symbol.prototype ? "symbol" : typeof n3;
  }, a(n2);
}
"function" == typeof SuppressedError && SuppressedError;
var e = /^\s+/, t = /\s+$/;
function i(n2, r2) {
  if (r2 = r2 || {}, (n2 = n2 || "") instanceof i) return n2;
  if (!(this instanceof i)) return new i(n2, r2);
  var o2 = function(n3) {
    var r3 = { r: 0, g: 0, b: 0 }, o3 = 1, i2 = null, l2 = null, s2 = null, c2 = false, u2 = false;
    "string" == typeof n3 && (n3 = function(n4) {
      n4 = n4.replace(e, "").replace(t, "").toLowerCase();
      var r4, o4 = false;
      if (P[n4]) n4 = P[n4], o4 = true;
      else if ("transparent" == n4) return { r: 0, g: 0, b: 0, a: 0, format: "name" };
      if (r4 = R.rgb.exec(n4)) return { r: r4[1], g: r4[2], b: r4[3] };
      if (r4 = R.rgba.exec(n4)) return { r: r4[1], g: r4[2], b: r4[3], a: r4[4] };
      if (r4 = R.hsl.exec(n4)) return { h: r4[1], s: r4[2], l: r4[3] };
      if (r4 = R.hsla.exec(n4)) return { h: r4[1], s: r4[2], l: r4[3], a: r4[4] };
      if (r4 = R.hsv.exec(n4)) return { h: r4[1], s: r4[2], v: r4[3] };
      if (r4 = R.hsva.exec(n4)) return { h: r4[1], s: r4[2], v: r4[3], a: r4[4] };
      if (r4 = R.hex8.exec(n4)) return { r: z(r4[1]), g: z(r4[2]), b: z(r4[3]), a: C(r4[4]), format: o4 ? "name" : "hex8" };
      if (r4 = R.hex6.exec(n4)) return { r: z(r4[1]), g: z(r4[2]), b: z(r4[3]), format: o4 ? "name" : "hex" };
      if (r4 = R.hex4.exec(n4)) return { r: z(r4[1] + "" + r4[1]), g: z(r4[2] + "" + r4[2]), b: z(r4[3] + "" + r4[3]), a: C(r4[4] + "" + r4[4]), format: o4 ? "name" : "hex8" };
      if (r4 = R.hex3.exec(n4)) return { r: z(r4[1] + "" + r4[1]), g: z(r4[2] + "" + r4[2]), b: z(r4[3] + "" + r4[3]), format: o4 ? "name" : "hex" };
      return false;
    }(n3));
    "object" == a(n3) && (J(n3.r) && J(n3.g) && J(n3.b) ? (d2 = n3.r, p2 = n3.g, b2 = n3.b, r3 = { r: 255 * S(d2, 255), g: 255 * S(p2, 255), b: 255 * S(b2, 255) }, c2 = true, u2 = "%" === String(n3.r).substr(-1) ? "prgb" : "rgb") : J(n3.h) && J(n3.s) && J(n3.v) ? (i2 = _(n3.s), l2 = _(n3.v), r3 = function(n4, r4, o4) {
      n4 = 6 * S(n4, 360), r4 = S(r4, 100), o4 = S(o4, 100);
      var a2 = Math.floor(n4), e2 = n4 - a2, t2 = o4 * (1 - r4), i3 = o4 * (1 - e2 * r4), l3 = o4 * (1 - (1 - e2) * r4), s3 = a2 % 6, c3 = [o4, i3, t2, t2, l3, o4][s3], u3 = [l3, o4, o4, i3, t2, t2][s3], d3 = [t2, t2, l3, o4, o4, i3][s3];
      return { r: 255 * c3, g: 255 * u3, b: 255 * d3 };
    }(n3.h, i2, l2), c2 = true, u2 = "hsv") : J(n3.h) && J(n3.s) && J(n3.l) && (i2 = _(n3.s), s2 = _(n3.l), r3 = function(n4, r4, o4) {
      var a2, e2, t2;
      function i3(n5, r5, o5) {
        return o5 < 0 && (o5 += 1), o5 > 1 && (o5 -= 1), o5 < 1 / 6 ? n5 + 6 * (r5 - n5) * o5 : o5 < 0.5 ? r5 : o5 < 2 / 3 ? n5 + (r5 - n5) * (2 / 3 - o5) * 6 : n5;
      }
      if (n4 = S(n4, 360), r4 = S(r4, 100), o4 = S(o4, 100), 0 === r4) a2 = e2 = t2 = o4;
      else {
        var l3 = o4 < 0.5 ? o4 * (1 + r4) : o4 + r4 - o4 * r4, s3 = 2 * o4 - l3;
        a2 = i3(s3, l3, n4 + 1 / 3), e2 = i3(s3, l3, n4), t2 = i3(s3, l3, n4 - 1 / 3);
      }
      return { r: 255 * a2, g: 255 * e2, b: 255 * t2 };
    }(n3.h, i2, s2), c2 = true, u2 = "hsl"), n3.hasOwnProperty("a") && (o3 = n3.a));
    var d2, p2, b2;
    return o3 = E(o3), { ok: c2, format: n3.format || u2, r: Math.min(255, Math.max(r3.r, 0)), g: Math.min(255, Math.max(r3.g, 0)), b: Math.min(255, Math.max(r3.b, 0)), a: o3 };
  }(n2);
  this._originalInput = n2, this._r = o2.r, this._g = o2.g, this._b = o2.b, this._a = o2.a, this._roundA = Math.round(100 * this._a) / 100, this._format = r2.format || o2.format, this._gradientType = r2.gradientType, this._r < 1 && (this._r = Math.round(this._r)), this._g < 1 && (this._g = Math.round(this._g)), this._b < 1 && (this._b = Math.round(this._b)), this._ok = o2.ok;
}
function l(n2, r2, o2) {
  n2 = S(n2, 255), r2 = S(r2, 255), o2 = S(o2, 255);
  var a2, e2, t2 = Math.max(n2, r2, o2), i2 = Math.min(n2, r2, o2), l2 = (t2 + i2) / 2;
  if (t2 == i2) a2 = e2 = 0;
  else {
    var s2 = t2 - i2;
    switch (e2 = l2 > 0.5 ? s2 / (2 - t2 - i2) : s2 / (t2 + i2), t2) {
      case n2:
        a2 = (r2 - o2) / s2 + (r2 < o2 ? 6 : 0);
        break;
      case r2:
        a2 = (o2 - n2) / s2 + 2;
        break;
      case o2:
        a2 = (n2 - r2) / s2 + 4;
    }
    a2 /= 6;
  }
  return { h: a2, s: e2, l: l2 };
}
function s(n2, r2, o2) {
  n2 = S(n2, 255), r2 = S(r2, 255), o2 = S(o2, 255);
  var a2, e2, t2 = Math.max(n2, r2, o2), i2 = Math.min(n2, r2, o2), l2 = t2, s2 = t2 - i2;
  if (e2 = 0 === t2 ? 0 : s2 / t2, t2 == i2) a2 = 0;
  else {
    switch (t2) {
      case n2:
        a2 = (r2 - o2) / s2 + (r2 < o2 ? 6 : 0);
        break;
      case r2:
        a2 = (o2 - n2) / s2 + 2;
        break;
      case o2:
        a2 = (n2 - r2) / s2 + 4;
    }
    a2 /= 6;
  }
  return { h: a2, s: e2, v: l2 };
}
function c(n2, r2, o2, a2) {
  var e2 = [A(Math.round(n2).toString(16)), A(Math.round(r2).toString(16)), A(Math.round(o2).toString(16))];
  return a2 && e2[0].charAt(0) == e2[0].charAt(1) && e2[1].charAt(0) == e2[1].charAt(1) && e2[2].charAt(0) == e2[2].charAt(1) ? e2[0].charAt(0) + e2[1].charAt(0) + e2[2].charAt(0) : e2.join("");
}
function u(n2, r2, o2, a2) {
  return [A(T(a2)), A(Math.round(n2).toString(16)), A(Math.round(r2).toString(16)), A(Math.round(o2).toString(16))].join("");
}
function d(n2, r2) {
  r2 = 0 === r2 ? 0 : r2 || 10;
  var o2 = i(n2).toHsl();
  return o2.s -= r2 / 100, o2.s = N(o2.s), i(o2);
}
function p(n2, r2) {
  r2 = 0 === r2 ? 0 : r2 || 10;
  var o2 = i(n2).toHsl();
  return o2.s += r2 / 100, o2.s = N(o2.s), i(o2);
}
function b(n2) {
  return i(n2).desaturate(100);
}
function h(n2, r2) {
  r2 = 0 === r2 ? 0 : r2 || 10;
  var o2 = i(n2).toHsl();
  return o2.l += r2 / 100, o2.l = N(o2.l), i(o2);
}
function m(n2, r2) {
  r2 = 0 === r2 ? 0 : r2 || 10;
  var o2 = i(n2).toRgb();
  return o2.r = Math.max(0, Math.min(255, o2.r - Math.round(-r2 / 100 * 255))), o2.g = Math.max(0, Math.min(255, o2.g - Math.round(-r2 / 100 * 255))), o2.b = Math.max(0, Math.min(255, o2.b - Math.round(-r2 / 100 * 255))), i(o2);
}
function g(n2, r2) {
  r2 = 0 === r2 ? 0 : r2 || 10;
  var o2 = i(n2).toHsl();
  return o2.l -= r2 / 100, o2.l = N(o2.l), i(o2);
}
function f(n2, r2) {
  var o2 = i(n2).toHsl(), a2 = (o2.h + r2) % 360;
  return o2.h = a2 < 0 ? 360 + a2 : a2, i(o2);
}
function v(n2) {
  var r2 = i(n2).toHsl();
  return r2.h = (r2.h + 180) % 360, i(r2);
}
function y(n2, r2) {
  if (isNaN(r2) || r2 <= 0) throw new Error("Argument to polyad must be a positive number");
  for (var o2 = i(n2).toHsl(), a2 = [i(n2)], e2 = 360 / r2, t2 = 1; t2 < r2; t2++) a2.push(i({ h: (o2.h + t2 * e2) % 360, s: o2.s, l: o2.l }));
  return a2;
}
function x(n2) {
  var r2 = i(n2).toHsl(), o2 = r2.h;
  return [i(n2), i({ h: (o2 + 72) % 360, s: r2.s, l: r2.l }), i({ h: (o2 + 216) % 360, s: r2.s, l: r2.l })];
}
function k(n2, r2, o2) {
  r2 = r2 || 6, o2 = o2 || 30;
  var a2 = i(n2).toHsl(), e2 = 360 / o2, t2 = [i(n2)];
  for (a2.h = (a2.h - (e2 * r2 >> 1) + 720) % 360; --r2; ) a2.h = (a2.h + e2) % 360, t2.push(i(a2));
  return t2;
}
function O(n2, r2) {
  r2 = r2 || 6;
  for (var o2 = i(n2).toHsv(), a2 = o2.h, e2 = o2.s, t2 = o2.v, l2 = [], s2 = 1 / r2; r2--; ) l2.push(i({ h: a2, s: e2, v: t2 })), t2 = (t2 + s2) % 1;
  return l2;
}
i.prototype = { isDark: function() {
  return this.getBrightness() < 128;
}, isLight: function() {
  return !this.isDark();
}, isValid: function() {
  return this._ok;
}, getOriginalInput: function() {
  return this._originalInput;
}, getFormat: function() {
  return this._format;
}, getAlpha: function() {
  return this._a;
}, getBrightness: function() {
  var n2 = this.toRgb();
  return (299 * n2.r + 587 * n2.g + 114 * n2.b) / 1e3;
}, getLuminance: function() {
  var n2, r2, o2, a2 = this.toRgb();
  return n2 = a2.r / 255, r2 = a2.g / 255, o2 = a2.b / 255, 0.2126 * (n2 <= 0.03928 ? n2 / 12.92 : Math.pow((n2 + 0.055) / 1.055, 2.4)) + 0.7152 * (r2 <= 0.03928 ? r2 / 12.92 : Math.pow((r2 + 0.055) / 1.055, 2.4)) + 0.0722 * (o2 <= 0.03928 ? o2 / 12.92 : Math.pow((o2 + 0.055) / 1.055, 2.4));
}, setAlpha: function(n2) {
  return this._a = E(n2), this._roundA = Math.round(100 * this._a) / 100, this;
}, toHsv: function() {
  var n2 = s(this._r, this._g, this._b);
  return { h: 360 * n2.h, s: n2.s, v: n2.v, a: this._a };
}, toHsvString: function() {
  var n2 = s(this._r, this._g, this._b), r2 = Math.round(360 * n2.h), o2 = Math.round(100 * n2.s), a2 = Math.round(100 * n2.v);
  return 1 == this._a ? "hsv(" + r2 + ", " + o2 + "%, " + a2 + "%)" : "hsva(" + r2 + ", " + o2 + "%, " + a2 + "%, " + this._roundA + ")";
}, toHsl: function() {
  var n2 = l(this._r, this._g, this._b);
  return { h: 360 * n2.h, s: n2.s, l: n2.l, a: this._a };
}, toHslString: function() {
  var n2 = l(this._r, this._g, this._b), r2 = Math.round(360 * n2.h), o2 = Math.round(100 * n2.s), a2 = Math.round(100 * n2.l);
  return 1 == this._a ? "hsl(" + r2 + ", " + o2 + "%, " + a2 + "%)" : "hsla(" + r2 + ", " + o2 + "%, " + a2 + "%, " + this._roundA + ")";
}, toHex: function(n2) {
  return c(this._r, this._g, this._b, n2);
}, toHexString: function(n2) {
  return "#" + this.toHex(n2);
}, toHex8: function(n2) {
  return function(n3, r2, o2, a2, e2) {
    var t2 = [A(Math.round(n3).toString(16)), A(Math.round(r2).toString(16)), A(Math.round(o2).toString(16)), A(T(a2))];
    if (e2 && t2[0].charAt(0) == t2[0].charAt(1) && t2[1].charAt(0) == t2[1].charAt(1) && t2[2].charAt(0) == t2[2].charAt(1) && t2[3].charAt(0) == t2[3].charAt(1)) return t2[0].charAt(0) + t2[1].charAt(0) + t2[2].charAt(0) + t2[3].charAt(0);
    return t2.join("");
  }(this._r, this._g, this._b, this._a, n2);
}, toHex8String: function(n2) {
  return "#" + this.toHex8(n2);
}, toRgb: function() {
  return { r: Math.round(this._r), g: Math.round(this._g), b: Math.round(this._b), a: this._a };
}, toRgbString: function() {
  return 1 == this._a ? "rgb(" + Math.round(this._r) + ", " + Math.round(this._g) + ", " + Math.round(this._b) + ")" : "rgba(" + Math.round(this._r) + ", " + Math.round(this._g) + ", " + Math.round(this._b) + ", " + this._roundA + ")";
}, toPercentageRgb: function() {
  return { r: Math.round(100 * S(this._r, 255)) + "%", g: Math.round(100 * S(this._g, 255)) + "%", b: Math.round(100 * S(this._b, 255)) + "%", a: this._a };
}, toPercentageRgbString: function() {
  return 1 == this._a ? "rgb(" + Math.round(100 * S(this._r, 255)) + "%, " + Math.round(100 * S(this._g, 255)) + "%, " + Math.round(100 * S(this._b, 255)) + "%)" : "rgba(" + Math.round(100 * S(this._r, 255)) + "%, " + Math.round(100 * S(this._g, 255)) + "%, " + Math.round(100 * S(this._b, 255)) + "%, " + this._roundA + ")";
}, toName: function() {
  return 0 === this._a ? "transparent" : !(this._a < 1) && (w[c(this._r, this._g, this._b, true)] || false);
}, toFilter: function(n2) {
  var r2 = "#" + u(this._r, this._g, this._b, this._a), o2 = r2, a2 = this._gradientType ? "GradientType = 1, " : "";
  if (n2) {
    var e2 = i(n2);
    o2 = "#" + u(e2._r, e2._g, e2._b, e2._a);
  }
  return "progid:DXImageTransform.Microsoft.gradient(" + a2 + "startColorstr=" + r2 + ",endColorstr=" + o2 + ")";
}, toString: function(n2) {
  var r2 = !!n2;
  n2 = n2 || this._format;
  var o2 = false, a2 = this._a < 1 && this._a >= 0;
  return r2 || !a2 || "hex" !== n2 && "hex6" !== n2 && "hex3" !== n2 && "hex4" !== n2 && "hex8" !== n2 && "name" !== n2 ? ("rgb" === n2 && (o2 = this.toRgbString()), "prgb" === n2 && (o2 = this.toPercentageRgbString()), "hex" !== n2 && "hex6" !== n2 || (o2 = this.toHexString()), "hex3" === n2 && (o2 = this.toHexString(true)), "hex4" === n2 && (o2 = this.toHex8String(true)), "hex8" === n2 && (o2 = this.toHex8String()), "name" === n2 && (o2 = this.toName()), "hsl" === n2 && (o2 = this.toHslString()), "hsv" === n2 && (o2 = this.toHsvString()), o2 || this.toHexString()) : "name" === n2 && 0 === this._a ? this.toName() : this.toRgbString();
}, clone: function() {
  return i(this.toString());
}, _applyModification: function(n2, r2) {
  var o2 = n2.apply(null, [this].concat([].slice.call(r2)));
  return this._r = o2._r, this._g = o2._g, this._b = o2._b, this.setAlpha(o2._a), this;
}, lighten: function() {
  return this._applyModification(h, arguments);
}, brighten: function() {
  return this._applyModification(m, arguments);
}, darken: function() {
  return this._applyModification(g, arguments);
}, desaturate: function() {
  return this._applyModification(d, arguments);
}, saturate: function() {
  return this._applyModification(p, arguments);
}, greyscale: function() {
  return this._applyModification(b, arguments);
}, spin: function() {
  return this._applyModification(f, arguments);
}, _applyCombination: function(n2, r2) {
  return n2.apply(null, [this].concat([].slice.call(r2)));
}, analogous: function() {
  return this._applyCombination(k, arguments);
}, complement: function() {
  return this._applyCombination(v, arguments);
}, monochromatic: function() {
  return this._applyCombination(O, arguments);
}, splitcomplement: function() {
  return this._applyCombination(x, arguments);
}, triad: function() {
  return this._applyCombination(y, [3]);
}, tetrad: function() {
  return this._applyCombination(y, [4]);
} }, i.fromRatio = function(n2, r2) {
  if ("object" == a(n2)) {
    var o2 = {};
    for (var e2 in n2) n2.hasOwnProperty(e2) && (o2[e2] = "a" === e2 ? n2[e2] : _(n2[e2]));
    n2 = o2;
  }
  return i(n2, r2);
}, i.equals = function(n2, r2) {
  return !(!n2 || !r2) && i(n2).toRgbString() == i(r2).toRgbString();
}, i.random = function() {
  return i.fromRatio({ r: Math.random(), g: Math.random(), b: Math.random() });
}, i.mix = function(n2, r2, o2) {
  o2 = 0 === o2 ? 0 : o2 || 50;
  var a2 = i(n2).toRgb(), e2 = i(r2).toRgb(), t2 = o2 / 100;
  return i({ r: (e2.r - a2.r) * t2 + a2.r, g: (e2.g - a2.g) * t2 + a2.g, b: (e2.b - a2.b) * t2 + a2.b, a: (e2.a - a2.a) * t2 + a2.a });
}, i.readability = function(n2, r2) {
  var o2 = i(n2), a2 = i(r2);
  return (Math.max(o2.getLuminance(), a2.getLuminance()) + 0.05) / (Math.min(o2.getLuminance(), a2.getLuminance()) + 0.05);
}, i.isReadable = function(n2, r2, o2) {
  var a2, e2, t2 = i.readability(n2, r2);
  switch (e2 = false, (a2 = function(n3) {
    var r3, o3;
    r3 = ((n3 = n3 || { level: "AA", size: "small" }).level || "AA").toUpperCase(), o3 = (n3.size || "small").toLowerCase(), "AA" !== r3 && "AAA" !== r3 && (r3 = "AA");
    "small" !== o3 && "large" !== o3 && (o3 = "small");
    return { level: r3, size: o3 };
  }(o2)).level + a2.size) {
    case "AAsmall":
    case "AAAlarge":
      e2 = t2 >= 4.5;
      break;
    case "AAlarge":
      e2 = t2 >= 3;
      break;
    case "AAAsmall":
      e2 = t2 >= 7;
  }
  return e2;
}, i.mostReadable = function(n2, r2, o2) {
  var a2, e2, t2, l2, s2 = null, c2 = 0;
  e2 = (o2 = o2 || {}).includeFallbackColors, t2 = o2.level, l2 = o2.size;
  for (var u2 = 0; u2 < r2.length; u2++) (a2 = i.readability(n2, r2[u2])) > c2 && (c2 = a2, s2 = i(r2[u2]));
  return i.isReadable(n2, s2, { level: t2, size: l2 }) || !e2 ? s2 : (o2.includeFallbackColors = false, i.mostReadable(n2, ["#fff", "#000"], o2));
};
var P = i.names = { aliceblue: "f0f8ff", antiquewhite: "faebd7", aqua: "0ff", aquamarine: "7fffd4", azure: "f0ffff", beige: "f5f5dc", bisque: "ffe4c4", black: "000", blanchedalmond: "ffebcd", blue: "00f", blueviolet: "8a2be2", brown: "a52a2a", burlywood: "deb887", burntsienna: "ea7e5d", cadetblue: "5f9ea0", chartreuse: "7fff00", chocolate: "d2691e", coral: "ff7f50", cornflowerblue: "6495ed", cornsilk: "fff8dc", crimson: "dc143c", cyan: "0ff", darkblue: "00008b", darkcyan: "008b8b", darkgoldenrod: "b8860b", darkgray: "a9a9a9", darkgreen: "006400", darkgrey: "a9a9a9", darkkhaki: "bdb76b", darkmagenta: "8b008b", darkolivegreen: "556b2f", darkorange: "ff8c00", darkorchid: "9932cc", darkred: "8b0000", darksalmon: "e9967a", darkseagreen: "8fbc8f", darkslateblue: "483d8b", darkslategray: "2f4f4f", darkslategrey: "2f4f4f", darkturquoise: "00ced1", darkviolet: "9400d3", deeppink: "ff1493", deepskyblue: "00bfff", dimgray: "696969", dimgrey: "696969", dodgerblue: "1e90ff", firebrick: "b22222", floralwhite: "fffaf0", forestgreen: "228b22", fuchsia: "f0f", gainsboro: "dcdcdc", ghostwhite: "f8f8ff", gold: "ffd700", goldenrod: "daa520", gray: "808080", green: "008000", greenyellow: "adff2f", grey: "808080", honeydew: "f0fff0", hotpink: "ff69b4", indianred: "cd5c5c", indigo: "4b0082", ivory: "fffff0", khaki: "f0e68c", lavender: "e6e6fa", lavenderblush: "fff0f5", lawngreen: "7cfc00", lemonchiffon: "fffacd", lightblue: "add8e6", lightcoral: "f08080", lightcyan: "e0ffff", lightgoldenrodyellow: "fafad2", lightgray: "d3d3d3", lightgreen: "90ee90", lightgrey: "d3d3d3", lightpink: "ffb6c1", lightsalmon: "ffa07a", lightseagreen: "20b2aa", lightskyblue: "87cefa", lightslategray: "789", lightslategrey: "789", lightsteelblue: "b0c4de", lightyellow: "ffffe0", lime: "0f0", limegreen: "32cd32", linen: "faf0e6", magenta: "f0f", maroon: "800000", mediumaquamarine: "66cdaa", mediumblue: "0000cd", mediumorchid: "ba55d3", mediumpurple: "9370db", mediumseagreen: "3cb371", mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a", mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970", mintcream: "f5fffa", mistyrose: "ffe4e1", moccasin: "ffe4b5", navajowhite: "ffdead", navy: "000080", oldlace: "fdf5e6", olive: "808000", olivedrab: "6b8e23", orange: "ffa500", orangered: "ff4500", orchid: "da70d6", palegoldenrod: "eee8aa", palegreen: "98fb98", paleturquoise: "afeeee", palevioletred: "db7093", papayawhip: "ffefd5", peachpuff: "ffdab9", peru: "cd853f", pink: "ffc0cb", plum: "dda0dd", powderblue: "b0e0e6", purple: "800080", rebeccapurple: "663399", red: "f00", rosybrown: "bc8f8f", royalblue: "4169e1", saddlebrown: "8b4513", salmon: "fa8072", sandybrown: "f4a460", seagreen: "2e8b57", seashell: "fff5ee", sienna: "a0522d", silver: "c0c0c0", skyblue: "87ceeb", slateblue: "6a5acd", slategray: "708090", slategrey: "708090", snow: "fffafa", springgreen: "00ff7f", steelblue: "4682b4", tan: "d2b48c", teal: "008080", thistle: "d8bfd8", tomato: "ff6347", turquoise: "40e0d0", violet: "ee82ee", wheat: "f5deb3", white: "fff", whitesmoke: "f5f5f5", yellow: "ff0", yellowgreen: "9acd32" }, w = i.hexNames = function(n2) {
  var r2 = {};
  for (var o2 in n2) n2.hasOwnProperty(o2) && (r2[n2[o2]] = o2);
  return r2;
}(P);
function E(n2) {
  return n2 = parseFloat(n2), (isNaN(n2) || n2 < 0 || n2 > 1) && (n2 = 1), n2;
}
function S(n2, r2) {
  (function(n3) {
    return "string" == typeof n3 && -1 != n3.indexOf(".") && 1 === parseFloat(n3);
  })(n2) && (n2 = "100%");
  var o2 = function(n3) {
    return "string" == typeof n3 && -1 != n3.indexOf("%");
  }(n2);
  return n2 = Math.min(r2, Math.max(0, parseFloat(n2))), o2 && (n2 = parseInt(n2 * r2, 10) / 100), Math.abs(n2 - r2) < 1e-6 ? 1 : n2 % r2 / parseFloat(r2);
}
function N(n2) {
  return Math.min(1, Math.max(0, n2));
}
function z(n2) {
  return parseInt(n2, 16);
}
function A(n2) {
  return 1 == n2.length ? "0" + n2 : "" + n2;
}
function _(n2) {
  return n2 <= 1 && (n2 = 100 * n2 + "%"), n2;
}
function T(n2) {
  return Math.round(255 * parseFloat(n2)).toString(16);
}
function C(n2) {
  return z(n2) / 255;
}
var D, M, q, R = (M = "[\\s|\\(]+(" + (D = "(?:[-\\+]?\\d*\\.\\d+%?)|(?:[-\\+]?\\d+%?)") + ")[,|\\s]+(" + D + ")[,|\\s]+(" + D + ")\\s*\\)?", q = "[\\s|\\(]+(" + D + ")[,|\\s]+(" + D + ")[,|\\s]+(" + D + ")[,|\\s]+(" + D + ")\\s*\\)?", { CSS_UNIT: new RegExp(D), rgb: new RegExp("rgb" + M), rgba: new RegExp("rgba" + q), hsl: new RegExp("hsl" + M), hsla: new RegExp("hsla" + q), hsv: new RegExp("hsv" + M), hsva: new RegExp("hsva" + q), hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/, hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/, hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/, hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/ });
function J(n2) {
  return !!R.CSS_UNIT.exec(n2);
}
var F = function(n2, r2) {
  var o2 = ("string" == typeof n2 ? parseInt(n2) : n2) || 0;
  if (o2 >= -5 && o2 <= 5) {
    var a2 = o2, e2 = parseFloat(r2), t2 = e2 + a2 * (e2 / 5) * -1;
    return (0 == t2 || t2 <= Number.EPSILON) && (t2 = 0.1), { animationPeriod: t2 + "s" };
  }
  return { animationPeriod: r2 };
}, L = function(n2, r2) {
  var o2 = n2 || {}, a2 = "";
  switch (r2) {
    case "small":
      a2 = "12px";
      break;
    case "medium":
      a2 = "16px";
      break;
    case "large":
      a2 = "20px";
      break;
    default:
      a2 = void 0;
  }
  var e2 = {};
  if (o2.fontSize) {
    var t2 = o2.fontSize;
    e2 = function(n3, r3) {
      var o3 = {};
      for (var a3 in n3) Object.prototype.hasOwnProperty.call(n3, a3) && r3.indexOf(a3) < 0 && (o3[a3] = n3[a3]);
      if (null != n3 && "function" == typeof Object.getOwnPropertySymbols) {
        var e3 = 0;
        for (a3 = Object.getOwnPropertySymbols(n3); e3 < a3.length; e3++) r3.indexOf(a3[e3]) < 0 && Object.prototype.propertyIsEnumerable.call(n3, a3[e3]) && (o3[a3[e3]] = n3[a3[e3]]);
      }
      return o3;
    }(o2, ["fontSize"]), a2 = t2;
  }
  return { fontSize: a2, styles: e2 };
}, H = { color: "currentColor", mixBlendMode: "difference", width: "unset", display: "block", paddingTop: "2px" }, U = function(r2) {
  var a2 = r2.className, e2 = r2.text, t2 = r2.textColor, i2 = r2.staticText, l2 = r2.style;
  return e2 ? React.createElement("span", { className: "rli-d-i-b rli-text-format ".concat(a2 || "").trim(), style: o(o(o({}, i2 && H), t2 && { color: t2, mixBlendMode: "unset" }), l2 && l2) }, "string" == typeof e2 && e2.length ? e2 : "loading") : null;
}, X = "rgb(50, 205, 50)";
function j(n2, r2) {
  if (void 0 === r2 && (r2 = 0), 0 === n2.length) throw new Error("Input array cannot be empty!");
  var o2 = [];
  return function n3(r3, a2) {
    return void 0 === a2 && (a2 = 0), o2.push.apply(o2, r3), o2.length < a2 && n3(o2, a2), o2.slice(0, a2);
  }(n2, r2);
}
r('.atom-rli-bounding-box {\n  --atom-phase1-rgb: 50, 205, 50;\n  color: rgba(var(--atom-phase1-rgb), 1);\n  font-size: 16px;\n  position: relative;\n  text-align: unset;\n  isolation: isolate;\n}\n.atom-rli-bounding-box .atom-indicator {\n  width: 6em;\n  height: 6em;\n  position: relative;\n  perspective: 6em;\n  overflow: hidden;\n  color: rgba(var(--atom-phase1-rgb), 1);\n  animation: calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, linear) infinite uxlv7gg;\n}\n.atom-rli-bounding-box .atom-indicator::after, .atom-rli-bounding-box .atom-indicator::before {\n  content: "";\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  width: 0.48em;\n  height: 0.48em;\n  margin: auto;\n  border-radius: 50%;\n  background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase1-rgb), 0.1), rgba(var(--atom-phase1-rgb), 0.3) 37%, rgba(var(--atom-phase1-rgb), 1) 100%);\n  animation: calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, linear) infinite uxlv7eg;\n}\n.atom-rli-bounding-box .atom-indicator::before {\n  filter: drop-shadow(0px 0px 0.0625em currentColor);\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit {\n  color: rgba(var(--atom-phase1-rgb), 0.85);\n  border: 0;\n  border-left: 0.4em solid currentColor;\n  box-sizing: border-box;\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  margin: auto;\n  width: 4.8em;\n  height: 4.8em;\n  background-color: transparent;\n  border-radius: 50%;\n  transform-style: preserve-3d;\n  animation: var(--rli-animation-duration, 1s) var(--rli-animation-function, linear) infinite uxlv7fj, calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, linear) infinite uxlv7gy;\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit::after {\n  content: "";\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  border-radius: 50%;\n  color: rgba(var(--atom-phase1-rgb), 0.18);\n  animation: calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, linear) infinite uxlv7hv;\n  border: 0.125em solid currentColor;\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit::before {\n  content: "";\n  width: 0.192em;\n  height: 0.192em;\n  position: absolute;\n  border-radius: 50%;\n  top: -0.096em;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  margin: 0 auto;\n  color: rgba(var(--atom-phase1-rgb), 1);\n  box-shadow: 0px 0px 0.0625em 0.0625em currentColor, 0px 0px 0.0625em 0.125em currentColor;\n  background-color: currentColor;\n  transform: rotateY(-70deg);\n  animation: var(--rli-animation-duration, 1s) var(--rli-animation-function, linear) infinite uxlv7ew, calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, linear) infinite uxlv7gg;\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit:nth-of-type(1) {\n  --orbit-vector-factor: -1;\n  transform: rotateY(65deg) rotateX(calc(54deg * var(--orbit-vector-factor)));\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit:nth-of-type(2) {\n  --orbit-vector-factor: 1;\n  transform: rotateY(65deg) rotateX(calc(54deg * var(--orbit-vector-factor)));\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit:nth-of-type(3) {\n  --orbit-vector-factor: 0;\n  transform: rotateY(65deg) rotateX(calc(54deg * var(--orbit-vector-factor)));\n  animation-delay: calc(var(--rli-animation-duration, 1s) * 0.5 * -1), calc(var(--rli-animation-duration, 1s) * 4 * -1);\n}\n.atom-rli-bounding-box .atom-indicator .electron-orbit:nth-of-type(3)::before {\n  animation-delay: calc(var(--rli-animation-duration, 1s) * 0.5 * -1), calc(var(--rli-animation-duration, 1s) * 4 * -1);\n}\n.atom-rli-bounding-box .atom-text {\n  color: currentColor;\n  mix-blend-mode: difference;\n  width: unset;\n  display: block;\n}\n\n@property --atom-phase1-rgb {\n  syntax: "<number>#";\n  inherits: true;\n  initial-value: 50, 205, 50;\n}\n@property --atom-phase2-rgb {\n  syntax: "<number>#";\n  inherits: true;\n  initial-value: 50, 205, 50;\n}\n@property --atom-phase3-rgb {\n  syntax: "<number>#";\n  inherits: true;\n  initial-value: 50, 205, 50;\n}\n@property --atom-phase4-rgb {\n  syntax: "<number>#";\n  inherits: true;\n  initial-value: 50, 205, 50;\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1s;\n}\n@keyframes uxlv7fj {\n  from {\n    transform: rotateY(70deg) rotateX(calc(54deg * var(--orbit-vector-factor))) rotateZ(0deg);\n  }\n  to {\n    transform: rotateY(70deg) rotateX(calc(54deg * var(--orbit-vector-factor))) rotateZ(360deg);\n  }\n}\n@keyframes uxlv7ew {\n  from {\n    transform: rotateY(-70deg) rotateX(0deg);\n  }\n  to {\n    transform: rotateY(-70deg) rotateX(-360deg);\n  }\n}\n@keyframes uxlv7eg {\n  100%, 0% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase1-rgb), 0.1), rgba(var(--atom-phase1-rgb), 0.3) 37%, rgba(var(--atom-phase1-rgb), 1) 100%);\n  }\n  20% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase1-rgb), 0.1), rgba(var(--atom-phase1-rgb), 0.3) 37%, rgba(var(--atom-phase1-rgb), 1) 100%);\n  }\n  25% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.1), rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.3) 37%, rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 1) 100%);\n  }\n  45% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.1), rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.3) 37%, rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 1) 100%);\n  }\n  50% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.1), rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.3) 37%, rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 1) 100%);\n  }\n  70% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.1), rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.3) 37%, rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 1) 100%);\n  }\n  75% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.1), rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.3) 37%, rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 1) 100%);\n  }\n  95% {\n    background-image: radial-gradient(circle at 35% 15%, rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.1), rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.3) 37%, rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 1) 100%);\n  }\n}\n@keyframes uxlv7gg {\n  100%, 0% {\n    color: rgba(var(--atom-phase1-rgb), 1);\n  }\n  20% {\n    color: rgba(var(--atom-phase1-rgb), 1);\n  }\n  25% {\n    color: rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 1);\n  }\n  45% {\n    color: rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 1);\n  }\n  50% {\n    color: rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 1);\n  }\n  70% {\n    color: rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 1);\n  }\n  75% {\n    color: rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 1);\n  }\n  95% {\n    color: rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 1);\n  }\n}\n@keyframes uxlv7gy {\n  100%, 0% {\n    color: rgba(var(--atom-phase1-rgb), 0.85);\n  }\n  20% {\n    color: rgba(var(--atom-phase1-rgb), 0.85);\n  }\n  25% {\n    color: rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.85);\n  }\n  45% {\n    color: rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.85);\n  }\n  50% {\n    color: rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.85);\n  }\n  70% {\n    color: rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.85);\n  }\n  75% {\n    color: rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.85);\n  }\n  95% {\n    color: rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.85);\n  }\n}\n@keyframes uxlv7hv {\n  100%, 0% {\n    color: rgba(var(--atom-phase1-rgb), 0.18);\n  }\n  20% {\n    color: rgba(var(--atom-phase1-rgb), 0.18);\n  }\n  25% {\n    color: rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.18);\n  }\n  45% {\n    color: rgba(var(--atom-phase2-rgb, var(--atom-phase1-rgb)), 0.18);\n  }\n  50% {\n    color: rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.18);\n  }\n  70% {\n    color: rgba(var(--atom-phase3-rgb, var(--atom-phase1-rgb)), 0.18);\n  }\n  75% {\n    color: rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.18);\n  }\n  95% {\n    color: rgba(var(--atom-phase4-rgb, var(--atom-phase1-rgb)), 0.18);\n  }\n}');
i(X).toRgb();
Array.from({ length: 4 }, function(n2, r2) {
  return "--atom-phase".concat(r2 + 1, "-rgb");
});
r('.commet-rli-bounding-box {\n  --commet-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  width: 6.85em;\n  height: 6.85em;\n  overflow: hidden;\n  display: inline-block;\n  box-sizing: border-box;\n  position: relative;\n  isolation: isolate;\n}\n.commet-rli-bounding-box .commet-indicator {\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  margin: auto;\n  box-sizing: border-box;\n  width: 6em;\n  height: 6em;\n  color: var(--commet-phase1-color);\n  display: inline-block;\n  isolation: isolate;\n  position: absolute;\n  z-index: 0;\n  animation: calc(var(--rli-animation-duration, 1.2s) * 4) var(--rli-animation-function, cubic-bezier(0.08, 0.03, 0.91, 0.93)) infinite uxlv7cp;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box {\n  position: absolute;\n  display: inline-block;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  bottom: 0;\n  left: 0;\n  margin: auto;\n  animation: uxlv7bx var(--rli-animation-duration, 1.2s) var(--rli-animation-function, cubic-bezier(0.08, 0.03, 0.91, 0.93)) infinite;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box:nth-of-type(1) {\n  width: 100%;\n  height: 100%;\n  animation-direction: normal;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box:nth-of-type(2) {\n  width: 70%;\n  height: 70%;\n  animation-direction: reverse;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box .commetball-box {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  bottom: 0;\n  left: 0;\n  display: inline-block;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box .commetball-box::before {\n  content: "";\n  width: 0.5em;\n  height: 0.5em;\n  border-radius: 50%;\n  background-color: currentColor;\n  position: absolute;\n  top: -0.125em;\n  left: 50%;\n  transform: translateX(-50%);\n  box-shadow: 0 0 0.2em 0em currentColor, 0 0 0.6em 0em currentColor;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box .commet-trail {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  bottom: 0;\n  left: 0;\n  border-radius: 50%;\n  box-sizing: border-box;\n  border-style: solid;\n}\n.commet-rli-bounding-box .commet-indicator .commet-box .commet-trail.trail1 {\n  border-color: currentColor transparent transparent currentColor;\n  border-width: 0.25em 0.25em 0 0;\n  transform: rotateZ(-45deg);\n}\n.commet-rli-bounding-box .commet-indicator .commet-box .commet-trail.trail2 {\n  border-color: currentColor currentColor transparent transparent;\n  border-width: 0.25em 0 0 0.25em;\n  transform: rotateZ(45deg);\n}\n.commet-rli-bounding-box .commet-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  color: var(--commet-phase1-color);\n}\n\n@property --commet-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --commet-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --commet-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --commet-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7bx {\n  to {\n    transform: rotate(1turn);\n  }\n}\n@keyframes uxlv7cp {\n  100%, 0% {\n    color: var(--commet-phase1-color);\n  }\n  20% {\n    color: var(--commet-phase1-color);\n  }\n  25% {\n    color: var(--commet-phase2-color, var(--commet-phase1-color));\n  }\n  45% {\n    color: var(--commet-phase2-color, var(--commet-phase1-color));\n  }\n  50% {\n    color: var(--commet-phase3-color, var(--commet-phase1-color));\n  }\n  70% {\n    color: var(--commet-phase3-color, var(--commet-phase1-color));\n  }\n  75% {\n    color: var(--commet-phase4-color, var(--commet-phase1-color));\n  }\n  95% {\n    color: var(--commet-phase4-color, var(--commet-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--commet-phase".concat(r2 + 1, "-color");
});
r('.OP-annulus-rli-bounding-box {\n  --OP-annulus-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  display: inline-block;\n}\n.OP-annulus-rli-bounding-box .OP-annulus-indicator {\n  width: 5em;\n  height: 5em;\n  color: var(--OP-annulus-phase1-color);\n  display: inline-block;\n  position: relative;\n  z-index: 0;\n}\n.OP-annulus-rli-bounding-box .OP-annulus-indicator .whirl {\n  animation: uxlv7n7 calc(var(--rli-animation-duration, 1.5s) * 1.33) linear infinite;\n  height: 100%;\n  transform-origin: center center;\n  width: 100%;\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  margin: auto;\n}\n.OP-annulus-rli-bounding-box .OP-annulus-indicator .path {\n  stroke-dasharray: 1, 125;\n  stroke-dashoffset: 0;\n  animation: var(--rli-animation-duration, 1.5s) var(--rli-animation-function, ease-in-out) infinite uxlv7oa, calc(var(--rli-animation-duration, 1.5s) * 4) var(--rli-animation-function, ease-in-out) infinite uxlv7p5;\n  stroke-linecap: round;\n}\n.OP-annulus-rli-bounding-box .OP-annulus-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: -2;\n}\n\n@property --OP-annulus-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.5s;\n}\n@keyframes uxlv7n7 {\n  100% {\n    transform: rotate(360deg);\n  }\n}\n@keyframes uxlv7oa {\n  0% {\n    stroke-dasharray: 1, 125;\n    stroke-dashoffset: 0;\n  }\n  50% {\n    stroke-dasharray: 98, 125;\n    stroke-dashoffset: -35px;\n  }\n  100% {\n    stroke-dasharray: 98, 125;\n    stroke-dashoffset: -124px;\n  }\n}\n@keyframes uxlv7p5 {\n  100%, 0% {\n    stroke: var(--OP-annulus-phase1-color);\n  }\n  22% {\n    stroke: var(--OP-annulus-phase1-color);\n  }\n  25% {\n    stroke: var(--OP-annulus-phase2-color, var(--OP-annulus-phase1-color));\n  }\n  42% {\n    stroke: var(--OP-annulus-phase2-color, var(--OP-annulus-phase1-color));\n  }\n  50% {\n    stroke: var(--OP-annulus-phase3-color, var(--OP-annulus-phase1-color));\n  }\n  72% {\n    stroke: var(--OP-annulus-phase3-color, var(--OP-annulus-phase1-color));\n  }\n  75% {\n    stroke: var(--OP-annulus-phase4-color, var(--OP-annulus-phase1-color));\n  }\n  97% {\n    stroke: var(--OP-annulus-phase4-color, var(--OP-annulus-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--OP-annulus-phase".concat(r2 + 1, "-color");
});
function W(n2) {
  return n2 && n2.Math === Math && n2;
}
r('.OP-dotted-rli-bounding-box {\n  --OP-dotted-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  box-sizing: border-box;\n  display: inline-block;\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator {\n  width: 5em;\n  height: 5em;\n  color: var(--OP-dotted-phase1-color);\n  display: inline-block;\n  position: relative;\n  z-index: 0;\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .OP-dotted-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: -2;\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder {\n  position: absolute;\n  left: 0;\n  top: 0;\n  bottom: 0;\n  right: 0;\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder .dot {\n  display: block;\n  margin: 0 auto;\n  width: 15%;\n  height: 15%;\n  background-color: currentColor;\n  border-radius: 50%;\n  animation: var(--rli-animation-duration, 1.2s) var(--rli-animation-function, ease-in-out) infinite uxlv7nu, calc(var(--rli-animation-duration, 1.2s) * 4) var(--rli-animation-function, ease-in-out) infinite uxlv7ol;\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(1) {\n  transform: rotate(0deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(1) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 12 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(2) {\n  transform: rotate(30deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(2) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 11 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(3) {\n  transform: rotate(60deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(3) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 10 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(4) {\n  transform: rotate(90deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(4) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 9 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(5) {\n  transform: rotate(120deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(5) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 8 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(6) {\n  transform: rotate(150deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(6) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 7 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(7) {\n  transform: rotate(180deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(7) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 6 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(8) {\n  transform: rotate(210deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(8) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 5 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(9) {\n  transform: rotate(240deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(9) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 4 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(10) {\n  transform: rotate(270deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(10) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 3 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(11) {\n  transform: rotate(300deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(11) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 2 * -1);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(12) {\n  transform: rotate(330deg);\n}\n.OP-dotted-rli-bounding-box .OP-dotted-indicator .dot-shape-holder:nth-of-type(12) .dot {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) / 12 * 1 * -1);\n}\n\n@property --OP-dotted-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-dotted-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-dotted-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-dotted-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7nu {\n  0%, 39%, 100% {\n    opacity: 0;\n  }\n  40% {\n    opacity: 1;\n  }\n}\n@keyframes uxlv7ol {\n  100%, 0% {\n    background-color: var(--OP-dotted-phase1-color);\n  }\n  22% {\n    background-color: var(--OP-dotted-phase1-color);\n  }\n  25% {\n    background-color: var(--OP-dotted-phase2-color, var(--OP-dotted-phase1-color));\n  }\n  47% {\n    background-color: var(--OP-dotted-phase2-color, var(--OP-dotted-phase1-color));\n  }\n  50% {\n    background-color: var(--OP-dotted-phase3-color, var(--OP-dotted-phase1-color));\n  }\n  72% {\n    background-color: var(--OP-dotted-phase3-color, var(--OP-dotted-phase1-color));\n  }\n  75% {\n    background-color: var(--OP-dotted-phase4-color, var(--OP-dotted-phase1-color));\n  }\n  97% {\n    background-color: var(--OP-dotted-phase4-color, var(--OP-dotted-phase1-color));\n  }\n}');
W("object" == typeof window && window) || W("object" == typeof self && self) || W("object" == typeof global && global) || /* @__PURE__ */ function() {
  return this;
}() || Function("return this")();
Array.from({ length: 4 }, function(n2, r2) {
  return "--OP-dotted-phase".concat(r2 + 1, "-color");
});
r('.OP-spokes-rli-bounding-box {\n  --OP-spokes-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  position: relative;\n  color: var(--OP-spokes-phase1-color);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator {\n  width: 4.8em;\n  height: 4.8em;\n  display: block;\n  position: relative;\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke {\n  position: absolute;\n  height: 1.2em;\n  width: 0.4em;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  margin: auto auto auto 50%;\n  background-color: var(--OP-spokes-phase1-color);\n  border-radius: 0.24em;\n  opacity: 0;\n  animation: var(--rli-animation-duration, 1.2s) var(--rli-animation-function, ease-in-out) backwards infinite uxlv7pw, calc(var(--rli-animation-duration, 1.2s) * 4) var(--rli-animation-function, ease-in-out) infinite uxlv7qn;\n  transform-origin: left center;\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(1) {\n  transform: rotate(calc(0 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(11 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(2) {\n  transform: rotate(calc(1 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(10 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(3) {\n  transform: rotate(calc(2 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(9 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(4) {\n  transform: rotate(calc(3 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(8 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(5) {\n  transform: rotate(calc(4 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(7 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(6) {\n  transform: rotate(calc(5 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(6 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(7) {\n  transform: rotate(calc(6 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(5 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(8) {\n  transform: rotate(calc(7 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(4 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(9) {\n  transform: rotate(calc(8 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(3 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(10) {\n  transform: rotate(calc(9 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(2 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(11) {\n  transform: rotate(calc(10 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(1 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator .spoke:nth-of-type(12) {\n  transform: rotate(calc(11 * 360deg / 12)) translate(-50%, -1.56em);\n  animation-delay: calc(0 * var(--rli-animation-duration, 1.2s) / 12 * -1);\n}\n.OP-spokes-rli-bounding-box .OP-spokes-indicator-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  color: var(--OP-spokes-phase1-color);\n  z-index: -2;\n}\n\n@property --OP-spokes-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-spokes-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-spokes-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-spokes-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7pw {\n  from {\n    opacity: 1;\n  }\n  to {\n    opacity: 0;\n  }\n}\n@keyframes uxlv7qn {\n  100%, 0% {\n    background-color: var(--OP-spokes-phase1-color);\n  }\n  22% {\n    background-color: var(--OP-spokes-phase1-color);\n  }\n  25% {\n    background-color: var(--OP-spokes-phase2-color, var(--OP-spokes-phase1-color));\n  }\n  42% {\n    background-color: var(--OP-spokes-phase2-color, var(--OP-spokes-phase1-color));\n  }\n  50% {\n    background-color: var(--OP-spokes-phase3-color, var(--OP-spokes-phase1-color));\n  }\n  72% {\n    background-color: var(--OP-spokes-phase3-color, var(--OP-spokes-phase1-color));\n  }\n  75% {\n    background-color: var(--OP-spokes-phase4-color, var(--OP-spokes-phase1-color));\n  }\n  97% {\n    background-color: var(--OP-spokes-phase4-color, var(--OP-spokes-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--OP-spokes-phase".concat(r2 + 1, "-color");
});
r('.OP-annulus-dual-sectors-rli-bounding-box {\n  --OP-annulus-dual-sectors-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  box-sizing: border-box;\n  display: inline-block;\n}\n.OP-annulus-dual-sectors-rli-bounding-box .OP-annulus-dual-sectors-indicator {\n  width: 5em;\n  height: 5em;\n  display: inline-block;\n  position: relative;\n  z-index: 0;\n  color: var(--OP-annulus-dual-sectors-phase1-color);\n}\n.OP-annulus-dual-sectors-rli-bounding-box .OP-annulus-dual-sectors-indicator .annulus-sectors {\n  box-sizing: border-box;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  border-width: 0.34em;\n  border-style: solid;\n  border-color: var(--OP-annulus-dual-sectors-phase1-color) transparent var(--OP-annulus-dual-sectors-phase1-color) transparent;\n  background-color: transparent;\n  animation: var(--rli-animation-duration, 1.2s) var(--rli-animation-function, linear) infinite uxlv7ra, calc(var(--rli-animation-duration, 1.2s) * 4) var(--rli-animation-function, linear) infinite uxlv7sv;\n}\n.OP-annulus-dual-sectors-rli-bounding-box .OP-annulus-dual-sectors-indicator .OP-annulus-dual-sectors-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: -2;\n}\n\n@property --OP-annulus-dual-sectors-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-dual-sectors-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-dual-sectors-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-dual-sectors-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7ra {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n@keyframes uxlv7sv {\n  100%, 0% {\n    border-color: var(--OP-annulus-dual-sectors-phase1-color) transparent;\n  }\n  20% {\n    border-color: var(--OP-annulus-dual-sectors-phase1-color) transparent;\n  }\n  25% {\n    border-color: var(--OP-annulus-dual-sectors-phase2-color, var(--OP-annulus-dual-sectors-phase1-color)) transparent;\n  }\n  45% {\n    border-color: var(--OP-annulus-dual-sectors-phase2-color, var(--OP-annulus-dual-sectors-phase1-color)) transparent;\n  }\n  50% {\n    border-color: var(--OP-annulus-dual-sectors-phase3-color, var(--OP-annulus-dual-sectors-phase1-color)) transparent;\n  }\n  70% {\n    border-color: var(--OP-annulus-dual-sectors-phase3-color, var(--OP-annulus-dual-sectors-phase1-color)) transparent;\n  }\n  75% {\n    border-color: var(--OP-annulus-dual-sectors-phase4-color, var(--OP-annulus-dual-sectors-phase1-color)) transparent;\n  }\n  95% {\n    border-color: var(--OP-annulus-dual-sectors-phase4-color, var(--OP-annulus-dual-sectors-phase1-color)) transparent;\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--OP-annulus-dual-sectors-phase".concat(r2 + 1, "-color");
});
r('.OP-annulus-sector-track-rli-bounding-box {\n  --OP-annulus-track-phase1-color: rgba(50, 205, 50, 0.22);\n  --OP-annulus-sector-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  display: inline-block;\n}\n.OP-annulus-sector-track-rli-bounding-box .OP-annulus-sector-track-indicator {\n  width: 5em;\n  height: 5em;\n  color: var(--OP-annulus-sector-phase1-color);\n  display: inline-block;\n  position: relative;\n  z-index: 0;\n}\n.OP-annulus-sector-track-rli-bounding-box .OP-annulus-sector-track-indicator .annulus-track-ring {\n  width: 100%;\n  height: 100%;\n  border-width: 0.34em;\n  border-style: solid;\n  border-radius: 50%;\n  box-sizing: border-box;\n  border-color: var(--OP-annulus-track-phase1-color);\n  border-top-color: var(--OP-annulus-sector-phase1-color);\n  animation: var(--rli-animation-duration, 1s) var(--rli-animation-function, linear) infinite uxlv7rl, calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, linear) infinite uxlv7tf;\n}\n.OP-annulus-sector-track-rli-bounding-box .OP-annulus-sector-track-indicator .OP-annulus-sector-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: -2;\n}\n\n@property --OP-annulus-track-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgba(50, 205, 50, 0.22);\n}\n@property --OP-annulus-track-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgba(50, 205, 50, 0.22);\n}\n@property --OP-annulus-track-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgba(50, 205, 50, 0.22);\n}\n@property --OP-annulus-track-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgba(50, 205, 50, 0.22);\n}\n@property --OP-annulus-sector-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-sector-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-sector-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --OP-annulus-sector-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1s;\n}\n@keyframes uxlv7rl {\n  to {\n    transform: rotate(1turn);\n  }\n}\n@keyframes uxlv7tf {\n  100%, 0% {\n    border-color: var(--OP-annulus-track-phase1-color);\n    border-top-color: var(--OP-annulus-sector-phase1-color);\n  }\n  18% {\n    border-color: var(--OP-annulus-track-phase1-color);\n    border-top-color: var(--OP-annulus-sector-phase1-color);\n  }\n  25% {\n    border-color: var(--OP-annulus-track-phase2-color, var(--OP-annulus-track-phase1-color));\n    border-top-color: var(--OP-annulus-sector-phase2-color, var(--OP-annulus-sector-phase1-color));\n  }\n  43% {\n    border-color: var(--OP-annulus-track-phase2-color, var(--OP-annulus-track-phase1-color));\n    border-top-color: var(--OP-annulus-sector-phase2-color, var(--OP-annulus-sector-phase1-color));\n  }\n  50% {\n    border-color: var(--OP-annulus-track-phase3-color, var(--OP-annulus-track-phase1-color));\n    border-top-color: var(--OP-annulus-sector-phase3-color, var(--OP-annulus-sector-phase1-color));\n  }\n  68% {\n    border-color: var(--OP-annulus-track-phase3-color, var(--OP-annulus-track-phase1-color));\n    border-top-color: var(--OP-annulus-sector-phase3-color, var(--OP-annulus-sector-phase1-color));\n  }\n  75% {\n    border-color: var(--OP-annulus-track-phase4-color, var(--OP-annulus-track-phase1-color));\n    border-top-color: var(--OP-annulus-sector-phase4-color, var(--OP-annulus-sector-phase1-color));\n  }\n  93% {\n    border-color: var(--OP-annulus-track-phase4-color, var(--OP-annulus-track-phase1-color));\n    border-top-color: var(--OP-annulus-sector-phase4-color, var(--OP-annulus-sector-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return ["--OP-annulus-track-phase".concat(r2 + 1, "-color"), "--OP-annulus-sector-phase".concat(r2 + 1, "-color")];
});
r('.foursquare-rli-bounding-box {\n  --four-square-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  box-sizing: border-box;\n  color: var(--four-square-phase1-color);\n  display: inline-block;\n  overflow: hidden;\n}\n.foursquare-rli-bounding-box .foursquare-indicator {\n  height: 5.3033008589em;\n  width: 5.3033008589em;\n  position: relative;\n  display: block;\n}\n.foursquare-rli-bounding-box .foursquare-indicator .squares-container {\n  position: absolute;\n  z-index: 0;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  margin: auto;\n  height: 2.5em;\n  width: 2.5em;\n  color: inherit;\n  will-change: color, width, height;\n  transform: rotate(45deg);\n  animation: var(--rli-animation-duration, 1s) var(--rli-animation-function, cubic-bezier(0.05, 0.28, 0.79, 0.98)) infinite uxlv7dk, calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, cubic-bezier(0.05, 0.28, 0.79, 0.98)) infinite uxlv7es;\n}\n.foursquare-rli-bounding-box .foursquare-indicator .squares-container .square {\n  position: absolute;\n  width: 1.25em;\n  height: 1.25em;\n  border-radius: 0.1875em;\n  background-color: currentColor;\n  animation: uxlv7dd var(--rli-animation-duration, 1s) var(--rli-animation-function, cubic-bezier(0.05, 0.28, 0.79, 0.98)) both infinite;\n}\n.foursquare-rli-bounding-box .foursquare-indicator .squares-container .square.square1 {\n  top: 0;\n  left: 0;\n}\n.foursquare-rli-bounding-box .foursquare-indicator .squares-container .square.square2 {\n  top: 0;\n  right: 0;\n}\n.foursquare-rli-bounding-box .foursquare-indicator .squares-container .square.square3 {\n  bottom: 0;\n  left: 0;\n}\n.foursquare-rli-bounding-box .foursquare-indicator .squares-container .square.square4 {\n  bottom: 0;\n  right: 0;\n}\n\n@property --four-square-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --four-square-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --four-square-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --four-square-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1s;\n}\n@keyframes uxlv7dk {\n  0% {\n    width: 2.5em;\n    height: 2.5em;\n  }\n  10% {\n    width: 2.5em;\n    height: 2.5em;\n  }\n  50% {\n    width: 3.75em;\n    height: 3.75em;\n  }\n  90% {\n    width: 2.5em;\n    height: 2.5em;\n  }\n  100% {\n    width: 2.5em;\n    height: 2.5em;\n  }\n}\n@keyframes uxlv7dd {\n  0% {\n    transform: rotateZ(0deg);\n  }\n  10% {\n    transform: rotateZ(0deg);\n  }\n  50% {\n    transform: rotateZ(90deg);\n  }\n  90% {\n    transform: rotateZ(90deg);\n  }\n  100% {\n    transform: rotateZ(90deg);\n  }\n}\n@keyframes uxlv7es {\n  100%, 0% {\n    color: var(--four-square-phase1-color);\n  }\n  20% {\n    color: var(--four-square-phase1-color);\n  }\n  25% {\n    color: var(--four-square-phase2-color, var(--four-square-phase1-color));\n  }\n  45% {\n    color: var(--four-square-phase2-color, var(--four-square-phase1-color));\n  }\n  50% {\n    color: var(--four-square-phase3-color, var(--four-square-phase1-color));\n  }\n  70% {\n    color: var(--four-square-phase3-color, var(--four-square-phase1-color));\n  }\n  75% {\n    color: var(--four-square-phase4-color, var(--four-square-phase1-color));\n  }\n  95% {\n    color: var(--four-square-phase4-color, var(--four-square-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--four-square-phase".concat(r2 + 1, "-color");
});
r('.mosaic-rli-bounding-box {\n  --mosaic-phase1-color: rgb(50, 205, 50);\n  box-sizing: border-box;\n  font-size: 16px;\n  color: var(--mosaic-phase1-color);\n}\n.mosaic-rli-bounding-box .mosaic-indicator {\n  width: 5em;\n  height: 5em;\n  color: currentColor;\n  display: grid;\n  gap: 0.125em;\n  grid-template-columns: repeat(3, 1fr);\n  grid-template-areas: "a b c" "d e f" "g h i";\n  position: relative;\n  z-index: 0;\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 105%;\n  left: 50%;\n  transform: translateX(-50%);\n  z-index: -2;\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube {\n  background-color: var(--mosaic-phase1-color);\n  animation-name: uxlv7i4, uxlv7is;\n  animation-duration: var(--rli-animation-duration, 1.5s), calc(var(--rli-animation-duration, 1.5s) * 4);\n  animation-timing-function: var(--rli-animation-function, ease-in-out);\n  animation-iteration-count: infinite;\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube1 {\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 2);\n  grid-area: a;\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube2 {\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 3);\n  grid-area: b;\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube3 {\n  grid-area: c;\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 4);\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube4 {\n  grid-area: d;\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 1);\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube5 {\n  grid-area: e;\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 2);\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube6 {\n  grid-area: f;\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 3);\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube7 {\n  grid-area: g;\n  animation-delay: 0s;\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube8 {\n  grid-area: h;\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 1);\n}\n.mosaic-rli-bounding-box .mosaic-indicator .mosaic-cube9 {\n  grid-area: i;\n  animation-delay: calc(var(--mosaic-skip-interval, 0.1s) * 2);\n}\n\n@property --mosaic-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --mosaic-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --mosaic-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --mosaic-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.5s;\n}\n@keyframes uxlv7i4 {\n  0%, 60%, 100% {\n    transform: scale3D(1, 1, 1);\n  }\n  30% {\n    transform: scale3D(0, 0, 1);\n  }\n}\n@keyframes uxlv7is {\n  100%, 0% {\n    background-color: var(--mosaic-phase1-color);\n  }\n  25% {\n    background-color: var(--mosaic-phase2-color, var(--mosaic-phase1-color));\n  }\n  50% {\n    background-color: var(--mosaic-phase3-color, var(--mosaic-phase1-color));\n  }\n  75% {\n    background-color: var(--mosaic-phase4-color, var(--mosaic-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--mosaic-phase".concat(r2 + 1, "-color");
});
r('.riple-rli-bounding-box {\n  --riple-phase1-color: rgb(50, 205, 50);\n  box-sizing: border-box;\n  font-size: 16px;\n  display: inline-block;\n  color: var(--riple-phase1-color);\n}\n.riple-rli-bounding-box .riple-indicator {\n  display: inline-block;\n  width: 5em;\n  height: 5em;\n  position: relative;\n  z-index: 0;\n}\n.riple-rli-bounding-box .riple-indicator .riple-text {\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: -2;\n}\n.riple-rli-bounding-box .riple-indicator .riple {\n  --border-width: 0.25em;\n  position: absolute;\n  border: var(--border-width) solid var(--riple-phase1-color);\n  opacity: 1;\n  border-radius: 50%;\n  will-change: top, right, left, bottom, border-color;\n  animation: var(--rli-animation-duration, 1s) var(--rli-animation-function, cubic-bezier(0, 0.2, 0.8, 1)) infinite uxlv7i1, calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, cubic-bezier(0, 0.2, 0.8, 1)) infinite uxlv7io;\n}\n.riple-rli-bounding-box .riple-indicator .riple:nth-of-type(2) {\n  animation-delay: calc(var(--rli-animation-duration, 1s) / 2 * -1);\n}\n\n@property --riple-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --riple-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --riple-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --riple-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1s;\n}\n@keyframes uxlv7i1 {\n  0% {\n    top: calc(50% - var(--border-width));\n    left: calc(50% - var(--border-width));\n    right: calc(50% - var(--border-width));\n    bottom: calc(50% - var(--border-width));\n    opacity: 0;\n  }\n  4.9% {\n    top: calc(50% - var(--border-width));\n    left: calc(50% - var(--border-width));\n    right: calc(50% - var(--border-width));\n    bottom: calc(50% - var(--border-width));\n    opacity: 0;\n  }\n  5% {\n    top: calc(50% - var(--border-width));\n    left: calc(50% - var(--border-width));\n    right: calc(50% - var(--border-width));\n    bottom: calc(50% - var(--border-width));\n    opacity: 1;\n  }\n  100% {\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    opacity: 0;\n  }\n}\n@keyframes uxlv7io {\n  100%, 0% {\n    border-color: var(--riple-phase1-color);\n  }\n  24.9% {\n    border-color: var(--riple-phase1-color);\n  }\n  25% {\n    border-color: var(--riple-phase2-color, var(--riple-phase1-color));\n  }\n  49.9% {\n    border-color: var(--riple-phase2-color, var(--riple-phase1-color));\n  }\n  50% {\n    border-color: var(--riple-phase3-color, var(--riple-phase1-color));\n  }\n  74.9% {\n    border-color: var(--riple-phase3-color, var(--riple-phase1-color));\n  }\n  75% {\n    border-color: var(--riple-phase4-color, var(--riple-phase1-color));\n  }\n  99.9% {\n    border-color: var(--riple-phase4-color, var(--riple-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--riple-phase".concat(r2 + 1, "-color");
});
r('.pulsate-rli-bounding-box {\n  --TD-pulsate-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  display: inline-block;\n  box-sizing: border-box;\n  color: var(--TD-pulsate-phase1-color);\n}\n.pulsate-rli-bounding-box .pulsate-indicator {\n  width: 4.4em;\n  height: 1.1em;\n  text-align: center;\n  position: relative;\n  z-index: 0;\n  display: flex;\n  justify-content: space-between;\n  flex-wrap: nowrap;\n  align-items: center;\n}\n.pulsate-rli-bounding-box .pulsate-indicator .pulsate-dot {\n  width: 1.1em;\n  height: 1.1em;\n  border-radius: 50%;\n  background-color: var(--TD-pulsate-phase1-color);\n  transform: scale(0);\n  animation: var(--rli-animation-duration, 1.2s) var(--rli-animation-function, ease-in-out) var(--delay) infinite uxlv7s0, calc(var(--rli-animation-duration, 1.2s) * 4) var(--rli-animation-function, ease-in-out) var(--delay) infinite uxlv7to;\n}\n.pulsate-rli-bounding-box .pulsate-indicator .pulsate-dot:nth-of-type(1) {\n  --delay: calc(var(--rli-animation-duration, 1.2s) * 0.15 * -1);\n}\n.pulsate-rli-bounding-box .pulsate-indicator .pulsate-dot:nth-of-type(2) {\n  --delay: calc(var(--rli-animation-duration, 1.2s) * 0);\n}\n.pulsate-rli-bounding-box .pulsate-indicator .pulsate-dot:nth-of-type(3) {\n  --delay: calc(var(--rli-animation-duration, 1.2s) * 0.15);\n}\n.pulsate-rli-bounding-box .pulsate-text {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  width: 80%;\n  text-transform: uppercase;\n  text-align: center;\n  font-size: 0.6em;\n  letter-spacing: 0.5px;\n  font-family: sans-serif;\n  mix-blend-mode: difference;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: -2;\n}\n\n@property --TD-pulsate-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-pulsate-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-pulsate-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-pulsate-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7s0 {\n  0%, 90%, 100% {\n    transform: scale(0);\n  }\n  40% {\n    transform: scale(1);\n  }\n}\n@keyframes uxlv7to {\n  0%, 100% {\n    background-color: var(--TD-pulsate-phase1-color);\n  }\n  24.9% {\n    background-color: var(--TD-pulsate-phase1-color);\n  }\n  25% {\n    background-color: var(--TD-pulsate-phase2-color, var(--TD-pulsate-phase1-color));\n  }\n  49.9% {\n    background-color: var(--TD-pulsate-phase2-color, var(--TD-pulsate-phase1-color));\n  }\n  50% {\n    background-color: var(--TD-pulsate-phase3-color, var(--TD-pulsate-phase1-color));\n  }\n  74.9% {\n    background-color: var(--TD-pulsate-phase3-color, var(--TD-pulsate-phase1-color));\n  }\n  75% {\n    background-color: var(--TD-pulsate-phase4-color, var(--TD-pulsate-phase1-color));\n  }\n  99.9% {\n    background-color: var(--TD-pulsate-phase4-color, var(--TD-pulsate-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--TD-pulsate-phase".concat(r2 + 1, "-color");
});
r('.brick-stack-rli-bounding-box {\n  --TD-brick-stack-phase1-color: rgb(50, 205, 50);\n  box-sizing: border-box;\n  font-size: 16px;\n  display: inline-block;\n  color: var(--TD-brick-stack-phase1-color);\n}\n.brick-stack-rli-bounding-box .brick-stack-indicator {\n  width: 2.8em;\n  height: 2.8em;\n  position: relative;\n  display: block;\n  margin: 0 auto;\n}\n.brick-stack-rli-bounding-box .brick-stack {\n  width: 100%;\n  height: 100%;\n  background: radial-gradient(circle closest-side, currentColor 0% 95%, rgba(0, 0, 0, 0) calc(95% + 1px)) 0 0/40% 40% no-repeat, radial-gradient(circle closest-side, currentColor 0% 95%, rgba(0, 0, 0, 0) calc(95% + 1px)) 0 100%/40% 40% no-repeat, radial-gradient(circle closest-side, currentColor 0% 95%, rgba(0, 0, 0, 0) calc(95% + 1px)) 100% 100%/40% 40% no-repeat;\n  animation: var(--rli-animation-duration, 1s) var(--rli-animation-function, ease-out) infinite uxlv7tu, calc(var(--rli-animation-duration, 1s) * 4) var(--rli-animation-function, ease-out) infinite uxlv7us;\n}\n\n@property --TD-brick-stack-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-brick-stack-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-brick-stack-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-brick-stack-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1s;\n}\n@keyframes uxlv7tu {\n  0% {\n    background-position: 0 0, 0 100%, 100% 100%;\n  }\n  25% {\n    background-position: 100% 0, 0 100%, 100% 100%;\n  }\n  50% {\n    background-position: 100% 0, 0 0, 100% 100%;\n  }\n  75% {\n    background-position: 100% 0, 0 0, 0 100%;\n  }\n  100% {\n    background-position: 100% 100%, 0 0, 0 100%;\n  }\n}\n@keyframes uxlv7us {\n  100%, 0% {\n    color: var(--TD-brick-stack-phase1-color);\n  }\n  20% {\n    color: var(--TD-brick-stack-phase1-color);\n  }\n  25% {\n    color: var(--TD-brick-stack-phase2-color, var(--TD-brick-stack-phase1-color));\n  }\n  45% {\n    color: var(--TD-brick-stack-phase2-color, var(--TD-brick-stack-phase1-color));\n  }\n  50% {\n    color: var(--TD-brick-stack-phase3-color, var(--TD-brick-stack-phase1-color));\n  }\n  70% {\n    color: var(--TD-brick-stack-phase3-color, var(--TD-brick-stack-phase1-color));\n  }\n  75% {\n    color: var(--TD-brick-stack-phase4-color, var(--TD-brick-stack-phase1-color));\n  }\n  95% {\n    color: var(--TD-brick-stack-phase4-color, var(--TD-brick-stack-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--TD-brick-stack-phase".concat(r2 + 1, "-color");
});
r('.bob-rli-bounding-box {\n  --TD-bob-phase1-color: rgb(50, 205, 50);\n  box-sizing: border-box;\n  font-size: 16px;\n  display: inline-block;\n  color: var(--TD-bob-phase1-color);\n}\n.bob-rli-bounding-box .bob-indicator {\n  width: 4.4em;\n  height: 2.2em;\n  position: relative;\n  display: block;\n  margin: 0 auto;\n}\n.bob-rli-bounding-box .bob-indicator .bobbing,\n.bob-rli-bounding-box .bob-indicator .bobbing::before,\n.bob-rli-bounding-box .bob-indicator .bobbing::after {\n  width: 1.1em;\n  height: 100%;\n  display: grid;\n  animation: var(--rli-animation-duration, 1.2s) var(--rli-animation-function, linear) var(--delay) infinite uxlv7u0, calc(var(--rli-animation-duration, 1.2s) * 4) var(--rli-animation-function, linear) var(--delay) infinite uxlv7vq;\n}\n.bob-rli-bounding-box .bob-indicator .bobbing::before,\n.bob-rli-bounding-box .bob-indicator .bobbing::after {\n  content: "";\n  grid-area: 1/1;\n}\n.bob-rli-bounding-box .bob-indicator .bobbing {\n  --delay: calc(var(--rli-animation-duration, 1.2s) * 0.12 * -1);\n  background: radial-gradient(circle closest-side at center, currentColor 0% 92%, rgba(0, 0, 0, 0) calc(92% + 1px)) 50% 50%/100% 50% no-repeat;\n}\n.bob-rli-bounding-box .bob-indicator .bobbing::before {\n  --delay: calc(var(--rli-animation-duration, 1.2s) * 0);\n  transform: translateX(150%);\n  background: radial-gradient(circle closest-side at center, currentColor 0% 92%, rgba(0, 0, 0, 0) calc(92% + 1px)) 50% 50%/100% 50% no-repeat;\n}\n.bob-rli-bounding-box .bob-indicator .bobbing::after {\n  --delay: calc(var(--rli-animation-duration, 1.2s) * 0.12);\n  transform: translateX(300%);\n  background: radial-gradient(circle closest-side at center, currentColor 0% 92%, rgba(0, 0, 0, 0) calc(92% + 1px)) 50% 50%/100% 50% no-repeat;\n}\n\n@property --TD-bob-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-bob-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-bob-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-bob-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7u0 {\n  100%, 0% {\n    background-position: 50% 50%;\n  }\n  15% {\n    background-position: 50% 10%;\n  }\n  30% {\n    background-position: 50% 100%;\n  }\n  40% {\n    background-position: 50% 0%;\n  }\n  50% {\n    background-position: 50% 90%;\n  }\n  70% {\n    background-position: 50% 10%;\n  }\n  98% {\n    background-position: 50% 50%;\n  }\n}\n@keyframes uxlv7vq {\n  100%, 0% {\n    color: var(--TD-bob-phase1-color);\n  }\n  22% {\n    color: var(--TD-bob-phase1-color);\n  }\n  25% {\n    color: var(--TD-bob-phase2-color, var(--TD-bob-phase1-color));\n  }\n  47% {\n    color: var(--TD-bob-phase2-color, var(--TD-bob-phase1-color));\n  }\n  50% {\n    color: var(--TD-bob-phase3-color, var(--TD-bob-phase1-color));\n  }\n  72% {\n    color: var(--TD-bob-phase3-color, var(--TD-bob-phase1-color));\n  }\n  75% {\n    color: var(--TD-bob-phase4-color, var(--TD-bob-phase1-color));\n  }\n  97% {\n    color: var(--TD-bob-phase4-color, var(--TD-bob-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--TD-bob-phase".concat(r2 + 1, "-color");
});
r('.bounce-rli-bounding-box {\n  --TD-bounce-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  color: var(--TD-bounce-phase1-color);\n  display: inline-block;\n  padding-bottom: 0.25125em;\n}\n.bounce-rli-bounding-box .wrapper {\n  --dot1-delay: 0s;\n  --dot1-x-offset: 0.55em;\n  --dot2-delay: calc((var(--rli-animation-duration, 0.5s) + var(--rli-animation-duration, 0.5s) * 0.75) * -1);\n  --dot2-x-offset: 2.2em;\n  --dot3-delay: calc((var(--rli-animation-duration, 0.5s) + var(--rli-animation-duration, 0.5s) * 0.5) * -1);\n  --dot3-x-offset: 3.85em;\n  width: 5.5em;\n  height: 3.125em;\n  position: relative;\n  display: block;\n  margin: 0 auto;\n}\n.bounce-rli-bounding-box .wrapper .group {\n  display: block;\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n}\n.bounce-rli-bounding-box .wrapper .group .dot {\n  width: 1.1em;\n  height: 1.1em;\n  position: absolute;\n  border-radius: 50%;\n  background-color: var(--TD-bounce-phase1-color);\n  transform-origin: 50%;\n  animation: var(--rli-animation-duration, 0.5s) var(--rli-animation-function, cubic-bezier(0.74, 0.1, 0.74, 1)) alternate infinite uxlv7wc, calc(var(--rli-animation-duration, 0.5s) * 4) var(--rli-animation-function, cubic-bezier(0.74, 0.1, 0.74, 1)) infinite uxlv7x6;\n}\n.bounce-rli-bounding-box .wrapper .group .dot:nth-of-type(1) {\n  left: var(--dot1-x-offset);\n  animation-delay: var(--dot1-delay), 0s;\n}\n.bounce-rli-bounding-box .wrapper .group .dot:nth-of-type(2) {\n  left: var(--dot2-x-offset);\n  animation-delay: var(--dot2-delay), 0s;\n}\n.bounce-rli-bounding-box .wrapper .group .dot:nth-of-type(3) {\n  left: var(--dot3-x-offset);\n  animation-delay: var(--dot3-delay), 0s;\n}\n.bounce-rli-bounding-box .wrapper .group .shadow {\n  width: 1.1em;\n  height: 0.22em;\n  border-radius: 50%;\n  background-color: rgba(0, 0, 0, 0.5);\n  position: absolute;\n  top: 101%;\n  transform-origin: 50%;\n  z-index: -1;\n  filter: blur(1px);\n  animation: var(--rli-animation-duration, 0.5s) var(--rli-animation-function, cubic-bezier(0.74, 0.1, 0.74, 1)) alternate infinite uxlv7ww;\n}\n.bounce-rli-bounding-box .wrapper .group .shadow:nth-of-type(1) {\n  left: var(--dot1-x-offset);\n  animation-delay: var(--dot1-delay);\n}\n.bounce-rli-bounding-box .wrapper .group .shadow:nth-of-type(2) {\n  left: var(--dot2-x-offset);\n  animation-delay: var(--dot2-delay);\n}\n.bounce-rli-bounding-box .wrapper .group .shadow:nth-of-type(3) {\n  left: var(--dot3-x-offset);\n  animation-delay: var(--dot3-delay);\n}\n\n@property --TD-bounce-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-bounce-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-bounce-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --TD-bounce-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 0.5s;\n}\n@keyframes uxlv7wc {\n  0% {\n    top: 0%;\n  }\n  60% {\n    height: 1.25em;\n    border-radius: 50%;\n    transform: scaleX(1);\n  }\n  100% {\n    top: 100%;\n    height: 0.22em;\n    transform: scaleX(1.5);\n    filter: blur(0.4px);\n  }\n}\n@keyframes uxlv7ww {\n  0% {\n    transform: scaleX(0.2);\n    opacity: 0.2;\n  }\n  60% {\n    opacity: 0.4;\n  }\n  100% {\n    transform: scaleX(1.5);\n    opacity: 0.6;\n  }\n}\n@keyframes uxlv7x6 {\n  0%, 100% {\n    background-color: var(--TD-bounce-phase1-color);\n  }\n  20% {\n    background-color: var(--TD-bounce-phase1-color);\n  }\n  25% {\n    background-color: var(--TD-bounce-phase2-color, var(--TD-bounce-phase1-color));\n  }\n  45% {\n    background-color: var(--TD-bounce-phase2-color, var(--TD-bounce-phase1-color));\n  }\n  50% {\n    background-color: var(--TD-bounce-phase3-color, var(--TD-bounce-phase1-color));\n  }\n  70% {\n    background-color: var(--TD-bounce-phase3-color, var(--TD-bounce-phase1-color));\n  }\n  75% {\n    background-color: var(--TD-bounce-phase4-color, var(--TD-bounce-phase1-color));\n  }\n  95% {\n    background-color: var(--TD-bounce-phase4-color, var(--TD-bounce-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--TD-bounce-phase".concat(r2 + 1, "-color");
});
r('.blink-blur-rli-bounding-box {\n  --shape-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  color: var(--shape-phase1-color);\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator {\n  isolation: isolate;\n  display: flex;\n  flex-direction: row;\n  -moz-column-gap: 0.4em;\n       column-gap: 0.4em;\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator .blink-blur-shape {\n  --x-deg: -20deg;\n  width: 1.8em;\n  height: 2.25em;\n  border-radius: 0.25em;\n  color: inherit;\n  transform: skewX(var(--x-deg));\n  background-color: var(--shape-phase1-color);\n  animation-name: uxlv7id, uxlv7jl;\n  animation-duration: var(--rli-animation-duration, 1.2s), calc(var(--rli-animation-duration, 1.2s) * 4);\n  animation-timing-function: var(--rli-animation-function, ease-in);\n  animation-iteration-count: infinite;\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator .blink-blur-shape.blink-blur-shape1 {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) * 0.5 * -1);\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator .blink-blur-shape.blink-blur-shape2 {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) * 0.4 * -1);\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator .blink-blur-shape.blink-blur-shape3 {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) * 0.3 * -1);\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator .blink-blur-shape.blink-blur-shape4 {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) * 0.2 * -1);\n}\n.blink-blur-rli-bounding-box .blink-blur-indicator .blink-blur-shape.blink-blur-shape5 {\n  animation-delay: calc(var(--rli-animation-duration, 1.2s) * 0.1 * -1);\n}\n\n@property --shape-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --shape-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --shape-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --shape-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 1.2s;\n}\n@keyframes uxlv7id {\n  100%, 0% {\n    opacity: 0.3;\n    filter: blur(0.0675em) drop-shadow(0 0 0.0625em);\n    transform: skewX(var(--x-deg)) scale(1.2, 1.45);\n  }\n  39% {\n    opacity: 0.8;\n  }\n  40%, 41%, 42% {\n    opacity: 0;\n  }\n  43% {\n    opacity: 0.8;\n  }\n  50% {\n    opacity: 1;\n    filter: blur(0em) drop-shadow(0 0 0em);\n    transform: skewX(var(--x-deg)) scale(1, 1);\n  }\n}\n@keyframes uxlv7jl {\n  100%, 0% {\n    color: var(--shape-phase1-color);\n    background-color: var(--shape-phase1-color);\n  }\n  25% {\n    color: var(--shape-phase2-color, var(--shape-phase1-color));\n    background-color: var(--shape-phase2-color, var(--shape-phase1-color));\n  }\n  50% {\n    color: var(--shape-phase3-color, var(--shape-phase1-color));\n    background-color: var(--shape-phase3-color, var(--shape-phase1-color));\n  }\n  75% {\n    color: var(--shape-phase4-color, var(--shape-phase1-color));\n    background-color: var(--shape-phase4-color, var(--shape-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--shape-phase".concat(r2 + 1, "-color");
});
r('.trophy-spin-rli-bounding-box {\n  --trophySpin-phase1-color: rgb(50, 205, 50);\n  box-sizing: border-box;\n  font-size: 16px;\n  position: relative;\n  isolation: isolate;\n  color: var(--trophySpin-phase1-color);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator {\n  width: 4em;\n  perspective: 1000px;\n  transform-style: preserve-3d;\n  display: block;\n  margin: 0 auto;\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade {\n  display: block;\n  width: 4em;\n  height: 0.5em;\n  background: var(--trophySpin-phase1-color);\n  animation: uxlv7ki var(--rli-animation-duration, 2.5s) var(--rli-animation-function, linear) infinite, uxlv7l2 calc(var(--rli-animation-duration, 2.5s) * 0.5) var(--rli-animation-function, linear) infinite, uxlv7ly calc(var(--rli-animation-duration, 2.5s) * 4) var(--rli-animation-function, linear) infinite;\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(8) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 0 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(7) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 1 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(6) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 2 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(5) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 3 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(4) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 4 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(3) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 5 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(2) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 6 * -1);\n}\n.trophy-spin-rli-bounding-box .trophy-spin-indicator .blade:nth-of-type(1) {\n  animation-delay: calc(var(--rli-animation-duration, 2.5s) / 2 / 8 * 7 * -1);\n}\n\n@property --trophySpin-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --trophySpin-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --trophySpin-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --trophySpin-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 2.5s;\n}\n@keyframes uxlv7ki {\n  to {\n    transform: rotateY(1turn) rotateX(-25deg);\n  }\n}\n@keyframes uxlv7l2 {\n  100%, 0% {\n    filter: brightness(1);\n    opacity: 1;\n  }\n  15% {\n    filter: brightness(1);\n  }\n  25% {\n    opacity: 0.96;\n  }\n  30% {\n    filter: brightness(0.92);\n  }\n  50% {\n    filter: brightness(0.7);\n    opacity: 1;\n  }\n  75% {\n    filter: brightness(0.92);\n    opacity: 0.96;\n  }\n  90% {\n    filter: brightness(1);\n  }\n}\n@keyframes uxlv7ly {\n  100%, 0% {\n    background-color: var(--trophySpin-phase1-color);\n  }\n  18% {\n    background-color: var(--trophySpin-phase1-color);\n  }\n  25% {\n    background-color: var(--trophySpin-phase2-color, var(--trophySpin-phase1-color));\n  }\n  43% {\n    background-color: var(--trophySpin-phase2-color, var(--trophySpin-phase1-color));\n  }\n  50% {\n    background-color: var(--trophySpin-phase3-color, var(--trophySpin-phase1-color));\n  }\n  68% {\n    background-color: var(--trophySpin-phase3-color, var(--trophySpin-phase1-color));\n  }\n  75% {\n    background-color: var(--trophySpin-phase4-color, var(--trophySpin-phase1-color));\n  }\n  93% {\n    background-color: var(--trophySpin-phase4-color, var(--trophySpin-phase1-color));\n  }\n}');
var An = Array.from({ length: 4 }, function(n2, r2) {
  return "--trophySpin-phase".concat(r2 + 1, "-color");
}), _n = function(r2) {
  var a2, e2 = L(null == r2 ? void 0 : r2.style, null == r2 ? void 0 : r2.size), t2 = e2.styles, i2 = e2.fontSize, l2 = null == r2 ? void 0 : r2.easing, s2 = F(null == r2 ? void 0 : r2.speedPlus, "2.5s").animationPeriod, c2 = function(n2) {
    var r3 = {}, o2 = An.length;
    if (n2 instanceof Array) {
      for (var a3 = j(n2, o2), e3 = 0; e3 < a3.length && !(e3 >= 4); e3++) r3[An[e3]] = a3[e3];
      return r3;
    }
    try {
      if ("string" != typeof n2) throw new Error("Color String expected");
      for (var t3 = 0; t3 < o2; t3++) r3[An[t3]] = n2;
    } catch (a4) {
      a4 instanceof Error ? console.warn("[".concat(a4.message, ']: Received "').concat(typeof n2, '" instead with value, ').concat(JSON.stringify(n2))) : console.warn("".concat(JSON.stringify(n2), " received in <TrophySpin /> indicator cannot be processed. Using default instead!"));
      for (t3 = 0; t3 < o2; t3++) r3[An[t3]] = X;
    }
    return r3;
  }(null !== (a2 = null == r2 ? void 0 : r2.color) && void 0 !== a2 ? a2 : "");
  return React.createElement("span", { className: "rli-d-i-b trophy-spin-rli-bounding-box", style: o(o(o(o(o({}, i2 && { fontSize: i2 }), s2 && { "--rli-animation-duration": s2 }), l2 && { "--rli-animation-function": l2 }), c2), t2), role: "status", "aria-live": "polite", "aria-label": "Loading" }, React.createElement("span", { className: "rli-d-i-b trophy-spin-indicator" }, React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" }), React.createElement("span", { className: "blade" })), React.createElement(U, { staticText: true, text: null == r2 ? void 0 : r2.text, textColor: null == r2 ? void 0 : r2.textColor }));
};
r('.slab-rli-bounding-box {\n  --slab-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  color: var(--slab-phase1-color);\n  position: relative;\n}\n.slab-rli-bounding-box .slab-indicator {\n  position: relative;\n  display: block;\n  width: 7em;\n  height: 4em;\n  margin: 0 auto;\n  overflow: hidden;\n}\n.slab-rli-bounding-box .slab-indicator .slabs-wrapper {\n  width: 4em;\n  height: 4em;\n  transform: perspective(15em) rotateX(66deg) rotateZ(-25deg);\n  transform-style: preserve-3d;\n  transform-origin: 50% 100%;\n  display: block;\n  position: absolute;\n  bottom: 0;\n  right: 0;\n}\n.slab-rli-bounding-box .slab-indicator .slabs-wrapper .slab {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background-color: var(--slab-phase1-color);\n  opacity: 0;\n  box-shadow: -0.08em 0.15em 0 rgba(0, 0, 0, 0.45);\n  transform-origin: 0% 0%;\n  animation: calc(var(--rli-animation-duration-unitless, 3) * 1s) var(--rli-animation-function, linear) infinite uxlv7md, calc(var(--rli-animation-duration-unitless, 3) * 4s) var(--rli-animation-function, linear) infinite uxlv7n0;\n}\n.slab-rli-bounding-box .slab-indicator .slabs-wrapper .slab:nth-child(1) {\n  animation-delay: calc(4 / (16 / var(--rli-animation-duration-unitless, 3)) * 3 * -1 * 1s);\n}\n.slab-rli-bounding-box .slab-indicator .slabs-wrapper .slab:nth-child(2) {\n  animation-delay: calc(4 / (16 / var(--rli-animation-duration-unitless, 3)) * 2 * -1 * 1s);\n}\n.slab-rli-bounding-box .slab-indicator .slabs-wrapper .slab:nth-child(3) {\n  animation-delay: calc(4 / (16 / var(--rli-animation-duration-unitless, 3)) * -1 * 1s);\n}\n.slab-rli-bounding-box .slab-indicator .slabs-wrapper .slab:nth-child(4) {\n  animation-delay: 0s;\n}\n\n@property --slab-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --slab-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --slab-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --slab-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration-unitless {\n  syntax: "<number>";\n  inherits: true;\n  initial-value: 3;\n}\n@keyframes uxlv7md {\n  0% {\n    transform: translateY(0) rotateX(30deg);\n    opacity: 0;\n  }\n  10% {\n    transform: translateY(-40%) rotateX(0deg);\n    opacity: 1;\n  }\n  25% {\n    opacity: 1;\n  }\n  100% {\n    transform: translateY(-400%) rotateX(0deg);\n    opacity: 0;\n  }\n}\n@keyframes uxlv7n0 {\n  100%, 0% {\n    background-color: var(--slab-phase1-color);\n  }\n  24.9% {\n    background-color: var(--slab-phase1-color);\n  }\n  25% {\n    background-color: var(--slab-phase2-color, var(--slab-phase1-color));\n  }\n  49.9% {\n    background-color: var(--slab-phase2-color, var(--slab-phase1-color));\n  }\n  50% {\n    background-color: var(--slab-phase3-color, var(--slab-phase1-color));\n  }\n  74.9% {\n    background-color: var(--slab-phase3-color, var(--slab-phase1-color));\n  }\n  75% {\n    background-color: var(--slab-phase4-color, var(--slab-phase1-color));\n  }\n  99.9% {\n    background-color: var(--slab-phase4-color, var(--slab-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--slab-phase".concat(r2 + 1, "-color");
});
r('.lifeline-rli-bounding-box {\n  --life-line-phase1-color: rgb(50, 205, 50);\n  font-size: 16px;\n  isolation: isolate;\n  color: var(--life-line-phase1-color);\n}\n.lifeline-rli-bounding-box .lifeline-indicator {\n  position: relative;\n  text-align: center;\n}\n.lifeline-rli-bounding-box .lifeline-indicator path.rli-lifeline {\n  stroke-dasharray: 474.7616760254 30.3039367676;\n  animation: var(--rli-animation-duration, 2s) var(--rli-animation-function, linear) infinite uxlv7k3, calc(var(--rli-animation-duration, 2s) * 4) var(--rli-animation-function, linear) infinite uxlv7kg;\n}\n.lifeline-rli-bounding-box .lifeline-text {\n  color: currentColor;\n  mix-blend-mode: difference;\n  width: unset;\n  display: block;\n}\n\n@property --life-line-phase1-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --life-line-phase2-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --life-line-phase3-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --life-line-phase4-color {\n  syntax: "<color>";\n  inherits: true;\n  initial-value: rgb(50, 205, 50);\n}\n@property --rli-animation-duration {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 2s;\n}\n@keyframes uxlv7k3 {\n  to {\n    stroke-dashoffset: -1010.1312255859;\n  }\n}\n@keyframes uxlv7kg {\n  100%, 0% {\n    color: var(--life-line-phase1-color);\n  }\n  20% {\n    color: var(--life-line-phase1-color);\n  }\n  25% {\n    color: var(--life-line-phase2-color, var(--life-line-phase1-color));\n  }\n  45% {\n    color: var(--life-line-phase2-color, var(--life-line-phase1-color));\n  }\n  50% {\n    color: var(--life-line-phase3-color, var(--life-line-phase1-color));\n  }\n  70% {\n    color: var(--life-line-phase3-color, var(--life-line-phase1-color));\n  }\n  75% {\n    color: var(--life-line-phase4-color, var(--life-line-phase1-color));\n  }\n  95% {\n    color: var(--life-line-phase4-color, var(--life-line-phase1-color));\n  }\n}');
Array.from({ length: 4 }, function(n2, r2) {
  return "--life-line-phase".concat(r2 + 1, "-color");
});
const sizeMap = {
  sm: 16,
  // Small spinner for buttons
  md: 24,
  // Medium for inline elements  
  lg: 32,
  // Large for main loading states
  xl: 48
  // Extra large for full screen loading
};
const TrophySpinLoader = ({
  size = "md",
  color = "#3b82f6",
  // Blue-600 by default
  speedPlus = 1,
  className = ""
}) => {
  const pixelSize = sizeMap[size];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex items-center justify-center ${className}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    _n,
    {
      color,
      size: pixelSize,
      speedPlus,
      style: {
        width: `${pixelSize}px`,
        height: `${pixelSize}px`
      }
    }
  ) });
};
const SmallTrophySpin = ({ className }) => /* @__PURE__ */ jsxRuntimeExports.jsx(TrophySpinLoader, { size: "sm", className });
const MediumTrophySpin = ({ className, color }) => /* @__PURE__ */ jsxRuntimeExports.jsx(TrophySpinLoader, { size: "md", color, className });
const ExpandableInvestigationButton = ({
  onStartWorkflow,
  onQuickAction,
  processingAction,
  isFooter = false
}) => {
  const [isHovered, setIsHovered] = reactExports.useState(false);
  const isProcessing = processingAction === "investigation-summary";
  const handleMouseEnter = reactExports.useCallback(() => {
    if (!isProcessing) {
      setIsHovered(true);
    }
  }, [isProcessing]);
  const handleMouseLeave = reactExports.useCallback(() => {
    setIsHovered(false);
  }, []);
  const handleDictate = reactExports.useCallback(() => {
    if (onStartWorkflow) {
      onStartWorkflow("investigation-summary");
    }
    setIsHovered(false);
  }, [onStartWorkflow]);
  const handleType = reactExports.useCallback(async () => {
    await onQuickAction("investigation-summary", { type: "manual" });
    setIsHovered(false);
  }, [onQuickAction]);
  if (isFooter) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "relative overflow-hidden min-h-16",
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        style: { minHeight: "64px" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
        `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: isProcessing,
              className: `
              glass-button relative p-2 rounded-lg transition-all hover:bg-gray-50 text-center w-full h-full
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-3 h-3 text-blue-600 flex-shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium leading-tight", children: "Investigations" })
                ] }),
                isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" }) })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg border border-emerald-200 bg-white h-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleDictate,
                className: "flex-1 p-2 text-center hover:bg-emerald-50 transition-colors border-r border-emerald-200",
                title: "Dictate investigation summary",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-3 h-3 text-emerald-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-900", children: "Dictate" })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleType,
                className: "flex-1 p-2 text-center hover:bg-emerald-50 transition-colors",
                title: "Type investigation summary",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { className: "w-3 h-3 text-emerald-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-900", children: "Type" })
                ] })
              }
            )
          ] }) })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative overflow-hidden min-h-20",
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      style: { minHeight: "80px" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
        transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
      `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: isProcessing,
            className: `
            glass-button p-3 rounded-lg text-left transition-all hover:bg-gray-50 w-full
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Investigations" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Open investigation summary field" })
                ] })
              ] }),
              isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" }) })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
        absolute inset-0 transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
      `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg glass-button border h-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDictate,
              className: "flex-1 p-3 text-left hover:bg-emerald-50 transition-colors border-r border-gray-200",
              title: "Dictate investigation summary with AI formatting",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Dictate Summary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Voice-to-text with AI formatting" })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleType,
              className: "flex-1 p-3 text-left hover:bg-blue-50 transition-colors",
              title: "Open field for manual entry",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { className: "w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Type Summary" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Open field for manual entry" })
                ] })
              ] })
            }
          )
        ] }) })
      ]
    }
  );
};
const ExpandableBackgroundButton = ({
  onStartWorkflow,
  onQuickAction,
  processingAction,
  isFooter = false
}) => {
  const [isHovered, setIsHovered] = reactExports.useState(false);
  const isProcessing = processingAction === "background";
  const handleMouseEnter = reactExports.useCallback(() => {
    if (!isProcessing) {
      setIsHovered(true);
    }
  }, [isProcessing]);
  const handleMouseLeave = reactExports.useCallback(() => {
    setIsHovered(false);
  }, []);
  const handleDictate = reactExports.useCallback(() => {
    if (onStartWorkflow) {
      onStartWorkflow("background");
    }
    setIsHovered(false);
  }, [onStartWorkflow]);
  const handleType = reactExports.useCallback(async () => {
    await onQuickAction("background", { type: "manual" });
    setIsHovered(false);
  }, [onQuickAction]);
  if (isFooter) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "relative overflow-hidden min-h-16",
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        style: { minHeight: "64px" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
        `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: isProcessing,
              className: `
              glass-button relative p-2 rounded-lg transition-all hover:bg-gray-50 text-center w-full h-full
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "w-3 h-3 text-blue-600 flex-shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium leading-tight", children: "Background" })
                ] }),
                isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" }) })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg border border-emerald-200 bg-white h-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleDictate,
                className: "flex-1 p-2 text-center hover:bg-emerald-50 transition-colors border-r border-emerald-200",
                title: "Dictate medical background history",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-3 h-3 text-emerald-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-900", children: "Dictate" })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleType,
                className: "flex-1 p-2 text-center hover:bg-emerald-50 transition-colors",
                title: "Access background section in EMR",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { className: "w-3 h-3 text-emerald-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-900", children: "Type" })
                ] })
              }
            )
          ] }) })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative overflow-hidden min-h-20",
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      style: { minHeight: "80px" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
        transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
      `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: isProcessing,
            className: `
            glass-button p-3 rounded-lg text-left transition-all hover:bg-gray-50 w-full
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Background" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Access patient background notes" })
                ] })
              ] }),
              isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" }) })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
        absolute inset-0 transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
      `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg glass-button border h-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDictate,
              className: "flex-1 p-3 text-left hover:bg-emerald-50 transition-colors border-r border-gray-200",
              title: "Dictate medical background with ↪ arrow formatting",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Dictate History" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Voice-to-text with ↪ arrow formatting" })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleType,
              className: "flex-1 p-3 text-left hover:bg-blue-50 transition-colors",
              title: "Access background section in EMR",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { className: "w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "EMR Access" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Navigate to background section" })
                ] })
              ] })
            }
          )
        ] }) })
      ]
    }
  );
};
const ExpandableMedicationButton = ({
  onStartWorkflow,
  onQuickAction,
  processingAction,
  isFooter = false
}) => {
  const [isHovered, setIsHovered] = reactExports.useState(false);
  const isProcessing = processingAction === "medications";
  const handleMouseEnter = reactExports.useCallback(() => {
    if (!isProcessing) {
      setIsHovered(true);
    }
  }, [isProcessing]);
  const handleMouseLeave = reactExports.useCallback(() => {
    setIsHovered(false);
  }, []);
  const handleDictate = reactExports.useCallback(() => {
    if (onStartWorkflow) {
      onStartWorkflow("medication");
    }
    setIsHovered(false);
  }, [onStartWorkflow]);
  const handleType = reactExports.useCallback(async () => {
    await onQuickAction("medications", { type: "manual" });
    setIsHovered(false);
  }, [onQuickAction]);
  if (isFooter) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "relative overflow-hidden min-h-16",
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        style: { minHeight: "64px" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
        `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              disabled: isProcessing,
              className: `
              glass-button relative p-2 rounded-lg transition-all hover:bg-gray-50 text-center w-full h-full
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Pill, { className: "w-3 h-3 text-blue-600 flex-shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium leading-tight", children: "Medications" })
                ] }),
                isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" }) })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute inset-0 transition-all duration-200 ease-out
          ${isHovered && !isProcessing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg border border-emerald-200 bg-white h-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleDictate,
                className: "flex-1 p-2 text-center hover:bg-emerald-50 transition-colors border-r border-emerald-200",
                title: "Dictate medication list with simple formatting",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-3 h-3 text-emerald-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-900", children: "Dictate" })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleType,
                className: "flex-1 p-2 text-center hover:bg-emerald-50 transition-colors",
                title: "Access medications section in EMR",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { className: "w-3 h-3 text-emerald-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-900", children: "Type" })
                ] })
              }
            )
          ] }) })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative overflow-hidden min-h-20",
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      style: { minHeight: "80px" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
        transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
      `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            disabled: isProcessing,
            className: `
            glass-button p-3 rounded-lg text-left transition-all hover:bg-gray-50 w-full
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Pill, { className: "w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Medications" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "View/edit medication list" })
                ] })
              ] }),
              isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" }) })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
        absolute inset-0 transition-all duration-200 ease-out
        ${isHovered && !isProcessing ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
      `, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex overflow-hidden rounded-lg glass-button border h-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDictate,
              className: "flex-1 p-3 text-left hover:bg-emerald-50 transition-colors border-r border-gray-200",
              title: "Dictate medication list with simple formatting",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "Dictate List" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Voice-to-text with simple formatting" })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleType,
              className: "flex-1 p-3 text-left hover:bg-blue-50 transition-colors",
              title: "Access medications section in EMR",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { className: "w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: "EMR Access" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: "Navigate to medications section" })
                ] })
              ] })
            }
          )
        ] }) })
      ]
    }
  );
};
const APPOINTMENT_PRESETS = [
  {
    id: "preset-116-fup-3mth",
    displayName: "116 + FUP 3mth",
    itemCode: "116",
    notes: "Face to face follow up in 3 months please"
  },
  {
    id: "preset-91824-fup-3mth",
    displayName: "91824 + FUP 3mth",
    itemCode: "91824",
    notes: "TH follow up in 3 months please"
  }
];
const INVESTIGATION_OPTIONS = [
  {
    id: "dictate",
    label: "Dictate",
    icon: Mic,
    description: "Voice-to-text with AI formatting"
  },
  {
    id: "type",
    label: "Type",
    icon: Keyboard,
    description: "Open field for manual entry"
  }
];
const QUICK_ACTIONS = [
  {
    id: "background",
    label: "Background",
    icon: User,
    description: "Access patient background notes",
    category: "emr"
  },
  {
    id: "investigation-summary",
    label: "Investigations",
    icon: Search,
    description: "Open investigation summary field",
    category: "emr"
  },
  {
    id: "medications",
    label: "Medications",
    icon: Pill,
    description: "View/edit medication list",
    category: "emr"
  },
  {
    id: "ai-medical-review",
    label: "AI Medical Review",
    icon: Bot,
    description: "Australian clinical oversight and guidelines review (analyzes existing EMR data)",
    category: "analysis"
  },
  {
    id: "batch-ai-review",
    label: "Batch AI Review",
    icon: Users,
    description: "AI review for multiple patients from appointment book",
    category: "analysis"
  },
  {
    id: "social-history",
    label: "Social History",
    icon: UserCheck,
    description: "Access social & family history section",
    category: "emr"
  },
  {
    id: "profile-photo",
    label: "Profile Photo",
    icon: Camera,
    description: "Capture screenshot for patient profile",
    category: "emr"
  },
  {
    id: "quick-letter",
    label: "Quick Letter",
    icon: FileText,
    description: "Generate quick medical letter",
    category: "documentation"
  },
  {
    id: "create-task",
    label: "Create Task",
    icon: CheckSquare,
    description: "Add new task to workflow",
    category: "workflow"
  },
  {
    id: "appointment-wrap-up",
    label: "Appointment Wrap-up",
    icon: Calendar,
    description: "Complete appointment workflow",
    category: "workflow"
  }
];
const QuickActions = reactExports.memo(({ onQuickAction, onStartWorkflow, isFooter = false }) => {
  const [processingAction, setProcessingAction] = reactExports.useState(null);
  const [showPresets, setShowPresets] = reactExports.useState(false);
  const [showInvestigationOptions, setShowInvestigationOptions] = reactExports.useState(false);
  const handleAction = async (actionId, data) => {
    if (actionId === "appointment-wrap-up" && !data) {
      setShowPresets(true);
      return;
    }
    if (actionId === "investigation-summary" && !data) {
      setShowInvestigationOptions(true);
      return;
    }
    if (actionId === "batch-ai-review") {
      try {
        setProcessingAction(actionId);
        console.log("👥 Starting Batch AI Review...");
        await onQuickAction(actionId, { type: "show-modal" });
        console.log("✅ Batch AI Review modal triggered");
      } catch (error) {
        console.error(`❌ Batch AI Review failed:`, error);
      } finally {
        setProcessingAction(null);
      }
      return;
    }
    if (actionId === "ai-medical-review") {
      try {
        setProcessingAction(actionId);
        console.log("🔍 Starting AI Medical Review...");
        console.log("📋 Extracting EMR data for AI medical review...");
        const emrData = await extractEMRData();
        if (emrData) {
          const hasData = emrData.background.trim() || emrData.investigations.trim() || emrData.medications.trim();
          if (!hasData) {
            throw new Error("No clinical data found in EMR fields (Background, Investigations, Medications are all empty)");
          }
          console.log("✅ EMR data extracted successfully");
          console.log("🔄 Processing with Australian Medical Review Agent...");
          const formattedInput = formatEMRDataForReview(emrData);
          await onQuickAction(actionId, {
            emrData,
            formattedInput,
            type: "australian-medical-review"
          });
          console.log("✅ AI Medical Review completed successfully");
        } else {
          throw new Error("Failed to extract EMR data");
        }
      } catch (error) {
        console.error(`❌ AI Medical Review failed:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("AI Review Error:", errorMessage);
        if (typeof window !== "undefined") {
          const userMessage = errorMessage.includes("Unknown message type") ? "Please reload the extension in chrome://extensions and try again" : errorMessage.includes("No clinical data") ? "Please navigate to a patient page with clinical data and try again" : `AI Review failed: ${errorMessage}`;
          alert(`AI Medical Review Error

${userMessage}`);
        }
      } finally {
        setProcessingAction(null);
      }
      return;
    }
    try {
      setProcessingAction(actionId);
      console.log("⚡ Calling onQuickAction...");
      await onQuickAction(actionId, data);
      console.log("⚡ onQuickAction completed successfully");
      setShowPresets(false);
      setShowInvestigationOptions(false);
    } catch (error) {
      console.error(`❌ Quick action ${actionId} failed:`, error);
    } finally {
      setProcessingAction(null);
    }
  };
  const extractEMRData = async () => {
    try {
      console.log("📋 Extracting EMR data using working action system...");
      const [backgroundResponse, investigationResponse, medicationResponse] = await Promise.all([
        chrome.runtime.sendMessage({
          type: "EXECUTE_ACTION",
          action: "background",
          data: { extractOnly: true }
        }),
        chrome.runtime.sendMessage({
          type: "EXECUTE_ACTION",
          action: "investigation-summary",
          data: { extractOnly: true }
        }),
        chrome.runtime.sendMessage({
          type: "EXECUTE_ACTION",
          action: "medications",
          data: { extractOnly: true }
        })
      ]);
      console.log("📋 Individual action responses:", {
        background: backgroundResponse,
        investigation: investigationResponse,
        medication: medicationResponse
      });
      console.log("📋 Response validation:", {
        backgroundSuccess: backgroundResponse?.success,
        backgroundHasData: !!backgroundResponse?.data,
        investigationSuccess: investigationResponse?.success,
        investigationHasData: !!investigationResponse?.data,
        medicationSuccess: medicationResponse?.success,
        medicationHasData: !!medicationResponse?.data
      });
      const background = extractTextFromResponse(backgroundResponse) || "";
      const investigations = extractTextFromResponse(investigationResponse) || "";
      const medications = extractTextFromResponse(medicationResponse) || "";
      console.log("✅ EMR data extracted successfully via actions:", {
        background: background.length + " chars",
        investigations: investigations.length + " chars",
        medications: medications.length + " chars"
      });
      return { background, investigations, medications };
    } catch (error) {
      console.error("❌ Error extracting EMR data via actions:", error);
      return null;
    }
  };
  const extractTextFromResponse = (response) => {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (response.data && typeof response.data === "string") return response.data;
    if (response.content && typeof response.content === "string") return response.content;
    if (response.text && typeof response.text === "string") return response.text;
    if (response.value && typeof response.value === "string") return response.value;
    return "";
  };
  const formatEMRDataForReview = (emrData) => {
    return `BACKGROUND: ${emrData.background || "Not provided"}

INVESTIGATIONS: ${emrData.investigations || "Not provided"}

MEDICATIONS: ${emrData.medications || "Not provided"}`;
  };
  const handlePresetSelect = async (preset) => {
    await handleAction("appointment-wrap-up", { preset });
  };
  const handleInvestigationOptionSelect = (option) => {
    if (option.id === "dictate") {
      if (onStartWorkflow) {
        onStartWorkflow("investigation-summary");
        setShowInvestigationOptions(false);
      }
    } else if (option.id === "type") {
      handleAction("investigation-summary", { type: "manual" });
    }
  };
  const handleBackToActions = () => {
    setShowPresets(false);
    setShowInvestigationOptions(false);
  };
  const groupedActions = QUICK_ACTIONS.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {});
  const categoryLabels = {
    emr: "EMR Navigation",
    documentation: "Documentation",
    workflow: "Workflow",
    analysis: "Clinical Analysis"
  };
  const categoryIcons = {
    emr: ExternalLink,
    documentation: FileText,
    workflow: CheckSquare,
    analysis: Shield
  };
  if (showInvestigationOptions) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleBackToActions,
            className: "flex items-center text-blue-600 hover:text-blue-700",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4 mr-1" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-5 h-5 text-blue-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Investigation Summary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 text-xs", children: "Choose how to add your summary" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3", children: INVESTIGATION_OPTIONS.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => handleInvestigationOptionSelect(option),
          disabled: processingAction === "investigation-summary",
          className: `
                  glass-button p-4 rounded-lg text-left transition-all hover:bg-gray-50 border-2 border-transparent hover:border-blue-200 btn-micro-press btn-micro-hover
                  ${processingAction === "investigation-summary" ? "opacity-50 cursor-not-allowed" : ""}
                `,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(option.icon, { className: "w-5 h-5 text-blue-600 mt-1 flex-shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-sm font-semibold mb-1", children: option.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs leading-tight", children: option.description })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-4 h-4 text-gray-400 flex-shrink-0 mt-1" })
            ] }),
            processingAction === "investigation-summary" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MediumTrophySpin, {}) })
          ]
        },
        option.id
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-gray-600 text-xs", children: [
        "💡 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tip:" }),
        " Dictate uses AI to format your speech, Type opens the field for manual entry"
      ] }) })
    ] });
  }
  if (showPresets) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-2xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleBackToActions,
            className: "flex items-center text-blue-600 hover:text-blue-700",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4 mr-1" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-5 h-5 text-blue-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Appointment Wrap-up Presets" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 text-xs", children: "Choose a preset to apply" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-3", children: APPOINTMENT_PRESETS.map((preset) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => handlePresetSelect(preset),
          disabled: processingAction === "appointment-wrap-up",
          className: `
                  glass-button p-4 rounded-lg text-left transition-all hover:bg-gray-50 border-2 border-transparent hover:border-blue-200 btn-micro-press btn-micro-hover
                  ${processingAction === "appointment-wrap-up" ? "opacity-50 cursor-not-allowed" : ""}
                `,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-5 h-5 text-blue-600 mt-1 flex-shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-sm font-semibold mb-1", children: preset.displayName }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-gray-600 text-xs mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Item Code:" }),
                  " ",
                  preset.itemCode
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-gray-600 text-xs leading-tight", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Notes:" }),
                  ' "',
                  preset.notes,
                  '"'
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-4 h-4 text-gray-400 flex-shrink-0 mt-1" })
            ] }),
            processingAction === "appointment-wrap-up" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MediumTrophySpin, {}) })
          ]
        },
        preset.id
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-gray-600 text-xs", children: [
        "💡 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tip:" }),
        " Presets will automatically fill the Item Code and Appointment Notes fields"
      ] }) })
    ] });
  }
  if (isFooter) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CheckSquare, { className: "w-3 h-3 text-blue-600" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-xs", children: "Quick Actions" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: QUICK_ACTIONS.map((action) => action.id === "investigation-summary" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        ExpandableInvestigationButton,
        {
          onStartWorkflow,
          onQuickAction,
          processingAction,
          isFooter: true
        },
        action.id
      ) : action.id === "background" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        ExpandableBackgroundButton,
        {
          onStartWorkflow,
          onQuickAction,
          processingAction,
          isFooter: true
        },
        action.id
      ) : action.id === "medications" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        ExpandableMedicationButton,
        {
          onStartWorkflow,
          onQuickAction,
          processingAction,
          isFooter: true
        },
        action.id
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => {
            console.log("🔧 Button clicked:", action.id, "at", (/* @__PURE__ */ new Date()).toISOString());
            handleAction(action.id);
          },
          disabled: processingAction === action.id,
          className: `
                  glass-button relative p-2 rounded-lg transition-all text-center btn-micro-press btn-micro-hover
                  ${action.category === "analysis" ? "hover:bg-indigo-50 border border-indigo-200 bg-indigo-50" : "hover:bg-gray-50"}
                  ${processingAction === action.id ? "opacity-50 cursor-not-allowed" : ""}
                `,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(action.icon, { className: `w-3 h-3 flex-shrink-0 ${action.category === "analysis" ? "text-indigo-600" : "text-blue-600"}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium leading-tight", children: action.label })
            ] }),
            processingAction === action.id && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SmallTrophySpin, {}) })
          ]
        },
        action.id
      )) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-2xl overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CheckSquare, { className: "w-5 h-5 text-blue-600" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Quick Actions" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 text-xs", children: "EMR shortcuts and workflows" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      Object.entries(groupedActions).map(([category, actions]) => {
        const CategoryIcon = categoryIcons[category];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-gray-100 last:border-b-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryIcon, { className: "w-4 h-4 text-gray-500" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-gray-700 text-xs font-medium uppercase tracking-wide", children: categoryLabels[category] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-2", children: actions.map((action) => action.id === "investigation-summary" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            ExpandableInvestigationButton,
            {
              onStartWorkflow,
              onQuickAction,
              processingAction,
              isFooter: false
            },
            action.id
          ) : action.id === "background" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            ExpandableBackgroundButton,
            {
              onStartWorkflow,
              onQuickAction,
              processingAction,
              isFooter: false
            },
            action.id
          ) : action.id === "medications" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            ExpandableMedicationButton,
            {
              onStartWorkflow,
              onQuickAction,
              processingAction,
              isFooter: false
            },
            action.id
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => handleAction(action.id),
              disabled: processingAction === action.id,
              className: `
                          glass-button p-3 rounded-lg text-left transition-all btn-micro-press btn-micro-hover
                          ${action.category === "analysis" ? "hover:bg-indigo-50 border border-indigo-200 bg-indigo-50" : "hover:bg-gray-50"}
                          ${processingAction === action.id ? "opacity-50 cursor-not-allowed" : ""}
                        `,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(action.icon, { className: `w-4 h-4 mt-0.5 flex-shrink-0 ${action.category === "analysis" ? "text-indigo-600" : "text-blue-600"}` }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-900 text-xs font-medium truncate", children: action.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-gray-600 text-xs mt-1 leading-tight", children: action.description })
                  ] })
                ] }),
                processingAction === action.id && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MediumTrophySpin, {}) })
              ]
            },
            action.id
          )) })
        ] }, category);
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-gray-600 text-xs", children: [
        "💡 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tip:" }),
        " Quick actions provide fast access to EMR fields and workflows"
      ] }) })
    ] })
  ] });
});
QuickActions.displayName = "QuickActions";
const STATUS_CONFIGS = {
  idle: {
    icon: Mic,
    label: "Ready",
    description: "Ready to record",
    color: "text-gray-500",
    bgColor: "bg-white/10",
    animate: false
  },
  recording: {
    icon: Volume2,
    label: "Recording",
    description: "Listening to your voice...",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    animate: true
  },
  transcribing: {
    icon: Loader2,
    label: "Transcribing",
    description: "Converting speech to text...",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    animate: true
  },
  classifying: {
    icon: Brain,
    label: "Analyzing",
    description: "Determining the best medical agent...",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    animate: true
  },
  processing: {
    icon: Zap,
    label: "Processing",
    description: "Generating medical report...",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    animate: true
  },
  enhancing: {
    icon: Brain,
    label: "Enhancing",
    description: "Refining medical content...",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    animate: true
  },
  complete: {
    icon: CheckCircle,
    label: "Complete",
    description: "Medical report generated successfully",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    animate: false
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    description: "Something went wrong. Please try again.",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    animate: false
  },
  cancelled: {
    icon: X$1,
    label: "Cancelled",
    description: "Operation cancelled by user",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    animate: false
  },
  cancelling: {
    icon: Loader2,
    label: "Cancelling",
    description: "Cancelling operation...",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    animate: true
  }
};
const AGENT_DISPLAY_NAMES = {
  "tavi": "TAVI Agent",
  "angiogram-pci": "Angiogram/PCI Agent",
  "quick-letter": "Quick Letter Agent",
  "consultation": "Consultation Agent",
  "investigation-summary": "Investigation Summary Agent",
  "background": "Background Agent",
  "medication": "Medication Agent",
  "mteer": "MTEER Agent",
  "tteer": "TTEER Agent",
  "pfo-closure": "PFO Closure Agent",
  "asd-closure": "ASD Closure Agent",
  "right-heart-cath": "RHC Agent",
  "pvl-plug": "PVL Plug Agent",
  "bypass-graft": "Bypass Graft Agent",
  "tavi-workup": "TAVI Workup Agent",
  "enhancement": "Enhancement Agent",
  "transcription": "Transcription Agent",
  "generation": "Generation Agent",
  "ai-medical-review": "AI Medical Review"
};
const StatusIndicator = ({
  status,
  currentAgent,
  onCompleteRecording,
  onCancelProcessing,
  isRecording = false
}) => {
  const config = STATUS_CONFIGS[status];
  const Icon = config.icon;
  const getDetailedDescription = () => {
    if (status === "processing" && currentAgent) {
      if (currentAgent === "ai-medical-review") {
        return "Analyzing clinical data against Australian guidelines...";
      }
      const agentName = AGENT_DISPLAY_NAMES[currentAgent] || currentAgent.toUpperCase();
      return `${agentName} is analyzing your input...`;
    }
    return config.description;
  };
  const getProgressPercentage = () => {
    const progressMap = {
      idle: 0,
      recording: 20,
      transcribing: 40,
      classifying: 60,
      processing: 80,
      enhancing: 90,
      complete: 100,
      error: 0,
      cancelled: 0,
      cancelling: 0
    };
    return progressMap[status];
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `glass rounded-2xl p-4 ${config.bgColor} border-white/20`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Icon,
          {
            className: `w-6 h-6 ${config.color} ${config.animate ? "animate-pulse" : ""}`
          }
        ),
        config.animate && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute inset-0 rounded-full border-2 ${config.color.replace("text-", "border-")} animate-ping opacity-30` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: `font-medium text-sm ${config.color}`, children: config.label }),
          currentAgent && status === "processing" && currentAgent !== "ai-medical-review" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium", children: AGENT_DISPLAY_NAMES[currentAgent] || currentAgent.toUpperCase() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 text-xs mt-0.5 break-words", children: getDetailedDescription() })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-shrink-0 flex items-center space-x-2", children: [
        isRecording && onCompleteRecording && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onCompleteRecording,
            className: "glass-button bg-emerald-500/10 border border-emerald-200 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-300 hover:text-emerald-800 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1.5 hover:shadow-md hover:scale-105",
            title: "Stop recording and process audio into medical report",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Complete" })
            ]
          }
        ),
        (isRecording || status === "transcribing" || status === "processing" || status === "cancelling") && onCancelProcessing && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onCancelProcessing,
            disabled: status === "cancelling",
            className: `glass-button px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1 ${status === "cancelling" ? "bg-orange-500/10 border border-orange-200 text-orange-600 cursor-not-allowed" : "bg-red-500/10 border border-red-200 text-red-600 hover:bg-red-500/20 hover:border-red-300 hover:text-red-700 hover:shadow-md hover:scale-105"}`,
            title: isRecording ? "Stop recording and discard audio without processing" : status === "transcribing" ? "Cancel audio transcription and discard" : "Cancel AI report generation and discard",
            children: [
              status === "cancelling" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin" }) : isRecording ? /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-3 h-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: status === "cancelling" ? "Cancelling..." : "Cancel" })
            ]
          }
        ),
        config.animate && !isRecording && status !== "transcribing" && status !== "processing" && status !== "cancelling" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-4 h-4 text-blue-600 animate-spin" }) })
      ] })
    ] }),
    status !== "idle" && status !== "error" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full bg-white/10 rounded-full h-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `h-1 rounded-full transition-all duration-500 ease-out ${config.color.replace("text-", "bg-")}`,
        style: { width: `${getProgressPercentage()}%` }
      }
    ) }) }),
    (status === "processing" || status === "enhancing") && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex items-center justify-center space-x-2", children: ["Analyzing", "Structuring", "Formatting"].map((step, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-center space-x-1",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `w-2 h-2 rounded-full transition-all duration-300 ${index === 0 ? config.color.replace("text-", "bg-") : "bg-white/20"}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 text-xs", children: step })
        ]
      },
      step
    )) }),
    status === "error" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => window.location.reload(),
        className: "text-xs text-gray-600 hover:text-gray-800 underline",
        children: "Refresh to try again"
      }
    ) })
  ] });
};
const useDropdownPosition = (options) => {
  const { isOpen, offset = { x: 0, y: 8 }, alignment = "right", maxHeight = 320 } = options;
  const triggerRef = reactExports.useRef(null);
  const dropdownRef = reactExports.useRef(null);
  const [position, setPosition] = reactExports.useState({ top: 0, left: 0 });
  const calculatePosition = reactExports.useCallback(() => {
    if (!triggerRef.current || !isOpen) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    let top = triggerRect.bottom + offset.y;
    let left = triggerRect.left + offset.x;
    let right;
    if (alignment === "right") {
      left = triggerRect.right - 280;
      right = viewport.width - triggerRect.right + offset.x;
    } else if (alignment === "center") {
      left = triggerRect.left + triggerRect.width / 2 - 140;
    }
    if (left < 8) {
      left = 8;
      right = void 0;
    } else if (left + 280 > viewport.width - 8) {
      left = viewport.width - 280 - 8;
      right = 8;
    }
    const availableSpaceBelow = viewport.height - triggerRect.bottom - 8;
    const availableSpaceAbove = triggerRect.top - 8;
    let adjustedMaxHeight = maxHeight;
    if (availableSpaceBelow < maxHeight && availableSpaceAbove > availableSpaceBelow) {
      top = triggerRect.top - maxHeight - offset.y;
      adjustedMaxHeight = Math.min(maxHeight, availableSpaceAbove);
    } else {
      adjustedMaxHeight = Math.min(maxHeight, availableSpaceBelow);
    }
    setPosition({
      top,
      left: right !== void 0 ? void 0 : left,
      right,
      maxHeight: adjustedMaxHeight
    });
  }, [isOpen, offset, alignment, maxHeight]);
  reactExports.useEffect(() => {
    if (isOpen) {
      calculatePosition();
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, calculatePosition]);
  return {
    triggerRef,
    dropdownRef,
    position,
    calculatePosition
  };
};
const usePortal = (id = "portal-root") => {
  const portalRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let portalContainer = document.getElementById(id);
    if (!portalContainer) {
      portalContainer = document.createElement("div");
      portalContainer.id = id;
      portalContainer.style.position = "relative";
      portalContainer.style.zIndex = "999999";
      portalContainer.style.pointerEvents = "none";
      document.body.appendChild(portalContainer);
    }
    portalRef.current = portalContainer;
    return () => {
      if (portalContainer && portalContainer.children.length === 0) {
        document.body.removeChild(portalContainer);
      }
    };
  }, [id]);
  return portalRef.current;
};
const DropdownPortal = ({
  isOpen,
  children,
  onClickOutside
}) => {
  const portalContainer = usePortal("dropdown-portal");
  reactExports.useEffect(() => {
    if (!isOpen || !onClickOutside) return;
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest("[data-dropdown-menu]") && !target.closest("[data-dropdown-trigger]")) {
        onClickOutside();
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClickOutside]);
  if (!isOpen || !portalContainer) {
    return null;
  }
  return reactDomExports.createPortal(
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          // Let clicks pass through the backdrop
          zIndex: 999999
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { pointerEvents: "auto" }, children })
      }
    ),
    portalContainer
  );
};
const ModelStatus = ({
  status,
  onRefresh,
  onRestartWhisper
}) => {
  const [isRefreshing, setIsRefreshing] = reactExports.useState(false);
  const [isRestartingWhisper, setIsRestartingWhisper] = reactExports.useState(false);
  const [showDetails, setShowDetails] = reactExports.useState(false);
  const { triggerRef, position } = useDropdownPosition({
    isOpen: showDetails,
    alignment: "right",
    offset: { x: 0, y: 8 },
    maxHeight: 400
  });
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleRestartWhisper = async () => {
    setIsRestartingWhisper(true);
    try {
      const result = await onRestartWhisper();
      if (result.running) {
        console.log("✅ Whisper server started successfully");
      } else {
        console.warn("⚠️ Failed to start Whisper server:", result.error);
      }
    } catch (error) {
      console.error("❌ Error restarting Whisper server:", error);
    } finally {
      setIsRestartingWhisper(false);
    }
  };
  const getOverallSystemStatus = () => {
    const lmStudioOk = status.isConnected;
    const whisperOk = status.whisperServer?.running || false;
    if (lmStudioOk && whisperOk) return "healthy";
    if (lmStudioOk || whisperOk) return "partial";
    return "offline";
  };
  const getConnectionStatusColor = () => {
    const systemStatus = getOverallSystemStatus();
    if (systemStatus === "offline") return "text-red-400";
    if (systemStatus === "partial") return "text-yellow-400";
    return "text-emerald-400";
  };
  const getConnectionStatusBg = () => {
    const systemStatus = getOverallSystemStatus();
    if (systemStatus === "offline") return "bg-red-500/20";
    if (systemStatus === "partial") return "bg-yellow-500/20";
    return "bg-emerald-500/20";
  };
  const formatLatency = (latency) => {
    if (latency === 0) return "N/A";
    if (latency < 1e3) return `${latency}ms`;
    return `${(latency / 1e3).toFixed(1)}s`;
  };
  const getLastPingStatus = () => {
    if (!status.lastPing) return "Never";
    const now = Date.now();
    const diff = now - status.lastPing;
    if (diff < 6e4) return "Just now";
    if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
    return `${Math.floor(diff / 36e5)}h ago`;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        ref: triggerRef,
        "data-dropdown-trigger": true,
        onClick: () => setShowDetails(!showDetails),
        className: `
          glass-button p-2 rounded-lg transition-all relative
          ${getConnectionStatusBg()}
        `,
        title: "AI Services Status",
        children: [
          getOverallSystemStatus() === "healthy" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { className: `w-4 h-4 ${getConnectionStatusColor()}` }) : getOverallSystemStatus() === "partial" ? /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircle, { className: `w-4 h-4 ${getConnectionStatusColor()}` }) : /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, { className: "w-4 h-4 text-red-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `
          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white/20
          ${getOverallSystemStatus() === "healthy" ? "bg-emerald-400" : getOverallSystemStatus() === "partial" ? "bg-yellow-400" : "bg-red-400"}
        ` })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DropdownPortal,
      {
        isOpen: showDetails,
        onClickOutside: () => setShowDetails(false),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-dropdown-menu": true,
            className: "glass rounded-lg border border-white/20 p-4",
            style: {
              position: "fixed",
              top: position.top,
              left: position.left,
              right: position.right,
              maxHeight: position.maxHeight,
              width: 320,
              zIndex: 999999
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-gray-900 font-medium text-sm flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { className: "w-4 h-4" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "AI Services Status" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: handleRefresh,
                    disabled: isRefreshing,
                    className: "glass-button p-1.5 rounded hover:bg-white/20 transition-colors",
                    title: "Refresh all services",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3 h-3 text-blue-600 ${isRefreshing ? "animate-spin" : ""}` })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-gray-100 rounded-lg p-3 space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { className: "w-4 h-4 text-blue-600" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-800 text-sm font-medium", children: "LMStudio" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center space-x-1 ${status.isConnected ? "text-emerald-600" : "text-red-600"}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${status.isConnected ? "bg-emerald-400" : "bg-red-400"}` }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: status.isConnected ? "Connected" : "Offline" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Latency:" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 font-mono ml-1", children: formatLatency(status.latency) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Last Check:" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 ml-1", children: getLastPingStatus() })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-gray-100 rounded-lg p-3 space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "w-4 h-4 text-purple-600" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-800 text-sm font-medium", children: "Whisper Server" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center space-x-1 ${status.whisperServer?.running ? "text-emerald-600" : "text-red-600"}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-2 h-2 rounded-full ${status.whisperServer?.running ? "bg-emerald-400" : "bg-red-400"}` }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: status.whisperServer?.running ? "Running" : "Stopped" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Port:" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 font-mono ml-1", children: status.whisperServer?.port || "8001" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600", children: "Model:" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 ml-1 truncate", children: status.whisperServer?.model || "whisper-large-v3-turbo" })
                  ] })
                ] }),
                !status.whisperServer?.running && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-amber-50 border border-amber-200 rounded p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-amber-800 text-xs font-medium", children: "Manual Start Required" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-amber-700 text-xs mt-1 leading-relaxed", children: [
                        "Run in terminal: ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "bg-amber-100 px-1 rounded", children: "./start-whisper-server.sh" })
                      ] })
                    ] })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      onClick: handleRestartWhisper,
                      disabled: isRestartingWhisper,
                      className: "w-full glass-button p-2 rounded flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3 h-3 text-blue-600 ${isRestartingWhisper ? "animate-spin" : ""}` }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 text-xs", children: isRestartingWhisper ? "Checking..." : "Check Status" })
                      ]
                    }
                  )
                ] }),
                status.whisperServer?.error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 border border-red-200 rounded p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-800 text-xs font-medium", children: "Connection Error" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-700 text-xs mt-1 leading-relaxed", children: status.whisperServer.error })
                  ] })
                ] }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-gray-200 pt-3 space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "w-3 h-3 text-blue-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-600 text-xs", children: "Models" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 pl-5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 text-xs", children: "Classifier" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 text-xs font-mono truncate max-w-24", title: status.classifierModel, children: status.classifierModel || "Not set" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 text-xs", children: "Processor" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 text-xs font-mono truncate max-w-24", title: status.processorModel, children: status.processorModel || "Not set" })
                  ] })
                ] })
              ] }),
              !status.isConnected && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-gray-200 pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-yellow-400 text-xs font-medium", children: "LMStudio Disconnected" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 text-xs mt-1 leading-relaxed", children: "Make sure LMStudio is running on localhost:1234 with a model loaded." })
                ] })
              ] }) }),
              status.isConnected && status.latency > 5e3 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-gray-200 pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-yellow-400 text-xs font-medium", children: "High Latency" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 text-xs mt-1 leading-relaxed", children: "Consider using a smaller model for better performance." })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-gray-200 pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "w-full glass-button p-2 rounded flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-3 h-3 text-blue-600" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-900 text-xs", children: "Model Settings" })
              ] }) })
            ] })
          }
        )
      }
    )
  ] });
};
const ErrorAlert = ({
  warnings = [],
  errors = [],
  onDismiss,
  onRetry,
  onEditTranscription,
  onAcceptWarning,
  className = ""
}) => {
  const hasWarnings = warnings.length > 0;
  const hasErrors = errors.length > 0;
  if (!hasWarnings && !hasErrors) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `glass rounded-2xl p-4 ${className}`, children: [
    hasWarnings && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-amber-800 text-sm font-medium", children: "Content Warning" }),
          onDismiss && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onDismiss,
              className: "text-amber-600 hover:text-amber-800 transition-colors",
              title: "Dismiss warning",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" })
            }
          )
        ] }),
        warnings.map((warning, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-amber-700 text-xs leading-relaxed mb-2 last:mb-0", children: warning }, index)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [
          onEditTranscription && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onEditTranscription,
              className: "inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { className: "w-3 h-3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Edit Transcription" })
              ]
            }
          ),
          onRetry && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onRetry,
              className: "inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "w-3 h-3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Retry" })
              ]
            }
          ),
          onAcceptWarning && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: onAcceptWarning,
              className: "inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { className: "w-3 h-3" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Accept" })
              ]
            }
          )
        ] })
      ] })
    ] }) }),
    hasErrors && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-red-800 text-sm font-medium", children: "Processing Error" }),
          onDismiss && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onDismiss,
              className: "text-red-600 hover:text-red-800 transition-colors",
              title: "Dismiss error",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" })
            }
          )
        ] }),
        errors.map((error, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-700 text-xs leading-relaxed mb-2 last:mb-0", children: error }, index)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 mt-3", children: onRetry && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: onRetry,
            className: "inline-flex items-center space-x-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "w-3 h-3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Retry" })
            ]
          }
        ) })
      ] })
    ] }) })
  ] });
};
const AGENT_EXPECTED_TIMES = {
  // Documentation agents - simpler tasks, some using lighter models
  "quick-letter": { min: 3e4, max: 6e4, complexity: "low" },
  // 30s-1min
  "consultation": { min: 12e4, max: 24e4, complexity: "medium" },
  // 2-4min
  "investigation-summary": { min: 1e4, max: 3e4, complexity: "low" },
  // 10-30s (uses lighter google/gemma-3n-e4b model)
  // Complex procedure agents - detailed medical reports using MedGemma-27b
  "tavi": { min: 48e4, max: 72e4, complexity: "high" },
  // 8-12min
  "mteer": { min: 42e4, max: 6e5, complexity: "high" },
  // 7-10min
  "pfo-closure": { min: 3e5, max: 48e4, complexity: "medium" },
  // 5-8min
  "right-heart-cath": { min: 36e4, max: 6e5, complexity: "medium" },
  // 6-10min
  "angiogram-pci": { min: 48e4, max: 9e5, complexity: "high" },
  // 8-15min
  // AI Review - comprehensive clinical analysis using MedGemma-27b
  "ai-medical-review": { min: 18e4, max: 24e4, complexity: "medium" }
  // 3-4min (user reported 3min actual)
};
const ProcessingTimeDisplay = ({ appState, isRecording = false, recordingTime = 0 }) => {
  const [elapsedTime, setElapsedTime] = reactExports.useState(0);
  reactExports.useEffect(() => {
    let intervalId;
    if (appState.processingStatus === "transcribing" || appState.processingStatus === "processing") {
      intervalId = window.setInterval(() => {
        if (appState.processingStartTime) {
          setElapsedTime(Date.now() - appState.processingStartTime);
        }
      }, 100);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [appState.processingStatus, appState.processingStartTime]);
  const formatTime = (ms) => {
    if (ms === null) return "0.0s";
    return `${(ms / 1e3).toFixed(1)}s`;
  };
  const getPerformanceIndicator = (actualTime, agentType) => {
    if (!agentType || !AGENT_EXPECTED_TIMES[agentType]) {
      return { icon: "🟡", color: "text-yellow-600", label: "Normal" };
    }
    const expected = AGENT_EXPECTED_TIMES[agentType];
    if (actualTime < expected.min) {
      return { icon: "🟢", color: "text-green-600", label: "Fast" };
    } else if (actualTime <= expected.max) {
      return { icon: "🟡", color: "text-yellow-600", label: "Normal" };
    } else {
      return { icon: "🔴", color: "text-red-600", label: "Slow" };
    }
  };
  if (isRecording && recordingTime > 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { className: "h-4 w-4 text-red-600 animate-pulse" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-red-800", children: "Recording..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-red-600 font-mono", children: [
        "(",
        formatTime(recordingTime),
        " elapsed)"
      ] })
    ] }) });
  }
  if (appState.processingStatus === "transcribing") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4 text-blue-600 animate-pulse" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-blue-800", children: "Transcribing..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-blue-600", children: [
        "(",
        formatTime(elapsedTime),
        " elapsed)"
      ] })
    ] }) });
  }
  if (appState.processingStatus === "processing") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "h-4 w-4 text-purple-600 animate-pulse" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-medium text-purple-800", children: [
        appState.currentAgentName || "Agent",
        " Processing..."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm text-purple-600", children: [
        "(",
        formatTime(elapsedTime),
        " elapsed)"
      ] })
    ] }) });
  }
  if (appState.processingStatus === "complete" && appState.totalProcessingTime) {
    const performance2 = getPerformanceIndicator(appState.totalProcessingTime, appState.currentAgent);
    const transcriptionPercent = appState.transcriptionTime ? Math.round(appState.transcriptionTime / appState.totalProcessingTime * 100) : 0;
    const agentPercent = appState.agentProcessingTime ? Math.round(appState.agentProcessingTime / appState.totalProcessingTime * 100) : 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-4 w-4 text-green-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-green-800", children: "Processing Complete" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-xs ${performance2.color}`, children: [
            performance2.icon,
            " ",
            performance2.label
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-green-800", children: formatTime(appState.totalProcessingTime) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        appState.transcriptionTime && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 bg-blue-400 rounded-full" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-700", children: "Transcription (MLX Whisper)" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 bg-gray-200 rounded-full h-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "bg-blue-400 h-1.5 rounded-full",
                style: { width: `${transcriptionPercent}%` }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-12 text-right font-medium", children: formatTime(appState.transcriptionTime) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-8 text-right text-gray-500", children: [
              transcriptionPercent,
              "%"
            ] })
          ] })
        ] }),
        appState.agentProcessingTime && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 bg-purple-400 rounded-full" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-700", children: [
              appState.currentAgentName || "Agent",
              " (MedGemma-27b)"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-20 bg-gray-200 rounded-full h-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "bg-purple-400 h-1.5 rounded-full",
                style: { width: `${agentPercent}%` }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-12 text-right font-medium", children: formatTime(appState.agentProcessingTime) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-8 text-right text-gray-500", children: [
              agentPercent,
              "%"
            ] })
          ] })
        ] })
      ] }),
      appState.currentAgent && AGENT_EXPECTED_TIMES[appState.currentAgent] && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-600 pt-1 border-t border-green-100", children: [
        "Expected: ",
        formatTime(AGENT_EXPECTED_TIMES[appState.currentAgent].min),
        " - ",
        formatTime(AGENT_EXPECTED_TIMES[appState.currentAgent].max),
        "(",
        AGENT_EXPECTED_TIMES[appState.currentAgent].complexity,
        " complexity)"
      ] })
    ] }) });
  }
  return null;
};
function CancelButton({
  processingStatus,
  isRecording,
  onCancel,
  className = ""
}) {
  const shouldShow = isRecording || processingStatus === "recording" || processingStatus === "transcribing" || processingStatus === "processing";
  if (!shouldShow) {
    return null;
  }
  const getButtonContent = () => {
    if (isRecording || processingStatus === "recording") {
      return {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" }),
        text: "Cancel & Discard",
        bgColor: "bg-red-500 hover:bg-red-600",
        description: "Stop recording and discard audio without processing"
      };
    } else if (processingStatus === "transcribing") {
      return {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" }),
        text: "Cancel Transcription",
        bgColor: "bg-orange-500 hover:bg-orange-600",
        description: "Cancel audio transcription and discard"
      };
    } else if (processingStatus === "processing") {
      return {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" }),
        text: "Cancel Processing",
        bgColor: "bg-orange-500 hover:bg-orange-600",
        description: "Cancel AI report generation and discard"
      };
    } else {
      return {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" }),
        text: "Cancel",
        bgColor: "bg-red-500 hover:bg-red-600",
        description: "Cancel current operation"
      };
    }
  };
  const { icon, text, bgColor, description } = getButtonContent();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex justify-center ${className}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: onCancel,
      title: description,
      className: `
          inline-flex items-center gap-2 px-3 py-1.5 
          ${bgColor} text-white text-xs font-medium 
          rounded-lg transition-all duration-200 
          hover:scale-105 active:scale-95
          shadow-md hover:shadow-lg
          border border-red-600
        `,
      children: [
        icon,
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: text })
      ]
    }
  ) });
}
const PatientSelectionModal = ({
  isOpen,
  onClose,
  onStartReview,
  calendarData,
  isExtracting = false,
  extractError
}) => {
  const [selectedPatients, setSelectedPatients] = reactExports.useState(/* @__PURE__ */ new Set());
  const [filter, setFilter] = reactExports.useState("all");
  const [isProcessing, setIsProcessing] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen && calendarData) {
      setSelectedPatients(/* @__PURE__ */ new Set());
      setFilter("all");
    }
  }, [isOpen, calendarData]);
  if (!isOpen) return null;
  const handlePatientToggle = (fileNumber) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(fileNumber)) {
      newSelected.delete(fileNumber);
    } else {
      newSelected.add(fileNumber);
    }
    setSelectedPatients(newSelected);
  };
  const handleSelectAll = () => {
    if (!calendarData) return;
    const filteredPatients2 = getFilteredPatients();
    const allSelected = filteredPatients2.every((p2) => selectedPatients.has(p2.fileNumber));
    const newSelected = new Set(selectedPatients);
    filteredPatients2.forEach((patient) => {
      if (allSelected) {
        newSelected.delete(patient.fileNumber);
      } else {
        newSelected.add(patient.fileNumber);
      }
    });
    setSelectedPatients(newSelected);
  };
  const getFilteredPatients = () => {
    if (!calendarData) return [];
    return calendarData.patients.filter((patient) => {
      switch (filter) {
        case "confirmed":
          return patient.confirmed;
        case "new":
          return patient.isFirstAppointment;
        case "routine":
          return !patient.isFirstAppointment;
        default:
          return true;
      }
    });
  };
  const handleStartReview = async () => {
    if (!calendarData || selectedPatients.size === 0) return;
    setIsProcessing(true);
    const selectedPatientList = calendarData.patients.filter(
      (patient) => selectedPatients.has(patient.fileNumber)
    );
    try {
      await onStartReview(selectedPatientList);
    } catch (error) {
      console.error("Failed to start batch review:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  const getAppointmentTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case "canew":
        return "bg-blue-100 text-blue-800";
      case "car20":
      case "carvi":
        return "bg-green-100 text-green-800";
      case "canvi":
        return "bg-purple-100 text-purple-800";
      case "phone":
        return "bg-gray-100 text-gray-800";
      case "unav":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const filteredPatients = getFilteredPatients();
  const selectedCount = selectedPatients.size;
  const estimatedTime = Math.ceil(selectedCount * 2.5);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-6 h-6 text-purple-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Batch AI Medical Review" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600", children: "Select patients for sequential AI review and analysis" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onClose,
            className: "p-2 hover:bg-gray-100 rounded-lg transition-colors",
            disabled: isProcessing,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-5 h-5 text-gray-500" })
          }
        )
      ] }),
      calendarData && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center space-x-6 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4 text-purple-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: calendarData.appointmentDate })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-4 h-4 text-purple-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            calendarData.totalCount,
            " total appointments"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden", children: isExtracting ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "Extracting Patient Data" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "Reading appointment information from calendar..." })
    ] }) }) : extractError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-8 h-8 text-red-500 mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "Extraction Failed" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-600 mb-4", children: extractError }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600", children: "Please ensure you're on the appointment book page and try again." })
    ] }) }) : !calendarData || calendarData.patients.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-8 h-8 text-gray-400 mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No Patients Found" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600", children: "No appointments with patient data were found on this calendar page." })
    ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 border-b border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { className: "w-4 h-4 text-gray-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: filter,
              onChange: (e2) => setFilter(e2.target.value),
              className: "border border-gray-300 rounded-lg px-3 py-1 text-sm",
              disabled: isProcessing,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "all", children: [
                  "All Appointments (",
                  calendarData.patients.length,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "confirmed", children: [
                  "Confirmed Only (",
                  calendarData.patients.filter((p2) => p2.confirmed).length,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "new", children: [
                  "New Patients (",
                  calendarData.patients.filter((p2) => p2.isFirstAppointment).length,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "routine", children: [
                  "Return Visits (",
                  calendarData.patients.filter((p2) => !p2.isFirstAppointment).length,
                  ")"
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleSelectAll,
            className: "text-sm text-purple-600 hover:text-purple-700 font-medium",
            disabled: isProcessing,
            children: filteredPatients.every((p2) => selectedPatients.has(p2.fileNumber)) ? "Deselect All" : "Select All"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-y-auto max-h-96 p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: filteredPatients.map((patient) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedPatients.has(patient.fileNumber) ? "border-purple-300 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`,
          onClick: () => handlePatientToggle(patient.fileNumber),
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: selectedPatients.has(patient.fileNumber),
                  onChange: () => handlePatientToggle(patient.fileNumber),
                  className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500",
                  disabled: isProcessing
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium text-gray-900", children: patient.name }),
                  patient.isFirstAppointment && /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "w-4 h-4 text-yellow-500" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4 text-sm text-gray-600 mt-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "DOB: ",
                    patient.dob
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "File: ",
                    patient.fileNumber
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3 h-3" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: patient.appointmentTime })
                  ] })
                ] }),
                patient.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500 mt-1", children: patient.notes })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getAppointmentTypeColor(patient.appointmentType)}`, children: patient.appointmentType }),
              patient.confirmed && /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { className: "w-4 h-4 text-green-500" })
            ] })
          ] })
        },
        patient.fileNumber
      )) }) })
    ] }) }),
    calendarData && calendarData.patients.length > 0 && !isExtracting && !extractError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 border-t border-gray-200 bg-gray-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-600", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: selectedCount }),
        " patient",
        selectedCount !== 1 ? "s" : "",
        " selected",
        selectedCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2", children: [
          "• Estimated time: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium", children: [
            estimatedTime,
            " minutes"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onClose,
            className: "px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors",
            disabled: isProcessing,
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleStartReview,
            disabled: selectedCount === 0 || isProcessing,
            className: "px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2",
            children: isProcessing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-4 h-4 animate-spin" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Starting..." })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Start AI Review" })
            ] })
          }
        )
      ] })
    ] }) })
  ] }) });
};
const NewRecordingButton = ({
  onClearRecording,
  disabled = false
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: onClearRecording,
      disabled,
      className: `
        glass-button flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-green-50 hover:border-green-300 text-green-700"}
      `,
      title: "Clear previous recording and start fresh",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-4 h-4 ${disabled ? "" : "text-green-600"}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "New Recording" })
      ]
    }
  );
};
const PatientSessionHeader = ({
  session,
  onRemoveSession,
  showRemoveButton = false,
  isCompact = false
}) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const getAgentIcon = (agentType) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4" });
  };
  if (isCompact) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3 p-2 bg-blue-50 rounded-lg border border-blue-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "w-4 h-4 text-blue-600 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-blue-900 truncate", children: session.patient.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full", children: session.agentName || session.agentType })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mt-1 text-xs text-blue-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "ID: ",
            session.patient.id
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "•" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(session.timestamp) })
        ] })
      ] }),
      showRemoveButton && onRemoveSession && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => onRemoveSession(session.id),
          className: "p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors",
          title: "Remove session",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" })
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass rounded-xl p-4 border-l-4 border-blue-500", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "w-6 h-6 text-blue-600 mt-1 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-blue-900", children: session.patient.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            getAgentIcon(session.agentType),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full", children: session.agentName || session.agentType })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "ID:" }),
            " ",
            session.patient.id
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Age:" }),
            " ",
            session.patient.age
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "DOB:" }),
            " ",
            session.patient.dob
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3 h-3" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(session.timestamp) })
          ] })
        ] }),
        (session.patient.phone || session.patient.medicare) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [
          session.patient.phone && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "📞 ",
            session.patient.phone
          ] }),
          session.patient.medicare && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "💳 Medicare: ",
            session.patient.medicare
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
      session.completed && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium", children: "✓ Complete" }),
      showRemoveButton && onRemoveSession && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => onRemoveSession(session.id),
          className: "p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors",
          title: "Remove session",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" })
        }
      )
    ] })
  ] }) });
};
const SessionsPanel = ({
  sessions,
  onRemoveSession,
  onClearAllSessions,
  onSessionSelect,
  isCollapsible = true
}) => {
  const [isExpanded, setIsExpanded] = reactExports.useState(sessions.length > 0);
  if (sessions.length === 0) {
    return null;
  }
  const completedSessions = sessions.filter((session) => session.completed);
  const inProgressSessions = sessions.filter((session) => !session.completed);
  const handleToggleExpanded = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };
  const handleSessionClick = (session) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `p-4 border-b border-gray-200 ${isCollapsible ? "cursor-pointer" : ""}`,
        onClick: handleToggleExpanded,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-5 h-5 text-blue-600" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-gray-900 font-medium text-sm", children: "Patient Sessions" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-gray-600 text-xs", children: [
                sessions.length,
                " session",
                sessions.length !== 1 ? "s" : "",
                " • ",
                completedSessions.length,
                " completed"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
            sessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: (e2) => {
                  e2.stopPropagation();
                  onClearAllSessions();
                },
                className: "p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors",
                title: "Clear all sessions",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
              }
            ),
            isCollapsible && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1", children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "w-4 h-4 text-gray-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-4 h-4 text-gray-400" }) })
          ] })
        ] })
      }
    ),
    isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-3 max-h-96 overflow-y-auto", children: [
      inProgressSessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-medium text-gray-700 uppercase tracking-wide mb-2", children: "In Progress" }),
        inProgressSessions.map((session) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `mb-3 ${onSessionSelect ? "cursor-pointer" : ""}`,
            onClick: () => handleSessionClick(session),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                PatientSessionHeader,
                {
                  session,
                  onRemoveSession,
                  showRemoveButton: true,
                  isCompact: true
                }
              ),
              session.transcription && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 ml-7 p-2 bg-gray-50 rounded text-xs text-gray-700", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-3 h-3" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Transcription Preview:" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "line-clamp-2", children: [
                  session.transcription.substring(0, 120),
                  session.transcription.length > 120 ? "..." : ""
                ] })
              ] })
            ]
          },
          session.id
        ))
      ] }),
      completedSessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        inProgressSessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-4 border-gray-200" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-medium text-gray-700 uppercase tracking-wide mb-2", children: "Completed" }),
        completedSessions.map((session) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `mb-3 ${onSessionSelect ? "cursor-pointer" : ""}`,
            onClick: () => handleSessionClick(session),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                PatientSessionHeader,
                {
                  session,
                  onRemoveSession,
                  showRemoveButton: true,
                  isCompact: true
                }
              ),
              session.results && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 ml-7 p-2 bg-green-50 rounded text-xs text-gray-700", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2 mb-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-3 h-3 text-green-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-green-700", children: "Report Generated" }),
                  session.processingTime && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-500", children: [
                    "• ",
                    (session.processingTime / 1e3).toFixed(1),
                    "s"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "line-clamp-2", children: [
                  session.results.substring(0, 120),
                  session.results.length > 120 ? "..." : ""
                ] })
              ] })
            ]
          },
          session.id
        ))
      ] })
    ] }),
    isExpanded && sessions.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 bg-gray-50 border-t border-gray-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-gray-600 text-center", children: [
      "💡 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Tip:" }),
      " Click on any session to review details, or use the trash icon to remove individual sessions"
    ] }) })
  ] });
};
const initialState = {
  // Core app state
  isRecording: false,
  isProcessing: false,
  currentAgent: null,
  transcription: "",
  results: "",
  processingStatus: "idle",
  voiceActivityLevel: 0,
  frequencyData: [],
  modelStatus: {
    isConnected: false,
    classifierModel: "",
    processorModel: "",
    lastPing: 0,
    latency: 0
  },
  transcriptionTime: null,
  agentProcessingTime: null,
  totalProcessingTime: null,
  currentAgentName: null,
  processingStartTime: null,
  failedAudioRecordings: [],
  reviewData: null,
  // Patient session management
  patientSessions: [],
  currentPatientInfo: null,
  // UI state
  ui: {
    activeWorkflow: null,
    isCancelling: false,
    showAlerts: true,
    showPatientSelectionModal: false,
    showMainMenu: false,
    isExtractingPatients: false,
    isBatchProcessing: false,
    warnings: [],
    errors: [],
    resultSummary: "",
    calendarData: null,
    extractError: null,
    batchProcessingProgress: null
  }
};
function appStateReducer(state, action) {
  switch (action.type) {
    case "SET_RECORDING":
      if (state.isRecording === action.payload) return state;
      return { ...state, isRecording: action.payload };
    case "SET_PROCESSING":
      if (state.isProcessing === action.payload) return state;
      return { ...state, isProcessing: action.payload };
    case "SET_CURRENT_AGENT":
      if (state.currentAgent === action.payload) return state;
      return { ...state, currentAgent: action.payload };
    case "SET_TRANSCRIPTION":
      if (state.transcription === action.payload) return state;
      return { ...state, transcription: action.payload };
    case "SET_RESULTS":
      if (state.results === action.payload) return state;
      return { ...state, results: action.payload };
    case "SET_PROCESSING_STATUS":
      if (state.processingStatus === action.payload) return state;
      return { ...state, processingStatus: action.payload };
    case "SET_VOICE_ACTIVITY":
      const timeSinceLastUpdate = Date.now() - (state.modelStatus.lastPing || 0);
      if (timeSinceLastUpdate < 200) return state;
      return {
        ...state,
        voiceActivityLevel: action.payload.level,
        frequencyData: action.payload.frequencyData,
        modelStatus: { ...state.modelStatus, lastPing: Date.now() }
      };
    case "SET_MODEL_STATUS":
      return { ...state, modelStatus: action.payload };
    case "SET_TIMING_DATA":
      return { ...state, ...action.payload };
    case "SET_CURRENT_AGENT_NAME":
      if (state.currentAgentName === action.payload) return state;
      return { ...state, currentAgentName: action.payload };
    case "SET_FAILED_RECORDINGS":
      return { ...state, failedAudioRecordings: action.payload };
    case "SET_REVIEW_DATA":
      return { ...state, reviewData: action.payload };
    case "SET_ACTIVE_WORKFLOW":
      if (state.ui.activeWorkflow === action.payload) return state;
      return { ...state, ui: { ...state.ui, activeWorkflow: action.payload } };
    case "SET_CANCELLING":
      if (state.ui.isCancelling === action.payload) return state;
      return { ...state, ui: { ...state.ui, isCancelling: action.payload } };
    case "SET_WARNINGS":
      return { ...state, ui: { ...state.ui, warnings: action.payload } };
    case "SET_ERRORS":
      return { ...state, ui: { ...state.ui, errors: action.payload } };
    case "SET_ALERTS_VISIBLE":
      if (state.ui.showAlerts === action.payload) return state;
      return { ...state, ui: { ...state.ui, showAlerts: action.payload } };
    case "SET_RESULT_SUMMARY":
      if (state.ui.resultSummary === action.payload) return state;
      return { ...state, ui: { ...state.ui, resultSummary: action.payload } };
    case "SET_PATIENT_MODAL":
      if (state.ui.showPatientSelectionModal === action.payload) return state;
      return { ...state, ui: { ...state.ui, showPatientSelectionModal: action.payload } };
    case "SET_MAIN_MENU":
      if (state.ui.showMainMenu === action.payload) return state;
      return { ...state, ui: { ...state.ui, showMainMenu: action.payload } };
    case "SET_CALENDAR_DATA":
      return { ...state, ui: { ...state.ui, calendarData: action.payload } };
    case "SET_EXTRACTING_PATIENTS":
      if (state.ui.isExtractingPatients === action.payload) return state;
      return { ...state, ui: { ...state.ui, isExtractingPatients: action.payload } };
    case "SET_EXTRACT_ERROR":
      if (state.ui.extractError === action.payload) return state;
      return { ...state, ui: { ...state.ui, extractError: action.payload } };
    case "SET_BATCH_PROCESSING":
      if (state.ui.isBatchProcessing === action.payload) return state;
      return { ...state, ui: { ...state.ui, isBatchProcessing: action.payload } };
    case "SET_BATCH_PROGRESS":
      return { ...state, ui: { ...state.ui, batchProcessingProgress: action.payload } };
    case "SET_PROCESSING_START_TIME":
      return { ...state, processingStartTime: action.payload };
    case "RESET_STATE":
      return initialState;
    case "CLEAR_RECORDING":
      return {
        ...state,
        transcription: "",
        results: "",
        processingStatus: "idle",
        currentAgent: null,
        currentAgentName: null,
        transcriptionTime: null,
        agentProcessingTime: null,
        totalProcessingTime: null,
        processingStartTime: null,
        reviewData: null,
        ui: {
          ...state.ui,
          activeWorkflow: null,
          warnings: [],
          errors: [],
          resultSummary: "",
          isCancelling: false
        }
      };
    case "SET_CURRENT_PATIENT_INFO":
      return { ...state, currentPatientInfo: action.payload };
    case "ADD_PATIENT_SESSION":
      return { ...state, patientSessions: [action.payload, ...state.patientSessions] };
    case "UPDATE_PATIENT_SESSION":
      return {
        ...state,
        patientSessions: state.patientSessions.map(
          (session) => session.id === action.payload.id ? { ...session, ...action.payload.updates } : session
        )
      };
    case "REMOVE_PATIENT_SESSION":
      return {
        ...state,
        patientSessions: state.patientSessions.filter((session) => session.id !== action.payload)
      };
    case "CLEAR_PATIENT_SESSIONS":
      return { ...state, patientSessions: [], currentPatientInfo: null };
    default:
      return state;
  }
}
function useAppState() {
  const [state, dispatch] = reactExports.useReducer(appStateReducer, initialState);
  const lastVoiceUpdateRef = reactExports.useRef(0);
  const actions = {
    setRecording: reactExports.useCallback((isRecording) => {
      dispatch({ type: "SET_RECORDING", payload: isRecording });
    }, []),
    setProcessing: reactExports.useCallback((isProcessing) => {
      dispatch({ type: "SET_PROCESSING", payload: isProcessing });
    }, []),
    setCurrentAgent: reactExports.useCallback((agent) => {
      dispatch({ type: "SET_CURRENT_AGENT", payload: agent });
    }, []),
    setTranscription: reactExports.useCallback((transcription) => {
      dispatch({ type: "SET_TRANSCRIPTION", payload: transcription });
    }, []),
    setResults: reactExports.useCallback((results) => {
      dispatch({ type: "SET_RESULTS", payload: results });
    }, []),
    setProcessingStatus: reactExports.useCallback((status) => {
      dispatch({ type: "SET_PROCESSING_STATUS", payload: status });
    }, []),
    setVoiceActivity: reactExports.useCallback((level, frequencyData) => {
      const now = Date.now();
      if (now - lastVoiceUpdateRef.current >= 200) {
        lastVoiceUpdateRef.current = now;
        dispatch({ type: "SET_VOICE_ACTIVITY", payload: { level, frequencyData } });
      }
    }, []),
    setModelStatus: reactExports.useCallback((status) => {
      dispatch({ type: "SET_MODEL_STATUS", payload: status });
    }, []),
    setTimingData: reactExports.useCallback((timing) => {
      dispatch({ type: "SET_TIMING_DATA", payload: timing });
    }, []),
    setCurrentAgentName: reactExports.useCallback((name) => {
      dispatch({ type: "SET_CURRENT_AGENT_NAME", payload: name });
    }, []),
    setFailedRecordings: reactExports.useCallback((recordings) => {
      dispatch({ type: "SET_FAILED_RECORDINGS", payload: recordings });
    }, []),
    setReviewData: reactExports.useCallback((data) => {
      dispatch({ type: "SET_REVIEW_DATA", payload: data });
    }, []),
    setActiveWorkflow: reactExports.useCallback((workflow) => {
      dispatch({ type: "SET_ACTIVE_WORKFLOW", payload: workflow });
    }, []),
    setCancelling: reactExports.useCallback((isCancelling) => {
      dispatch({ type: "SET_CANCELLING", payload: isCancelling });
    }, []),
    setWarnings: reactExports.useCallback((warnings) => {
      dispatch({ type: "SET_WARNINGS", payload: warnings });
    }, []),
    setErrors: reactExports.useCallback((errors) => {
      dispatch({ type: "SET_ERRORS", payload: errors });
    }, []),
    setAlertsVisible: reactExports.useCallback((visible) => {
      dispatch({ type: "SET_ALERTS_VISIBLE", payload: visible });
    }, []),
    setResultSummary: reactExports.useCallback((summary) => {
      dispatch({ type: "SET_RESULT_SUMMARY", payload: summary });
    }, []),
    setPatientModal: reactExports.useCallback((show) => {
      dispatch({ type: "SET_PATIENT_MODAL", payload: show });
    }, []),
    setMainMenu: reactExports.useCallback((show) => {
      dispatch({ type: "SET_MAIN_MENU", payload: show });
    }, []),
    setCalendarData: reactExports.useCallback((data) => {
      dispatch({ type: "SET_CALENDAR_DATA", payload: data });
    }, []),
    setExtractingPatients: reactExports.useCallback((extracting) => {
      dispatch({ type: "SET_EXTRACTING_PATIENTS", payload: extracting });
    }, []),
    setExtractError: reactExports.useCallback((error) => {
      dispatch({ type: "SET_EXTRACT_ERROR", payload: error });
    }, []),
    setBatchProcessing: reactExports.useCallback((processing) => {
      dispatch({ type: "SET_BATCH_PROCESSING", payload: processing });
    }, []),
    setBatchProgress: reactExports.useCallback((progress) => {
      dispatch({ type: "SET_BATCH_PROGRESS", payload: progress });
    }, []),
    setProcessingStartTime: reactExports.useCallback((time) => {
      dispatch({ type: "SET_PROCESSING_START_TIME", payload: time });
    }, []),
    resetState: reactExports.useCallback(() => {
      dispatch({ type: "RESET_STATE" });
    }, []),
    clearRecording: reactExports.useCallback(() => {
      dispatch({ type: "CLEAR_RECORDING" });
    }, []),
    // Patient session management actions
    setCurrentPatientInfo: reactExports.useCallback((patientInfo) => {
      dispatch({ type: "SET_CURRENT_PATIENT_INFO", payload: patientInfo });
    }, []),
    addPatientSession: reactExports.useCallback((session) => {
      dispatch({ type: "ADD_PATIENT_SESSION", payload: session });
    }, []),
    updatePatientSession: reactExports.useCallback((id, updates) => {
      dispatch({ type: "UPDATE_PATIENT_SESSION", payload: { id, updates } });
    }, []),
    removePatientSession: reactExports.useCallback((id) => {
      dispatch({ type: "REMOVE_PATIENT_SESSION", payload: id });
    }, []),
    clearPatientSessions: reactExports.useCallback(() => {
      dispatch({ type: "CLEAR_PATIENT_SESSIONS" });
    }, [])
  };
  return {
    state,
    actions
  };
}
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e2 = new Event("vite:preloadError", {
      cancelable: true
    });
    e2.payload = err;
    window.dispatchEvent(e2);
    if (!e2.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const agentCache = /* @__PURE__ */ new Map();
const _LazyAgentFactory = class _LazyAgentFactory {
  static getInstance() {
    if (!_LazyAgentFactory.instance) {
      _LazyAgentFactory.instance = new _LazyAgentFactory();
    }
    return _LazyAgentFactory.instance;
  }
  /**
   * Dynamically load and instantiate a medical agent
   */
  async loadAgent(agentType) {
    if (agentCache.has(agentType)) {
      console.log(`♻️ Using cached ${agentType} agent`);
      return agentCache.get(agentType);
    }
    console.log(`🔄 Lazy loading ${agentType} agent...`);
    try {
      let AgentClass;
      switch (agentType) {
        case "tavi":
          const taviModule = await __vitePreload(() => import("./chunks/agents.BUoiklxm.js").then((n2) => n2.T), true ? __vite__mapDeps([0,1]) : void 0);
          AgentClass = taviModule.TAVIAgent;
          break;
        case "angiogram-pci":
          const angiogramModule = await __vitePreload(() => import("./chunks/agents.BUoiklxm.js").then((n2) => n2.A), true ? __vite__mapDeps([0,1]) : void 0);
          AgentClass = angiogramModule.AngiogramPCIAgent;
          break;
        case "quick-letter":
          const quickLetterModule = await __vitePreload(() => import("./chunks/agents.BUoiklxm.js").then((n2) => n2.Q), true ? __vite__mapDeps([0,1]) : void 0);
          AgentClass = quickLetterModule.QuickLetterAgent;
          break;
        case "consultation":
          const consultationModule = await __vitePreload(() => import("./chunks/agents.BUoiklxm.js").then((n2) => n2.C), true ? __vite__mapDeps([0,1]) : void 0);
          AgentClass = consultationModule.ConsultationAgent;
          break;
        case "investigation-summary":
          const investigationModule = await __vitePreload(() => import("./chunks/InvestigationSummaryAgent.h8LP0CJK.js"), true ? __vite__mapDeps([2,0,1]) : void 0);
          AgentClass = investigationModule.InvestigationSummaryAgent;
          break;
        case "background":
          const backgroundModule = await __vitePreload(() => import("./chunks/BackgroundAgent.Bz6RECVn.js"), true ? __vite__mapDeps([3,0,1]) : void 0);
          AgentClass = backgroundModule.BackgroundAgent;
          break;
        case "medication":
          const medicationModule = await __vitePreload(() => import("./chunks/MedicationAgent.CjbOUxMN.js"), true ? __vite__mapDeps([4,0,1]) : void 0);
          AgentClass = medicationModule.MedicationAgent;
          break;
        case "mteer":
          const mteerModule = await __vitePreload(() => import("./chunks/MTEERAgent.DtXYlnTp.js"), true ? __vite__mapDeps([5,0,1]) : void 0);
          AgentClass = mteerModule.MTEERAgent;
          break;
        case "pfo-closure":
          const pfoModule = await __vitePreload(() => import("./chunks/PFOClosureAgent._oao8gHW.js"), true ? __vite__mapDeps([6,0,1]) : void 0);
          AgentClass = pfoModule.PFOClosureAgent;
          break;
        case "right-heart-cath":
          const rhcModule = await __vitePreload(() => import("./chunks/RightHeartCathAgent.DqBj-H9G.js"), true ? __vite__mapDeps([7,0,1]) : void 0);
          AgentClass = rhcModule.RightHeartCathAgent;
          break;
        case "ai-medical-review":
          const aiReviewModule = await __vitePreload(() => Promise.resolve().then(() => AusMedicalReviewAgent$1), true ? void 0 : void 0);
          AgentClass = aiReviewModule.AusMedicalReviewAgent;
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }
      const agent = new AgentClass();
      agentCache.set(agentType, agent);
      console.log(`✅ Successfully loaded ${agentType} agent`);
      return agent;
    } catch (error) {
      console.error(`❌ Failed to load ${agentType} agent:`, error);
      throw new Error(`Failed to load agent: ${agentType}`);
    }
  }
  /**
   * Process input with a lazily-loaded agent
   */
  async processWithAgent(agentType, input, context) {
    const startTime = Date.now();
    try {
      const agent = await this.loadAgent(agentType);
      const loadTime = Date.now() - startTime;
      console.log(`⚡ Agent loaded in ${loadTime}ms, processing...`);
      const result = await agent.process(input, context);
      const totalTime = Date.now() - startTime;
      console.log(`✅ ${agentType} processing completed in ${totalTime}ms`);
      return result;
    } catch (error) {
      console.error(`❌ Agent processing failed for ${agentType}:`, error);
      throw error;
    }
  }
  /**
   * Preload agents that are likely to be used
   */
  async preloadCommonAgents() {
    const commonAgents = [
      "quick-letter",
      "investigation-summary",
      "background"
    ];
    console.log("🔄 Preloading common agents...");
    const preloadPromises = commonAgents.map(async (agentType) => {
      try {
        await this.loadAgent(agentType);
        console.log(`✅ Preloaded ${agentType}`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${agentType}:`, error);
      }
    });
    await Promise.allSettled(preloadPromises);
    console.log("✅ Common agents preloading completed");
  }
  /**
   * Get available agent types (for UI display)
   */
  getAvailableAgentTypes() {
    return [
      "tavi",
      "angiogram-pci",
      "quick-letter",
      "consultation",
      "investigation-summary",
      "background",
      "medication",
      "mteer",
      "pfo-closure",
      "right-heart-cath",
      "ai-medical-review"
    ];
  }
  /**
   * Check if an agent is already loaded (cached)
   */
  isAgentLoaded(agentType) {
    return agentCache.has(agentType);
  }
  /**
   * Clear agent cache (for memory management)
   */
  clearCache() {
    console.log("🗑️ Clearing agent cache");
    agentCache.clear();
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: agentCache.size,
      loadedAgents: Array.from(agentCache.keys())
    };
  }
};
__publicField(_LazyAgentFactory, "instance");
let LazyAgentFactory = _LazyAgentFactory;
class AgentFactory {
  /**
   * Process input with the specified agent (lazy-loaded)
   */
  static async processWithAgent(workflowId, input, context, _signal) {
    const startTime = Date.now();
    try {
      const report = await this.lazyFactory.processWithAgent(workflowId, input, context);
      const totalTime = Date.now() - startTime;
      console.info(`Workflow: ${workflowId.toUpperCase()}`);
      console.log(`⏱️ Total processing time (including load): ${totalTime}ms`);
      console.log(`⏱️ Agent processing time: ${report.metadata.processingTime}ms`);
      const ausMedicalReviewData = report.reviewData;
      if (workflowId === "ai-medical-review" && ausMedicalReviewData) {
        console.log(`🔍 AI Review found ${ausMedicalReviewData.findings?.length || 0} findings`);
      }
      return {
        content: report.content,
        summary: report.summary,
        warnings: report.warnings,
        errors: report.errors,
        processingTime: report.metadata.processingTime,
        agentName: report.agentName,
        reviewData: ausMedicalReviewData
        // Include structured data for AI Review
      };
    } catch (error) {
      console.error(`❌ Agent processing failed for ${workflowId}:`, error);
      throw error;
    }
  }
  /**
   * Clear the agent cache (useful for testing or memory management)
   */
  static clearCache() {
    this.lazyFactory.clearCache();
  }
  /**
   * Get all supported workflow IDs
   */
  static getSupportedWorkflows() {
    return this.lazyFactory.getAvailableAgentTypes();
  }
  /**
   * Check if a workflow is supported
   */
  static isSupported(workflowId) {
    return this.getSupportedWorkflows().includes(workflowId);
  }
  /**
   * Preload common agents for better performance
   */
  static async preloadCommonAgents() {
    await this.lazyFactory.preloadCommonAgents();
  }
  /**
   * Check if an agent is already loaded
   */
  static isAgentLoaded(agentType) {
    return this.lazyFactory.isAgentLoaded(agentType);
  }
  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return this.lazyFactory.getCacheStats();
  }
}
__publicField(AgentFactory, "lazyFactory", LazyAgentFactory.getInstance());
const AusMedicalReviewSystemPrompts = {
  ausMedicalReviewAgent: {
    systemPrompt: `You are an Australian cardiology AI review specialist. Your role is to systematically analyze patient data against Australian clinical guidelines to identify potential clinical oversights or diagnostic considerations.

CORE PRINCIPLES:
- Follow Australian guidelines: NHFA/CSANZ (heart failure, atrial fibrillation), RACGP (CVD risk), Cancer Council Australia (screening)
- Consider Aboriginal/Torres Strait Islander specific screening ages and risk factors
- Prioritise life-threatening cardiac oversights first
- Provide actionable, evidence-based recommendations
- Use Australian spelling and terminology throughout

PATTERN RECOGNITION CHECKLIST:

PRIMARY CARDIAC CONDITIONS:

1. TTR Amyloidosis Red Flags (Check for ≥2 indicators):
   - Bilateral carpal tunnel syndrome
   - Spinal stenosis with unexplained LVH
   - Polyneuropathy with cardiac involvement
   - Ruptured biceps tendon
   - Trigger finger with cardiac symptoms
   - Unexplained HFpEF (heart failure with preserved ejection fraction)
   - Family history of TTR amyloidosis

2. HFrEF GDMT Gaps (NHFA/CSANZ Guidelines - Check for missing pillars):
   - ACE inhibitor/ARB/ARNI (sacubitril/valsartan if LVEF ≤40%)
   - Beta-blocker (bisoprolol, carvedilol, or nebivolol)
   - MRA (spironolactone or eplerenone if LVEF ≤35%)
   - SGLT2 inhibitor (dapagliflozin or empagliflozin)
   - Iron deficiency treatment: ferric carboxymaltose if iron studies show deficiency and patient symptomatic
   - Influenza and pneumococcal vaccination
   - Cardiac rehabilitation referral

3. ASCVD Risk Management (Australian Absolute CVD Risk Guidelines):
   - High risk (>15% 5-year risk) without statin therapy
   - Established CVD without high-intensity statin
   - Familial hypercholesterolaemia without appropriate therapy
   - Aboriginal/Torres Strait Islander patients: assess risk from age 30 (not 45)
   - LDL targets: <1.8 mmol/L very high risk, <1.4 mmol/L recurrent events (verify local target policy as targets may vary by organisation/guideline version)
   - Lp(a) testing: consider lifetime Lp(a) once; avoid repeat testing if already done

4. Atrial Fibrillation Management (NHFA/CSANZ AF Guidelines):
   - Missing anticoagulation when CHA2DS2-VA ≥2
   - Using aspirin instead of appropriate anticoagulation
   - IMPORTANT: Avoid aspirin as stroke prevention in AF unless another indication exists
   - Post-PCI in AF: assess for OAC + antiplatelet minimisation strategies
   - No documented rate/rhythm control strategy
   - Missing echocardiogram within 12 months

5. Post-ACS Management (NHFA/CSANZ Guidelines):
   - Missing DAPT in first 12 months
   - No high-intensity statin (atorvastatin 40-80mg or rosuvastatin 20-40mg)
   - Missing beta-blocker post-MI
   - No ACE/ARB if LV dysfunction
   - Missing cardiac rehabilitation referral

MEDICATION SAFETY:

6. QT-Prolongation Risk:
   - Multiple QT-prolonging medications in combination
   - QT-prolonging drugs without baseline ECG or monitoring
   - Electrolyte abnormalities (hypokalaemia, hypomagnesaemia) with QT drugs

7. Drug-Disease Interactions:
   - Beta-blockers in uncontrolled asthma
   - Non-dihydropyridine CCBs with beta-blockers
   - NSAIDs in CKD, heart failure, or with anticoagulation

8. Monitoring Gaps:
   - Potassium/creatinine for ACE/ARB/MRA
   - LFTs for statins
   - Thyroid function for amiodarone
   - INR for warfarin

SECONDARY HYPERTENSION SCREENING:

9. Renal Causes:
   - Resistant HTN + abdominal bruit + deteriorating renal function with ACE/ARB
   - Flash pulmonary oedema suggesting renal artery stenosis
   - CKD with ACR and eGFR trend as trigger for renovascular consideration (conservative approach to imaging)

10. Primary Aldosteronism:
    - HTN + hypokalaemia + resistant HTN (≥3 medications)
    - Missing aldosterone:renin ratio

11. Phaeochromocytoma:
    - Episodic HTN + palpitations + sweating + headaches
    - Missing plasma/urine metanephrines

12. Sleep Apnoea:
    - HTN + obesity + snoring + daytime somnolence
    - No sleep study consideration

AUSTRALIAN CANCER SCREENING (Gate by age/sex/eligibility):

13. Bowel Cancer (National Bowel Cancer Screening Program):
    - Men/women age 50-74 without 2-yearly FOBT/FIT
    - Consider cardiac relevance: antiplatelet therapy and bleeding risk assessment

14. Breast Cancer (BreastScreen Australia):
    - Women age 50-74 without 2-yearly mammogram
    - Generally Routine priority unless specific cardiac considerations

15. Cervical Cancer:
    - Women age 25-74 without 5-yearly cervical screening test
    - Generally Routine priority

16. Lung Cancer Screening:
    - Program-context dependent—verify local programme criteria
    - Do not assert specific ages/pack-years as criteria may change

HEART FAILURE SPECIFIC (NHFA Guidelines):

17. Missing Assessments:
    - NT-proBNP or BNP measurement not done
    - No echocardiogram within last 2 years for monitoring
    - Missing iron studies (iron deficiency common in HF)
    - No influenza/pneumococcal vaccination documented
    - Missing cardiac rehabilitation referral
    - No advance care planning discussion
    - Patient education gaps: sodium/glucose/weight self-monitoring education

RESPONSE FORMAT:
Provide exactly 5 findings maximum, ranked by clinical urgency. For each finding:

FINDING: [Clear, specific clinical finding]
AUSTRALIAN GUIDELINE: [Specific NHFA/CSANZ/RACGP/Cancer Council guideline reference]
CLINICAL REASONING: [Why this matters in cardiac context - 1-2 sentences]
RECOMMENDED ACTION: [Specific next step with timeframe]
URGENCY: [Immediate/Soon/Routine]

Always prioritise:
1. Life-threatening cardiac conditions (highest priority)
2. Medication safety concerns (QT prolongation, drug interactions)
3. Missing guideline-directed cardiac therapy
4. Secondary hypertension with treatable causes
5. Cancer screening gaps with cardiovascular relevance (generally Routine unless bleeding risk considerations)

Use Australian spelling throughout (favour, colour, centre, etc.)`,
    userPromptTemplate: `Review this Australian cardiology patient's data systematically against the pattern recognition checklist:

BACKGROUND: {background}

INVESTIGATIONS: {investigations}

MEDICATIONS: {medications}

Identify up to 5 HIGH-PRIORITY actionable clinical points following Australian guidelines (NHFA/CSANZ/RACGP). Focus on life-threatening cardiac oversights, medication safety concerns, secondary hypertension screening gaps, missing guideline-directed therapy, and cardiovascular risk factors.

For each finding, provide the structured format with Australian guideline references, clinical reasoning, recommended actions, and urgency levels. Prioritise cancer screening as Routine unless specific cardiovascular relevance (e.g., bleeding risk with antiplatelets).`
  },
  // Validation patterns for Australian medical terminology
  ausMedicalPatterns: {
    // QT-prolonging medication patterns
    qtMedicationPatterns: [
      /amiodarone/gi,
      /sotalol/gi,
      /quinidine/gi,
      /procainamide/gi,
      /disopyramide/gi,
      /dofetilide/gi,
      /dronedarone/gi,
      /haloperidol/gi,
      /chlorpromazine/gi,
      /thioridazine/gi,
      /methadone/gi,
      /clarithromycin/gi,
      /erythromycin/gi,
      /azithromycin/gi,
      /fluconazole/gi,
      /ketoconazole/gi
    ]
  }
};
const HeartFoundationResources = {
  heartFailure: "https://www.heartfoundation.org.au/health-professionals/clinical-information/heart-failure",
  atrialFibrillation: "https://www.heartfoundation.org.au/health-professionals/clinical-information/atrial-fibrillation",
  cardiovascularRisk: "https://www.heartfoundation.org.au/health-professionals/clinical-information/cardiovascular-risk-assessment",
  guidelines: "https://www.heartfoundation.org.au/health-professionals/clinical-information/clinical-guidelines"
};
const AustralianCVDRiskCalculator = {
  url: "http://www.cvdcheck.org.au/"
};
class AusMedicalReviewAgent extends MedicalAgent {
  constructor() {
    super(
      "Australian Medical Review Specialist",
      "Cardiology Quality Assurance",
      "Australian cardiology practice clinical oversight and pattern recognition",
      "ai-medical-review",
      AusMedicalReviewSystemPrompts.ausMedicalReviewAgent.systemPrompt
    );
    __publicField(this, "lmStudioService");
    this.lmStudioService = LMStudioService.getInstance();
  }
  async process(input, context) {
    const startTime = Date.now();
    try {
      const reviewInput = this.parseReviewInput(input);
      const contextualPrompt = `${this.systemPrompt}

Please analyze the following clinical data against Australian cardiology guidelines and identify any potential clinical oversights or diagnostic considerations. 

Provide findings in the following structured format for each clinical oversight identified:

FINDING: [Brief description of the clinical finding]
AUSTRALIAN GUIDELINE: [Specific Australian guideline reference - NHFA/CSANZ, RACGP, etc.]
CLINICAL REASONING: [Medical reasoning for this finding]
RECOMMENDED ACTION: [Specific actionable recommendation]
URGENCY: [Immediate/Soon/Routine]

If no clinical oversights are identified, respond with:
FINDING: No significant clinical oversights identified
AUSTRALIAN GUIDELINE: N/A
CLINICAL REASONING: Patient management appears appropriate based on available information
RECOMMENDED ACTION: Continue current management
URGENCY: Routine`;
      const response = await this.lmStudioService.processWithAgent(contextualPrompt, input, "ai-medical-review");
      const sections = this.parseResponse(response, context);
      const reviewData = this.extractReviewData(response, reviewInput);
      const report = this.createAusMedicalReviewReport(
        response,
        sections,
        reviewData,
        context,
        Date.now() - startTime
      );
      this.addProcedureMemory("australian-medical-review", {
        findingsCount: reviewData.findings.length,
        urgentFindings: reviewData.findings.filter((f2) => f2.urgency === "Immediate").length,
        guidelinesReferences: reviewData.guidelineReferences.length
      });
      return report;
    } catch (error) {
      console.error("❌ AusMedicalReviewAgent.process error:", error);
      return this.createAusMedicalReviewReport(
        `Error processing medical review: ${error instanceof Error ? error.message : "Unknown error"}`,
        [],
        {
          findings: [],
          guidelineReferences: [],
          heartFoundationResources: [],
          cvdRiskCalculatorRecommended: false,
          aboriginalTorresStraitIslander: false,
          qtProlongationRisk: false,
          medicationSafetyIssues: 0
        },
        context,
        Date.now() - startTime,
        0,
        [],
        [error instanceof Error ? error.message : "Unknown error"]
      );
    }
  }
  buildMessages(input, _context) {
    const reviewInput = this.parseReviewInput(input);
    const userPrompt = AusMedicalReviewSystemPrompts.ausMedicalReviewAgent.userPromptTemplate.replace("{background}", reviewInput.background || "Not provided").replace("{investigations}", reviewInput.investigations || "Not provided").replace("{medications}", reviewInput.medications || "Not provided");
    return [
      {
        role: "system",
        content: this.systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ];
  }
  parseResponse(response, _context) {
    const sections = [];
    const findingBlocks = this.extractFindingBlocks(response);
    findingBlocks.forEach((block, index) => {
      const finding = this.parseFindingBlock(block);
      if (finding) {
        sections.push({
          title: `Finding ${index + 1}: ${finding.finding}`,
          content: this.formatFindingContent(finding),
          type: "structured",
          priority: finding.urgency === "Immediate" ? "high" : finding.urgency === "Soon" ? "medium" : "low"
        });
      }
    });
    sections.unshift({
      title: "Australian Medical Review Summary",
      content: this.generateSummaryContent(findingBlocks.length, response),
      type: "narrative",
      priority: "high"
    });
    return sections;
  }
  parseReviewInput(input) {
    const lines = input.split("\n");
    let currentSection = "";
    const result = {
      background: "",
      investigations: "",
      medications: ""
    };
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().includes("background:")) {
        currentSection = "background";
        result.background = trimmedLine.replace(/background:\s*/i, "");
      } else if (trimmedLine.toLowerCase().includes("investigations:")) {
        currentSection = "investigations";
        result.investigations = trimmedLine.replace(/investigations:\s*/i, "");
      } else if (trimmedLine.toLowerCase().includes("medications:")) {
        currentSection = "medications";
        result.medications = trimmedLine.replace(/medications:\s*/i, "");
      } else if (trimmedLine && currentSection) {
        switch (currentSection) {
          case "background":
            result.background += " " + trimmedLine;
            break;
          case "investigations":
            result.investigations += " " + trimmedLine;
            break;
          case "medications":
            result.medications += " " + trimmedLine;
            break;
        }
      }
    }
    return {
      background: result.background.trim(),
      investigations: result.investigations.trim(),
      medications: result.medications.trim()
    };
  }
  extractFindingBlocks(response) {
    const blocks = response.split(/(?=FINDING:)/i).filter((block) => block.trim());
    return blocks.slice(1);
  }
  parseFindingBlock(block) {
    try {
      const lines = block.split("\n").map((line) => line.trim()).filter((line) => line);
      const finding = {};
      for (const line of lines) {
        if (line.startsWith("FINDING:")) {
          finding.finding = line.replace("FINDING:", "").trim();
        } else if (line.startsWith("AUSTRALIAN GUIDELINE:")) {
          finding.australianGuideline = line.replace("AUSTRALIAN GUIDELINE:", "").trim();
        } else if (line.startsWith("CLINICAL REASONING:")) {
          finding.clinicalReasoning = line.replace("CLINICAL REASONING:", "").trim();
        } else if (line.startsWith("RECOMMENDED ACTION:")) {
          finding.recommendedAction = line.replace("RECOMMENDED ACTION:", "").trim();
        } else if (line.startsWith("URGENCY:")) {
          const urgency = line.replace("URGENCY:", "").trim();
          if (["Immediate", "Soon", "Routine"].includes(urgency)) {
            finding.urgency = urgency;
          }
        }
      }
      if (finding.finding && finding.australianGuideline && finding.clinicalReasoning && finding.recommendedAction && finding.urgency) {
        return finding;
      }
      return null;
    } catch (error) {
      console.warn("Failed to parse finding block:", error);
      return null;
    }
  }
  formatFindingContent(finding) {
    let content = `**Clinical Finding:** ${finding.finding}

`;
    content += `**Australian Guideline:** ${finding.australianGuideline}

`;
    content += `**Clinical Reasoning:** ${finding.clinicalReasoning}

`;
    content += `**Recommended Action:** ${finding.recommendedAction}

`;
    content += `**Urgency Level:** ${finding.urgency}

`;
    if (finding.heartFoundationLink) {
      content += `**Heart Foundation Resource:** ${finding.heartFoundationLink}

`;
    }
    return content;
  }
  generateSummaryContent(findingsCount, response) {
    let summary = `## Australian Medical Review Summary

`;
    summary += `**Total Findings:** ${findingsCount}

`;
    const urgentCount = (response.match(/URGENCY:\s*Immediate/gi) || []).length;
    const soonCount = (response.match(/URGENCY:\s*Soon/gi) || []).length;
    const routineCount = (response.match(/URGENCY:\s*Routine/gi) || []).length;
    summary += `**Urgency Breakdown:**
`;
    summary += `- Immediate: ${urgentCount}
`;
    summary += `- Soon: ${soonCount}
`;
    summary += `- Routine: ${routineCount}

`;
    summary += `**Guideline Sources:** NHFA/CSANZ, RACGP, Cancer Council Australia

`;
    summary += `**Resources:**
`;
    summary += `- [Heart Foundation Guidelines](${HeartFoundationResources.guidelines})
`;
    summary += `- [Australian CVD Risk Calculator](${AustralianCVDRiskCalculator.url})

`;
    summary += `⚠️ **Disclaimer:** AI-generated suggestions based on Australian clinical guidelines for cardiology practice. Not a substitute for clinical judgment. Review against current NHFA/CSANZ guidelines.`;
    return summary;
  }
  extractReviewData(response, input) {
    const findings = this.extractFindingBlocks(response).map((block) => this.parseFindingBlock(block)).filter((finding) => finding !== null);
    const guidelineReferences = this.extractGuidelineReferences(response);
    const heartFoundationResources = this.determineHeartFoundationResources(findings);
    const cvdRiskCalculatorRecommended = response.toLowerCase().includes("cvd risk") || response.toLowerCase().includes("cardiovascular risk") || response.toLowerCase().includes("lp(a)");
    const aboriginalTorresStraitIslander = response.toLowerCase().includes("aboriginal") || response.toLowerCase().includes("torres strait");
    const qtProlongationRisk = response.toLowerCase().includes("qt") || response.toLowerCase().includes("prolongation") || this.detectQTRiskInMedications(input.medications);
    const medicationSafetyIssues = this.countMedicationSafetyIssues(response, input.medications);
    return {
      findings,
      guidelineReferences,
      heartFoundationResources,
      cvdRiskCalculatorRecommended,
      aboriginalTorresStraitIslander,
      qtProlongationRisk,
      medicationSafetyIssues
    };
  }
  extractGuidelineReferences(response) {
    const references = /* @__PURE__ */ new Set();
    const patterns = [
      /NHFA\/CSANZ/gi,
      /National Heart Foundation/gi,
      /RACGP/gi,
      /Cancer Council Australia/gi,
      /Australian Absolute CVD Risk/gi
    ];
    patterns.forEach((pattern) => {
      const matches = response.match(pattern);
      if (matches) {
        matches.forEach((match) => references.add(match));
      }
    });
    return Array.from(references);
  }
  detectQTRiskInMedications(medications) {
    const qtMeds = AusMedicalReviewSystemPrompts.ausMedicalPatterns.qtMedicationPatterns;
    return qtMeds.some((pattern) => pattern.test(medications));
  }
  countMedicationSafetyIssues(response, medications) {
    let count = 0;
    if (response.toLowerCase().includes("qt") || this.detectQTRiskInMedications(medications)) {
      count++;
    }
    if (response.toLowerCase().includes("interaction") || response.toLowerCase().includes("nsaid")) {
      count++;
    }
    if (response.toLowerCase().includes("monitoring") || response.toLowerCase().includes("potassium")) {
      count++;
    }
    return count;
  }
  determineHeartFoundationResources(findings) {
    const resources = /* @__PURE__ */ new Set();
    findings.forEach((finding) => {
      const content = `${finding.finding} ${finding.clinicalReasoning}`.toLowerCase();
      if (content.includes("heart failure") || content.includes("hf")) {
        resources.add(HeartFoundationResources.heartFailure);
      }
      if (content.includes("atrial fibrillation") || content.includes("af")) {
        resources.add(HeartFoundationResources.atrialFibrillation);
      }
      if (content.includes("cardiovascular risk") || content.includes("cvd risk")) {
        resources.add(HeartFoundationResources.cardiovascularRisk);
      }
    });
    resources.add(HeartFoundationResources.guidelines);
    return Array.from(resources);
  }
  createAusMedicalReviewReport(content, sections, reviewData, context, processingTime = 0, confidence = 0.9, warnings = [], errors = []) {
    const baseReport = this.createReport(
      content,
      sections,
      context,
      processingTime,
      confidence,
      warnings,
      errors
    );
    return {
      ...baseReport,
      reviewData
    };
  }
}
const AusMedicalReviewAgent$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AusMedicalReviewAgent
}, Symbol.toStringTag, { value: "Module" }));
const _DynamicWaitUtils = class _DynamicWaitUtils {
  constructor() {
    __publicField(this, "defaultTimeout", 15e3);
    // 15 seconds
    __publicField(this, "defaultInterval", 500);
    // 500ms checks
    __publicField(this, "debugMode", false);
  }
  static getInstance() {
    if (!_DynamicWaitUtils.instance) {
      _DynamicWaitUtils.instance = new _DynamicWaitUtils();
    }
    return _DynamicWaitUtils.instance;
  }
  /**
   * Enable or disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  /**
   * Wait for patient data to load with intelligent verification
   */
  async waitForPatientDataLoad(tabId, patientName, timeout = this.defaultTimeout) {
    const conditions = [
      {
        name: "content_script_responsive",
        checker: () => this.checkContentScriptResponsive(tabId),
        description: "Content script is responsive",
        timeout: 5e3,
        interval: 200
      },
      {
        name: "xestro_boxes_present",
        checker: () => this.checkXestroBoxesPresent(tabId),
        description: "XestroBox elements are present",
        timeout,
        interval: this.defaultInterval
      },
      {
        name: "patient_data_populated",
        checker: () => this.checkPatientDataPopulated(tabId, patientName),
        description: "Patient data fields are populated",
        timeout,
        interval: this.defaultInterval
      },
      {
        name: "clinical_sections_ready",
        checker: () => this.checkClinicalSectionsReady(tabId),
        description: "Clinical sections have content",
        timeout,
        interval: this.defaultInterval
      }
    ];
    return this.waitForMultipleConditions(conditions, {
      requireAll: false,
      // At least XestroBoxes and patient data must be ready
      minConditions: 2,
      earlyReturnOnCritical: true
    });
  }
  /**
   * Wait for specific clinical section to be ready
   */
  async waitForClinicalSection(tabId, sectionType, timeout = this.defaultTimeout) {
    const conditions = [
      {
        name: `${sectionType}_section_present`,
        checker: () => this.checkSectionPresent(tabId, sectionType),
        description: `${sectionType} section is present in DOM`,
        timeout: timeout / 2,
        interval: this.defaultInterval
      },
      {
        name: `${sectionType}_content_loaded`,
        checker: () => this.checkSectionContentLoaded(tabId, sectionType),
        description: `${sectionType} section has content`,
        timeout,
        interval: this.defaultInterval
      }
    ];
    return this.waitForMultipleConditions(conditions, {
      requireAll: true,
      minConditions: 2,
      earlyReturnOnCritical: false
    });
  }
  /**
   * Wait for patient activation to complete
   */
  async waitForPatientActivation(tabId, patientIndex, timeout = 1e4) {
    const conditions = [
      {
        name: "patient_row_highlighted",
        checker: () => this.checkPatientRowHighlighted(tabId, patientIndex),
        description: "Patient row is highlighted/selected",
        timeout: timeout / 3,
        interval: 200
      },
      {
        name: "patient_record_loading",
        checker: () => this.checkPatientRecordLoading(tabId),
        description: "Patient record is loading",
        timeout: timeout / 2,
        interval: this.defaultInterval
      },
      {
        name: "patient_record_loaded",
        checker: () => this.checkPatientRecordLoaded(tabId),
        description: "Patient record is fully loaded",
        timeout,
        interval: this.defaultInterval
      }
    ];
    return this.waitForMultipleConditions(conditions, {
      requireAll: false,
      minConditions: 1,
      earlyReturnOnCritical: true,
      sequentialChecking: true
      // Check conditions in order
    });
  }
  /**
   * Wait for DOM changes to settle
   */
  async waitForDOMStability(tabId, stabilityPeriodMs = 1e3, timeout = this.defaultTimeout) {
    const startTime = Date.now();
    const checkResults = [];
    let lastChangeTime = Date.now();
    let lastDOMHash = "";
    while (Date.now() - startTime < timeout) {
      try {
        const currentDOMHash = await this.getDOMHash(tabId);
        const currentTime = Date.now();
        if (currentDOMHash !== lastDOMHash) {
          lastChangeTime = currentTime;
          lastDOMHash = currentDOMHash;
          checkResults.push({
            timestamp: currentTime,
            conditionName: "dom_changed",
            passed: false,
            details: "DOM structure changed"
          });
        } else if (currentTime - lastChangeTime >= stabilityPeriodMs) {
          checkResults.push({
            timestamp: currentTime,
            conditionName: "dom_stable",
            passed: true,
            details: `DOM stable for ${stabilityPeriodMs}ms`
          });
          return {
            success: true,
            timeElapsed: currentTime - startTime,
            conditionMet: "dom_stable",
            intermediateChecks: checkResults
          };
        }
        await this.sleep(200);
      } catch (error) {
        this.log("Error checking DOM stability:", error);
        await this.sleep(this.defaultInterval);
      }
    }
    return {
      success: false,
      timeElapsed: Date.now() - startTime,
      conditionMet: null,
      error: `DOM did not stabilize within ${timeout}ms`,
      intermediateChecks: checkResults
    };
  }
  /**
   * Smart wait with custom condition
   */
  async waitForCondition(condition, options = {}) {
    const startTime = Date.now();
    const checkResults = [];
    const { earlyReturn = true, logProgress = this.debugMode } = options;
    this.log(`Starting wait for condition: ${condition.name} - ${condition.description}`);
    while (Date.now() - startTime < condition.timeout) {
      try {
        const passed = await condition.checker();
        const timestamp = Date.now();
        checkResults.push({
          timestamp,
          conditionName: condition.name,
          passed,
          details: passed ? "Condition met" : "Condition not met"
        });
        if (passed) {
          const timeElapsed2 = timestamp - startTime;
          this.log(`✅ Condition '${condition.name}' met in ${timeElapsed2}ms`);
          return {
            success: true,
            timeElapsed: timeElapsed2,
            conditionMet: condition.name,
            intermediateChecks: checkResults
          };
        }
        if (logProgress && checkResults.length % 10 === 0) {
          this.log(`⏳ Still waiting for '${condition.name}' (${Date.now() - startTime}ms elapsed)`);
        }
        await this.sleep(condition.interval);
      } catch (error) {
        checkResults.push({
          timestamp: Date.now(),
          conditionName: condition.name,
          passed: false,
          details: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
        this.log(`❌ Error checking condition '${condition.name}':`, error);
        await this.sleep(condition.interval);
      }
    }
    const timeElapsed = Date.now() - startTime;
    this.log(`⏰ Timeout waiting for condition '${condition.name}' after ${timeElapsed}ms`);
    return {
      success: false,
      timeElapsed,
      conditionMet: null,
      error: `Timeout waiting for condition '${condition.name}'`,
      intermediateChecks: checkResults
    };
  }
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  async waitForMultipleConditions(conditions, options) {
    const startTime = Date.now();
    const allCheckResults = [];
    const conditionsMet = /* @__PURE__ */ new Set();
    const maxTimeout = Math.max(...conditions.map((c2) => c2.timeout));
    this.log(`Starting multi-condition wait: ${conditions.length} conditions`);
    if (options.sequentialChecking) {
      for (const condition of conditions) {
        const result = await this.waitForCondition(condition);
        allCheckResults.push(...result.intermediateChecks);
        if (result.success) {
          conditionsMet.add(condition.name);
        } else if (options.requireAll) {
          return {
            success: false,
            timeElapsed: Date.now() - startTime,
            conditionMet: null,
            error: `Sequential condition failed: ${condition.name}`,
            intermediateChecks: allCheckResults
          };
        }
      }
    } else {
      while (Date.now() - startTime < maxTimeout) {
        for (const condition of conditions) {
          if (conditionsMet.has(condition.name)) continue;
          try {
            const passed = await condition.checker();
            const timestamp = Date.now();
            allCheckResults.push({
              timestamp,
              conditionName: condition.name,
              passed,
              details: passed ? "Condition met" : "Condition not met"
            });
            if (passed) {
              conditionsMet.add(condition.name);
              this.log(`✅ Condition met: ${condition.name}`);
            }
          } catch (error) {
            allCheckResults.push({
              timestamp: Date.now(),
              conditionName: condition.name,
              passed: false,
              details: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }
        const metCount2 = conditionsMet.size;
        if (options.requireAll && metCount2 === conditions.length) {
          break;
        } else if (!options.requireAll && metCount2 >= options.minConditions) {
          break;
        }
        await this.sleep(Math.min(...conditions.map((c2) => c2.interval)));
      }
    }
    const metCount = conditionsMet.size;
    const success = options.requireAll ? metCount === conditions.length : metCount >= options.minConditions;
    const timeElapsed = Date.now() - startTime;
    if (success) {
      this.log(`✅ Multi-condition wait successful: ${metCount}/${conditions.length} conditions met`);
    } else {
      this.log(`❌ Multi-condition wait failed: ${metCount}/${conditions.length} conditions met`);
    }
    return {
      success,
      timeElapsed,
      conditionMet: success ? Array.from(conditionsMet).join(", ") : null,
      error: success ? void 0 : `Insufficient conditions met: ${metCount}/${options.minConditions}`,
      intermediateChecks: allCheckResults
    };
  }
  // ============================================================================
  // Condition Checker Methods
  // ============================================================================
  async checkContentScriptResponsive(tabId) {
    try {
      const response = await this.sendMessage(tabId, { type: "PING" }, 2e3);
      return !!response;
    } catch {
      return false;
    }
  }
  async checkXestroBoxesPresent(tabId) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_XESTRO_BOXES"
      }, 3e3);
      return response?.found === true;
    } catch {
      return false;
    }
  }
  async checkPatientDataPopulated(tabId, patientName) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_PATIENT_DATA",
        data: { expectedPatientName: patientName }
      }, 3e3);
      return response?.populated === true;
    } catch {
      return false;
    }
  }
  async checkClinicalSectionsReady(tabId) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_CLINICAL_SECTIONS"
      }, 3e3);
      return response?.sectionsReady === true;
    } catch {
      return false;
    }
  }
  async checkSectionPresent(tabId, sectionType) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_SECTION_PRESENT",
        data: { sectionType }
      }, 3e3);
      return response?.present === true;
    } catch {
      return false;
    }
  }
  async checkSectionContentLoaded(tabId, sectionType) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_SECTION_CONTENT",
        data: { sectionType }
      }, 3e3);
      return response?.hasContent === true && response?.wordCount > 0;
    } catch {
      return false;
    }
  }
  async checkPatientRowHighlighted(tabId, patientIndex) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_PATIENT_ROW_HIGHLIGHTED",
        data: { patientIndex }
      }, 2e3);
      return response?.highlighted === true;
    } catch {
      return false;
    }
  }
  async checkPatientRecordLoading(tabId) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_PATIENT_RECORD_STATE"
      }, 2e3);
      return response?.state === "loading" || response?.state === "loaded";
    } catch {
      return false;
    }
  }
  async checkPatientRecordLoaded(tabId) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "CHECK_PATIENT_RECORD_STATE"
      }, 2e3);
      return response?.state === "loaded";
    } catch {
      return false;
    }
  }
  async getDOMHash(tabId) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "GET_DOM_HASH"
      }, 2e3);
      return response?.hash || "";
    } catch {
      return "";
    }
  }
  // ============================================================================
  // Utility Methods
  // ============================================================================
  async sendMessage(tabId, message, timeoutMs = 5e3) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(`Message failed: ${chrome.runtime.lastError.message}`));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[DynamicWaitUtils]", ...args);
    }
  }
  // ============================================================================
  // Public Configuration Methods
  // ============================================================================
  setDefaultTimeout(timeout) {
    this.defaultTimeout = timeout;
  }
  setDefaultInterval(interval) {
    this.defaultInterval = interval;
  }
  getDefaultTimeout() {
    return this.defaultTimeout;
  }
  getDefaultInterval() {
    return this.defaultInterval;
  }
};
__publicField(_DynamicWaitUtils, "instance");
let DynamicWaitUtils = _DynamicWaitUtils;
const _DataValidation = class _DataValidation {
  constructor() {
    __publicField(this, "debugMode", false);
    __publicField(this, "medicalTermPatterns", []);
    __publicField(this, "commonErrorPatterns", []);
    __publicField(this, "defaultConfig", {
      fields: ["background", "investigations", "medications"],
      fallbackSelectors: {
        background: [
          'textarea[data-field="background"]',
          "#background",
          ".background textarea",
          '.XestroBox:contains("Background") textarea',
          'textarea[placeholder*="background" i]'
        ],
        investigations: [
          'textarea[data-field="investigations"]',
          "#investigations",
          ".investigations textarea",
          '.XestroBox:contains("Investigation") textarea',
          'textarea[placeholder*="investigation" i]'
        ],
        medications: [
          'textarea[data-field="medications"]',
          "#medications",
          ".medications textarea",
          '.XestroBox:contains("Medication") textarea',
          'textarea[placeholder*="medication" i]'
        ]
      },
      qualityThresholds: {
        minWordCount: 5,
        minMedicalTerms: 1,
        minCompletenessScore: 0.3,
        acceptableConfidenceLevel: "medium"
      },
      retryAttempts: 3,
      timeout: 1e4,
      screenshotOnFailure: true
    });
    this.initializeMedicalPatterns();
    this.initializeErrorPatterns();
  }
  static getInstance() {
    if (!_DataValidation.instance) {
      _DataValidation.instance = new _DataValidation();
    }
    return _DataValidation.instance;
  }
  /**
   * Extract patient clinical data with comprehensive validation
   */
  async extractPatientClinicalData(tabId, patient, config = {}) {
    const fullConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    this.log(`🔍 Starting data extraction for patient: ${patient.name}`);
    const preValidation = await this.preExtractionValidation(tabId, patient);
    if (!preValidation.isValid) {
      throw new Error(`Pre-extraction validation failed: ${preValidation.errors.join(", ")}`);
    }
    const fieldResults = /* @__PURE__ */ new Map();
    for (const fieldName of fullConfig.fields) {
      try {
        const result = await this.extractField(tabId, fieldName, fullConfig);
        fieldResults.set(fieldName, result);
        if (result.success) {
          this.log(`✅ Successfully extracted ${fieldName}: ${result.content.length} chars`);
        } else {
          this.log(`❌ Failed to extract ${fieldName}: ${result.errorMessage}`);
        }
      } catch (error) {
        this.log(`❌ Exception extracting ${fieldName}:`, error);
        fieldResults.set(fieldName, {
          fieldName,
          content: "",
          extractionTime: 0,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          quality: this.createEmptyQualityReport(),
          fallbackUsed: false,
          selectorUsed: "none"
        });
      }
    }
    const extractedData = {
      background: fieldResults.get("background")?.content || "",
      investigations: fieldResults.get("investigations")?.content || "",
      medications: fieldResults.get("medications")?.content || "",
      extractionTimestamp: Date.now(),
      extractionAttempts: 1,
      qualityScore: this.calculateOverallQualityScore(fieldResults)
    };
    const qualityReport = this.assessDataQuality(extractedData);
    this.log(`📊 Data quality assessment:`, {
      completeness: qualityReport.completenessScore,
      richness: qualityReport.contentRichness,
      confidence: qualityReport.confidenceLevel,
      medicalTerms: qualityReport.medicalTermsFound
    });
    if (qualityReport.completenessScore < fullConfig.qualityThresholds.minCompletenessScore) {
      this.log(`⚠️ Low quality data detected, attempting fallback extraction`);
      const improvedData = await this.attemptFallbackExtraction(
        tabId,
        extractedData,
        fieldResults,
        fullConfig
      );
      if (improvedData) {
        return improvedData;
      }
    }
    const totalTime = Date.now() - startTime;
    this.log(`✅ Data extraction completed in ${totalTime}ms`);
    return extractedData;
  }
  /**
   * Assess data quality with comprehensive metrics
   */
  assessDataQuality(data) {
    const fields = ["background", "investigations", "medications"];
    let totalFields = fields.length;
    let populatedFields = 0;
    let totalWordCount = 0;
    let totalMedicalTerms = 0;
    const missingFields = [];
    const extractionWarnings = [];
    for (const field of fields) {
      const content = data[field];
      if (this.isContentMeaningful(content)) {
        populatedFields++;
        const wordCount = this.countWords(content);
        const medicalTerms = this.countMedicalTerms(content);
        totalWordCount += wordCount;
        totalMedicalTerms += medicalTerms;
        if (this.containsErrorPatterns(content)) {
          extractionWarnings.push(`${field} contains potential error text`);
        }
        if (wordCount < 5) {
          extractionWarnings.push(`${field} has very little content (${wordCount} words)`);
        }
      } else {
        missingFields.push(field);
      }
    }
    const completenessScore = populatedFields / totalFields;
    const avgWordsPerField = populatedFields > 0 ? totalWordCount / populatedFields : 0;
    const contentRichness = Math.min(1, avgWordsPerField / 50 * 0.7 + totalMedicalTerms / 10 * 0.3);
    let confidenceLevel = "low";
    if (completenessScore >= 0.8 && contentRichness >= 0.6 && totalMedicalTerms >= 3) {
      confidenceLevel = "high";
    } else if (completenessScore >= 0.5 && contentRichness >= 0.3 && totalMedicalTerms >= 1) {
      confidenceLevel = "medium";
    }
    return {
      completenessScore,
      contentRichness,
      confidenceLevel,
      missingFields,
      extractionWarnings,
      medicalTermsFound: totalMedicalTerms,
      estimatedWordCount: totalWordCount
    };
  }
  /**
   * Verify patient identity before extraction
   */
  async verifyPatientIdentity(tabId, expectedPatient) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "VERIFY_PATIENT_IDENTITY",
        data: {
          expectedName: expectedPatient.name,
          expectedFileNumber: expectedPatient.fileNumber,
          expectedDOB: expectedPatient.dob
        }
      });
      if (response?.verified === true) {
        return {
          isValid: true,
          errors: [],
          warnings: [],
          score: 1
        };
      } else {
        const errors = [
          `Patient identity mismatch. Expected: ${expectedPatient.name} (${expectedPatient.fileNumber})`
        ];
        if (response?.currentPatient) {
          errors.push(`Current patient: ${response.currentPatient.name} (${response.currentPatient.fileNumber})`);
        }
        return {
          isValid: false,
          errors,
          warnings: response?.warnings || [],
          score: 0
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to verify patient identity: ${error}`],
        warnings: [],
        score: 0
      };
    }
  }
  /**
   * Extract field with fallback strategies
   */
  async extractField(tabId, fieldName, config) {
    const startTime = Date.now();
    const selectors = config.fallbackSelectors[fieldName] || [];
    for (let i2 = 0; i2 < selectors.length; i2++) {
      const selector = selectors[i2];
      const isFirstAttempt = i2 === 0;
      try {
        this.log(`🔍 Extracting ${fieldName} with selector: ${selector} (attempt ${i2 + 1})`);
        const response = await this.sendMessage(tabId, {
          type: "EXTRACT_FIELD_DATA",
          data: {
            fieldName,
            selector,
            timeout: config.timeout / selectors.length
          }
        });
        if (response?.success && response?.content) {
          const content = this.sanitizeContent(response.content);
          const quality = this.assessFieldQuality(fieldName, content);
          return {
            fieldName,
            content,
            extractionTime: Date.now() - startTime,
            success: true,
            quality,
            fallbackUsed: !isFirstAttempt,
            selectorUsed: selector
          };
        }
      } catch (error) {
        this.log(`❌ Extraction attempt ${i2 + 1} failed for ${fieldName}:`, error);
        if (i2 < selectors.length - 1) {
          continue;
        }
        return {
          fieldName,
          content: "",
          extractionTime: Date.now() - startTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          quality: this.createEmptyQualityReport(),
          fallbackUsed: !isFirstAttempt,
          selectorUsed: selector
        };
      }
    }
    return {
      fieldName,
      content: "",
      extractionTime: Date.now() - startTime,
      success: false,
      errorMessage: "All selectors failed",
      quality: this.createEmptyQualityReport(),
      fallbackUsed: true,
      selectorUsed: "none"
    };
  }
  /**
   * Pre-extraction validation checks
   */
  async preExtractionValidation(tabId, patient) {
    const errors = [];
    const warnings = [];
    try {
      const identityCheck = await this.verifyPatientIdentity(tabId, patient);
      if (!identityCheck.isValid) {
        errors.push(...identityCheck.errors);
      }
      warnings.push(...identityCheck.warnings);
      const pageCheck = await this.sendMessage(tabId, {
        type: "CHECK_PAGE_READY_FOR_EXTRACTION"
      });
      if (!pageCheck?.ready) {
        errors.push("Page not ready for data extraction");
        if (pageCheck?.reason) {
          errors.push(`Reason: ${pageCheck.reason}`);
        }
      }
      const sectionsCheck = await this.sendMessage(tabId, {
        type: "CHECK_CLINICAL_SECTIONS_EXIST"
      });
      if (!sectionsCheck?.allSectionsFound) {
        warnings.push("Some clinical sections may not be available");
        if (sectionsCheck?.missingSections) {
          warnings.push(`Missing: ${sectionsCheck.missingSections.join(", ")}`);
        }
      }
    } catch (error) {
      errors.push(`Pre-extraction validation failed: ${error}`);
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : 0
    };
  }
  /**
   * Attempt fallback extraction for failed fields
   */
  async attemptFallbackExtraction(tabId, originalData, fieldResults, config) {
    this.log("🔄 Attempting fallback extraction strategies");
    const fieldsToRetry = [];
    for (const [fieldName, result] of fieldResults) {
      if (!result.success || result.quality.completenessScore < 0.5) {
        fieldsToRetry.push(fieldName);
      }
    }
    if (fieldsToRetry.length === 0) {
      return null;
    }
    const improvedData = { ...originalData };
    let anyImprovement = false;
    for (const fieldName of fieldsToRetry) {
      try {
        const ocrResult = await this.tryOCRExtraction(tabId, fieldName);
        if (ocrResult && this.isContentMeaningful(ocrResult) && (fieldName === "background" || fieldName === "investigations" || fieldName === "medications")) {
          improvedData[fieldName] = ocrResult;
          anyImprovement = true;
          this.log(`✅ OCR extraction successful for ${fieldName}`);
          continue;
        }
        const semanticResult = await this.trySemanticExtraction(tabId, fieldName);
        if (semanticResult && this.isContentMeaningful(semanticResult) && (fieldName === "background" || fieldName === "investigations" || fieldName === "medications")) {
          improvedData[fieldName] = semanticResult;
          anyImprovement = true;
          this.log(`✅ Semantic extraction successful for ${fieldName}`);
          continue;
        }
      } catch (error) {
        this.log(`❌ Fallback extraction failed for ${fieldName}:`, error);
      }
    }
    if (anyImprovement) {
      improvedData.extractionAttempts++;
      improvedData.qualityScore = this.calculateOverallQualityScore(
        /* @__PURE__ */ new Map([["improved", {
          fieldName: "improved",
          content: JSON.stringify(improvedData),
          extractionTime: 0,
          success: true,
          quality: this.assessDataQuality(improvedData),
          fallbackUsed: true,
          selectorUsed: "fallback"
        }]])
      );
      return improvedData;
    }
    return null;
  }
  /**
   * Try OCR-based extraction for difficult fields
   */
  async tryOCRExtraction(tabId, fieldName) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "EXTRACT_FIELD_OCR",
        data: { fieldName }
      });
      return response?.content || null;
    } catch {
      return null;
    }
  }
  /**
   * Try semantic extraction based on proximity to labels
   */
  async trySemanticExtraction(tabId, fieldName) {
    try {
      const response = await this.sendMessage(tabId, {
        type: "EXTRACT_FIELD_SEMANTIC",
        data: { fieldName }
      });
      return response?.content || null;
    } catch {
      return null;
    }
  }
  // ============================================================================
  // Content Analysis Methods
  // ============================================================================
  isContentMeaningful(content) {
    if (!content || typeof content !== "string") return false;
    const trimmed = content.trim();
    if (trimmed.length < 3) return false;
    const emptyPatterns = [
      /^(\s*|-|n\/a|none|nil|not?\s*applicable?)$/i,
      /^\s*\[.*extraction.*failed.*\]\s*$/i,
      /^\s*loading\.+\s*$/i,
      /^\s*please\s+wait\.+\s*$/i
    ];
    return !emptyPatterns.some((pattern) => pattern.test(trimmed));
  }
  countWords(content) {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }
  countMedicalTerms(content) {
    if (!content) return 0;
    let count = 0;
    for (const pattern of this.medicalTermPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }
  containsErrorPatterns(content) {
    return this.commonErrorPatterns.some((pattern) => pattern.test(content));
  }
  sanitizeContent(content) {
    if (!content) return "";
    return content.trim().replace(/\s+/g, " ").replace(/[\x00-\x1F\x7F]/g, "");
  }
  assessFieldQuality(fieldName, content) {
    const wordCount = this.countWords(content);
    const medicalTerms = this.countMedicalTerms(content);
    const hasContent = this.isContentMeaningful(content);
    const completenessScore = hasContent ? 1 : 0;
    const contentRichness = Math.min(1, wordCount / 20);
    let confidenceLevel = "low";
    if (completenessScore === 1 && wordCount >= 10 && medicalTerms >= 1) {
      confidenceLevel = "high";
    } else if (completenessScore === 1 && wordCount >= 5) {
      confidenceLevel = "medium";
    }
    return {
      completenessScore,
      contentRichness,
      confidenceLevel,
      missingFields: hasContent ? [] : [fieldName],
      extractionWarnings: this.containsErrorPatterns(content) ? ["Contains error patterns"] : [],
      medicalTermsFound: medicalTerms,
      estimatedWordCount: wordCount
    };
  }
  createEmptyQualityReport() {
    return {
      completenessScore: 0,
      contentRichness: 0,
      confidenceLevel: "low",
      missingFields: [],
      extractionWarnings: [],
      medicalTermsFound: 0,
      estimatedWordCount: 0
    };
  }
  calculateOverallQualityScore(fieldResults) {
    const results = Array.from(fieldResults.values());
    if (results.length === 0) return 0;
    const avgCompleteness = results.reduce((sum, r2) => sum + r2.quality.completenessScore, 0) / results.length;
    const avgRichness = results.reduce((sum, r2) => sum + r2.quality.contentRichness, 0) / results.length;
    const successRate = results.filter((r2) => r2.success).length / results.length;
    return avgCompleteness * 0.4 + avgRichness * 0.3 + successRate * 0.3;
  }
  // ============================================================================
  // Pattern Initialization
  // ============================================================================
  initializeMedicalPatterns() {
    this.medicalTermPatterns = [
      // Common medical terminology
      /\b(?:diagnosis|treatment|medication|prescription|symptom|condition|disease|disorder|syndrome)\b/gi,
      // Medical measurements and units
      /\b\d+\s*(?:mg|mcg|g|ml|cc|units?|mmHg|bpm|kg|lbs?)\b/gi,
      // Common procedures
      /\b(?:angiogram|angioplasty|stent|bypass|catheter|biopsy|surgery|procedure)\b/gi,
      // Clinical findings
      /\b(?:abnormal|normal|elevated|decreased|hypertension|diabetes|coronary|cardiac|pulmonary)\b/gi,
      // Australian medical terminology
      /\b(?:paracetamol|lignocaine|adrenaline|salbutamol|glyceryl trinitrate)\b/gi
    ];
  }
  initializeErrorPatterns() {
    this.commonErrorPatterns = [
      /error|failed|timeout|exception|null|undefined/gi,
      /loading\.+|please\s+wait\.+/gi,
      /access\s+denied|permission\s+denied/gi,
      /not\s+found|404|500|503/gi
    ];
  }
  // ============================================================================
  // Utility Methods
  // ============================================================================
  async sendMessage(tabId, message, timeoutMs = 5e3) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(`Message failed: ${chrome.runtime.lastError.message}`));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[DataValidation]", ...args);
    }
  }
  // ============================================================================
  // Public Configuration Methods
  // ============================================================================
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  updateConfig(config) {
    Object.assign(this.defaultConfig, config);
  }
  getConfig() {
    return { ...this.defaultConfig };
  }
};
__publicField(_DataValidation, "instance");
let DataValidation = _DataValidation;
const _ErrorRecoveryManager = class _ErrorRecoveryManager {
  constructor() {
    __publicField(this, "strategies");
    __publicField(this, "circuitBreakers");
    __publicField(this, "failureHistory");
    __publicField(this, "config");
    __publicField(this, "debugMode", false);
    this.strategies = /* @__PURE__ */ new Map();
    this.circuitBreakers = /* @__PURE__ */ new Map();
    this.failureHistory = [];
    this.config = this.getDefaultConfig();
    this.initializeStrategies();
  }
  static getInstance() {
    if (!_ErrorRecoveryManager.instance) {
      _ErrorRecoveryManager.instance = new _ErrorRecoveryManager();
    }
    return _ErrorRecoveryManager.instance;
  }
  /**
   * Execute operation with comprehensive error recovery
   */
  async executeWithRecovery(operation, context, customStrategy) {
    const operationKey = `${context.operation}_${context.patientIndex}`;
    if (this.isCircuitBreakerOpen(operationKey)) {
      throw new Error(`Circuit breaker is open for operation: ${context.operation}`);
    }
    let lastError = null;
    let attemptCount = 0;
    const maxAttempts = this.getMaxAttempts(context.operation);
    while (attemptCount < maxAttempts) {
      try {
        this.log(`🔄 Executing ${context.operation} (attempt ${attemptCount + 1}/${maxAttempts})`);
        const result = await operation();
        this.resetCircuitBreaker(operationKey);
        this.log(`✅ Operation ${context.operation} succeeded on attempt ${attemptCount + 1}`);
        return result;
      } catch (error) {
        attemptCount++;
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(`❌ Attempt ${attemptCount} failed for ${context.operation}:`, lastError.message);
        const errorType = this.classifyError(lastError);
        const failedAttempt = {
          patientIndex: context.patientIndex,
          patient: context.patient,
          operation: context.operation,
          error: lastError.message,
          timestamp: Date.now(),
          context,
          recoveryAttempted: false
        };
        const strategy = this.getStrategy(errorType, customStrategy);
        if (!strategy.shouldRetry(lastError, attemptCount, context) || attemptCount >= maxAttempts) {
          this.recordCircuitBreakerFailure(operationKey);
          this.recordFailure(failedAttempt);
          break;
        }
        failedAttempt.recoveryAttempted = true;
        await this.applyRecoveryStrategy(strategy, lastError, attemptCount, context);
        this.recordFailure(failedAttempt);
      }
    }
    this.recordCircuitBreakerFailure(operationKey);
    if (this.config.enableGracefulDegradation) {
      const degradedResult = await this.attemptGracefulDegradation(context, lastError);
      if (degradedResult !== null) {
        this.log(`🔄 Graceful degradation successful for ${context.operation}`);
        return degradedResult;
      }
    }
    throw new Error(`Operation ${context.operation} failed after ${attemptCount} attempts. Last error: ${lastError?.message}`);
  }
  /**
   * Check if an operation should be retried based on error patterns
   */
  shouldRetryOperation(operation, error, attemptCount) {
    const errorType = this.classifyError(error);
    const strategy = this.strategies.get(errorType);
    if (!strategy) return false;
    const mockContext = {
      operation,
      patientIndex: 0,
      patient: { name: "", dob: "", fileNumber: "", appointmentTime: "", appointmentType: "", confirmed: false, isFirstAppointment: false },
      timestamp: Date.now(),
      environmentState: { tabId: 0, currentUrl: "", contentScriptVersion: "", lastHealthCheck: 0 },
      previousAttempts: attemptCount - 1
    };
    return strategy.shouldRetry(error, attemptCount, mockContext);
  }
  /**
   * Get recommended retry delay for an error
   */
  getRetryDelay(errorType, attemptCount) {
    const strategy = this.strategies.get(errorType);
    if (!strategy) return 1e3;
    return this.calculateBackoffDelay(strategy.backoffStrategy, attemptCount, 1e3);
  }
  /**
   * Reset circuit breaker for specific operation
   */
  resetCircuitBreaker(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = "closed";
      breaker.resetAttempts = 0;
    }
  }
  /**
   * Get current failure statistics
   */
  getFailureStats() {
    const failuresByType = /* @__PURE__ */ new Map();
    const failuresByOperation = /* @__PURE__ */ new Map();
    for (const failure of this.failureHistory) {
      const errorType = this.classifyError(new Error(failure.error));
      failuresByType.set(errorType, (failuresByType.get(errorType) || 0) + 1);
      failuresByOperation.set(failure.operation, (failuresByOperation.get(failure.operation) || 0) + 1);
    }
    const recentFailures = this.failureHistory.filter((f2) => Date.now() - f2.timestamp < 3e5).slice(-10);
    const circuitBreakersOpen = Array.from(this.circuitBreakers.entries()).filter(([_2, breaker]) => breaker.state === "open").map(([key, _2]) => key);
    return {
      totalFailures: this.failureHistory.length,
      failuresByType,
      failuresByOperation,
      recentFailures,
      circuitBreakersOpen
    };
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  initializeStrategies() {
    this.strategies.set("network_timeout", {
      errorType: "network_timeout",
      maxRetries: 3,
      backoffStrategy: "exponential",
      recoveryTimeout: 3e4,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 3 && !error.message.includes("permanent");
      }
    });
    this.strategies.set("dom_not_found", {
      errorType: "dom_not_found",
      maxRetries: 5,
      backoffStrategy: "linear",
      recoveryTimeout: 2e4,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 5;
      },
      fallbackAction: async () => {
        return null;
      }
    });
    this.strategies.set("content_script_unresponsive", {
      errorType: "content_script_unresponsive",
      maxRetries: 2,
      backoffStrategy: "fixed",
      recoveryTimeout: 15e3,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 2;
      },
      fallbackAction: async () => {
        return null;
      }
    });
    this.strategies.set("extraction_failed", {
      errorType: "extraction_failed",
      maxRetries: 4,
      backoffStrategy: "fibonacci",
      recoveryTimeout: 25e3,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 4 && !error.message.includes("no data available");
      }
    });
    this.strategies.set("ai_processing_failed", {
      errorType: "ai_processing_failed",
      maxRetries: 2,
      backoffStrategy: "exponential",
      recoveryTimeout: 6e4,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 2 && !error.message.includes("model unavailable");
      }
    });
    this.strategies.set("navigation_failed", {
      errorType: "navigation_failed",
      maxRetries: 3,
      backoffStrategy: "linear",
      recoveryTimeout: 2e4,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 3;
      }
    });
    this.strategies.set("permission_denied", {
      errorType: "permission_denied",
      maxRetries: 1,
      backoffStrategy: "fixed",
      recoveryTimeout: 5e3,
      shouldRetry: (error, attemptCount, context) => {
        return false;
      }
    });
    this.strategies.set("memory_limit", {
      errorType: "memory_limit",
      maxRetries: 1,
      backoffStrategy: "fixed",
      recoveryTimeout: 1e4,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount === 1;
      },
      fallbackAction: async () => {
        try {
          if (window.gc) {
            window.gc();
          }
        } catch {
        }
        return null;
      }
    });
    this.strategies.set("unknown", {
      errorType: "unknown",
      maxRetries: 2,
      backoffStrategy: "exponential",
      recoveryTimeout: 15e3,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 2;
      }
    });
  }
  classifyError(error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout") || message.includes("timed out")) {
      return "network_timeout";
    }
    if (message.includes("not found") || message.includes("element") || message.includes("selector")) {
      return "dom_not_found";
    }
    if (message.includes("content script") || message.includes("script not responsive")) {
      return "content_script_unresponsive";
    }
    if (message.includes("extraction") || message.includes("data") || message.includes("field")) {
      return "extraction_failed";
    }
    if (message.includes("ai") || message.includes("model") || message.includes("processing")) {
      return "ai_processing_failed";
    }
    if (message.includes("navigation") || message.includes("navigate") || message.includes("tab")) {
      return "navigation_failed";
    }
    if (message.includes("permission") || message.includes("access denied")) {
      return "permission_denied";
    }
    if (message.includes("memory") || message.includes("heap") || message.includes("out of memory")) {
      return "memory_limit";
    }
    return "unknown";
  }
  getStrategy(errorType, customStrategy) {
    const baseStrategy = this.strategies.get(errorType) || this.strategies.get("unknown");
    if (customStrategy) {
      return { ...baseStrategy, ...customStrategy };
    }
    return baseStrategy;
  }
  async applyRecoveryStrategy(strategy, error, attemptCount, context) {
    const delay = this.calculateBackoffDelay(strategy.backoffStrategy, attemptCount);
    this.log(`🔄 Applying recovery strategy for ${strategy.errorType}, waiting ${delay}ms`);
    if (strategy.fallbackAction) {
      try {
        await strategy.fallbackAction();
        this.log(`✅ Fallback action executed for ${strategy.errorType}`);
      } catch (fallbackError) {
        this.log(`❌ Fallback action failed for ${strategy.errorType}:`, fallbackError);
      }
    }
    await this.sleep(delay);
    await this.performContextSpecificRecovery(context, strategy.errorType);
  }
  async performContextSpecificRecovery(context, errorType) {
    switch (errorType) {
      case "content_script_unresponsive":
        await this.recoverContentScript(context.environmentState.tabId);
        break;
      case "dom_not_found":
        await this.recoverDOMElements(context.environmentState.tabId);
        break;
      case "navigation_failed":
        await this.recoverNavigation(context.environmentState.tabId);
        break;
      case "memory_limit":
        await this.recoverMemory();
        break;
    }
  }
  async recoverContentScript(tabId) {
    try {
      this.log(`🔧 Attempting to recover content script on tab ${tabId}`);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-script.js"]
      });
      await this.sleep(2e3);
    } catch (error) {
      this.log(`❌ Content script recovery failed:`, error);
    }
  }
  async recoverDOMElements(tabId) {
    try {
      this.log(`🔧 Attempting to recover DOM elements on tab ${tabId}`);
      await this.sleep(1e3);
      await chrome.tabs.sendMessage(tabId, {
        type: "REFRESH_PAGE_SECTION"
      });
    } catch (error) {
      this.log(`❌ DOM recovery failed:`, error);
    }
  }
  async recoverNavigation(tabId) {
    try {
      this.log(`🔧 Attempting to recover navigation on tab ${tabId}`);
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        throw new Error("Tab no longer exists");
      }
      await this.sleep(3e3);
    } catch (error) {
      this.log(`❌ Navigation recovery failed:`, error);
    }
  }
  async recoverMemory() {
    this.log(`🔧 Attempting memory recovery`);
    if (this.failureHistory.length > 100) {
      this.failureHistory = this.failureHistory.slice(-50);
    }
    const now = Date.now();
    for (const [key, breaker] of this.circuitBreakers) {
      if (now - breaker.lastFailureTime > 3e5) {
        this.circuitBreakers.delete(key);
      }
    }
    try {
      if (window.gc) {
        window.gc();
      }
    } catch {
    }
  }
  calculateBackoffDelay(strategy, attemptCount, baseDelay = 1e3) {
    switch (strategy) {
      case "exponential":
        return Math.min(baseDelay * Math.pow(2, attemptCount - 1), 3e4);
      case "linear":
        return Math.min(baseDelay * attemptCount, 2e4);
      case "fibonacci":
        return Math.min(this.fibonacci(attemptCount) * baseDelay, 25e3);
      case "fixed":
      default:
        return baseDelay;
    }
  }
  fibonacci(n2) {
    if (n2 <= 1) return 1;
    if (n2 === 2) return 2;
    let a2 = 1, b2 = 2;
    for (let i2 = 3; i2 <= n2; i2++) {
      const temp = a2 + b2;
      a2 = b2;
      b2 = temp;
    }
    return b2;
  }
  isCircuitBreakerOpen(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    if (!breaker) return false;
    if (breaker.state === "open") {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure > this.config.circuitBreakerResetTime) {
        breaker.state = "half-open";
        breaker.resetAttempts++;
        return false;
      }
      return true;
    }
    return false;
  }
  recordCircuitBreakerFailure(operationKey) {
    let breaker = this.circuitBreakers.get(operationKey);
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailureTime: 0,
        state: "closed",
        resetAttempts: 0
      };
      this.circuitBreakers.set(operationKey, breaker);
    }
    breaker.failures++;
    breaker.lastFailureTime = Date.now();
    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = "open";
      this.log(`🚨 Circuit breaker opened for operation: ${operationKey}`);
    }
  }
  recordFailure(failure) {
    this.failureHistory.push(failure);
    if (this.failureHistory.length > 500) {
      this.failureHistory = this.failureHistory.slice(-250);
    }
  }
  getMaxAttempts(operation) {
    const criticalOperations = ["extract-data", "ai-review"];
    const normalOperations = ["navigate", "activate-patient"];
    if (criticalOperations.some((op) => operation.includes(op))) {
      return 5;
    } else if (normalOperations.some((op) => operation.includes(op))) {
      return 3;
    }
    return 2;
  }
  async attemptGracefulDegradation(context, error) {
    this.log(`🔄 Attempting graceful degradation for ${context.operation}`);
    switch (context.operation) {
      case "extract-data":
        return {
          background: "[Data extraction failed - manual review required]",
          investigations: "[Data extraction failed]",
          medications: "[Data extraction failed]"
        };
      case "ai-review":
        return {
          summary: "[AI review failed - manual review required]",
          findings: [],
          recommendations: []
        };
      default:
        return null;
    }
  }
  getDefaultConfig() {
    return {
      strategy: "conservative",
      maxTotalRetries: 10,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTime: 3e5,
      // 5 minutes
      enableGracefulDegradation: true,
      userNotificationEnabled: true
    };
  }
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[ErrorRecoveryManager]", ...args);
    }
  }
  // ============================================================================
  // Public Configuration Methods
  // ============================================================================
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  updateConfig(config) {
    Object.assign(this.config, config);
  }
  getConfig() {
    return { ...this.config };
  }
  clearHistory() {
    this.failureHistory = [];
    this.circuitBreakers.clear();
  }
  addCustomStrategy(errorType, strategy) {
    this.strategies.set(errorType, strategy);
  }
};
__publicField(_ErrorRecoveryManager, "instance");
let ErrorRecoveryManager = _ErrorRecoveryManager;
const _CacheManager = class _CacheManager {
  constructor() {
    __publicField(this, "memoryCache", /* @__PURE__ */ new Map());
    __publicField(this, "config");
    __publicField(this, "stats");
    __publicField(this, "invalidationRules", []);
    __publicField(this, "cleanupInterval");
    __publicField(this, "debugMode", false);
    this.config = this.getDefaultConfig();
    this.stats = this.initializeStats();
    this.initializeInvalidationRules();
    this.startPeriodicCleanup();
  }
  static getInstance() {
    if (!_CacheManager.instance) {
      _CacheManager.instance = new _CacheManager();
    }
    return _CacheManager.instance;
  }
  /**
   * Store data in cache with automatic hashing and compression
   */
  async set(key, data, quality, ttl) {
    const cacheKey = this.generateCacheKey(key);
    const timestamp = Date.now();
    const dataHash = await this.calculateDataHash(data);
    const expiryTime = timestamp + (ttl || this.config.defaultTtlMs);
    this.log(`💾 Caching data for key: ${cacheKey}`);
    const entry = {
      key: cacheKey,
      patientId: key.patientId,
      extractedData: data,
      // Generic for different data types
      timestamp,
      dataHash,
      quality: quality || this.createDefaultQuality(),
      expiryTime,
      accessCount: 0,
      lastAccessed: timestamp
    };
    this.memoryCache.set(cacheKey, entry);
    if (this.config.persistToDisk) {
      await this.saveToPersistentStorage(cacheKey, entry);
    }
    this.updateStats("set");
    await this.checkSizeConstraints();
    this.log(`✅ Cached data for key: ${cacheKey} (expires: ${new Date(expiryTime).toISOString()})`);
  }
  /**
   * Retrieve data from cache with validation
   */
  async get(key) {
    const cacheKey = this.generateCacheKey(key);
    this.log(`🔍 Looking for cached data: ${cacheKey}`);
    let entry = this.memoryCache.get(cacheKey);
    if (!entry && this.config.persistToDisk) {
      const loadedEntry = await this.loadFromPersistentStorage(cacheKey);
      if (loadedEntry) {
        entry = loadedEntry;
        this.memoryCache.set(cacheKey, entry);
      }
    }
    if (!entry) {
      this.updateStats("miss");
      this.log(`❌ Cache miss for key: ${cacheKey}`);
      return { hit: false, reason: "not_found" };
    }
    if (Date.now() > entry.expiryTime) {
      this.memoryCache.delete(cacheKey);
      await this.removeFromPersistentStorage(cacheKey);
      this.updateStats("miss");
      this.log(`⏰ Cache expired for key: ${cacheKey}`);
      return { hit: false, reason: "expired" };
    }
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateStats("hit");
    this.log(`✅ Cache hit for key: ${cacheKey} (accessed ${entry.accessCount} times)`);
    return {
      hit: true,
      data: entry.extractedData,
      entry
    };
  }
  /**
   * Check if cached data has changed
   */
  async hasChanged(key, currentData) {
    const result = await this.get(key);
    if (!result.hit || !result.entry) {
      return true;
    }
    const currentHash = await this.calculateDataHash(currentData);
    return currentHash !== result.entry.dataHash;
  }
  /**
   * Invalidate specific cache entry
   */
  async invalidate(key) {
    const cacheKey = this.generateCacheKey(key);
    this.log(`🗑️ Invalidating cache entry: ${cacheKey}`);
    this.memoryCache.delete(cacheKey);
    await this.removeFromPersistentStorage(cacheKey);
  }
  /**
   * Invalidate all cache entries for a patient
   */
  async invalidatePatient(patientId) {
    let invalidated = 0;
    for (const [key, entry] of this.memoryCache) {
      if (entry.patientId === patientId) {
        this.memoryCache.delete(key);
        await this.removeFromPersistentStorage(key);
        invalidated++;
      }
    }
    this.log(`🗑️ Invalidated ${invalidated} cache entries for patient: ${patientId}`);
    return invalidated;
  }
  /**
   * Apply invalidation rules to clean stale data
   */
  async applyInvalidationRules() {
    let processed = 0;
    const toRemove = [];
    const toRefresh = [];
    for (const [key, entry] of this.memoryCache) {
      for (const rule of this.invalidationRules) {
        if (rule.condition(entry)) {
          switch (rule.action) {
            case "remove":
              toRemove.push(key);
              break;
            case "refresh":
              toRefresh.push(key);
              break;
          }
          processed++;
          break;
        }
      }
    }
    for (const key of toRemove) {
      this.memoryCache.delete(key);
      await this.removeFromPersistentStorage(key);
    }
    for (const key of toRefresh) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        entry.expiryTime = Date.now();
      }
    }
    this.log(`🧹 Applied invalidation rules: ${processed} entries processed, ${toRemove.length} removed, ${toRefresh.length} marked for refresh`);
    return processed;
  }
  /**
   * Get comprehensive cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalSize = 0;
    let oldestEntry = now;
    let newestEntry = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += this.estimateEntrySize(entry);
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }
    return {
      ...this.stats,
      totalSizeBytes: totalSize,
      entryCount: this.memoryCache.size,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry
    };
  }
  /**
   * Get detailed cache information for debugging
   */
  getCacheInfo() {
    const entries = Array.from(this.memoryCache.values());
    const now = Date.now();
    const topAccessed = entries.sort((a2, b2) => b2.accessCount - a2.accessCount).slice(0, 10);
    const expiringSoon = entries.filter((e2) => e2.expiryTime - now < 3e5).sort((a2, b2) => a2.expiryTime - b2.expiryTime);
    const sizeByPatient = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const currentSize = sizeByPatient.get(entry.patientId) || 0;
      sizeByPatient.set(entry.patientId, currentSize + this.estimateEntrySize(entry));
    }
    return {
      memoryEntries: entries,
      topAccessed,
      expiringSoon,
      sizeByPatient
    };
  }
  /**
   * Clear all cache data
   */
  async clear() {
    this.log(`🧹 Clearing all cache data`);
    this.memoryCache.clear();
    if (this.config.persistToDisk) {
      await this.clearPersistentStorage();
    }
    this.stats = this.initializeStats();
  }
  /**
   * Export cache data for analysis
   */
  async exportCache() {
    const cacheData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      config: this.config,
      stats: this.getStats(),
      entries: Array.from(this.memoryCache.values()).map((entry) => ({
        ...entry,
        extractedData: "[DATA_REDACTED]"
        // Don't export sensitive data
      }))
    };
    return JSON.stringify(cacheData, null, 2);
  }
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  generateCacheKey(key) {
    const version = key.version || "v1";
    return `${key.patientId}_${key.dataType}_${version}`;
  }
  async calculateDataHash(data) {
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
  }
  estimateEntrySize(entry) {
    const jsonString = JSON.stringify(entry);
    return new Blob([jsonString]).size;
  }
  async checkSizeConstraints() {
    const stats = this.getStats();
    if (stats.totalSizeBytes > this.config.maxSizeBytes) {
      await this.evictLeastRecentlyUsed(Math.floor(this.memoryCache.size * 0.2));
    }
    if (stats.entryCount > this.config.maxEntries) {
      await this.evictLeastRecentlyUsed(stats.entryCount - this.config.maxEntries);
    }
  }
  async evictLeastRecentlyUsed(count) {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(([, a2], [, b2]) => a2.lastAccessed - b2.lastAccessed);
    const toEvict = entries.slice(0, count);
    for (const [key] of toEvict) {
      this.memoryCache.delete(key);
      await this.removeFromPersistentStorage(key);
    }
    this.log(`🗑️ Evicted ${toEvict.length} least recently used entries`);
  }
  initializeInvalidationRules() {
    this.invalidationRules = [
      {
        name: "expired_entries",
        condition: (entry) => Date.now() > entry.expiryTime,
        action: "remove"
      },
      {
        name: "low_quality_old_data",
        condition: (entry) => {
          const age = Date.now() - entry.timestamp;
          return entry.quality.confidenceLevel === "low" && age > 18e5;
        },
        action: "remove"
      },
      {
        name: "unused_entries",
        condition: (entry) => {
          const age = Date.now() - entry.lastAccessed;
          return entry.accessCount === 0 && age > 36e5;
        },
        action: "remove"
      },
      {
        name: "refresh_high_access",
        condition: (entry) => {
          const age = Date.now() - entry.timestamp;
          return entry.accessCount > 10 && age > 72e5;
        },
        action: "refresh"
      }
    ];
  }
  startPeriodicCleanup() {
    this.cleanupInterval = setInterval(async () => {
      await this.applyInvalidationRules();
      await this.checkSizeConstraints();
    }, 3e5);
  }
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = void 0;
    }
  }
  updateStats(operation) {
    this.stats.totalRequests++;
    switch (operation) {
      case "hit":
        this.stats.hitCount++;
        break;
      case "miss":
        this.stats.missCount++;
        break;
    }
    this.stats.hitRate = this.stats.totalRequests > 0 ? this.stats.hitCount / this.stats.totalRequests : 0;
  }
  createDefaultQuality() {
    return {
      completenessScore: 1,
      contentRichness: 1,
      confidenceLevel: "high",
      missingFields: [],
      extractionWarnings: [],
      medicalTermsFound: 0,
      estimatedWordCount: 0
    };
  }
  // ============================================================================
  // Persistent Storage Methods
  // ============================================================================
  async saveToPersistentStorage(key, entry) {
    try {
      const storageKey = `cache_${key}`;
      let data = JSON.stringify(entry);
      if (this.config.compressionEnabled) {
        data = await this.compressData(data);
      }
      await chrome.storage.local.set({ [storageKey]: data });
    } catch (error) {
      this.log(`❌ Failed to save to persistent storage:`, error);
    }
  }
  async loadFromPersistentStorage(key) {
    try {
      const storageKey = `cache_${key}`;
      const result = await chrome.storage.local.get(storageKey);
      if (!result[storageKey]) {
        return null;
      }
      let data = result[storageKey];
      if (this.config.compressionEnabled) {
        data = await this.decompressData(data);
      }
      return JSON.parse(data);
    } catch (error) {
      this.log(`❌ Failed to load from persistent storage:`, error);
      return null;
    }
  }
  async removeFromPersistentStorage(key) {
    try {
      const storageKey = `cache_${key}`;
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      this.log(`❌ Failed to remove from persistent storage:`, error);
    }
  }
  async clearPersistentStorage() {
    try {
      const allItems = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allItems).filter((key) => key.startsWith("cache_"));
      await chrome.storage.local.remove(cacheKeys);
    } catch (error) {
      this.log(`❌ Failed to clear persistent storage:`, error);
    }
  }
  // ============================================================================
  // Compression Methods (Basic Implementation)
  // ============================================================================
  async compressData(data) {
    return btoa(data);
  }
  async decompressData(data) {
    return atob(data);
  }
  // ============================================================================
  // Configuration and Initialization
  // ============================================================================
  getDefaultConfig() {
    return {
      maxSizeBytes: 50 * 1024 * 1024,
      // 50MB
      maxEntries: 1e3,
      defaultTtlMs: 36e5,
      // 1 hour
      compressionEnabled: true,
      persistToDisk: true
    };
  }
  initializeStats() {
    return {
      hitCount: 0,
      missCount: 0,
      totalRequests: 0,
      hitRate: 0,
      totalSizeBytes: 0,
      entryCount: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[CacheManager]", ...args);
    }
  }
  // ============================================================================
  // Public Configuration Methods
  // ============================================================================
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  updateConfig(config) {
    Object.assign(this.config, config);
  }
  getConfig() {
    return { ...this.config };
  }
  addInvalidationRule(rule) {
    this.invalidationRules.push(rule);
  }
  removeInvalidationRule(name) {
    const index = this.invalidationRules.findIndex((rule) => rule.name === name);
    if (index >= 0) {
      this.invalidationRules.splice(index, 1);
      return true;
    }
    return false;
  }
  cleanup() {
    this.stopPeriodicCleanup();
    this.memoryCache.clear();
  }
  // ============================================================================
  // Utility Methods for External Use
  // ============================================================================
  /**
   * Warm up cache with patient data
   */
  async warmup(patients) {
    this.log(`🔥 Warming up cache for ${patients.length} patients`);
    for (const patient of patients) {
      const keys = [
        { patientId: patient.fileNumber, dataType: "extracted_data" },
        { patientId: patient.fileNumber, dataType: "ai_review" },
        { patientId: patient.fileNumber, dataType: "validation_result" }
      ];
      for (const key of keys) {
        const result = await this.get(key);
        if (!result.hit) {
          await this.set(key, null, void 0, 6e4);
        }
      }
    }
  }
  /**
   * Preload cache from previous batch data
   */
  async preload(cacheData) {
    let loaded = 0;
    for (const data of cacheData) {
      try {
        const key = {
          patientId: data.patientId,
          dataType: data.dataType,
          version: data.version
        };
        await this.set(key, data.content, data.quality, data.ttl);
        loaded++;
      } catch (error) {
        this.log(`❌ Failed to preload cache entry:`, error);
      }
    }
    this.log(`📥 Preloaded ${loaded} cache entries`);
    return loaded;
  }
};
__publicField(_CacheManager, "instance");
let CacheManager = _CacheManager;
const _CheckpointManager = class _CheckpointManager {
  constructor() {
    __publicField(this, "config");
    __publicField(this, "storagePrefix", "batch_checkpoint_");
    __publicField(this, "backupPrefix", "backup_checkpoint_");
    __publicField(this, "debugMode", false);
    this.config = this.getDefaultConfig();
  }
  static getInstance() {
    if (!_CheckpointManager.instance) {
      _CheckpointManager.instance = new _CheckpointManager();
    }
    return _CheckpointManager.instance;
  }
  /**
   * Save a checkpoint for the current batch processing state
   */
  async saveCheckpoint(batchId, input, completedPatients, currentPatientIndex, failedAttempts, configuration, performanceMetrics, environmentState) {
    const checkpointId = this.generateCheckpointId(batchId);
    const timestamp = Date.now();
    this.log(`💾 Saving checkpoint: ${checkpointId}`);
    const resumeData = {
      lastSuccessfulOperation: this.getLastSuccessfulOperation(completedPatients),
      skippedPatients: this.getSkippedPatients(completedPatients),
      retryQueue: this.buildRetryQueue(failedAttempts),
      environmentState
    };
    const checkpoint = {
      id: checkpointId,
      batchId,
      timestamp,
      version: "1.0.0",
      totalPatients: input.selectedPatients.length,
      completedPatients,
      currentPatientIndex,
      failedAttempts,
      configuration,
      performanceMetrics,
      resumeData,
      integrityHash: ""
    };
    checkpoint.integrityHash = await this.calculateIntegrityHash(checkpoint);
    try {
      const serializedData = this.config.compressionEnabled ? await this.compressData(checkpoint) : JSON.stringify(checkpoint);
      const finalData = this.config.encryptionEnabled ? await this.encryptData(serializedData) : serializedData;
      const storageKey = this.storagePrefix + checkpointId;
      await this.saveToStorage(storageKey, finalData);
      if (this.config.backupEnabled) {
        const backupKey = this.backupPrefix + checkpointId;
        await this.saveToStorage(backupKey, finalData);
      }
      this.log(`✅ Checkpoint saved successfully: ${checkpointId}`);
      await this.cleanupOldCheckpoints(batchId);
      return checkpointId;
    } catch (error) {
      this.log(`❌ Failed to save checkpoint:`, error);
      throw new Error(`Checkpoint save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Load a checkpoint and validate its integrity
   */
  async loadCheckpoint(checkpointId) {
    this.log(`📂 Loading checkpoint: ${checkpointId}`);
    try {
      let data = await this.loadFromStorage(this.storagePrefix + checkpointId);
      if (!data && this.config.backupEnabled) {
        this.log(`⚠️ Primary checkpoint not found, trying backup`);
        data = await this.loadFromStorage(this.backupPrefix + checkpointId);
      }
      if (!data) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }
      const decryptedData = this.config.encryptionEnabled ? await this.decryptData(data) : data;
      const checkpoint = this.config.compressionEnabled ? await this.decompressData(decryptedData) : JSON.parse(decryptedData);
      if (this.config.integrityChecking) {
        const isValid = await this.validateIntegrity(checkpoint);
        if (!isValid) {
          throw new Error("Checkpoint integrity validation failed");
        }
      }
      const validation = this.validateCheckpointStructure(checkpoint);
      if (!validation.isValid) {
        throw new Error(`Invalid checkpoint structure: ${validation.errors.join(", ")}`);
      }
      this.log(`✅ Checkpoint loaded successfully: ${checkpointId}`);
      return checkpoint;
    } catch (error) {
      this.log(`❌ Failed to load checkpoint:`, error);
      throw new Error(`Checkpoint load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Resume batch processing from a checkpoint
   */
  async resumeFromCheckpoint(checkpointId, newConfiguration, options = {}) {
    this.log(`🔄 Resuming from checkpoint: ${checkpointId}`);
    const checkpoint = await this.loadCheckpoint(checkpointId);
    const resumeOptions = {
      skipFailedPatients: false,
      retryFailedPatients: true,
      validateEnvironment: true,
      allowConfigChanges: true,
      resumeFromLastSuccessful: true,
      ...options
    };
    const warnings = [];
    if (resumeOptions.validateEnvironment) {
      const envValidation = await this.validateEnvironment(checkpoint.resumeData.environmentState);
      if (!envValidation.isValid) {
        warnings.push(`Environment validation warnings: ${envValidation.warnings.join(", ")}`);
        if (envValidation.errors.length > 0) {
          throw new Error(`Environment validation failed: ${envValidation.errors.join(", ")}`);
        }
      }
    }
    if (newConfiguration) {
      if (!resumeOptions.allowConfigChanges) {
        throw new Error("Configuration changes not allowed during resume");
      }
      const configDiff = this.compareConfigurations(checkpoint.configuration, newConfiguration);
      if (configDiff.hasSignificantChanges) {
        warnings.push(`Significant configuration changes detected: ${configDiff.changes.join(", ")}`);
      }
      checkpoint.configuration = { ...checkpoint.configuration, ...newConfiguration };
    }
    const resumeStrategy = this.determineResumeStrategy(checkpoint, resumeOptions);
    checkpoint.resumeData.lastSuccessfulOperation = `resumed_from_checkpoint_${Date.now()}`;
    this.log(`✅ Resume strategy determined:`, resumeStrategy);
    return {
      checkpoint,
      resumeStrategy,
      warnings
    };
  }
  /**
   * List available checkpoints for a batch
   */
  async listCheckpoints(batchId) {
    try {
      const storage = chrome.storage.local;
      const allItems = await storage.get(null);
      const checkpoints = [];
      for (const [key, value] of Object.entries(allItems)) {
        if (key.startsWith(this.storagePrefix)) {
          try {
            const info = await this.extractCheckpointInfo(key, value);
            if (!batchId || info.batchId === batchId) {
              checkpoints.push(info);
            }
          } catch (error) {
            this.log(`⚠️ Error reading checkpoint ${key}:`, error);
          }
        }
      }
      checkpoints.sort((a2, b2) => b2.timestamp - a2.timestamp);
      return checkpoints;
    } catch (error) {
      this.log(`❌ Failed to list checkpoints:`, error);
      return [];
    }
  }
  /**
   * Delete a specific checkpoint
   */
  async deleteCheckpoint(checkpointId) {
    try {
      const storage = chrome.storage.local;
      const keys = [
        this.storagePrefix + checkpointId,
        this.backupPrefix + checkpointId
      ];
      await storage.remove(keys);
      this.log(`🗑️ Checkpoint deleted: ${checkpointId}`);
    } catch (error) {
      this.log(`❌ Failed to delete checkpoint:`, error);
      throw new Error(`Checkpoint deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Clean up old checkpoints based on configuration
   */
  async cleanupOldCheckpoints(batchId) {
    try {
      const checkpoints = await this.listCheckpoints(batchId);
      if (checkpoints.length <= this.config.maxCheckpoints) {
        return 0;
      }
      const toDelete = checkpoints.slice(this.config.maxCheckpoints);
      let deletedCount = 0;
      for (const checkpoint of toDelete) {
        try {
          await this.deleteCheckpoint(checkpoint.id);
          deletedCount++;
        } catch (error) {
          this.log(`⚠️ Failed to delete old checkpoint ${checkpoint.id}:`, error);
        }
      }
      this.log(`🧹 Cleaned up ${deletedCount} old checkpoints`);
      return deletedCount;
    } catch (error) {
      this.log(`❌ Cleanup failed:`, error);
      return 0;
    }
  }
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  generateCheckpointId(batchId) {
    return `${batchId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  async calculateIntegrityHash(checkpoint) {
    const dataToHash = { ...checkpoint };
    delete dataToHash.integrityHash;
    const dataString = JSON.stringify(dataToHash);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
  }
  async validateIntegrity(checkpoint) {
    const expectedHash = checkpoint.integrityHash;
    const actualHash = await this.calculateIntegrityHash(checkpoint);
    return expectedHash === actualHash;
  }
  validateCheckpointStructure(checkpoint) {
    const errors = [];
    const warnings = [];
    const requiredFields = ["id", "batchId", "timestamp", "version", "totalPatients", "completedPatients", "currentPatientIndex"];
    for (const field of requiredFields) {
      if (checkpoint[field] === void 0 || checkpoint[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    if (typeof checkpoint.currentPatientIndex !== "number") {
      errors.push("currentPatientIndex must be a number");
    }
    if (!Array.isArray(checkpoint.completedPatients)) {
      errors.push("completedPatients must be an array");
    }
    if (checkpoint.currentPatientIndex < 0 || checkpoint.currentPatientIndex > checkpoint.totalPatients) {
      warnings.push("currentPatientIndex seems out of bounds");
    }
    if (checkpoint.version !== "1.0.0") {
      warnings.push(`Checkpoint version ${checkpoint.version} may not be fully compatible`);
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : 0
    };
  }
  async validateEnvironment(environmentState) {
    const errors = [];
    const warnings = [];
    try {
      if (environmentState.tabId) {
        try {
          await chrome.tabs.get(environmentState.tabId);
        } catch {
          warnings.push("Original tab no longer exists");
        }
      }
      if (environmentState.currentUrl) {
        try {
          new URL(environmentState.currentUrl);
        } catch {
          warnings.push("Current URL appears invalid");
        }
      }
      if (environmentState.contentScriptVersion) {
        warnings.push("Content script version compatibility not verified");
      }
      const timeSinceLastCheck = Date.now() - environmentState.lastHealthCheck;
      if (timeSinceLastCheck > 36e5) {
        warnings.push("Environment state is quite old (>1 hour)");
      }
    } catch (error) {
      errors.push(`Environment validation error: ${error}`);
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1 : 0
    };
  }
  compareConfigurations(original, updated) {
    const changes = [];
    const significantFields = ["maxRetries", "timeoutMs", "errorRecoveryStrategy"];
    for (const [key, newValue] of Object.entries(updated)) {
      const originalValue = original[key];
      if (originalValue !== newValue) {
        changes.push(`${key}: ${originalValue} → ${newValue}`);
      }
    }
    const hasSignificantChanges = changes.some(
      (change) => significantFields.some((field) => change.startsWith(field))
    );
    return { hasSignificantChanges, changes };
  }
  determineResumeStrategy(checkpoint, options) {
    const strategy = {
      startIndex: checkpoint.currentPatientIndex,
      skipPatients: [],
      retryPatients: [],
      forceReprocessPatients: [],
      resumeMode: "continue"
    };
    if (options.resumeFromLastSuccessful) {
      const lastSuccessfulIndex = this.findLastSuccessfulPatientIndex(checkpoint.completedPatients);
      strategy.startIndex = Math.max(lastSuccessfulIndex + 1, checkpoint.currentPatientIndex);
    }
    if (options.skipFailedPatients) {
      strategy.skipPatients = checkpoint.failedAttempts.map((f2) => f2.patientIndex);
    } else if (options.retryFailedPatients) {
      strategy.retryPatients = checkpoint.failedAttempts.map((f2) => f2.patientIndex);
    }
    if (strategy.retryPatients.length > 0) {
      strategy.resumeMode = "retry_failed";
    } else if (strategy.skipPatients.length > 0) {
      strategy.resumeMode = "skip_failed";
    } else {
      strategy.resumeMode = "continue";
    }
    return strategy;
  }
  getLastSuccessfulOperation(completedPatients) {
    const successful = completedPatients.filter((p2) => p2.success);
    if (successful.length === 0) {
      return "batch_start";
    }
    const lastPatient = successful[successful.length - 1];
    return `patient_completed_${lastPatient.patient.fileNumber}`;
  }
  getSkippedPatients(completedPatients) {
    const processedIndices = new Set(completedPatients.map((_2, index) => index));
    const skipped = [];
    for (let i2 = 0; i2 < completedPatients.length; i2++) {
      if (!processedIndices.has(i2)) {
        skipped.push(i2);
      }
    }
    return skipped;
  }
  buildRetryQueue(failedAttempts) {
    const retryQueue = [];
    const patientFailures = /* @__PURE__ */ new Map();
    for (const failure of failedAttempts) {
      const existing = patientFailures.get(failure.patientIndex) || [];
      existing.push(failure);
      patientFailures.set(failure.patientIndex, existing);
    }
    for (const [patientIndex, failures] of patientFailures) {
      const lastFailure = failures[failures.length - 1];
      retryQueue.push({
        patientIndex,
        patient: lastFailure.patient,
        lastError: lastFailure.error,
        retryCount: failures.length,
        nextRetryTime: Date.now() + failures.length * 6e4
        // Escalating delays
      });
    }
    return retryQueue;
  }
  findLastSuccessfulPatientIndex(completedPatients) {
    for (let i2 = completedPatients.length - 1; i2 >= 0; i2--) {
      if (completedPatients[i2].success) {
        return i2;
      }
    }
    return -1;
  }
  async extractCheckpointInfo(key, data) {
    try {
      const checkpointId = key.replace(this.storagePrefix, "");
      let parsedData;
      if (this.config.encryptionEnabled) {
        parsedData = { id: checkpointId, timestamp: 0, batchId: "encrypted" };
      } else if (this.config.compressionEnabled) {
        parsedData = await this.decompressData(data);
      } else {
        parsedData = JSON.parse(data);
      }
      return {
        id: parsedData.id || checkpointId,
        batchId: parsedData.batchId || "unknown",
        timestamp: parsedData.timestamp || 0,
        totalPatients: parsedData.totalPatients || 0,
        completedPatients: parsedData.completedPatients?.length || 0,
        currentIndex: parsedData.currentPatientIndex || 0,
        hasFailures: (parsedData.failedAttempts?.length || 0) > 0
      };
    } catch (error) {
      throw new Error(`Failed to extract checkpoint info: ${error}`);
    }
  }
  // ============================================================================
  // Storage Operations
  // ============================================================================
  async saveToStorage(key, data) {
    const storage = chrome.storage.local;
    await storage.set({ [key]: data });
  }
  async loadFromStorage(key) {
    const storage = chrome.storage.local;
    const result = await storage.get(key);
    return result[key] || null;
  }
  // ============================================================================
  // Compression/Encryption (Basic implementations)
  // ============================================================================
  async compressData(data) {
    const jsonString = JSON.stringify(data);
    const compressed = jsonString.replace(/\s+/g, "").replace(/"completedPatients"/g, '"cp"').replace(/"currentPatientIndex"/g, '"ci"').replace(/"failedAttempts"/g, '"fa"').replace(/"timestamp"/g, '"ts"');
    return compressed;
  }
  async decompressData(data) {
    const decompressed = data.replace(/"cp"/g, '"completedPatients"').replace(/"ci"/g, '"currentPatientIndex"').replace(/"fa"/g, '"failedAttempts"').replace(/"ts"/g, '"timestamp"');
    return JSON.parse(decompressed);
  }
  async encryptData(data) {
    return btoa(data);
  }
  async decryptData(data) {
    return atob(data);
  }
  getDefaultConfig() {
    return {
      autoSaveInterval: 5,
      // Save every 5 patients
      maxCheckpoints: 10,
      compressionEnabled: true,
      encryptionEnabled: false,
      // Disabled for now due to complexity
      integrityChecking: true,
      backupEnabled: true
    };
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[CheckpointManager]", ...args);
    }
  }
  // ============================================================================
  // Public Configuration Methods
  // ============================================================================
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  updateConfig(config) {
    Object.assign(this.config, config);
  }
  getConfig() {
    return { ...this.config };
  }
};
__publicField(_CheckpointManager, "instance");
let CheckpointManager = _CheckpointManager;
const _MetricsCollector = class _MetricsCollector {
  constructor() {
    __publicField(this, "metrics");
    __publicField(this, "config");
    __publicField(this, "memorySnapshots", []);
    __publicField(this, "activeOperations", /* @__PURE__ */ new Map());
    __publicField(this, "memoryMonitorInterval");
    __publicField(this, "debugMode", false);
    this.config = this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
    this.startMemoryMonitoring();
  }
  static getInstance() {
    if (!_MetricsCollector.instance) {
      _MetricsCollector.instance = new _MetricsCollector();
    }
    return _MetricsCollector.instance;
  }
  /**
   * Start a new metrics session
   */
  startSession(sessionId) {
    this.log(`📊 Starting metrics session: ${sessionId}`);
    this.metrics = this.initializeMetrics();
    this.metrics.sessionId = sessionId;
    this.metrics.batchStartTime = Date.now();
    if (this.config.enablePerformanceMarks) {
      performance.mark(`batch-start-${sessionId}`);
    }
  }
  /**
   * End the current metrics session
   */
  endSession() {
    const endTime = Date.now();
    this.metrics.totalProcessingTime = endTime - this.metrics.batchStartTime;
    this.log(`📊 Ending metrics session: ${this.metrics.sessionId}`);
    if (this.config.enablePerformanceMarks) {
      performance.mark(`batch-end-${this.metrics.sessionId}`);
      performance.measure(
        `batch-duration-${this.metrics.sessionId}`,
        `batch-start-${this.metrics.sessionId}`,
        `batch-end-${this.metrics.sessionId}`
      );
    }
    const report = this.generateReport();
    if (this.config.autoExport) {
      this.exportMetrics(report);
    }
    return report;
  }
  /**
   * Start timing an operation
   */
  startOperation(operationId, operation, patientIndex) {
    const startTime = Date.now();
    this.activeOperations.set(operationId, startTime);
    this.log(`⏱️ Started operation: ${operation} (${operationId})`);
    if (this.config.enablePerformanceMarks) {
      performance.mark(`op-start-${operationId}`);
    }
  }
  /**
   * End timing an operation
   */
  endOperation(operationId, operation, success, patientIndex, metadata) {
    const endTime = Date.now();
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      this.log(`⚠️ No start time found for operation: ${operationId}`);
      return this.createEmptyTiming(operation, operationId);
    }
    const duration = endTime - startTime;
    this.activeOperations.delete(operationId);
    const timing = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      patientIndex,
      metadata
    };
    this.metrics.operationTimings.push(timing);
    switch (operation) {
      case "patient-activation":
        this.metrics.patientActivationTimes.push(duration);
        break;
      case "data-extraction":
        this.metrics.dataExtractionTimes.push(duration);
        break;
      case "ai-review":
        this.metrics.aiReviewTimes.push(duration);
        break;
      case "content-script-response":
        this.metrics.contentScriptResponseTimes.push(duration);
        break;
    }
    if (!success) {
      const currentCount = this.metrics.retryCount.get(operation) || 0;
      this.metrics.retryCount.set(operation, currentCount + 1);
    }
    this.log(`✅ Completed operation: ${operation} in ${duration}ms (success: ${success})`);
    if (this.config.enablePerformanceMarks) {
      performance.mark(`op-end-${operationId}`);
      performance.measure(`op-duration-${operationId}`, `op-start-${operationId}`, `op-end-${operationId}`);
    }
    return timing;
  }
  /**
   * Record an error occurrence
   */
  recordError(operation, error, patientIndex) {
    const errorType = this.classifyError(error);
    const currentErrorCount = this.metrics.errorFrequency.get(errorType) || 0;
    this.metrics.errorFrequency.set(errorType, currentErrorCount + 1);
    const currentOpErrorCount = this.metrics.errorFrequency.get(operation) || 0;
    this.metrics.errorFrequency.set(operation, currentOpErrorCount + 1);
    this.log(`❌ Recorded error: ${errorType} in ${operation} (patient ${patientIndex})`);
  }
  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0
    };
    if (performance.memory) {
      const memory = performance.memory;
      snapshot.heapUsed = memory.usedJSHeapSize;
      snapshot.heapTotal = memory.totalJSHeapSize;
      snapshot.external = memory.usedJSHeapSize;
    }
    this.memorySnapshots.push(snapshot);
    this.metrics.memoryUsageHistory.push(snapshot);
    if (this.memorySnapshots.length > 1e3) {
      this.memorySnapshots = this.memorySnapshots.slice(-500);
    }
    return snapshot;
  }
  /**
   * Calculate current performance indicators
   */
  getPerformanceIndicators() {
    const recentTimings = this.getRecentTimings(3e5);
    const totalOperations = this.metrics.operationTimings.length;
    const successfulOperations = this.metrics.operationTimings.filter((t2) => t2.success).length;
    const patientTimings = recentTimings.filter((t2) => t2.patientIndex !== void 0);
    const avgTimePerPatient = patientTimings.length > 0 ? patientTimings.reduce((sum, t2) => sum + t2.duration, 0) / patientTimings.length : 0;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 1;
    let currentSpeed = "normal";
    if (avgTimePerPatient > 0) {
      if (avgTimePerPatient < 3e4) currentSpeed = "fast";
      else if (avgTimePerPatient < 6e4) currentSpeed = "normal";
      else if (avgTimePerPatient < 12e4) currentSpeed = "slow";
      else currentSpeed = "degraded";
    }
    const totalErrors = Array.from(this.metrics.errorFrequency.values()).reduce((sum, count) => sum + count, 0);
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    const latestMemory = this.memorySnapshots[this.memorySnapshots.length - 1];
    const memoryUsage = latestMemory ? latestMemory.heapUsed / (1024 * 1024) : 0;
    return {
      averageTimePerPatient: avgTimePerPatient,
      successRate,
      currentSpeed,
      errorRate,
      memoryUsage
    };
  }
  /**
   * Generate comprehensive metrics report
   */
  generateReport() {
    const summary = this.generateSummary();
    const timingAnalysis = this.analyzeTimings();
    const memoryAnalysis = this.analyzeMemory();
    const errorAnalysis = this.analyzeErrors();
    const insights = this.generateInsights();
    const recommendations = this.generateRecommendations(insights);
    return {
      summary,
      timingAnalysis,
      memoryAnalysis,
      errorAnalysis,
      performanceInsights: insights,
      recommendations
    };
  }
  /**
   * Export metrics in specified format
   */
  async exportMetrics(report) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `batch-metrics-${report.summary.sessionId}-${timestamp}`;
    if (this.config.exportFormat === "csv") {
      return this.exportAsCSV(report, filename);
    } else {
      return this.exportAsJSON(report, filename);
    }
  }
  // ============================================================================
  // Private Analysis Methods
  // ============================================================================
  generateSummary() {
    const totalPatients = new Set(
      this.metrics.operationTimings.filter((t2) => t2.patientIndex !== void 0).map((t2) => t2.patientIndex)
    ).size;
    const successfulPatients = new Set(
      this.metrics.operationTimings.filter((t2) => t2.patientIndex !== void 0 && t2.success).map((t2) => t2.patientIndex)
    ).size;
    const failedPatients = totalPatients - successfulPatients;
    const patientTimings = this.metrics.operationTimings.filter((t2) => t2.patientIndex !== void 0);
    const avgTimePerPatient = patientTimings.length > 0 ? patientTimings.reduce((sum, t2) => sum + t2.duration, 0) / patientTimings.length : 0;
    const successRate = totalPatients > 0 ? successfulPatients / totalPatients : 0;
    const totalHours = this.metrics.totalProcessingTime / (1e3 * 60 * 60);
    const throughputPatientsPerHour = totalHours > 0 ? totalPatients / totalHours : 0;
    return {
      sessionId: this.metrics.sessionId,
      totalDuration: this.metrics.totalProcessingTime,
      totalPatients,
      successfulPatients,
      failedPatients,
      averageTimePerPatient: avgTimePerPatient,
      successRate,
      throughputPatientsPerHour
    };
  }
  analyzeTimings() {
    const operationBreakdown = /* @__PURE__ */ new Map();
    const allDurations = [];
    for (const timing of this.metrics.operationTimings) {
      allDurations.push(timing.duration);
      let stats = operationBreakdown.get(timing.operation);
      if (!stats) {
        stats = {
          operation: timing.operation,
          count: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0,
          standardDeviation: 0,
          successRate: 0
        };
        operationBreakdown.set(timing.operation, stats);
      }
      stats.count++;
      stats.totalTime += timing.duration;
      stats.minTime = Math.min(stats.minTime, timing.duration);
      stats.maxTime = Math.max(stats.maxTime, timing.duration);
      if (timing.success) {
        stats.successRate++;
      }
    }
    for (const stats of operationBreakdown.values()) {
      stats.averageTime = stats.totalTime / stats.count;
      stats.successRate = stats.successRate / stats.count;
      const operationTimings = this.metrics.operationTimings.filter((t2) => t2.operation === stats.operation).map((t2) => t2.duration);
      const variance = operationTimings.reduce((sum, duration) => {
        return sum + Math.pow(duration - stats.averageTime, 2);
      }, 0) / operationTimings.length;
      stats.standardDeviation = Math.sqrt(variance);
    }
    allDurations.sort((a2, b2) => a2 - b2);
    const percentiles = {
      p50: this.getPercentile(allDurations, 50),
      p90: this.getPercentile(allDurations, 90),
      p95: this.getPercentile(allDurations, 95),
      p99: this.getPercentile(allDurations, 99)
    };
    const bottlenecks = this.identifyBottlenecks(operationBreakdown);
    const criticalPath = this.determineCriticalPath(operationBreakdown);
    return {
      operationBreakdown,
      criticalPath,
      bottlenecks,
      percentiles
    };
  }
  analyzeMemory() {
    if (this.memorySnapshots.length < 2) {
      return {
        peakUsage: 0,
        averageUsage: 0,
        growthRate: 0,
        leakDetection: [],
        gcImpact: 0
      };
    }
    const heapUsages = this.memorySnapshots.map((s2) => s2.heapUsed);
    const peakUsage = Math.max(...heapUsages);
    const averageUsage = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
    const firstSnapshot = this.memorySnapshots[0];
    const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
    const timeDiff = (lastSnapshot.timestamp - firstSnapshot.timestamp) / (1e3 * 60);
    const memoryDiff = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / (1024 * 1024);
    const growthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0;
    const leakDetection = this.detectMemoryLeaks();
    return {
      peakUsage: peakUsage / (1024 * 1024),
      // Convert to MB
      averageUsage: averageUsage / (1024 * 1024),
      // Convert to MB
      growthRate,
      leakDetection,
      gcImpact: 0
      // Would need more sophisticated GC tracking
    };
  }
  analyzeErrors() {
    const totalErrors = Array.from(this.metrics.errorFrequency.values()).reduce((sum, count) => sum + count, 0);
    const totalOperations = this.metrics.operationTimings.length;
    const successfulOperations = this.metrics.operationTimings.filter((t2) => t2.success).length;
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    const recoveryRate = totalOperations > totalErrors ? (successfulOperations - (totalOperations - totalErrors)) / totalErrors : 0;
    const errorsByType = /* @__PURE__ */ new Map();
    const errorsByOperation = /* @__PURE__ */ new Map();
    for (const [key, count] of this.metrics.errorFrequency) {
      if (this.isErrorType(key)) {
        errorsByType.set(key, count);
      } else {
        errorsByOperation.set(key, count);
      }
    }
    const failedTimings = this.metrics.operationTimings.filter((t2) => !t2.success);
    const avgFailedTime = failedTimings.length > 0 ? failedTimings.reduce((sum, t2) => sum + t2.duration, 0) / failedTimings.length : 0;
    const successfulTimings = this.metrics.operationTimings.filter((t2) => t2.success);
    const avgSuccessfulTime = successfulTimings.length > 0 ? successfulTimings.reduce((sum, t2) => sum + t2.duration, 0) / successfulTimings.length : 0;
    const impactOnPerformance = avgSuccessfulTime > 0 ? (avgFailedTime - avgSuccessfulTime) / avgSuccessfulTime : 0;
    return {
      totalErrors,
      errorsByType,
      errorsByOperation,
      errorRate,
      recoveryRate,
      impactOnPerformance
    };
  }
  generateInsights() {
    const insights = [];
    const indicators = this.getPerformanceIndicators();
    if (indicators.currentSpeed === "degraded") {
      insights.push({
        type: "warning",
        title: "Severely Degraded Performance",
        description: `Average processing time per patient is ${Math.round(indicators.averageTimePerPatient / 1e3)}s, indicating severe performance issues.`,
        impact: "high",
        actionRequired: true
      });
    }
    if (indicators.errorRate > 0.1) {
      insights.push({
        type: "warning",
        title: "High Error Rate",
        description: `Error rate of ${Math.round(indicators.errorRate * 100)}% is concerning and may indicate system issues.`,
        impact: "high",
        actionRequired: true
      });
    }
    if (indicators.memoryUsage > 500) {
      insights.push({
        type: "warning",
        title: "High Memory Usage",
        description: `Memory usage of ${Math.round(indicators.memoryUsage)}MB is high and may cause performance issues.`,
        impact: "medium",
        actionRequired: false
      });
    }
    if (indicators.successRate < 0.9) {
      insights.push({
        type: "optimization",
        title: "Low Success Rate",
        description: `Success rate of ${Math.round(indicators.successRate * 100)}% suggests opportunities for improvement.`,
        impact: "medium",
        actionRequired: false
      });
    }
    return insights;
  }
  generateRecommendations(insights) {
    const recommendations = [];
    for (const insight of insights) {
      switch (insight.title) {
        case "Severely Degraded Performance":
          recommendations.push("Consider reducing batch size or increasing timeout values");
          recommendations.push("Check for network connectivity issues");
          break;
        case "High Error Rate":
          recommendations.push("Review error logs to identify common failure patterns");
          recommendations.push("Consider implementing additional retry strategies");
          break;
        case "High Memory Usage":
          recommendations.push("Implement more frequent garbage collection");
          recommendations.push("Reduce the number of concurrent operations");
          break;
        case "Low Success Rate":
          recommendations.push("Improve error handling and recovery mechanisms");
          recommendations.push("Add more robust validation checks");
          break;
      }
    }
    return recommendations;
  }
  // ============================================================================
  // Helper Methods
  // ============================================================================
  identifyBottlenecks(operationBreakdown) {
    const bottlenecks = [];
    for (const stats of operationBreakdown.values()) {
      let impact = "low";
      let suggestion = "";
      if (stats.averageTime > 6e4) {
        impact = "critical";
        suggestion = "This operation is extremely slow and should be optimized immediately";
      } else if (stats.averageTime > 3e4) {
        impact = "high";
        suggestion = "Consider optimizing this operation or implementing caching";
      } else if (stats.averageTime > 15e3) {
        impact = "medium";
        suggestion = "Monitor this operation for potential optimization opportunities";
      }
      if (impact !== "low") {
        bottlenecks.push({
          operation: stats.operation,
          averageTime: stats.averageTime,
          impact,
          description: `${stats.operation} takes an average of ${Math.round(stats.averageTime / 1e3)}s`,
          suggestion
        });
      }
    }
    return bottlenecks.sort((a2, b2) => b2.averageTime - a2.averageTime);
  }
  determineCriticalPath(operationBreakdown) {
    const operations = Array.from(operationBreakdown.values()).sort((a2, b2) => b2.averageTime * b2.count - a2.averageTime * a2.count).slice(0, 5).map((op) => op.operation);
    return operations;
  }
  detectMemoryLeaks() {
    const leaks = [];
    if (this.memorySnapshots.length < 10) {
      return leaks;
    }
    const recentSnapshots = this.memorySnapshots.slice(-10);
    const growthValues = [];
    for (let i2 = 1; i2 < recentSnapshots.length; i2++) {
      const growth = recentSnapshots[i2].heapUsed - recentSnapshots[i2 - 1].heapUsed;
      growthValues.push(growth);
    }
    const averageGrowth = growthValues.reduce((sum, growth) => sum + growth, 0) / growthValues.length;
    recentSnapshots[recentSnapshots.length - 1].heapUsed - recentSnapshots[0].heapUsed;
    if (averageGrowth > 1024 * 1024) {
      leaks.push({
        suspected: true,
        confidence: Math.min(averageGrowth / (5 * 1024 * 1024), 1),
        // Confidence based on growth rate
        description: "Consistent memory growth detected",
        growthPattern: "linear"
      });
    }
    return leaks;
  }
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil(percentile / 100 * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))] || 0;
  }
  getRecentTimings(timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.operationTimings.filter((t2) => t2.startTime >= cutoff);
  }
  classifyError(error) {
    const errorLower = error.toLowerCase();
    if (errorLower.includes("timeout")) return "timeout";
    if (errorLower.includes("network")) return "network";
    if (errorLower.includes("permission")) return "permission";
    if (errorLower.includes("not found")) return "not_found";
    if (errorLower.includes("memory")) return "memory";
    return "unknown";
  }
  isErrorType(key) {
    const errorTypes = ["timeout", "network", "permission", "not_found", "memory", "unknown"];
    return errorTypes.includes(key);
  }
  createEmptyTiming(operation, operationId) {
    return {
      operation,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      success: false,
      metadata: { error: "No start time found", operationId }
    };
  }
  // ============================================================================
  // Export Methods
  // ============================================================================
  async exportAsJSON(report, filename) {
    const data = JSON.stringify(report, null, 2);
    if (typeof window !== "undefined") {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = `${filename}.json`;
      a2.click();
      URL.revokeObjectURL(url);
    }
    return data;
  }
  async exportAsCSV(report, filename) {
    const rows = [];
    rows.push("Category,Metric,Value,Unit");
    rows.push(`Summary,Session ID,${report.summary.sessionId},`);
    rows.push(`Summary,Total Duration,${report.summary.totalDuration},ms`);
    rows.push(`Summary,Total Patients,${report.summary.totalPatients},count`);
    rows.push(`Summary,Success Rate,${report.summary.successRate},percentage`);
    rows.push(`Summary,Avg Time Per Patient,${report.summary.averageTimePerPatient},ms`);
    for (const [operation, stats] of report.timingAnalysis.operationBreakdown) {
      rows.push(`Timing,${operation} Count,${stats.count},count`);
      rows.push(`Timing,${operation} Avg Time,${stats.averageTime},ms`);
      rows.push(`Timing,${operation} Success Rate,${stats.successRate},percentage`);
    }
    rows.push(`Memory,Peak Usage,${report.memoryAnalysis.peakUsage},MB`);
    rows.push(`Memory,Average Usage,${report.memoryAnalysis.averageUsage},MB`);
    rows.push(`Memory,Growth Rate,${report.memoryAnalysis.growthRate},MB/min`);
    const csvData = rows.join("\n");
    if (typeof window !== "undefined") {
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = `${filename}.csv`;
      a2.click();
      URL.revokeObjectURL(url);
    }
    return csvData;
  }
  // ============================================================================
  // Memory Monitoring
  // ============================================================================
  startMemoryMonitoring() {
    if (this.config.enableMemoryTracking) {
      this.memoryMonitorInterval = setInterval(() => {
        this.takeMemorySnapshot();
      }, this.config.sampleInterval);
    }
  }
  stopMemoryMonitoring() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = void 0;
    }
  }
  // ============================================================================
  // Configuration
  // ============================================================================
  initializeMetrics() {
    return {
      sessionId: "",
      batchStartTime: 0,
      patientActivationTimes: [],
      dataExtractionTimes: [],
      aiReviewTimes: [],
      contentScriptResponseTimes: [],
      totalProcessingTime: 0,
      retryCount: /* @__PURE__ */ new Map(),
      errorFrequency: /* @__PURE__ */ new Map(),
      memoryUsageHistory: [],
      operationTimings: []
    };
  }
  getDefaultConfig() {
    return {
      enableDetailedTiming: true,
      enableMemoryTracking: true,
      enablePerformanceMarks: true,
      sampleInterval: 5e3,
      // 5 seconds
      retentionPeriod: 36e5,
      // 1 hour
      exportFormat: "json",
      autoExport: false
    };
  }
  log(...args) {
    if (this.debugMode) {
      console.log("[MetricsCollector]", ...args);
    }
  }
  // ============================================================================
  // Public Configuration Methods
  // ============================================================================
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  updateConfig(config) {
    Object.assign(this.config, config);
    if (config.sampleInterval !== void 0 || config.enableMemoryTracking !== void 0) {
      this.stopMemoryMonitoring();
      this.startMemoryMonitoring();
    }
  }
  getConfig() {
    return { ...this.config };
  }
  getMetrics() {
    return { ...this.metrics };
  }
  clearMetrics() {
    this.metrics = this.initializeMetrics();
    this.memorySnapshots = [];
    this.activeOperations.clear();
  }
  cleanup() {
    this.stopMemoryMonitoring();
    this.clearMetrics();
  }
};
__publicField(_MetricsCollector, "instance");
let MetricsCollector = _MetricsCollector;
class BatchAIReviewOrchestrator {
  constructor(config = {}) {
    __publicField(this, "ausMedicalReviewAgent");
    __publicField(this, "dynamicWait");
    __publicField(this, "dataValidation");
    __publicField(this, "errorRecovery");
    __publicField(this, "cacheManager");
    __publicField(this, "checkpointManager");
    __publicField(this, "metricsCollector");
    __publicField(this, "isProcessing", false);
    __publicField(this, "abortController", null);
    __publicField(this, "currentBatchId", null);
    __publicField(this, "config");
    __publicField(this, "currentProcessingContext", null);
    this.ausMedicalReviewAgent = new AusMedicalReviewAgent();
    this.dynamicWait = DynamicWaitUtils.getInstance();
    this.dataValidation = DataValidation.getInstance();
    this.errorRecovery = ErrorRecoveryManager.getInstance();
    this.cacheManager = CacheManager.getInstance();
    this.checkpointManager = CheckpointManager.getInstance();
    this.metricsCollector = MetricsCollector.getInstance();
    this.config = this.getDefaultConfig();
    this.updateConfig(config);
    this.log("🚀 Enhanced Batch AI Review Orchestrator initialized");
  }
  /**
   * Process a batch of patients with advanced capabilities
   */
  async processBatch(input, onProgress) {
    if (this.isProcessing) {
      throw new Error("Batch processing already in progress");
    }
    this.isProcessing = true;
    this.abortController = new AbortController();
    this.currentBatchId = this.generateBatchId(input);
    const startTime = Date.now();
    const patientResults = [];
    const errors = [];
    this.log(`🔄 Starting enhanced batch AI review for ${input.selectedPatients.length} patients`);
    if (this.config.enableMetrics) {
      this.metricsCollector.startSession(this.currentBatchId);
    }
    if (this.config.enableCaching) {
      await this.cacheManager.warmup(input.selectedPatients);
    }
    try {
      const resumeOption = await this.checkForResumableCheckpoint(this.currentBatchId);
      let startIndex = 0;
      if (resumeOption) {
        const shouldResume = await this.handleResumeOption(resumeOption, onProgress);
        if (shouldResume) {
          patientResults.push(...resumeOption.completedPatients);
          startIndex = resumeOption.currentPatientIndex;
          this.log(`📂 Resuming from checkpoint at patient ${startIndex}`);
        }
      }
      const patientsToProcess = input.selectedPatients.slice(startIndex);
      if (this.config.parallelProcessing && patientsToProcess.length > 1) {
        this.log(`🚀 Using PARALLEL processing for ${patientsToProcess.length} patients (max ${this.config.maxConcurrentOperations} concurrent)`);
        const parallelResults = await this.processPatientsBatchParallel(
          patientsToProcess,
          startIndex,
          onProgress,
          startTime
        );
        patientResults.push(...parallelResults.results);
        errors.push(...parallelResults.errors);
      } else {
        this.log(`🔄 Using SEQUENTIAL processing for ${patientsToProcess.length} patients`);
        for (let i2 = 0; i2 < patientsToProcess.length; i2++) {
          const patient = patientsToProcess[i2];
          const globalIndex = startIndex + i2;
          if (this.abortController?.signal.aborted) {
            this.log("🛑 Batch processing was cancelled by user");
            throw new Error("Batch processing was cancelled");
          }
          await this.validateAppointmentBookState(patient, globalIndex);
          const progress = this.createEnhancedProgress(
            globalIndex,
            input.selectedPatients.length,
            patient,
            patientResults,
            errors,
            startTime
          );
          onProgress?.(progress);
          try {
            this.log(`🧭 Processing patient ${globalIndex + 1}/${input.selectedPatients.length}: ${patient.name}`);
            const result = await this.processIndividualPatientEnhanced(
              patient,
              globalIndex,
              (phase, subPhase) => {
                progress.phase = phase;
                progress.subPhase = subPhase;
                onProgress?.(progress);
              }
            );
            patientResults.push(result);
            this.log(`✅ Completed patient ${globalIndex + 1}: ${patient.name}`);
            if (this.config.enableCheckpoints && (globalIndex + 1) % this.config.checkpointInterval === 0) {
              await this.saveProgressCheckpoint(
                input,
                patientResults,
                globalIndex + 1,
                errors,
                startTime
              );
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            this.log(`❌ Failed to process patient ${patient.name}:`, errorMessage);
            if (this.config.enableMetrics) {
              this.metricsCollector.recordError("patient-processing", errorMessage, globalIndex);
            }
            patientResults.push({
              patient,
              reviewReport: null,
              extractedData: { background: "", investigations: "", medications: "" },
              processingTime: 0,
              success: false,
              error: errorMessage
            });
            errors.push(`${patient.name}: ${errorMessage}`);
            const errorRate = errors.length / (globalIndex + 1);
            if (errorRate > 0.5 && errors.length > 3) {
              this.log(`🚨 High error rate detected (${Math.round(errorRate * 100)}%), stopping batch`);
              throw new Error(`Batch stopped due to high error rate: ${Math.round(errorRate * 100)}%`);
            }
          }
        }
      }
      const finalProgress = this.createEnhancedProgress(
        input.selectedPatients.length,
        input.selectedPatients.length,
        null,
        patientResults,
        errors,
        startTime
      );
      finalProgress.phase = "completed";
      onProgress?.(finalProgress);
      const batchReport = await this.generateEnhancedBatchReport(
        input,
        patientResults,
        startTime,
        Date.now()
      );
      this.log(`🎉 Batch processing completed: ${patientResults.filter((r2) => r2.success).length}/${input.selectedPatients.length} successful`);
      return batchReport;
    } catch (error) {
      this.log("❌ Batch processing failed:", error);
      const errorProgress = this.createEnhancedProgress(
        0,
        input.selectedPatients.length,
        null,
        patientResults,
        [...errors, error instanceof Error ? error.message : "Unknown error"],
        startTime
      );
      errorProgress.phase = "error";
      onProgress?.(errorProgress);
      throw error;
    } finally {
      await this.finalizeProcessing();
    }
  }
  /**
   * Resume processing from a specific checkpoint
   */
  async resumeFromCheckpoint(checkpointId, onProgress) {
    this.log(`🔄 Resuming batch processing from checkpoint: ${checkpointId}`);
    const { checkpoint, resumeStrategy, warnings } = await this.checkpointManager.resumeFromCheckpoint(checkpointId);
    for (const warning of warnings) {
      this.log(`⚠️ Resume warning: ${warning}`);
    }
    const input = {
      selectedPatients: [],
      // Would need to reconstruct from checkpoint data
      appointmentDate: (/* @__PURE__ */ new Date()).toISOString(),
      calendarUrl: checkpoint.resumeData.environmentState?.currentUrl || ""
    };
    return this.processBatch(input, onProgress);
  }
  /**
   * Cancel ongoing batch processing
   */
  cancelProcessing() {
    if (this.abortController) {
      this.abortController.abort();
      this.log("🛑 Batch processing cancelled by user");
    }
  }
  /**
   * Check if batch processing is currently running
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }
  /**
   * Get current processing statistics
   */
  getProcessingStats() {
    return {
      isProcessing: this.isProcessing,
      currentBatchId: this.currentBatchId,
      performanceIndicators: this.config.enableMetrics ? this.metricsCollector.getPerformanceIndicators() : null,
      cacheStats: this.config.enableCaching ? this.cacheManager.getStats() : null,
      errorStats: this.errorRecovery.getFailureStats()
    };
  }
  // ============================================================================
  // Parallel Patient Processing
  // ============================================================================
  /**
   * Process patients in parallel using two-phase approach:
   * Phase 1: Collect all patient data rapidly
   * Phase 2: Process AI reviews in parallel
   */
  async processPatientsBatchParallel(patients, startIndex, onProgress, batchStartTime) {
    const results = [];
    const errors = [];
    this.log(`🚀 Starting parallel batch processing for ${patients.length} patients`);
    this.log(`📊 PHASE 1: Collecting data from all ${patients.length} patients...`);
    const extractedDataBatch = [];
    for (let i2 = 0; i2 < patients.length; i2++) {
      const patient = patients[i2];
      const globalIndex = startIndex + i2;
      if (this.abortController?.signal.aborted) {
        throw new Error("Batch processing was cancelled");
      }
      onProgress?.({
        currentPatientIndex: globalIndex,
        totalPatients: patients.length,
        currentPatient: patient,
        phase: "extracting",
        subPhase: `collecting-data-${i2 + 1}/${patients.length}`,
        completedPatients: [],
        errors: [],
        percentComplete: i2 / patients.length * 50,
        // First 50% for data collection
        estimatedTimeRemaining: 0,
        currentOperationDetails: `Collecting data from ${patient.name}`,
        performanceIndicators: {
          averageTimePerPatient: 0,
          successRate: 1,
          currentSpeed: "normal",
          errorRate: 0,
          memoryUsage: 0
        }
      });
      try {
        await this.validateAppointmentBookState(patient, globalIndex);
        const tabId = await this.getCurrentTabId();
        const extractedData = await this.extractPatientDataEnhanced(tabId, patient);
        extractedDataBatch.push({
          patient,
          extractedData,
          patientIndex: globalIndex,
          success: true
        });
        this.log(`✅ Phase 1: Collected data for ${patient.name} (${i2 + 1}/${patients.length})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.log(`❌ Phase 1: Failed to collect data for ${patient.name}: ${errorMessage}`);
        extractedDataBatch.push({
          patient,
          extractedData: { background: "", investigations: "", medications: "", extractionTimestamp: Date.now(), extractionAttempts: 1, qualityScore: 0 },
          patientIndex: globalIndex,
          success: false,
          error: errorMessage
        });
        errors.push(`${patient.name}: ${errorMessage}`);
      }
    }
    this.log(`📊 PHASE 1 COMPLETE: Collected data from ${extractedDataBatch.length} patients`);
    this.log(`🤖 PHASE 2: Processing AI reviews in parallel (max ${this.config.maxConcurrentOperations} concurrent)...`);
    const successfulExtractions = extractedDataBatch.filter((item) => item.success);
    const chunks = this.chunkArray(successfulExtractions, this.config.maxConcurrentOperations);
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item, chunkIndex) => {
        try {
          const progressPercent = 50 + results.length / patients.length * 50;
          onProgress?.({
            currentPatientIndex: item.patientIndex,
            totalPatients: patients.length,
            currentPatient: item.patient,
            phase: "reviewing",
            subPhase: `ai-processing-parallel`,
            completedPatients: results,
            errors: [],
            percentComplete: progressPercent,
            estimatedTimeRemaining: 0,
            currentOperationDetails: `AI review: ${item.patient.name} (parallel)`,
            performanceIndicators: {
              averageTimePerPatient: 0,
              successRate: 1,
              currentSpeed: "normal",
              errorRate: 0,
              memoryUsage: 0
            }
          });
          this.log(`🤖 Processing AI review for ${item.patient.name} (parallel batch)`);
          const reviewReport = await this.performAIReviewWithCaching(item.extractedData, item.patient);
          const result = {
            patient: item.patient,
            reviewReport,
            extractedData: item.extractedData,
            processingTime: 0,
            // Will be calculated later
            success: true
          };
          this.log(`✅ Completed AI review for ${item.patient.name}`);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          this.log(`❌ AI review failed for ${item.patient.name}: ${errorMessage}`);
          const failedResult = {
            patient: item.patient,
            reviewReport: null,
            extractedData: item.extractedData,
            processingTime: 0,
            success: false,
            error: errorMessage
          };
          errors.push(`${item.patient.name}: ${errorMessage}`);
          return failedResult;
        }
      });
      const chunkResults = await Promise.allSettled(chunkPromises);
      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
      this.log(`✅ Completed AI processing chunk: ${results.filter((r2) => r2.success).length}/${results.length} successful`);
    }
    for (const failedItem of extractedDataBatch.filter((item) => !item.success)) {
      results.push({
        patient: failedItem.patient,
        reviewReport: null,
        extractedData: failedItem.extractedData,
        processingTime: 0,
        success: false,
        error: failedItem.error
      });
    }
    this.log(`🎉 PARALLEL PROCESSING COMPLETE: ${results.filter((r2) => r2.success).length}/${results.length} patients successful`);
    return { results, errors };
  }
  /**
   * Split array into chunks for parallel processing
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i2 = 0; i2 < array.length; i2 += chunkSize) {
      chunks.push(array.slice(i2, i2 + chunkSize));
    }
    return chunks;
  }
  // ============================================================================
  // Enhanced Patient Processing
  // ============================================================================
  async processIndividualPatientEnhanced(patient, patientIndex, onPhaseChange) {
    const processingStartTime = Date.now();
    this.currentProcessingContext = { patient };
    const operationContext = {
      operation: "process-patient",
      patientIndex,
      patient,
      timestamp: processingStartTime,
      environmentState: await this.getCurrentEnvironmentState(),
      previousAttempts: 0
    };
    try {
      const metricsId = `patient-${patientIndex}`;
      if (this.config.enableMetrics) {
        this.metricsCollector.startOperation(metricsId, "patient-processing", patientIndex);
      }
      onPhaseChange?.("navigating", "activating-patient");
      this.log(`🖱️ Activating patient ${patientIndex}: ${patient.name} (${patient.fileNumber})`);
      await this.errorRecovery.executeWithRecovery(
        () => this.activatePatientWithIntelligentWaiting(patientIndex),
        { ...operationContext, operation: "patient-activation" }
      );
      onPhaseChange?.("waiting-for-load", "patient-data-loading");
      const tabId = await this.getCurrentTabId();
      const waitResult = await this.dynamicWait.waitForPatientDataLoad(tabId, patient.name);
      if (!waitResult.success) {
        throw new Error(`Patient data failed to load: ${waitResult.error}`);
      }
      onPhaseChange?.("extracting", "clinical-data-extraction");
      this.log(`📋 Extracting clinical data for: ${patient.name}`);
      const extractedData = await this.errorRecovery.executeWithRecovery(
        () => this.extractPatientDataEnhanced(tabId, patient),
        { ...operationContext, operation: "data-extraction" }
      );
      onPhaseChange?.("reviewing", "ai-medical-review");
      if (extractedData.dataCompleteness && !extractedData.dataCompleteness.hasRealData) {
        this.log(`🤖 Running AI review for ${patient.name} (incomplete data - ${extractedData.dataCompleteness.emptyFieldCount}/${extractedData.dataCompleteness.totalFields} fields empty)`);
      } else {
        this.log(`🤖 Running AI review for: ${patient.name}`);
      }
      const reviewReport = await this.errorRecovery.executeWithRecovery(
        () => this.performAIReviewWithCaching(extractedData, patient),
        { ...operationContext, operation: "ai-review" }
      );
      const processingTime = Date.now() - processingStartTime;
      if (this.config.enableMetrics) {
        this.metricsCollector.endOperation(
          metricsId,
          "patient-processing",
          true,
          patientIndex,
          { processingTime, dataQuality: extractedData.qualityScore }
        );
      }
      return {
        patient,
        reviewReport,
        extractedData,
        processingTime,
        success: true
      };
    } catch (error) {
      const processingTime = Date.now() - processingStartTime;
      this.log(`❌ Failed to process patient ${patient.name}:`, error);
      if (this.config.enableMetrics) {
        this.metricsCollector.endOperation(
          `patient-${patientIndex}`,
          "patient-processing",
          false,
          patientIndex,
          { processingTime, error: error instanceof Error ? error.message : String(error) }
        );
      }
      throw error;
    } finally {
      this.currentProcessingContext = null;
    }
  }
  async activatePatientWithIntelligentWaiting(patientIndex) {
    const tabId = await this.getCurrentTabId();
    const context = this.getCurrentProcessingContext();
    if (!context?.patient) {
      throw new Error("No patient context available for activation");
    }
    const patient = context.patient;
    try {
      this.log(`👆 SPA Workflow: Starting patient processing for ${patient.name} (${patient.fileNumber})`);
      this.log(`👆 Step 1: Double-clicking patient ${patient.name}`);
      const doubleClickResponse = await this.sendMessageWithTimeout(tabId, {
        type: "EXECUTE_ACTION",
        action: "double-click-patient",
        data: {
          patientName: patient.name,
          patientId: patient.fileNumber
        }
      }, 1e4);
      if (!doubleClickResponse?.success) {
        throw new Error(`Double-click patient failed: ${doubleClickResponse?.error || "Unknown error"}`);
      }
      this.log(`🏥 Step 2: Navigating to Patient Record view`);
      const patientRecordResponse = await this.sendMessageWithTimeout(tabId, {
        type: "EXECUTE_ACTION",
        action: "navigate-to-patient-record",
        data: {}
      }, 15e3);
      if (!patientRecordResponse?.success) {
        throw new Error(`Navigate to patient record failed: ${patientRecordResponse?.error || "Unknown error"}`);
      }
      await this.waitForPatientDataReady(tabId, patient.name);
      this.log(`✅ SPA Workflow: Patient ${patient.name} activated and Patient Record view ready`);
    } catch (error) {
      this.log(`❌ SPA Workflow activation failed:`, error);
      throw new Error(`SPA patient activation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  getCurrentProcessingContext() {
    return this.currentProcessingContext || null;
  }
  async waitForPatientDataReady(tabId, patientName) {
    const maxAttempts = 30;
    const delay = 500;
    this.log(`⏳ Waiting for patient data to load for: ${patientName}`);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.sendMessageWithTimeout(tabId, {
          type: "CHECK_XESTRO_BOXES"
        }, 3e3);
        if (response?.found && response.count > 0) {
          this.log(`✅ Patient data ready after ${(attempt + 1) * delay}ms (${response.count} XestroBoxes found)`);
          await this.sleep(1e3);
          return;
        }
        if (attempt % 5 === 0) {
          this.log(`⏳ Still waiting for patient data... (attempt ${attempt + 1}/${maxAttempts}, ${response?.count || 0} XestroBoxes)`);
        }
        await this.sleep(delay);
      } catch (error) {
        this.log(`❌ Error checking patient data readiness (attempt ${attempt + 1}):`, error);
        if (error instanceof Error && error.message.includes("message channel")) {
          this.log(`🔧 Message channel error detected, waiting longer before retry...`);
          await this.sleep(delay * 2);
        } else {
          await this.sleep(delay);
        }
        if (attempt === maxAttempts - 1) {
          throw new Error(`Patient data failed to load after ${maxAttempts * delay}ms: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }
    throw new Error(`Patient data did not load within ${maxAttempts * delay}ms for patient: ${patientName}`);
  }
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async sendMessageWithTimeout(tabId, message, timeoutMs = 5e3) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(`Message failed: ${chrome.runtime.lastError.message}`));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  async extractPatientDataEnhanced(tabId, patient) {
    if (this.config.enableCaching) {
      const cacheKey = { patientId: patient.fileNumber, dataType: "extracted_data" };
      const cachedResult = await this.cacheManager.get(cacheKey);
      if (cachedResult.hit && cachedResult.data) {
        this.log(`💾 Using cached data for patient: ${patient.name}`);
        await this.navigateBackToAppointmentBook(tabId);
        return cachedResult.data;
      }
    }
    try {
      this.log(`📋 Step 3: Extracting patient fields for ${patient.name}`);
      const extractResponse = await this.sendMessageWithTimeout(tabId, {
        type: "EXECUTE_ACTION",
        action: "extract-patient-fields",
        data: {}
      }, 3e4);
      if (!extractResponse?.success || !extractResponse?.data) {
        throw new Error(`Patient fields extraction failed: ${extractResponse?.error || "No data returned"}`);
      }
      const extractionData = extractResponse.data;
      const hasAnyData = extractionData.hasAnyData;
      this.log(`📊 Data completeness check for ${patient.name}:`, {
        hasAnyData,
        backgroundLength: extractionData.background?.length || 0,
        investigationsLength: extractionData.investigations?.length || 0,
        medicationsLength: extractionData.medications?.length || 0
      });
      const processedBackground = extractionData.background?.trim() ? extractionData.background : "No data available in Background section";
      const processedInvestigations = extractionData.investigations?.trim() ? extractionData.investigations : "No data available in Investigations section";
      const processedMedications = extractionData.medications?.trim() ? extractionData.medications : "No data available in Medications section";
      this.log(`📝 Processed field data for ${patient.name}:`, {
        backgroundMarked: !extractionData.background?.trim(),
        investigationsMarked: !extractionData.investigations?.trim(),
        medicationsMarked: !extractionData.medications?.trim(),
        hasAnyRealData: hasAnyData
      });
      const extractedData = {
        background: processedBackground,
        investigations: processedInvestigations,
        medications: processedMedications,
        extractionTimestamp: extractionData.extractionTimestamp || Date.now(),
        extractionAttempts: 1,
        qualityScore: this.calculateDataQuality(extractionData),
        dataCompleteness: {
          hasRealData: hasAnyData,
          emptyFieldCount: [
            !extractionData.background?.trim(),
            !extractionData.investigations?.trim(),
            !extractionData.medications?.trim()
          ].filter(Boolean).length,
          totalFields: 3
        }
      };
      await this.navigateBackToAppointmentBook(tabId);
      if (this.config.enableCaching) {
        const cacheKey = { patientId: patient.fileNumber, dataType: "extracted_data" };
        const quality = this.dataValidation.assessDataQuality(extractedData);
        await this.cacheManager.set(cacheKey, extractedData, quality);
      }
      this.log(`✅ SPA Workflow: Patient ${patient.name} data extraction completed and returned to appointment book`);
      return extractedData;
    } catch (error) {
      this.log(`❌ SPA Workflow extraction failed:`, error);
      try {
        await this.navigateBackToAppointmentBook(tabId);
      } catch (navError) {
        this.log(`❌ Failed to navigate back to appointment book:`, navError);
      }
      throw new Error(`SPA data extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Navigate back to Appointment Book for SPA workflow
   */
  async navigateBackToAppointmentBook(tabId) {
    this.log(`📅 Step 4: Navigating back to Appointment Book`);
    const appointmentBookResponse = await this.sendMessageWithTimeout(tabId, {
      type: "EXECUTE_ACTION",
      action: "navigate-to-appointment-book",
      data: {}
    }, 15e3);
    if (!appointmentBookResponse?.success) {
      throw new Error(`Navigate to appointment book failed: ${appointmentBookResponse?.error || "Unknown error"}`);
    }
  }
  /**
   * Calculate data quality score for extracted data
   */
  calculateDataQuality(data) {
    let score = 0;
    let totalFields = 0;
    const fields = ["background", "investigations", "medications"];
    fields.forEach((field) => {
      totalFields++;
      const content = data[field] || "";
      if (content.trim().length > 0) {
        score += 1;
        if (content.trim().length > 50) {
          score += 0.5;
        }
      }
    });
    return Math.min(score / (totalFields * 1.5), 1);
  }
  async performAIReviewWithCaching(extractedData, patient) {
    if (this.config.enableCaching) {
      const cacheKey = { patientId: patient.fileNumber, dataType: "ai_review" };
      const cachedResult = await this.cacheManager.get(cacheKey);
      if (cachedResult.hit && cachedResult.data) {
        const dataChanged = await this.cacheManager.hasChanged(
          { patientId: patient.fileNumber, dataType: "extracted_data" },
          extractedData
        );
        if (!dataChanged) {
          this.log(`💾 Using cached AI review for patient: ${patient.name}`);
          return cachedResult.data;
        }
      }
    }
    const reviewInput = this.formatReviewInput(extractedData, patient);
    const reviewReport = await this.ausMedicalReviewAgent.process(reviewInput);
    if (this.config.enableCaching) {
      const cacheKey = { patientId: patient.fileNumber, dataType: "ai_review" };
      await this.cacheManager.set(cacheKey, reviewReport);
    }
    return reviewReport;
  }
  // ============================================================================
  // Enhanced Progress and Reporting
  // ============================================================================
  createEnhancedProgress(currentIndex, totalPatients, currentPatient, completedPatients, errors, startTime) {
    const now = Date.now();
    const elapsedTime = now - startTime;
    const successfulPatients = completedPatients.filter((p2) => p2.success).length;
    const averageTimePerPatient = currentIndex > 0 ? elapsedTime / currentIndex : 0;
    const remainingPatients = totalPatients - currentIndex;
    const estimatedTimeRemaining = remainingPatients * averageTimePerPatient;
    const percentComplete = totalPatients > 0 ? currentIndex / totalPatients * 100 : 0;
    const performanceIndicators = this.config.enableMetrics ? this.metricsCollector.getPerformanceIndicators() : {
      averageTimePerPatient,
      successRate: currentIndex > 0 ? successfulPatients / currentIndex : 1,
      currentSpeed: "normal",
      errorRate: currentIndex > 0 ? errors.length / currentIndex : 0,
      memoryUsage: 0
    };
    return {
      currentPatientIndex: currentIndex,
      totalPatients,
      currentPatient,
      phase: "navigating",
      // Will be updated by caller
      completedPatients,
      errors,
      percentComplete,
      estimatedTimeRemaining,
      currentOperationDetails: currentPatient ? `Processing ${currentPatient.name} (${currentPatient.fileNumber})` : "Initializing...",
      performanceIndicators
    };
  }
  async generateEnhancedBatchReport(input, patientResults, startTime, endTime) {
    const successfulReviews = patientResults.filter((r2) => r2.success);
    const failedReviews = patientResults.filter((r2) => !r2.success);
    let metricsReport = null;
    if (this.config.enableMetrics) {
      metricsReport = this.metricsCollector.endSession();
    }
    let totalFindings = 0;
    let immediateFindings = 0;
    let medicationSafetyIssues = 0;
    const commonFindings = [];
    successfulReviews.forEach((result) => {
      if (result.reviewReport?.reviewData) {
        const reviewData = result.reviewReport.reviewData;
        totalFindings += reviewData.findings?.length || 0;
        immediateFindings += reviewData.findings?.filter((f2) => f2.urgency === "Immediate").length || 0;
        medicationSafetyIssues += reviewData.medicationSafetyIssues || 0;
        reviewData.findings?.forEach((finding) => {
          if (finding.finding && !commonFindings.includes(finding.finding)) {
            commonFindings.push(finding.finding);
          }
        });
      }
    });
    const batchReport = {
      id: `batch-${Date.now()}`,
      agentName: "Enhanced Batch AI Review Orchestrator v3.0",
      content: `Enhanced batch AI medical review completed for ${input.selectedPatients.length} patients on ${input.appointmentDate}`,
      sections: [],
      // Will be populated with individual patient sections
      metadata: {
        confidence: successfulReviews.length / input.selectedPatients.length,
        processingTime: endTime - startTime,
        modelUsed: "AusMedicalReviewAgent",
        enhancedFeatures: {
          intelligentWaiting: true,
          dataValidation: true,
          errorRecovery: true,
          caching: this.config.enableCaching,
          checkpointing: this.config.enableCheckpoints,
          metrics: this.config.enableMetrics
        }
      },
      timestamp: endTime,
      warnings: failedReviews.map((r2) => `Failed to process ${r2.patient.name}: ${r2.error}`),
      errors: failedReviews.map((r2) => r2.error || "Unknown error"),
      batchData: {
        appointmentDate: input.appointmentDate,
        totalPatients: input.selectedPatients.length,
        successfulReviews: successfulReviews.length,
        failedReviews: failedReviews.length,
        processingStartTime: startTime,
        processingEndTime: endTime,
        patientResults,
        summary: {
          totalFindings,
          immediateFindings,
          medicationSafetyIssues,
          commonFindings: commonFindings.slice(0, 10)
          // Top 10 common findings
        },
        enhancedMetrics: metricsReport
      }
    };
    return batchReport;
  }
  // ============================================================================
  // Checkpoint Management
  // ============================================================================
  async checkForResumableCheckpoint(batchId) {
    if (!this.config.enableCheckpoints) return null;
    try {
      const checkpoints = await this.checkpointManager.listCheckpoints(batchId);
      if (checkpoints.length > 0) {
        const latest = checkpoints[0];
        this.log(`📂 Found resumable checkpoint: ${latest.id}`);
        return await this.checkpointManager.loadCheckpoint(latest.id);
      }
    } catch (error) {
      this.log(`❌ Error checking for resumable checkpoint:`, error);
    }
    return null;
  }
  async handleResumeOption(checkpoint, onProgress) {
    this.log(`🔄 Auto-resuming from checkpoint with ${checkpoint.completedPatients.length} completed patients`);
    return true;
  }
  async saveProgressCheckpoint(input, completedPatients, currentIndex, errors, startTime) {
    if (!this.config.enableCheckpoints || !this.currentBatchId) return;
    try {
      const environmentState = await this.getCurrentEnvironmentState();
      const performanceMetrics = this.config.enableMetrics ? this.metricsCollector.getMetrics() : this.createEmptyMetrics();
      const checkpointId = await this.checkpointManager.saveCheckpoint(
        this.currentBatchId,
        input,
        completedPatients,
        currentIndex,
        [],
        // Failed attempts would be tracked separately
        this.getBatchConfiguration(),
        performanceMetrics,
        environmentState
      );
      this.log(`💾 Saved checkpoint: ${checkpointId} (${completedPatients.length} patients completed)`);
    } catch (error) {
      this.log(`❌ Failed to save checkpoint:`, error);
    }
  }
  // ============================================================================
  // Helper Methods
  // ============================================================================
  async getCurrentTabId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error("No active tab found");
    }
    return tabs[0].id;
  }
  async getCurrentEnvironmentState() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return {
      tabId: tabs[0]?.id || 0,
      currentUrl: tabs[0]?.url || "",
      contentScriptVersion: "2.6.0",
      // Would get from content script
      lastHealthCheck: Date.now()
    };
  }
  formatReviewInput(extractedData, patient) {
    let completenessNote = "";
    if (extractedData.dataCompleteness) {
      const { hasRealData, emptyFieldCount, totalFields } = extractedData.dataCompleteness;
      if (!hasRealData) {
        completenessNote = `

DATA COMPLETENESS ALERT: This patient record has ${emptyFieldCount}/${totalFields} empty clinical sections. Please assess if missing data represents a clinical oversight or if additional data collection is needed.`;
      } else if (emptyFieldCount > 0) {
        completenessNote = `

DATA COMPLETENESS NOTE: ${emptyFieldCount}/${totalFields} clinical sections are incomplete. Consider if missing information is clinically significant.`;
      }
    }
    return `Patient: ${patient.name} (DOB: ${patient.dob}, File: ${patient.fileNumber})

Background: ${extractedData.background}

Investigations: ${extractedData.investigations}

Medications: ${extractedData.medications}${completenessNote}`;
  }
  generateBatchId(input) {
    return `batch-${input.appointmentDate}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  getBatchConfiguration() {
    return {
      maxRetries: this.config.retryAttempts,
      timeoutMs: this.config.timeoutMs,
      parallelProcessing: this.config.parallelProcessing,
      cacheEnabled: this.config.enableCaching,
      diagnosticsEnabled: this.config.enableAdvancedDiagnostics,
      checkpointInterval: this.config.checkpointInterval,
      errorRecoveryStrategy: "conservative"
    };
  }
  createEmptyMetrics() {
    return {
      sessionId: this.currentBatchId || "",
      batchStartTime: Date.now(),
      patientActivationTimes: [],
      dataExtractionTimes: [],
      aiReviewTimes: [],
      contentScriptResponseTimes: [],
      totalProcessingTime: 0,
      retryCount: /* @__PURE__ */ new Map(),
      errorFrequency: /* @__PURE__ */ new Map(),
      memoryUsageHistory: [],
      operationTimings: []
    };
  }
  async finalizeProcessing() {
    this.isProcessing = false;
    this.abortController = null;
    this.currentBatchId = null;
    if (this.config.enableCaching) {
      await this.cacheManager.applyInvalidationRules();
    }
    this.log("🏁 Batch processing finalized");
  }
  // ============================================================================
  // Configuration Management
  // ============================================================================
  getDefaultConfig() {
    return {
      enableCheckpoints: true,
      checkpointInterval: 5,
      // Every 5 patients
      enableCaching: true,
      enableMetrics: true,
      enableAdvancedDiagnostics: false,
      parallelProcessing: true,
      // Enable parallel processing for improved performance
      maxConcurrentOperations: 3,
      // Process up to 3 AI reviews concurrently
      timeoutMs: 3e5,
      // 5 minutes
      retryAttempts: 3
    };
  }
  updateConfig(config) {
    Object.assign(this.config, config);
    this.dynamicWait.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.dataValidation.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.errorRecovery.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.cacheManager.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.checkpointManager.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.metricsCollector.setDebugMode(config.enableAdvancedDiagnostics || false);
  }
  getConfig() {
    return { ...this.config };
  }
  /**
   * Validate that we're in the correct appointment book state before processing each patient
   */
  async validateAppointmentBookState(expectedPatient, patientIndex) {
    const tabId = await this.getCurrentTabId();
    this.log(`🔍 Validating appointment book state for patient ${patientIndex}: ${expectedPatient.name}`);
    try {
      const currentPatientsResponse = await this.sendMessageWithTimeout(tabId, {
        type: "EXECUTE_ACTION",
        action: "extract-calendar-patients",
        data: {}
      }, 1e4);
      if (!currentPatientsResponse?.success || !currentPatientsResponse?.data?.patients) {
        this.log(`⚠️ WARNING: Could not validate current patient list`);
        return;
      }
      const currentPatients = currentPatientsResponse.data.patients;
      this.log(`🔍 Current appointment book has ${currentPatients.length} patients`);
      this.log(`🔍 Current patient list:`, currentPatients.map((p2, index) => ({
        index,
        name: p2.name,
        fileNumber: p2.fileNumber,
        dob: p2.dob
      })));
      if (patientIndex < currentPatients.length) {
        const currentPatientAtIndex = currentPatients[patientIndex];
        this.log(`🔍 Expected patient at index ${patientIndex}:`, {
          name: expectedPatient.name,
          fileNumber: expectedPatient.fileNumber,
          dob: expectedPatient.dob
        });
        this.log(`🔍 Actual patient at index ${patientIndex}:`, {
          name: currentPatientAtIndex.name,
          fileNumber: currentPatientAtIndex.fileNumber,
          dob: currentPatientAtIndex.dob
        });
        if (currentPatientAtIndex.fileNumber !== expectedPatient.fileNumber) {
          this.log(`🚨 CRITICAL ERROR: Patient mismatch detected!`);
          this.log(`🚨 Expected: ${expectedPatient.name} (${expectedPatient.fileNumber})`);
          this.log(`🚨 Found: ${currentPatientAtIndex.name} (${currentPatientAtIndex.fileNumber})`);
          throw new Error(`Patient list state corrupted. Expected ${expectedPatient.name} but found ${currentPatientAtIndex.name} at index ${patientIndex}`);
        }
        this.log(`✅ Patient validation successful: ${expectedPatient.name} is at correct position ${patientIndex}`);
      } else {
        this.log(`🚨 CRITICAL ERROR: Patient index ${patientIndex} is out of bounds (current list has ${currentPatients.length} patients)`);
        throw new Error(`Patient index ${patientIndex} is out of bounds for current appointment book`);
      }
    } catch (error) {
      this.log(`❌ Patient validation failed:`, error);
      throw new Error(`Patient validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  log(...args) {
    console.log("[Enhanced BatchAIReviewOrchestrator]", ...args);
  }
  // ============================================================================
  // Public API for Advanced Features
  // ============================================================================
  /**
   * Get available checkpoints for management
   */
  async getAvailableCheckpoints() {
    return this.checkpointManager.listCheckpoints();
  }
  /**
   * Delete a specific checkpoint
   */
  async deleteCheckpoint(checkpointId) {
    return this.checkpointManager.deleteCheckpoint(checkpointId);
  }
  /**
   * Export comprehensive metrics
   */
  async exportMetrics() {
    if (!this.config.enableMetrics) {
      throw new Error("Metrics collection is disabled");
    }
    const report = this.metricsCollector.generateReport();
    return this.metricsCollector.exportMetrics(report);
  }
  /**
   * Clear all caches
   */
  async clearCaches() {
    return this.cacheManager.clear();
  }
  /**
   * Get detailed processing statistics
   */
  getDetailedStats() {
    return {
      processing: this.getProcessingStats(),
      cache: this.config.enableCaching ? this.cacheManager.getCacheInfo() : null,
      errors: this.errorRecovery.getFailureStats(),
      metrics: this.config.enableMetrics ? this.metricsCollector.getMetrics() : null
    };
  }
}
function useRecorder(options) {
  const {
    onRecordingComplete,
    onVoiceActivityUpdate,
    onRecordingTimeUpdate,
    onError,
    selectedMicrophoneId
  } = options;
  const [state, setState] = reactExports.useState({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    voiceActivityLevel: 0,
    frequencyData: [],
    hasPermission: null,
    isRequestingPermission: false
  });
  const mediaRecorderRef = reactExports.useRef(null);
  const audioContextRef = reactExports.useRef(null);
  const analyserRef = reactExports.useRef(null);
  const streamRef = reactExports.useRef(null);
  const audioChunksRef = reactExports.useRef([]);
  const animationFrameRef = reactExports.useRef();
  const intervalRef = reactExports.useRef();
  const detectVoiceActivity = reactExports.useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !state.isRecording) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = Math.min(average / 128, 1);
    const numBars = 10;
    const frequencies = [];
    const binSize = Math.floor(bufferLength / numBars);
    for (let i2 = 0; i2 < numBars; i2++) {
      let sum = 0;
      const start = i2 * binSize;
      const end = Math.min(start + binSize, bufferLength);
      for (let j2 = start; j2 < end; j2++) {
        sum += dataArray[j2];
      }
      const barValue = Math.min(sum / (end - start) / 128, 1);
      frequencies.push(Math.pow(barValue, 0.7));
    }
    setState((prev) => ({
      ...prev,
      voiceActivityLevel: normalizedLevel,
      frequencyData: frequencies
    }));
    onVoiceActivityUpdate?.(normalizedLevel, frequencies);
    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(detectVoiceActivity);
    }
  }, [state.isRecording, onVoiceActivityUpdate]);
  const startTimer = reactExports.useCallback(() => {
    setState((prev) => ({ ...prev, recordingTime: 0 }));
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const newTime = prev.recordingTime + 1;
        onRecordingTimeUpdate?.(newTime);
        return { ...prev, recordingTime: newTime };
      });
    }, 1e3);
  }, [onRecordingTimeUpdate]);
  const stopTimer = reactExports.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = void 0;
    }
  }, []);
  const checkPermission = reactExports.useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: "microphone" });
      setState((prev) => ({ ...prev, hasPermission: result.state === "granted" }));
      result.addEventListener("change", () => {
        setState((prev) => ({ ...prev, hasPermission: result.state === "granted" }));
      });
    } catch (error) {
      setState((prev) => ({ ...prev, hasPermission: null }));
    }
  }, []);
  const startRecording = reactExports.useCallback(async () => {
    console.log("🎤 useRecorder.startRecording() called");
    setState((prev) => ({ ...prev, isRequestingPermission: true }));
    try {
      const constraints = {
        audio: selectedMicrophoneId ? {
          deviceId: selectedMicrophoneId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16e3
        } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16e3
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setState((prev) => ({
        ...prev,
        hasPermission: true,
        isRequestingPermission: false,
        isRecording: true,
        voiceActivityLevel: 0,
        frequencyData: []
      }));
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();
        console.log("🎤 Using microphone:", {
          label: track.label,
          deviceId: settings.deviceId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount
        });
      }
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus"
      });
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        console.log("🎤 Audio recording completed:", {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
          recordingTime: state.recordingTime
        });
        onRecordingComplete(audioBlob);
        cleanup();
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      startTimer();
      detectVoiceActivity();
    } catch (error) {
      console.error("🎤 Recording start failed:", error);
      setState((prev) => ({
        ...prev,
        hasPermission: false,
        isRequestingPermission: false
      }));
      onError?.(error);
    }
  }, [selectedMicrophoneId, onRecordingComplete, onError, detectVoiceActivity, startTimer, state.recordingTime]);
  const stopRecording = reactExports.useCallback(() => {
    console.log("🛑 useRecorder.stopRecording() called");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setState((prev) => ({ ...prev, isRecording: false }));
    stopTimer();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [stopTimer]);
  const cleanup = reactExports.useCallback(() => {
    stopTimer();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isRecording: false,
      voiceActivityLevel: 0,
      frequencyData: []
    }));
  }, [stopTimer]);
  React.useEffect(() => {
    checkPermission();
    return cleanup;
  }, [checkPermission, cleanup]);
  return {
    ...state,
    startRecording,
    stopRecording,
    cleanup
  };
}
const OptimizedApp = reactExports.memo(() => {
  const { state, actions } = useAppState();
  const activeWorkflowRef = reactExports.useRef(null);
  const currentAudioBlobRef = reactExports.useRef(null);
  const currentRecordingTimeRef = reactExports.useRef(0);
  const transcriptionAbortRef = reactExports.useRef(null);
  const processingAbortRef = reactExports.useRef(null);
  const lmStudioService = LMStudioService.getInstance();
  const whisperServerService = WhisperServerService.getInstance();
  const batchOrchestrator = reactExports.useRef(null);
  const getBatchOrchestrator = reactExports.useCallback(() => {
    if (!batchOrchestrator.current) {
      batchOrchestrator.current = new BatchAIReviewOrchestrator();
    }
    return batchOrchestrator.current;
  }, []);
  const storeFailedAudioRecording = reactExports.useCallback((audioBlob, agentType, errorMessage, transcriptionAttempt, recordingTime) => {
    const failedRecording = {
      id: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      audioBlob,
      timestamp: Date.now(),
      agentType,
      errorMessage,
      transcriptionAttempt,
      metadata: {
        duration: recordingTime || currentRecordingTimeRef.current || 0,
        fileSize: audioBlob.size,
        recordingTime: recordingTime || currentRecordingTimeRef.current || 0
      }
    };
    actions.setFailedRecordings([failedRecording, ...state.failedAudioRecordings.slice(0, 4)]);
    console.log("📱 Stored failed audio recording:", {
      id: failedRecording.id,
      agentType,
      errorMessage,
      fileSize: audioBlob.size,
      duration: failedRecording.metadata.duration
    });
  }, [actions, state.failedAudioRecordings]);
  const clearFailedRecordings = reactExports.useCallback(() => {
    actions.setFailedRecordings([]);
    console.log("🗑️ Cleared all failed audio recordings");
  }, [actions]);
  const handleRecordingComplete = reactExports.useCallback(async (audioBlob) => {
    currentAudioBlobRef.current = audioBlob;
    if (state.ui.isCancelling) {
      console.log("🛑 Recording completed but cancellation in progress - ignoring");
      actions.setCancelling(false);
      return;
    }
    const workflowId = activeWorkflowRef.current || state.ui.activeWorkflow;
    if (!workflowId) {
      console.error("❌ No active workflow selected");
      actions.setErrors(["No workflow selected. Please select a workflow type before recording."]);
      return;
    }
    try {
      transcriptionAbortRef.current = new AbortController();
      console.log("🔄 Starting transcription...");
      actions.setProcessingStatus("transcribing");
      const transcriptionResult = await lmStudioService.transcribeAudio(
        audioBlob,
        transcriptionAbortRef.current.signal
      );
      transcriptionAbortRef.current = null;
      console.log("✅ Transcription complete:", transcriptionResult.substring(0, 100) + "...");
      actions.setTranscription(transcriptionResult);
      actions.setProcessingStatus("processing");
      processingAbortRef.current = new AbortController();
      console.log("🔄 Processing with agent:", workflowId);
      const result = await AgentFactory.processWithAgent(
        workflowId,
        transcriptionResult,
        void 0,
        processingAbortRef.current.signal
      );
      console.log("✅ Agent processing complete");
      processingAbortRef.current = null;
      actions.setWarnings(result.warnings || []);
      actions.setErrors(result.errors || []);
      actions.setAlertsVisible(true);
      if (result.errors && result.errors.length > 0) {
        const hasParsingError = result.errors.some(
          (error) => error.includes("could not be parsed coherently") || error.includes("Investigation dictation could not be parsed")
        );
        if (hasParsingError) {
          storeFailedAudioRecording(
            audioBlob,
            workflowId,
            result.errors.join("; "),
            transcriptionResult,
            currentRecordingTimeRef.current
          );
        }
      }
      actions.setResults(result.content);
      actions.setTimingData({
        agentProcessingTime: result.processingTime,
        totalProcessingTime: Date.now() - (state.processingStartTime || Date.now())
      });
      if (result.content) {
        const summary = result.summary || generateSmartSummary(result.content);
        actions.setResultSummary(summary);
      }
      actions.setCurrentAgentName(result.agentName);
      if (result.reviewData) {
        actions.setReviewData(result.reviewData);
      }
      if (state.currentPatientInfo) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const patientSession = {
          id: sessionId,
          patient: state.currentPatientInfo,
          transcription: transcriptionResult,
          results: result.content,
          agentType: workflowId,
          agentName: result.agentName,
          timestamp: Date.now(),
          completed: true,
          processingTime: result.processingTime,
          warnings: result.warnings,
          errors: result.errors
        };
        actions.addPatientSession(patientSession);
        console.log("👤 Created patient session:", sessionId, "for", state.currentPatientInfo.name);
      }
    } catch (error) {
      console.error("❌ Processing failed:", error);
      if (currentAudioBlobRef.current) {
        storeFailedAudioRecording(
          currentAudioBlobRef.current,
          workflowId,
          error.message || "Processing failed",
          state.transcription || void 0,
          currentRecordingTimeRef.current
        );
      }
      if (error.name === "AbortError") {
        console.log("🛑 Processing was cancelled by user");
        actions.setProcessingStatus("idle");
        actions.setErrors(["Processing was cancelled"]);
      } else {
        actions.setErrors([`Processing failed: ${error.message}`]);
        actions.setProcessingStatus("error");
      }
    } finally {
      actions.setProcessing(false);
      actions.setProcessingStatus("idle");
      actions.setActiveWorkflow(null);
      actions.setCancelling(false);
      activeWorkflowRef.current = null;
      transcriptionAbortRef.current = null;
      processingAbortRef.current = null;
    }
  }, [actions, state, lmStudioService, storeFailedAudioRecording]);
  const generateSmartSummary = (content) => {
    const sentences = content.split(/[.!?]+/).filter((s2) => s2.trim().length > 0);
    if (sentences.length === 0) return content.substring(0, 150) + "...";
    const keyTerms = ["stenosis", "regurgitation", "valve", "artery", "diagnosis", "treatment"];
    const importantSentences = sentences.filter(
      (sentence) => keyTerms.some((term) => sentence.toLowerCase().includes(term))
    );
    if (importantSentences.length > 0) {
      return importantSentences.slice(0, 2).join(". ").trim() + ".";
    }
    return sentences[0]?.trim() + ".";
  };
  const recorder = useRecorder({
    onRecordingComplete: handleRecordingComplete,
    onVoiceActivityUpdate: actions.setVoiceActivity,
    onRecordingTimeUpdate: (time) => {
      currentRecordingTimeRef.current = time;
    }
  });
  const extractPatientData = reactExports.useCallback(async () => {
    try {
      console.log("👤 Extracting patient data from EMR...");
      const response = await chrome.runtime.sendMessage({
        type: "EXECUTE_ACTION",
        action: "extract-patient-data",
        data: {}
      });
      if (response?.success && response?.data) {
        console.log("✅ Patient data extracted:", response.data);
        return response.data;
      } else {
        console.log("❌ No patient data found or extraction failed");
        return null;
      }
    } catch (error) {
      console.error("❌ Failed to extract patient data:", error);
      return null;
    }
  }, []);
  const handleWorkflowSelect = reactExports.useCallback(async (workflowId) => {
    console.log("🎯 Workflow selected:", workflowId);
    if (recorder.isRecording && state.ui.activeWorkflow === workflowId) {
      recorder.stopRecording();
    } else if (!recorder.isRecording) {
      const patientData = await extractPatientData();
      if (patientData) {
        actions.setCurrentPatientInfo({
          name: patientData.name || "Unknown Patient",
          id: patientData.id || "Unknown ID",
          dob: patientData.dob || "",
          age: patientData.age || "",
          phone: patientData.phone,
          email: patientData.email,
          medicare: patientData.medicare,
          insurance: patientData.insurance,
          address: patientData.address,
          extractedAt: patientData.extractedAt || Date.now()
        });
        console.log("👤 Current patient set:", patientData.name, "(ID:", patientData.id + ")");
      }
      actions.setActiveWorkflow(workflowId);
      activeWorkflowRef.current = workflowId;
      recorder.startRecording();
      actions.setProcessingStartTime(Date.now());
    }
  }, [recorder, state.ui.activeWorkflow, actions, extractPatientData]);
  const handleCancel = reactExports.useCallback(() => {
    console.log("🛑 Cancellation requested");
    actions.setCancelling(true);
    if (transcriptionAbortRef.current) {
      transcriptionAbortRef.current.abort();
      transcriptionAbortRef.current = null;
    }
    if (processingAbortRef.current) {
      processingAbortRef.current.abort();
      processingAbortRef.current = null;
    }
    if (recorder.isRecording) {
      recorder.stopRecording();
    }
    actions.setActiveWorkflow(null);
    actions.setProcessing(false);
    actions.setProcessingStatus("idle");
    actions.setWarnings([]);
    actions.setErrors([]);
    actions.setResults("");
    activeWorkflowRef.current = null;
    setTimeout(() => actions.setCancelling(false), 1e3);
  }, [recorder, actions]);
  const handleCopy = reactExports.useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("📋 Text copied to clipboard");
    } catch (error) {
      console.error("Failed to copy text:", error);
      throw error;
    }
  }, []);
  const handleInsertToEMR = reactExports.useCallback(async (text) => {
    try {
      await chrome.runtime.sendMessage({
        type: "EXECUTE_ACTION",
        action: "insertText",
        data: { text }
      });
      console.log("📝 Text inserted to EMR");
    } catch (error) {
      console.error("Failed to insert text to EMR:", error);
      throw error;
    }
  }, []);
  reactExports.useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const status = await lmStudioService.checkConnection();
        actions.setModelStatus(status);
      } catch (error) {
        actions.setModelStatus({
          isConnected: false,
          classifierModel: "",
          processorModel: "",
          lastPing: Date.now(),
          latency: 0
        });
      }
    };
    checkModelStatus();
    const interval = setInterval(checkModelStatus, 3e4);
    return () => clearInterval(interval);
  }, [lmStudioService, actions]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-screen max-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-blue-50 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm border-b border-emerald-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center space-x-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        StatusIndicator,
        {
          status: recorder.isRecording ? "recording" : state.processingStatus,
          currentAgent: state.currentAgent,
          isRecording: recorder.isRecording
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ModelStatus,
          {
            status: state.modelStatus,
            onRefresh: async () => {
              const status = await lmStudioService.checkConnection();
              actions.setModelStatus(status);
            },
            onRestartWhisper: async () => {
              try {
                const result = await whisperServerService.startServer();
                return {
                  running: result.running,
                  model: result.model,
                  port: result.port,
                  error: result.error,
                  lastChecked: result.lastChecked
                };
              } catch (error) {
                return {
                  running: false,
                  port: 8001,
                  error: error instanceof Error ? error.message : "Unknown error",
                  lastChecked: Date.now()
                };
              }
            }
          }
        ),
        (recorder.isRecording || state.isProcessing) && /* @__PURE__ */ jsxRuntimeExports.jsx(
          CancelButton,
          {
            processingStatus: recorder.isRecording ? "recording" : state.processingStatus,
            isRecording: recorder.isRecording,
            onCancel: handleCancel
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 p-3 bg-white/60 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-md mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkflowButtons,
      {
        onWorkflowSelect: handleWorkflowSelect,
        activeWorkflow: state.ui.activeWorkflow,
        isRecording: recorder.isRecording,
        disabled: state.isProcessing,
        voiceActivityLevel: state.voiceActivityLevel,
        recordingTime: currentRecordingTimeRef.current
      }
    ) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full max-w-md mx-auto p-4 space-y-4 overflow-y-auto", children: [
      (state.transcription || state.results) && !recorder.isRecording && !state.isProcessing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        NewRecordingButton,
        {
          onClearRecording: actions.clearRecording,
          disabled: recorder.isRecording || state.isProcessing
        }
      ) }),
      state.ui.showAlerts && state.ui.errors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ErrorAlert,
        {
          errors: state.ui.errors,
          onDismiss: () => actions.setAlertsVisible(false)
        }
      ),
      state.transcription && /* @__PURE__ */ jsxRuntimeExports.jsx(
        TranscriptionDisplay,
        {
          transcription: state.transcription,
          onEdit: actions.setTranscription,
          isProcessing: state.isProcessing
        }
      ),
      (recorder.isRecording || state.transcriptionTime || state.agentProcessingTime || state.totalProcessingTime) && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ProcessingTimeDisplay,
        {
          appState: state,
          isRecording: recorder.isRecording,
          recordingTime: currentRecordingTimeRef.current
        }
      ),
      state.results && /* @__PURE__ */ jsxRuntimeExports.jsx(
        OptimizedResultsPanel,
        {
          results: state.results,
          agentType: state.currentAgent,
          onCopy: handleCopy,
          onInsertToEMR: handleInsertToEMR,
          warnings: state.ui.warnings,
          onDismissWarnings: () => {
            actions.setWarnings([]);
            actions.setAlertsVisible(false);
          },
          originalTranscription: state.transcription,
          onTranscriptionCopy: handleCopy,
          onTranscriptionInsert: handleInsertToEMR,
          currentAgent: state.currentAgent,
          isProcessing: state.isProcessing,
          failedAudioRecordings: state.failedAudioRecordings,
          onClearFailedRecordings: clearFailedRecordings,
          errors: state.ui.errors,
          reviewData: state.reviewData
        }
      ),
      state.patientSessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        SessionsPanel,
        {
          sessions: state.patientSessions,
          onRemoveSession: actions.removePatientSession,
          onClearAllSessions: actions.clearPatientSessions,
          onSessionSelect: (session) => {
            console.log("📋 Selected patient session:", session.patient.name);
            actions.setTranscription(session.transcription);
            actions.setResults(session.results);
          }
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 p-3 bg-white/80 backdrop-blur-sm border-t border-emerald-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-md mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      QuickActions,
      {
        onQuickAction: async (actionId, data) => {
          try {
            if (actionId === "batch-ai-review") {
              console.log("👥 Showing Batch AI Review modal");
              actions.setPatientModal(true);
              return;
            }
            if (actionId === "ai-medical-review") {
              console.log("🔍 Processing AI Medical Review...");
              actions.setProcessingStatus("processing");
              actions.setCurrentAgent("ai-medical-review");
              try {
                const emrData = data?.emrData;
                const formattedInput = data?.formattedInput;
                if (!emrData || !formattedInput) {
                  throw new Error("No EMR data provided for AI Medical Review");
                }
                console.log("🔍 Creating AusMedicalReviewAgent and processing EMR data...");
                const agent = new AusMedicalReviewAgent();
                const report = await agent.process(formattedInput);
                console.log("✅ AI Medical Review completed:", report);
                actions.setResults(report.content);
                actions.setReviewData(report.reviewData);
                actions.setProcessingStatus("complete");
              } catch (error) {
                console.error("❌ AI Medical Review failed:", error);
                actions.setProcessingStatus("error");
                actions.setErrors([error instanceof Error ? error.message : "AI Medical Review failed"]);
              }
              return;
            }
            await chrome.runtime.sendMessage({
              type: "EXECUTE_ACTION",
              action: actionId,
              data
            });
            console.log(`✅ Quick action ${actionId} executed`);
          } catch (error) {
            console.error(`❌ Quick action ${actionId} failed:`, error);
            if (actionId === "ai-medical-review") {
              actions.setProcessingStatus("error");
              actions.setErrors([error instanceof Error ? error.message : "AI Medical Review failed"]);
            }
          }
        },
        onStartWorkflow: handleWorkflowSelect,
        isFooter: true
      }
    ) }) }),
    state.ui.showPatientSelectionModal && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PatientSelectionModal,
      {
        isOpen: state.ui.showPatientSelectionModal,
        onClose: () => actions.setPatientModal(false),
        onStartReview: async (patients) => {
          try {
            console.log("👥 Processing batch AI review for", patients.length, "patients");
            actions.setPatientModal(false);
            actions.setBatchProcessing(true);
            const result = await getBatchOrchestrator().processBatch({
              selectedPatients: patients,
              appointmentDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              calendarUrl: state.ui.calendarData?.calendarUrl || ""
            });
            console.log("✅ Batch AI review completed:", result);
          } catch (error) {
            console.error("❌ Batch AI review failed:", error);
          } finally {
            actions.setBatchProcessing(false);
          }
        },
        calendarData: state.ui.calendarData,
        isExtracting: state.ui.isExtractingPatients,
        extractError: state.ui.extractError
      }
    )
  ] });
});
OptimizedApp.displayName = "OptimizedApp";
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gradient-to-br from-red-500 to-red-700 p-4 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-2xl p-6 max-w-md text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-white text-xl font-bold mb-4", children: "Extension Error" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/80 mb-4", children: "The Reflow Medical Assistant encountered an error." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => window.location.reload(),
            className: "bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors",
            children: "Reload Extension"
          }
        ),
        this.state.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-4 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "text-white/60 cursor-pointer text-sm", children: "Error Details" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-xs text-white/50 mt-2 p-2 bg-black/20 rounded", children: this.state.error.message })
        ] })
      ] }) });
    }
    return this.props.children;
  }
}
window.addEventListener("error", (event) => {
  console.error("Global error in sidepanel:", event.error);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in sidepanel:", event.reason);
});
function initializeApp() {
  console.log("🏥 Initializing Reflow Medical Assistant...", (/* @__PURE__ */ new Date()).toISOString());
  console.log("🔧 Extension context check:", typeof chrome !== "undefined" && chrome.runtime);
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("❌ Root element not found!");
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; backdrop-filter: blur(10px);">
          <h1 style="color: white; margin-bottom: 1rem;">Mount Error</h1>
          <p style="color: rgba(255,255,255,0.8);">Could not find root element</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
    return;
  }
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.warn("⚠️ Chrome extension APIs not available");
  } else {
    console.log("✅ Chrome extension context detected");
  }
  try {
    const root = createRoot(rootElement);
    root.render(
      /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(OptimizedApp, {}) }) })
    );
    console.log("✅ React app rendered successfully");
  } catch (error) {
    console.error("❌ Failed to render React app:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; backdrop-filter: blur(10px);">
          <h1 style="color: white; margin-bottom: 1rem;">Render Error</h1>
          <p style="color: rgba(255,255,255,0.8);">${error instanceof Error ? error.message : "Unknown error"}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
  }
}
if (document.readyState === "loading") {
  console.log("⏳ Waiting for DOM to load...");
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  console.log("✅ DOM already loaded, initializing immediately");
  initializeApp();
}
if (typeof window !== "undefined") {
  window.reflowDebug = {
    version: "1.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userAgent: navigator.userAgent,
    chromeAvailable: typeof chrome !== "undefined",
    extensionId: chrome?.runtime?.id || "unknown"
  };
  console.log("🔧 Debug info:", window.reflowDebug);
}
