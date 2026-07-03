export class LeaveApprovedEvent {
  constructor(
    public readonly leaveRequestId: string,
    public readonly staffId: string,
    public readonly leaveType: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}
