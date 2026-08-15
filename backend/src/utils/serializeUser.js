export function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || "",
    avatarPublicId: user.avatarPublicId || "",
  };
}
