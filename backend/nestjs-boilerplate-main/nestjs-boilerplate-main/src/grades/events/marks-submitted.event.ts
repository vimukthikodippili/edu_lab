export class MarksSubmittedEvent {
  constructor(
    public readonly assessmentId: string,
    public readonly subjectId: string,
    public readonly termId: number,
    public readonly classSectionId: number,
    public readonly studentIds: string[],
  ) {}
}
