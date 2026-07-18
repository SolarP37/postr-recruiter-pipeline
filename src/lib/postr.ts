export interface PostrAdapter {
  getRecruiterLink(): string;
}

export class EnvironmentPostrAdapter implements PostrAdapter {
  getRecruiterLink(): string {
    const link = process.env.POSTR_RECRUITER_LINK;
    if (!link) throw new Error("POSTR_RECRUITER_LINK is not configured.");
    return link;
  }
}
