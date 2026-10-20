import type { UserDTO } from '@dsa/shared';
import type { UserDoc } from '../../models';

export function toUserDTO(user: UserDoc): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    preferences: {
      dailyGoal: user.preferences?.dailyGoal ?? 3,
      studyDays: user.preferences?.studyDays ?? [1, 2, 3, 4, 5, 6],
      targetDate: user.preferences?.targetDate ?? null,
    },
    lastActive: {
      problemId: user.lastActive?.problemId?.toString() ?? null,
      at: user.lastActive?.at?.toISOString() ?? null,
    },
    createdAt: user.createdAt.toISOString(),
  };
}
