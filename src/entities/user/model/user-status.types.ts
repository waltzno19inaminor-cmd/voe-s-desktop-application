export type UserStatusVisualPreset = 0 | 1 | 2 | 3

export interface UserProfileStatus {
  name: string
  visualPreset: UserStatusVisualPreset
  granted?: unknown
  isSelected: boolean
}
