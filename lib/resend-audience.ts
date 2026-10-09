export type AudienceContactCount = { id: string; activeContacts: number };

export function selectAudienceId(configuredId: string, audiences: AudienceContactCount[]): string {
  const configured = audiences.find((audience) => audience.id === configuredId);
  if (configured?.activeContacts) return configuredId;

  const alternatives = audiences.filter((audience) => audience.id !== configuredId && audience.activeContacts > 0);
  return alternatives.length === 1 ? alternatives[0].id : configuredId;
}
