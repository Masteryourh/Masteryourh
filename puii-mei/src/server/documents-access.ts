import "server-only";
import type { FarmDocument, User } from "@/lib/domain";
import { investmentRepository } from "./repositories/documents";

/**
 * Cine poate deschide un document: adminul; gospodarul gospodăriei lui; investitorul,
 * pentru actele investițiilor lui și pentru documentele gospodăriilor pe care le susține.
 */
export async function canViewDocument(user: User | null, doc: FarmDocument) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "gospodar") return Boolean(doc.farmSlug && doc.farmSlug === user.farmSlug && !doc.investmentId);
  if (user.role === "investitor") {
    const mine = (await investmentRepository.byInvestor(user.id)).filter((i) => i.status !== "anulata");
    if (doc.investmentId) return mine.some((i) => i.id === doc.investmentId);
    return Boolean(doc.farmSlug && mine.some((i) => i.farmSlug === doc.farmSlug));
  }
  return false;
}
