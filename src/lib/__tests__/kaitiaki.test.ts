import { describe, expect, it } from "vitest";
import { minimumTierFor, scoreDeployment, tierMeetsClassification } from "../kaitiaki";
import type { DeploymentRequest } from "../types";

function baseRequest(overrides: Partial<DeploymentRequest> = {}): DeploymentRequest {
  return {
    workloadId: "sovereign-rag",
    backendId: "catalyst-cloud",
    clientName: "Test Org",
    dataClassification: "internal",
    guardian: { name: "Aroha Ngata", role: "Data Steward", email: "aroha@example.nz" },
    guardrails: {
      auditLogging: true,
      budgetCapNzd: 2000,
      dlpEnabled: true,
      ssoMfaEnforced: true,
      encryptionAtRest: true,
      guardianReviewCadenceDays: 90,
    },
    ...overrides,
  };
}

describe("classification → minimum tier", () => {
  it("requires Tier S for taonga, health and official information", () => {
    expect(minimumTierFor("maori-data")).toBe("S");
    expect(minimumTierFor("health")).toBe("S");
    expect(minimumTierFor("official-information")).toBe("S");
  });

  it("allows Tier R for commercial classifications and Tier G for public", () => {
    expect(minimumTierFor("confidential")).toBe("R");
    expect(minimumTierFor("internal")).toBe("R");
    expect(minimumTierFor("public")).toBe("G");
  });

  it("treats higher tiers as satisfying lower requirements", () => {
    expect(tierMeetsClassification("S", "public")).toBe(true);
    expect(tierMeetsClassification("R", "maori-data")).toBe(false);
    expect(tierMeetsClassification("G", "internal")).toBe(false);
  });
});

describe("scoreDeployment", () => {
  it("gives a fully-governed sovereign deployment an A+ with no violations", () => {
    const score = scoreDeployment(baseRequest());
    expect(score.total).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe("A+");
    expect(score.violations).toHaveLength(0);
  });

  it("pillar weights sum to 100 and earned never exceeds weight", () => {
    const score = scoreDeployment(baseRequest());
    expect(score.pillars.reduce((s, p) => s + p.weight, 0)).toBe(100);
    for (const p of score.pillars) {
      expect(p.earned).toBeGreaterThanOrEqual(0);
      expect(p.earned).toBeLessThanOrEqual(p.weight);
    }
  });

  it("flags Māori data on a CLOUD Act-exposed backend as a violation and caps the grade", () => {
    const score = scoreDeployment(
      baseRequest({ backendId: "azure-nz-north", dataClassification: "maori-data" }),
    );
    expect(score.violations.length).toBeGreaterThan(0);
    expect(score.violations[0]).toMatch(/NZ jurisdiction|Tier S/);
    expect(["C", "D"]).toContain(score.grade);
    expect(score.recommendations[0]).toMatch(/Tier S/);
  });

  it("docks the jurisdiction pillar for resident (Tier R) backends", () => {
    const sovereign = scoreDeployment(baseRequest());
    const resident = scoreDeployment(baseRequest({ backendId: "aws-ap-southeast-6" }));
    const sPillar = sovereign.pillars.find((p) => p.id === "whakapapa")!;
    const rPillar = resident.pillars.find((p) => p.id === "whakapapa")!;
    expect(sPillar.earned).toBe(sPillar.weight);
    expect(rPillar.earned).toBeLessThan(rPillar.weight);
    expect(rPillar.detail).toMatch(/CLOUD Act/);
  });

  it("penalises a missing guardian and recommends assigning one", () => {
    const score = scoreDeployment(baseRequest({ guardian: null }));
    const pillar = score.pillars.find((p) => p.id === "kaitiakitanga")!;
    expect(pillar.earned).toBeLessThan(pillar.weight);
    expect(score.recommendations.some((r) => /named guardian/i.test(r))).toBe(true);
  });

  it("penalises missing guardrails without ever going negative", () => {
    const score = scoreDeployment(
      baseRequest({
        guardian: null,
        guardrails: {
          auditLogging: false,
          budgetCapNzd: null,
          dlpEnabled: false,
          ssoMfaEnforced: false,
          encryptionAtRest: false,
          guardianReviewCadenceDays: null,
        },
      }),
    );
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.grade).toMatch(/C|D/);
    expect(score.recommendations.length).toBeGreaterThanOrEqual(5);
  });

  it("rejects backends that are not GA (Google Cloud NZ is announced only)", () => {
    expect(() => scoreDeployment(baseRequest({ backendId: "gcp-nz" }))).toThrow(/not generally available/);
  });
});
