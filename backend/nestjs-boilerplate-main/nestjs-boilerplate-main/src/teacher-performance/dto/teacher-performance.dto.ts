export interface MonthlyAttendanceRow {
  month: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  totalMarkedDays: number;
  presentRate: number;
  punctualityRate: number;
}

export interface AttendanceSummary {
  monthly: MonthlyAttendanceRow[];
  overall: {
    totalMarkedDays: number;
    presentRate: number;
    punctualityRate: number;
  };
}

export interface ClassSubjectPerformanceRow {
  subjectId: string;
  subjectName: string;
  classSectionId: number;
  classSectionName: string;
  assessmentsCount: number;
  submittedMarksCount: number;
  passRate: number;
  averageMarkPercent: number;
  isPassRateOutlier: boolean;
  priorYearAveragePassRate: number | null;
}

export interface SubjectSyllabusRow {
  subjectId: string;
  subjectName: string;
  totalUnits: number;
  completedUnits: number;
  completionPercent: number;
}

export interface SyllabusSummary {
  bySubject: SubjectSyllabusRow[];
  overallCompletionPercent: number;
}

export interface TeacherPerformanceDto {
  attendance: AttendanceSummary;
  classResults: ClassSubjectPerformanceRow[];
  syllabus: SyllabusSummary;
}

export interface StaffPerformanceDto extends TeacherPerformanceDto {
  behindScheduleOutlier: boolean;
}
