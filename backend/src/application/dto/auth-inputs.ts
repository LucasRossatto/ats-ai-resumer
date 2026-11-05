/** Application-owned inputs; the @api DTOs implement these. */
export interface RegisterInput {
  name: string;
  lastname?: string;
  age?: number;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
