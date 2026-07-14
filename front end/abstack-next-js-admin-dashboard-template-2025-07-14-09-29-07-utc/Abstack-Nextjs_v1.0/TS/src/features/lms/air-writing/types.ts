export interface WhiteboardPoint {
  x: number
  y: number
}

export type WhiteboardStrokePhase = 'start' | 'draw'

export interface WhiteboardPointMessage extends WhiteboardPoint {
  type: 'point'
  strokeId: string
  phase: WhiteboardStrokePhase
}

export interface WhiteboardClearMessage {
  type: 'clear'
}

export type WhiteboardMessage = WhiteboardPointMessage | WhiteboardClearMessage

export const WHITEBOARD_DATA_TOPIC = 'whiteboard'
