export interface PostrAdapter {
  getRecruiterLink(): string;
}

export class EnvironmentPostrAdapter implements PostrAdapter {
  getRecruiterLink(): string {
    return RECRUITER_CONFIG.referralUrl;
  }
}
import { RECRUITER_CONFIG } from "@/config/recruiter";
