/** Zero-pad a unit number to three digits (e.g. 4 -> "004"). */
export function unit3(n: number): string {
  return String(n).padStart(3, "0");
}
