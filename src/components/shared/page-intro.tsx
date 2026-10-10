export function PageIntro({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="kicker">{kicker}</p>
        <h1 className="page-title mt-1.5">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
