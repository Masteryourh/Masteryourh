export type PreorderFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | {
      status: "success";
      result: {
        number: string;
        birds: number;
        lotCode: string | null;
        availableFrom: string | null;
        zoneName: string;
        total: number;
        estimatedKg: number;
        email: string;
      };
    };

export const initialPreorderState: PreorderFormState = { status: "idle" };
