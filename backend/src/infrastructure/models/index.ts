import { Connection } from 'mongoose';
import {
  PROFILE_MODEL_PROVIDER,
  DB_PROVIDER,
  AUTH_MODEL_PROVIDER,
  RESUME_MODEL_PROVIDER,
  RESUME_VERSION_MODEL_PROVIDER,
  ANALYSIS_MODEL_PROVIDER,
} from '@constants';
import { ProfileSchema } from './profile.model';
import { AuthSchema } from './auth.model';
import { ResumeSchema } from './resume.model';
import { ResumeVersionSchema } from './resume-version.model';
import { AnalysisSchema } from './analysis.model';

export const modelProviders = [
  {
    provide: PROFILE_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('Profile', ProfileSchema),
    inject: [DB_PROVIDER],
  },
  {
    provide: AUTH_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('Auth', AuthSchema),
    inject: [DB_PROVIDER],
  },
  {
    provide: RESUME_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('Resume', ResumeSchema),
    inject: [DB_PROVIDER],
  },
  {
    provide: RESUME_VERSION_MODEL_PROVIDER,
    useFactory: (connection: Connection) =>
      connection.model('ResumeVersion', ResumeVersionSchema),
    inject: [DB_PROVIDER],
  },
  {
    provide: ANALYSIS_MODEL_PROVIDER,
    useFactory: (connection: Connection) => connection.model('Analysis', AnalysisSchema),
    inject: [DB_PROVIDER],
  },
];
