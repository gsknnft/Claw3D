/**
 * Onboarding feature module.
 *
 * Usage:
 *   import { OnboardingWizard, useOnboardingState } from "@/features/onboarding";
 */
export { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard";
export type { OnboardingWizardProps } from "@/features/onboarding/components/OnboardingWizard";
export { useOnboardingState } from "@/features/onboarding/useOnboardingState";
export type { OnboardingStateReturn } from "@/features/onboarding/useOnboardingState";
export {
  LOCAL_ONBOARDING_STEPS,
  MANAGED_ONBOARDING_STEPS,
  type OnboardingStepId,
  type OnboardingStep,
} from "@/features/onboarding/types";
