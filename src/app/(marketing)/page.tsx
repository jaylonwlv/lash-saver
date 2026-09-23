import { ButtonLink } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12">
      <div className="flex flex-col gap-3">
        <p className="text-brand text-sm font-semibold tracking-wide uppercase">{APP_NAME}</p>
        <h1 className="text-3xl leading-tight font-bold">Stop losing money to no-shows.</h1>
        <p className="text-muted text-lg">
          Send clients a deposit link from your Instagram DMs. They pay to lock in the slot, and you
          keep the deposit if they don&apos;t show.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <ButtonLink href="/login">Get started</ButtonLink>
        <ButtonLink href="/login" variant="secondary">
          I already have an account
        </ButtonLink>
      </div>
    </main>
  );
}
