/** Application-owned inputs; the @api DTOs implement these. */
export interface CreateProfileInput {
  authId: string;
  name: string;
  lastname: string;
  age: number;
}

export interface UpdateProfileInput {
  name?: string;
  lastname?: string;
  age?: number;
}
