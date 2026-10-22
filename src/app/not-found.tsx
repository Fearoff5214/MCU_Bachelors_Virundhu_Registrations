import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <p className="glitch font-display text-8xl font-black neon-text" data-text="404">
          404
        </p>
        <p className="mt-4 text-mute">Enna mapla, vazhi thappiteenga? This page doesn&apos;t exist.</p>
        <ButtonLink href="/" className="mt-8">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
