import * as mongoose from 'mongoose';
import { DB_PROVIDER, MONGODB_URI } from '@constants';

export const databaseProviders = [
  {
    provide: DB_PROVIDER,
    useFactory: (): Promise<typeof mongoose> => mongoose.connect(MONGODB_URI),
  },
];
