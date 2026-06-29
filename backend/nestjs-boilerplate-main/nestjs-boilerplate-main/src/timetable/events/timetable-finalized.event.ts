export class TimetableFinalizedEvent {
  constructor(
    public readonly academicYear: string,
    public readonly finalizedAt: Date,
    public readonly teacherIds: string[],
  ) {}
}
