declare module 'expo-haptics' {
  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  export function notificationAsync(type: NotificationFeedbackType): Promise<void>;
  export function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
  export function selectionAsync(): Promise<void>;
}
