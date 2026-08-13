type DatabaseError = { code?: string } | null;

export function isDuplicateNotificationError(error: DatabaseError): boolean {
  return error?.code === "23505";
}
