// The strip along the bottom of dress up timothée, carrying what is playing.
// It repeats what the page already says, so it is hidden from screen readers;
// it pauses under the pointer, and stands still with reduced motion.
export function Ticker({ text }) {
  return (
    <div aria-hidden className="ticker fixed inset-x-0 bottom-0 z-40 h-[26px] overflow-hidden whitespace-nowrap bg-ticker text-[13px] leading-[26px] text-white">
      <span className="ticker-run">{`${text} ♡ `.repeat(4)}</span>
    </div>
  )
}
