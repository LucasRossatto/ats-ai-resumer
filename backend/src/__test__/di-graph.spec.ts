import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { DB_PROVIDER } from '@constants';
import { AuthController } from '@api/controllers/auth.controller';
import { AuthService } from '@application/services/auth.service';
import { DashboardService } from '@application/services/dashboard.service';
import { ProfileController } from '@api/controllers/profile.controller';

/**
 * The unit specs build their own testing modules with hand written providers,
 * so none of them notices a provider the real modules forget to register or
 * export. That failure only shows on boot. Compiling the actual `AppModule` is
 * the cheapest place to catch it.
 *
 * The database provider is stubbed with the single method the model factories
 * call: what is under test is the wiring, not the connection.
 */
describe('DI graph', () => {
  it('compiles the real AppModule and resolves the wiring', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DB_PROVIDER)
      .useValue({ model: () => ({}) })
      .compile();

    /** Cross-module edges, the ones a missing export breaks first. */
    expect(moduleRef.get(AuthService, { strict: false })).toBeDefined();
    expect(moduleRef.get(AuthController, { strict: false })).toBeDefined();
    expect(moduleRef.get(ProfileController, { strict: false })).toBeDefined();
    expect(moduleRef.get(DashboardService, { strict: false })).toBeDefined();

    await moduleRef.close();
  }, 60000);
});
