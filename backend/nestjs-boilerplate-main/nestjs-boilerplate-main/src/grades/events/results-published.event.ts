export class ResultsPublishedEvent {
  constructor(
    public readonly classSectionId: number,
    public readonly termId: number,
    public readonly studentIds: string[],
  ) {}
}
