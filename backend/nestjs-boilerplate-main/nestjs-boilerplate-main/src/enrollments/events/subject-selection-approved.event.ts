export class SubjectSelectionApprovedEvent {
  constructor(
    public readonly requestId: string,
    public readonly studentId: string,
    public readonly windowId: string,
    public readonly subjectIds: string[],
  ) {}
}
