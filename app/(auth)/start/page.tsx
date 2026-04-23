import Link from "next/link";
import { Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ONBOARDING_ROLE_LABELS,
  type OnboardingRole,
} from "@/lib/auth/onboarding-role";

const RESIDENT: OnboardingRole[] = ["owner", "tenant"];
const LEADERSHIP: OnboardingRole[] = ["manager", "committee_chair"];

export default function StartPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="font-serif-brand text-2xl font-semibold text-neutral-900">
          How will you use Parity?
        </h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
          We tailor your workspace and permissions. You can change this later in
          settings if your role changes.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 text-sm font-medium text-teal-800 mb-3">
            <Users className="h-4 w-4" />
            Lot owner or tenant
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RESIDENT.map((role) => (
              <Button
                key={role}
                asChild
                variant="outline"
                className="h-auto min-h-[3.5rem] flex-col items-start py-3 px-4 text-left whitespace-normal"
              >
                <Link href={`/signup?role=${role}`}>
                  <span className="font-medium text-neutral-900">
                    {ONBOARDING_ROLE_LABELS[role]}
                  </span>
                  <span className="text-xs text-neutral-500 font-normal">
                    {role === "owner"
                      ? "Owns a lot in a scheme"
                      : "Renting in a community titles scheme"}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-sm font-medium text-teal-800 mb-3">
            <Building2 className="h-4 w-4" />
            Manager or body corporate
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEADERSHIP.map((role) => (
              <Button
                key={role}
                asChild
                variant="outline"
                className="h-auto min-h-[3.5rem] flex-col items-start py-3 px-4 text-left whitespace-normal"
              >
                <Link href={`/signup?role=${role}`}>
                  <span className="font-medium text-neutral-900">
                    {ONBOARDING_ROLE_LABELS[role]}
                  </span>
                  <span className="text-xs text-neutral-500 font-normal">
                    {role === "manager"
                      ? "Professional body corporate management"
                      : "Committee chair, secretary, or office-bearer"}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </div>

      <p className="text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="text-teal-700 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
