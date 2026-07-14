export class LiveSessionStartedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly classSectionId: number,
    public readonly subjectId: string,
    public readonly teacherId: string,
  ) {}
}
