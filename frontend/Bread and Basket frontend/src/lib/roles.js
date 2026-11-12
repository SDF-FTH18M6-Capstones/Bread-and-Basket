export const HOME_BY_ROLE = {
  consumer: "/shop",
  seller: "/seller",
  admin: "/admin",
};

export const homeFor = (role) => HOME_BY_ROLE[role] || "/";
