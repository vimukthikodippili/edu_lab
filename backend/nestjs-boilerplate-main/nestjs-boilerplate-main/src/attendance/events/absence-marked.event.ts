export class AbsenceMarkedEvent {
  constructor(
    public readonly attendanceId: string,
    public readonly studentId: string,
    public readonly classSectionId: number,
    public readonly date: string, // ISO "YYYY-MM-DD"
  ) {}
}
