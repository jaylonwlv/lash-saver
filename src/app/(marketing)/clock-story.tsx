/** A no-show as a short timeline: the excuses by the clock, then the same client with a deposit. */
export function ClockStory({
  lead,
  excuses,
  deposit,
  business,
}: {
  lead: string;
  excuses: [string, string, string];
  deposit: string;
  business: string;
}) {
  const [first, second, third] = excuses;
  return (
    <section className="clock-run">
      <h2 className="text-3xl tracking-tight">{lead}</h2>
      <ol className="mt-5 flex flex-col gap-4">
        {(
          [
            ["1:55 PM", first],
            ["2:20 PM", second],
            ["2:45 PM", third],
          ] as const
        ).map(([time, excuse]) => (
          <li key={time}>
            <p className="text-muted text-sm">{time}</p>
            <p className="clock-bubble">{excuse}</p>
          </li>
        ))}
      </ol>
      <p className="clock-verdict">Empty slot. $0 today.</p>
      <div className="clock-card" data-theme="light">
        <p className="text-muted text-xs">Same client, deposit first · {business}</p>
        <p className="clock-card-title">{deposit} paid. They&apos;re here.</p>
        <p className="stage-stamp clock-card-stamp">Booked</p>
      </div>
    </section>
  );
}
