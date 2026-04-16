export type Claw3dDeploymentMode = "local" | "managed";

export function resolveClaw3dDeploymentMode(): Claw3dDeploymentMode {
  return process.env.NEXT_PUBLIC_CLAW3D_DEPLOYMENT_MODE === "managed" ? "managed" : "local";
}

export function isManagedClaw3dDeployment() {
  return resolveClaw3dDeploymentMode() === "managed";
}
