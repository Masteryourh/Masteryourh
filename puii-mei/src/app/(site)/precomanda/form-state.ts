export type PreorderFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | {
      status: "success";
      result: {
        number: string;
        birds: number;
        lotCode: string | null;
        /** „alocata” = are gospodărie; „alegere” = clientul alege împărțire / așteptare; „asteapta” = în coadă. */
        allocation: "alocata" | "alegere" | "asteapta";
        farmName: string | null;
        maxSingle: number;
        availableFrom: string | null;
        zoneName: string;
        total: number;
        estimatedKg: number;
        email: string;
        trackingToken: string;
        feedKg: number;
        feedAmount: number;
      };
    };

export const initialPreorderState: PreorderFormState = { status: "idle" };
