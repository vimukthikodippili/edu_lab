export interface SubjectTopic {
  id: string
  subjectId: string
  teacherId: string
  title: string
  order: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSubjectTopicPayload {
  subjectId: string
  title: string
}

export interface RenameSubjectTopicPayload {
  title: string
}

export interface ReorderSubjectTopicsPayload {
  subjectId: string
  topicIds: string[]
}
