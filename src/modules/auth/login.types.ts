export type LoginInput = Readonly<{
  email: string;
  password: string;
}>;

export type LoginResult = Readonly<{
  token: string;
  userId: string;
}>;
