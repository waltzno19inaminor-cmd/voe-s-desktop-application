import { Timestamp } from "firebase/firestore"

export function normalizeDate(
  raw: Date | string | Timestamp | undefined
): Date {
  if (!raw) return new Date()

  if (raw instanceof Date) return raw

  if (raw instanceof Timestamp) return raw.toDate()

  return new Date(raw)
}