export type UserStatusVisualPreset = 0 | 1 | 2 | 3

export interface UserProfileStatus {
  name: string
  visualPreset: UserStatusVisualPreset
  granted?: unknown
  isSelected: boolean
}

export function normalizeUserProfileStatuses(value: unknown): UserProfileStatus[] {
  if (!Array.isArray(value)) return []

  return value.reduce<UserProfileStatus[]>((statuses, rawStatus) => {
    if (!rawStatus || typeof rawStatus !== 'object' || Array.isArray(rawStatus)) return statuses

    const raw = rawStatus as Record<string, unknown>
    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    if (!name) return statuses

    const preset = Number(raw.visualPreset)
    const visualPreset: UserStatusVisualPreset = Number.isInteger(preset) && preset >= 0 && preset <= 3
      ? preset as UserStatusVisualPreset
      : 3

    statuses.push({
      name,
      visualPreset,
      granted: raw.granted,
      isSelected: raw.isSelected === true
    })
    return statuses
  }, [])
}
