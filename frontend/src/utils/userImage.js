export function getUserImage(user) {
  if (!user) return "";

  return (
    user.avatarUrl ||
    user.avatar ||
    user.profileImage ||
    user.profileImageUrl ||
    user.imageUrl ||
    user.image ||
    user.photoUrl ||
    user.photo ||
    ""
  );
}
