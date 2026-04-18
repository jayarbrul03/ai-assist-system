import { DisclaimerStrip } from "@/components/ui/disclaimer";

export function PageHeader({
  title,
  description,
  action,
  disclaimer = true,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  disclaimer?: boolean;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif-brand text-3xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-neutral-600 mt-1">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {disclaimer ? <DisclaimerStrip className="mt-4" compact /> : null}
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="px-8 py-8 max-w-6xl mx-auto">{children}</div>;
}
