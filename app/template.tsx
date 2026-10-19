// Route enter transition: templates re-mount on every navigation
// (unlike layouts), so this CSS animation replays for each page change —
// home→article, article→home, refresh — smoothing the swap.

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="newz-enter">{children}</div>;
}
