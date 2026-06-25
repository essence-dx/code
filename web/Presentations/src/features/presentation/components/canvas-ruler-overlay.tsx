const rulerMarks = Array.from({ length: 21 }, (_, index) => index * 5)

function isMajorMark(mark: number) {
  return mark % 25 === 0
}

function isMediumMark(mark: number) {
  return mark % 10 === 0
}

export function CanvasRulerOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute top-0 right-0 left-0 h-5 border-b border-slate-400/50 bg-white/80 shadow-sm backdrop-blur-sm">
        {rulerMarks.map((mark) => (
          <span
            key={`x-${mark}`}
            className="absolute top-0 h-full"
            style={{ left: `${mark}%` }}
          >
            <span
              className="absolute top-0 w-px bg-slate-500/75"
              style={{
                height: isMajorMark(mark)
                  ? "20px"
                  : isMediumMark(mark)
                    ? "14px"
                    : "8px",
              }}
            />
            {isMajorMark(mark) ? (
              <span className="absolute top-1 left-1 font-mono text-[9px] leading-none text-slate-600">
                {mark}
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <div className="absolute top-0 bottom-0 left-0 w-6 border-r border-slate-400/50 bg-white/80 shadow-sm backdrop-blur-sm">
        {rulerMarks.map((mark) => (
          <span
            key={`y-${mark}`}
            className="absolute left-0 w-full"
            style={{ top: `${mark}%` }}
          >
            <span
              className="absolute left-0 h-px bg-slate-500/75"
              style={{
                width: isMajorMark(mark)
                  ? "24px"
                  : isMediumMark(mark)
                    ? "17px"
                    : "10px",
              }}
            />
            {isMajorMark(mark) ? (
              <span className="absolute top-1 left-1 font-mono text-[9px] leading-none text-slate-600">
                {mark}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  )
}
