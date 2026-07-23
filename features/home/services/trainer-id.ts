// Displayable "Trainer ID" derived from PlayerProfile.id — there is no
// dedicated trainerId column (adding one would need a migration for a
// purely cosmetic value), so this deterministically formats the id the
// profile already has instead. Same input always produces the same output.
export function formatTrainerId(profileId: string): string {
  const suffix = profileId.slice(-8).toUpperCase();
  return `#${suffix}`;
}
