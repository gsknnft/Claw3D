/**
 * Onboarding wizard types.
 *
 * The wizard is step-based and extensible: new steps can be added by
 * extending `OnboardingStepId` and registering a component in the
 * step registry.
 */

export type OnboardingStepId =
  | "welcome"
  | "prerequisites"
  | "connect"
  | "byok"
  | "agents"
  | "company"
  | "complete";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  /** Whether the step can be skipped. */
  skippable: boolean;
};

export type OnboardingState = {
  currentStep: OnboardingStepId;
  completedSteps: Set<OnboardingStepId>;
  /** Whether the user has dismissed the wizard entirely. */
  dismissed: boolean;
  /** Gateway connection state passed from the parent. */
  gatewayConnected: boolean;
  /** Number of agents discovered after connection. */
  agentCount: number;
};

export const LOCAL_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Claw3D",
    description: "Your AI office in 3D",
    skippable: false,
  },
  {
    id: "prerequisites",
    title: "Before You Start",
    description: "What you'll need",
    skippable: true,
  },
  {
    id: "connect",
    title: "Connect Your Gateway",
    description: "Link to your runtime instance",
    skippable: false,
  },
  {
    id: "agents",
    title: "Your Agents",
    description: "Meet your AI team",
    skippable: true,
  },
  {
    id: "company",
    title: "Build Your Company",
    description: "Generate your org structure",
    skippable: true,
  },
  {
    id: "complete",
    title: "You're All Set",
    description: "Start exploring",
    skippable: false,
  },
];

export const MANAGED_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Claw3D",
    description: "Your AI office in 3D",
    skippable: false,
  },
  {
    id: "prerequisites",
    title: "Before You Start",
    description: "What you'll need",
    skippable: true,
  },
  {
    id: "byok",
    title: "Add Your Provider Key",
    description: "Configure model access for this managed workspace",
    skippable: false,
  },
  {
    id: "company",
    title: "Build Your Company",
    description: "Generate your org structure",
    skippable: true,
  },
  {
    id: "complete",
    title: "You're All Set",
    description: "Start exploring",
    skippable: false,
  },
];

// Default step list used by tests and single-tenant flows.
export const ONBOARDING_STEPS = LOCAL_ONBOARDING_STEPS;

export function getStepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

export function getNextStep(id: OnboardingStepId): OnboardingStepId | null {
  const idx = getStepIndex(id);
  return idx >= 0 && idx < ONBOARDING_STEPS.length - 1
    ? ONBOARDING_STEPS[idx + 1].id
    : null;
}

export function getPrevStep(id: OnboardingStepId): OnboardingStepId | null {
  const idx = getStepIndex(id);
  return idx > 0 ? ONBOARDING_STEPS[idx - 1].id : null;
}
