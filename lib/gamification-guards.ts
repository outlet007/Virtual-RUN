type DatabaseError = { code?: string } | null;

export function medalInsertCreatedNewAward(error: DatabaseError): boolean {
  return error === null;
}